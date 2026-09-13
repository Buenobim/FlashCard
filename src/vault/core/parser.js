/*
  =============================================================================
  ARQUIVO: src/vault/core/parser.js
  PARA QUE SERVE: Lê o texto cru de uma nota em Markdown e extrai dela tudo que
  o sistema precisa saber SEM ter que reler o texto depois:

    - Frontmatter  -> o bloco YAML entre --- no topo (propriedades da nota)
    - Headings     -> os títulos (#, ##, ###...)
    - Wikilinks    -> [[Outra Nota]], [[Nota|apelido]], [[Nota#Seção]]
    - Embeds       -> ![[Imagem.png]] ou ![[Outra Nota]] (incorporados)
    - Tags         -> #estudo, #faculdade/calculo
    - Tarefas      -> - [ ] fazer isso   /   - [x] feito

  REGRA DE OURO DESTE ARQUIVO: ele é PURO. Entra texto, sai um objeto. Não sabe
  o que é React, não sabe o que é Firebase, não toca em disco. Por isso é a peça
  mais fácil de testar e a que nunca vai quebrar por causa de outra.
  =============================================================================
*/

// Um marcador de posição dentro do arquivo: em que linha, em que coluna e em
// que caractere absoluto. Serve para o editor saber onde desenhar/clicar.
const pos = (line, col, offset, length) => ({ line, col, offset, length });

/*
  FUNÇÃO: parseFrontmatter
  PARA QUE SERVE: Lê o bloco de propriedades no topo da nota, delimitado por ---.
  É um YAML simplificado de propósito: chave: valor, listas com "- item" e listas
  em linha [a, b, c]. Cobre 99% do uso real e evita arrastar uma biblioteca de
  YAML inteira (que pesaria mais que o resto do módulo junto).

  Exemplo:
    ---
    titulo: Cálculo I
    tags: [faculdade, matematica]
    concluido: false
    ---
*/
export function parseFrontmatter(text) {
  const empty = { frontmatter: null, bodyStartLine: 0, bodyOffset: 0 };
  if (!text.startsWith('---')) return empty;

  const lines = text.split('\n');
  if (lines[0].trim() !== '---') return empty;

  // Procura a linha que fecha o bloco
  let endLine = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') { endLine = i; break; }
  }
  if (endLine === -1) return empty; // abriu e nunca fechou: não é frontmatter

  const data = {};
  let currentListKey = null;

  for (let i = 1; i < endLine; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;

    // Item de lista pendurado na chave anterior ("  - item")
    const listItem = raw.match(/^\s*-\s+(.*)$/);
    if (listItem && currentListKey) {
      data[currentListKey].push(castValue(listItem[1].trim()));
      continue;
    }

    const kv = raw.match(/^([A-Za-zÀ-ÿ0-9_\- ]+):\s*(.*)$/);
    if (!kv) continue;

    const key = kv[1].trim();
    const rawValue = kv[2].trim();

    if (rawValue === '') {
      // "tags:" sozinho => os próximos "- item" pertencem a ele
      data[key] = [];
      currentListKey = key;
    } else if (rawValue.startsWith('[') && rawValue.endsWith(']')) {
      // Lista em linha: [a, b, c]
      data[key] = rawValue.slice(1, -1).split(',')
        .map(s => castValue(s.trim())).filter(v => v !== '');
      currentListKey = null;
    } else {
      data[key] = castValue(rawValue);
      currentListKey = null;
    }
  }

  // Offset do corpo = tudo que veio até o --- de fechamento, mais a quebra
  let bodyOffset = 0;
  for (let i = 0; i <= endLine; i++) bodyOffset += lines[i].length + 1;

  return { frontmatter: data, bodyStartLine: endLine + 1, bodyOffset };
}

// Converte "true"/"false"/"42" nos tipos certos; o resto continua texto.
function castValue(v) {
  const s = v.replace(/^["']|["']$/g, '');
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s !== '' && !isNaN(Number(s))) return Number(s);
  return s;
}

/*
  FUNÇÃO: parseWikilinkTarget
  PARA QUE SERVE: Quebra o miolo de um [[...]] nas suas partes.
  Formato completo: [[Nota#Seção^bloco|Apelido]]
*/
export function parseWikilinkTarget(inner) {
  let rest = inner;
  let alias = null;

  const pipe = rest.indexOf('|');
  if (pipe !== -1) {
    alias = rest.slice(pipe + 1).trim();
    rest = rest.slice(0, pipe);
  }

  let subpath = null;
  const hash = rest.indexOf('#');
  if (hash !== -1) {
    subpath = rest.slice(hash + 1).trim();
    rest = rest.slice(0, hash);
  }

  const target = rest.trim();
  return {
    target,                                  // "Nota"
    subpath,                                 // "Seção" ou null
    alias,                                   // "Apelido" ou null
    displayText: alias || (subpath ? `${target} › ${subpath}` : target),
  };
}

/*
  FUNÇÃO: maskInlineCode
  PARA QUE SERVE: Troca o conteúdo de `código em linha` por espaços, mantendo o
  MESMO comprimento da linha. Assim, quando procurarmos tags e links, um exemplo
  escrito dentro de crase (tipo `#nao-e-tag`) é ignorado — mas todas as posições
  continuam batendo com o texto original, que é o que o editor precisa.
*/
function maskInlineCode(line) {
  let out = '';
  let inCode = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '`') { inCode = !inCode; out += ' '; continue; }
    out += inCode ? ' ' : ch;
  }
  return out;
}

// Expressões usadas na varredura linha a linha
const RE_HEADING = /^(#{1,6})\s+(.*)$/;
const RE_WIKILINK = /(!?)\[\[([^[\]]+?)\]\]/g;
const RE_TAG = /(^|[\s([{>,;:"'])#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu;
const RE_TASK = /^(\s*)[-*+]\s+\[([ xX])\]\s*(.*)$/;
const RE_FENCE = /^\s*(```|~~~)/;

/*
  FUNÇÃO: parseNote  (a principal deste arquivo)
  PARA QUE SERVE: Faz UMA passada linha a linha pelo texto e devolve o mapa
  completo da nota. Uma passada só, de propósito: é o que mantém a abertura de
  uma nota abaixo de milissegundos mesmo com o cofre cheio.
*/
export function parseNote(text) {
  const { frontmatter, bodyStartLine } = parseFrontmatter(text);

  const headings = [];
  const links = [];
  const embeds = [];
  const tags = [];
  const tasks = [];

  const lines = text.split('\n');
  let offset = 0;       // caractere absoluto onde a linha atual começa
  let inFence = false;  // estamos dentro de um bloco ``` de código?

  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln];
    const lineOffset = offset;
    offset += line.length + 1;

    // Pula o frontmatter: já foi lido acima e não deve virar link nem tag
    if (ln < bodyStartLine) continue;

    // Blocos de código: nada lá dentro é link, tag ou título
    if (RE_FENCE.test(line)) { inFence = !inFence; continue; }
    if (inFence) continue;

    // --- Títulos ---
    const h = line.match(RE_HEADING);
    if (h) {
      headings.push({
        level: h[1].length,
        heading: h[2].trim(),
        position: pos(ln, 0, lineOffset, line.length),
      });
    }

    // --- Tarefas ---
    const t = line.match(RE_TASK);
    if (t) {
      tasks.push({
        checked: t[2].toLowerCase() === 'x',
        text: t[3].trim(),
        indent: t[1].length,
        position: pos(ln, t[1].length, lineOffset + t[1].length, line.length - t[1].length),
      });
    }

    const masked = maskInlineCode(line);

    // --- Wikilinks e embeds ---
    RE_WIKILINK.lastIndex = 0;
    let m;
    while ((m = RE_WIKILINK.exec(masked)) !== null) {
      const isEmbed = m[1] === '!';
      const parsed = parseWikilinkTarget(m[2]);
      if (!parsed.target && !parsed.subpath) continue; // [[ ]] vazio: ignora

      const entry = {
        ...parsed,
        raw: m[0],
        position: pos(ln, m.index, lineOffset + m.index, m[0].length),
      };
      (isEmbed ? embeds : links).push(entry);
    }

    // --- Tags ---
    RE_TAG.lastIndex = 0;
    while ((m = RE_TAG.exec(masked)) !== null) {
      const tagStart = m.index + m[1].length;
      tags.push({
        tag: m[2],
        position: pos(ln, tagStart, lineOffset + tagStart, m[2].length + 1),
      });
      // Recua 1 para não perder uma tag colada logo em seguida
      RE_TAG.lastIndex = tagStart + m[2].length;
    }
  }

  // Tags declaradas no frontmatter valem tanto quanto as do corpo
  if (frontmatter?.tags) {
    const fmTags = Array.isArray(frontmatter.tags) ? frontmatter.tags : [frontmatter.tags];
    for (const tg of fmTags) {
      const clean = String(tg).replace(/^#/, '').trim();
      if (clean) tags.push({ tag: clean, position: pos(0, 0, 0, 0), fromFrontmatter: true });
    }
  }

  return { frontmatter, headings, links, embeds, tags, tasks };
}

/*
  =============================================================================
  ARQUIVO: src/vault/ui/cm/livePreview.js
  PARA QUE SERVE: É o truque que faz o Obsidian parecer mágico — o "Live Preview".

  A IDEIA EM UMA FRASE: o texto continua sendo Markdown puro o tempo todo; a gente
  só ESCONDE os símbolos na linha onde o cursor NÃO está.

  Na prática:
    - cursor longe   ->  **negrito**        vira   negrito
                         [[Cálculo I]]      vira   Cálculo I  (azul, clicável)
                         - [ ] tarefa       vira   ☐ tarefa   (caixa de verdade)
                         ![](data:image..)  vira   a imagem aparece
    - cursor na linha ->  tudo volta a ser texto cru, para você editar sem susto

  POR QUE ISSO É FEITO COM "DECORAÇÕES" E NÃO MUDANDO O TEXTO: porque o arquivo
  NUNCA é alterado. Se um dia você exportar as notas, elas são .md normais, que
  abrem em qualquer editor do mundo. Nada de formato proprietário.

  DESEMPENHO: só as linhas VISÍVEIS na tela são processadas. Uma nota de 10 mil
  linhas custa o mesmo que uma de 30.
  =============================================================================
*/

import { ViewPlugin, Decoration, WidgetType, EditorView } from '@codemirror/view';

/* ---------------------------------------------------------------------------
   PEDACINHOS DE INTERFACE (widgets) que entram no lugar do texto cru
--------------------------------------------------------------------------- */

// Um [[link]] renderizado: azul se a nota existe, tracejado se ainda não existe
class WikilinkWidget extends WidgetType {
  constructor(display, target, exists, isEmbed) {
    super();
    this.display = display; this.target = target;
    this.exists = exists; this.isEmbed = isEmbed;
  }
  eq(other) {
    return other.display === this.display && other.target === this.target && other.exists === this.exists;
  }
  toDOM() {
    const el = document.createElement('span');
    el.className = `cm-wikilink${this.exists ? '' : ' cm-wikilink-broken'}${this.isEmbed ? ' cm-wikilink-embed' : ''}`;
    el.textContent = this.display;
    el.dataset.linkTarget = this.target;
    el.title = this.exists ? `Abrir "${this.target}"` : `Criar a nota "${this.target}"`;
    return el;
  }
  ignoreEvent() { return false; } // precisa receber o clique
}

// Uma #tag renderizada como etiqueta clicável
class TagWidget extends WidgetType {
  constructor(tag) { super(); this.tag = tag; }
  eq(other) { return other.tag === this.tag; }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-tag-pill';
    el.textContent = `#${this.tag}`;
    el.dataset.tag = this.tag;
    return el;
  }
  ignoreEvent() { return false; }
}

// A caixinha de tarefa. Clicar nela edita o documento de verdade ([ ] <-> [x]).
class TaskWidget extends WidgetType {
  constructor(checked, from, to) { super(); this.checked = checked; this.from = from; this.to = to; }
  eq(other) { return other.checked === this.checked && other.from === this.from; }
  toDOM(view) {
    const box = document.createElement('span');
    box.className = `cm-task-box${this.checked ? ' cm-task-done' : ''}`;
    box.textContent = this.checked ? '✓' : '';
    box.onmousedown = (e) => {
      e.preventDefault();
      view.dispatch({
        changes: { from: this.from, to: this.to, insert: this.checked ? '[ ]' : '[x]' },
      });
    };
    return box;
  }
  ignoreEvent() { return false; }
}

// Imagem colada com Ctrl+V (o app já salva como data:image/...) aparece de verdade
class ImageWidget extends WidgetType {
  constructor(src, alt) { super(); this.src = src; this.alt = alt; }
  eq(other) { return other.src === this.src; }
  toDOM() {
    const wrap = document.createElement('span');
    wrap.className = 'cm-image-wrap';
    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt || '';
    img.className = 'cm-image';
    wrap.appendChild(img);
    return wrap;
  }
}

/* ---------------------------------------------------------------------------
   AS REGRAS DE FORMATAÇÃO
   Cada uma diz: o que procurar, o que esconder e como pintar o que sobrou.
--------------------------------------------------------------------------- */

const INLINE_RULES = [
  { re: /\*\*([^*\n]+)\*\*/g,      cls: 'cm-strong',    marks: 2 },
  { re: /(?<!\*)\*([^*\n]+)\*(?!\*)/g, cls: 'cm-em',    marks: 1 },
  { re: /~~([^~\n]+)~~/g,          cls: 'cm-strike',    marks: 2 },
  { re: /==([^=\n]+)==/g,          cls: 'cm-highlight', marks: 2 },
  { re: /`([^`\n]+)`/g,            cls: 'cm-inline-code', marks: 1 },
];

const RE_WIKILINK = /(!?)\[\[([^[\]]+?)\]\]/g;
const RE_TAG = /(^|[\s([{>,;:"'])#([\p{L}\p{N}][\p{L}\p{N}_/-]*)/gu;
const RE_TASK = /^(\s*)([-*+])\s\[([ xX])\]\s/;
const RE_HEADING = /^(#{1,6})\s+/;
const RE_QUOTE = /^(\s*>\s?)/;
const RE_IMAGE = /!\[([^\]]*)\]\((data:[^)]+|https?:\/\/[^)]+)\)/g;
const RE_FENCE = /^\s*(```|~~~)/;
const RE_BULLET = /^(\s*)([-*+])\s/;

/*
  FUNÇÃO: buildDecorations
  PARA QUE SERVE: Percorre só as linhas visíveis e monta a lista de "enfeites".
  Recebe de fora a função resolveLink para saber se um [[link]] existe ou não —
  assim este arquivo não precisa conhecer o índice do cofre (fica desacoplado).
*/
function buildDecorations(view, resolveLink) {
  const deco = [];
  const { state } = view;
  const doc = state.doc;

  // Quais linhas estão "abertas para edição" (cursor ou seleção dentro delas)
  const activeLines = new Set();
  for (const range of state.selection.ranges) {
    const first = doc.lineAt(range.from).number;
    const last = doc.lineAt(range.to).number;
    for (let n = first; n <= last; n++) activeLines.add(n);
  }

  /*
    Onde termina o bloco de propriedades (frontmatter) no topo da nota.
    Essas linhas guardam informação técnica — por exemplo, a qual baralho a
    anotação pertence. É preciso que continuem editáveis, mas elas não podem
    competir visualmente com o seu texto. Então ficam pequenas e apagadas,
    como uma etiqueta, em vez de um bloco de código gritando no topo da página.
  */
  let fimFrontmatter = -1;
  if (doc.lines > 1 && doc.line(1).text.trim() === '---') {
    for (let n = 2; n <= doc.lines; n++) {
      if (doc.line(n).text.trim() === '---') { fimFrontmatter = n; break; }
    }
  }

  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = doc.lineAt(pos);
      const text = line.text;

      if (fimFrontmatter > 0 && line.number <= fimFrontmatter) {
        deco.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-frontmatter' }) });
        pos = line.to + 1;
        continue;
      }
      const raw = activeLines.has(line.number); // cursor aqui? mostra o código puro

      /*
        add: registra um enfeite.
        O 4º argumento marca se é uma decoração do tipo "substituir" (esconde ou
        troca o texto). Isso importa porque o CodeMirror NÃO permite duas
        substituições sobrepostas — e "**[[link]]**" produz exatamente isso.
        Guardamos a informação agora e resolvemos o conflito no final.
      */
      const add = (f, t, d, isReplace = false) => {
        if (f > t) return;
        deco.push({ from: f, to: t, deco: d, isReplace });
      };

      // Blocos de código: só pinta o fundo, não formata nada dentro
      if (RE_FENCE.test(text)) {
        deco.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-fence-line' }) });
        pos = line.to + 1;
        continue;
      }

      // --- Título (#, ##, ...) ---
      const h = text.match(RE_HEADING);
      if (h) {
        deco.push({ from: line.from, to: line.from, deco: Decoration.line({ class: `cm-h${h[1].length}` }) });
        if (!raw) add(line.from, line.from + h[0].length, Decoration.replace({}), true);
      }

      // --- Citação (>) ---
      const q = text.match(RE_QUOTE);
      if (q) {
        deco.push({ from: line.from, to: line.from, deco: Decoration.line({ class: 'cm-quote-line' }) });
        if (!raw) add(line.from, line.from + q[0].length, Decoration.replace({}), true);
      }

      // --- Tarefa (- [ ] / - [x]) ---
      const tk = text.match(RE_TASK);
      if (tk) {
        const boxFrom = line.from + tk[1].length + tk[2].length + 1;
        const boxTo = boxFrom + 3;
        deco.push({
          from: line.from, to: line.from,
          deco: Decoration.line({ class: tk[3].toLowerCase() === 'x' ? 'cm-task-line cm-task-line-done' : 'cm-task-line' }),
        });
        if (!raw) {
          // esconde o marcador de lista e troca o [ ] por uma caixa clicável
          add(line.from + tk[1].length, boxFrom, Decoration.replace({}), true);
          add(boxFrom, boxTo, Decoration.replace({
            widget: new TaskWidget(tk[3].toLowerCase() === 'x', boxFrom, boxTo),
          }), true);
        }
      } else {
        // --- Lista comum: troca o "-" por um bullet bonito ---
        const b = text.match(RE_BULLET);
        if (b && !raw) {
          add(line.from + b[1].length, line.from + b[1].length + 1,
            Decoration.replace({ widget: new BulletWidget() }), true);
        }
      }

      // --- Imagens ---
      RE_IMAGE.lastIndex = 0;
      let m;
      while ((m = RE_IMAGE.exec(text)) !== null) {
        if (raw) break;
        add(line.from + m.index, line.from + m.index + m[0].length,
          Decoration.replace({ widget: new ImageWidget(m[2], m[1]) }), true);
      }

      // --- Wikilinks ---
      RE_WIKILINK.lastIndex = 0;
      while ((m = RE_WIKILINK.exec(text)) !== null) {
        const start = line.from + m.index;
        const end = start + m[0].length;
        const inner = m[2];
        const pipe = inner.indexOf('|');
        const hash = inner.indexOf('#');
        let target = inner, alias = null, sub = null;
        if (pipe !== -1) { alias = inner.slice(pipe + 1).trim(); target = inner.slice(0, pipe); }
        if (hash !== -1 && (pipe === -1 || hash < pipe)) { sub = target.slice(hash + 1); target = target.slice(0, hash); }
        target = target.trim();

        const display = alias || (sub ? `${target} › ${sub}` : target);
        const exists = !!resolveLink(target);

        if (raw) {
          add(start, end, Decoration.mark({ class: exists ? 'cm-wikilink-raw' : 'cm-wikilink-raw-broken' }));
        } else {
          add(start, end, Decoration.replace({
            widget: new WikilinkWidget(display, target, exists, m[1] === '!'),
          }), true);
        }
      }

      // --- Tags ---
      RE_TAG.lastIndex = 0;
      while ((m = RE_TAG.exec(text)) !== null) {
        const tagStart = line.from + m.index + m[1].length;
        const tagEnd = tagStart + m[2].length + 1;
        if (raw) add(tagStart, tagEnd, Decoration.mark({ class: 'cm-tag-raw' }));
        else add(tagStart, tagEnd, Decoration.replace({ widget: new TagWidget(m[2]) }), true);
        RE_TAG.lastIndex = m.index + m[1].length + m[2].length;
      }

      // --- Negrito, itálico, código, marca-texto, riscado ---
      for (const rule of INLINE_RULES) {
        rule.re.lastIndex = 0;
        while ((m = rule.re.exec(text)) !== null) {
          const s = line.from + m.index;
          const e = s + m[0].length;
          add(s + rule.marks, e - rule.marks, Decoration.mark({ class: rule.cls }));
          if (!raw) {
            add(s, s + rule.marks, Decoration.replace({}), true);
            add(e - rule.marks, e, Decoration.replace({}), true);
          }
        }
      }

      pos = line.to + 1;
    }
  }

  /*
    RESOLUÇÃO DE CONFLITO — a parte chata mas indispensável.

    O CodeMirror proíbe duas decorações do tipo "substituir" se sobreporem. E isso
    acontece de verdade: escreva **[[Cálculo]]** e o negrito quer esconder os
    asteriscos enquanto o wikilink quer substituir o miolo inteiro. Sem tratar,
    o editor lança exceção e a nota simplesmente não abre.

    A regra: ordenamos por posição e, em caso de empate, a substituição MAIS LARGA
    ganha (o link vale mais que o asterisco). Quem sobrar sobreposto é descartado.
    Decorações de "pintar" (mark/line) não têm essa restrição e passam todas.
  */
  deco.sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from));

  const accepted = [];
  let lastReplaceEnd = -1;
  for (const d of deco) {
    if (d.isReplace) {
      if (d.from < lastReplaceEnd) continue; // sobrepõe uma substituição já aceita
      lastReplaceEnd = d.to;
    }
    accepted.push(d.deco.range(d.from, d.to));
  }

  // Decoration.set com sort=true cuida da ordenação fina (startSide das linhas).
  return Decoration.set(accepted, true);
}

// Bullet "•" no lugar do hífen
class BulletWidget extends WidgetType {
  eq() { return true; }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-bullet';
    el.textContent = '•';
    return el;
  }
}

/*
  FUNÇÃO: livePreview
  PARA QUE SERVE: Monta a extensão pronta para o editor.
  Recebe as funções de callback (abrir link, abrir tag) de quem está por fora —
  este arquivo continua sem saber que existe React ou roteamento.
*/
export function livePreview({ resolveLink, onOpenLink, onOpenTag }) {
  const plugin = ViewPlugin.fromClass(
    class {
      constructor(view) { this.decorations = buildDecorations(view, resolveLink); }
      update(update) {
        // Refaz quando o texto muda, quando o cursor anda (para revelar a linha)
        // ou quando a rolagem traz linhas novas para a tela.
        if (update.docChanged || update.selectionSet || update.viewportChanged) {
          this.decorations = buildDecorations(update.view, resolveLink);
        }
      }
    },
    { decorations: (v) => v.decorations }
  );

  const clicks = EditorView.domEventHandlers({
    mousedown(event) {
      const link = event.target.closest?.('.cm-wikilink');
      if (link) {
        event.preventDefault();
        onOpenLink?.(link.dataset.linkTarget, { newTab: event.ctrlKey || event.metaKey });
        return true;
      }
      const tag = event.target.closest?.('.cm-tag-pill');
      if (tag) {
        event.preventDefault();
        onOpenTag?.(tag.dataset.tag);
        return true;
      }
      return false;
    },
  });

  return [plugin, clicks];
}

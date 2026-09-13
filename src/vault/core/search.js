/*
  =============================================================================
  ARQUIVO: src/vault/core/search.js
  PARA QUE SERVE: As duas buscas do cofre, que são bem diferentes uma da outra:

  1) fuzzyFind  -> a busca do "Ctrl+O" (abrir nota rápido). Você digita "calc1" e
     ela acha "Faculdade/Cálculo I". Procura só nos NOMES e aceita letras faltando.

  2) searchContent -> a busca global (Ctrl+Shift+F). Varre o TEXTO de todas as
     notas e devolve as linhas onde bateu, com destaque.

  Tudo roda em cima do índice em memória, sem tocar no disco. É por isso que a
  busca responde enquanto você digita, mesmo com o cofre cheio.
  =============================================================================
*/

import { metadataCache } from './metadataCache.js';

const COMBINING_MARKS = new RegExp('[\u0300-\u036f]', 'g');

// Deixa o texto comparável: sem acento, minúsculo
const fold = (s) => String(s || '')
  .normalize('NFD').replace(COMBINING_MARKS, '').toLowerCase();

/*
  FUNÇÃO: fuzzyScore
  PARA QUE SERVE: Dá uma nota (quanto maior, melhor) para o quão bem um texto casa
  com o que você digitou, permitindo pular letras. Devolve null se não casar.

  A pontuação premia:
    - letras em sequência ("calc" em "calculo" vale mais que c-a-l-c espalhados)
    - casar no começo de uma palavra (depois de espaço, "/" ou "-")
  É o que faz o resultado óbvio aparecer em primeiro lugar.
*/
export function fuzzyScore(text, query) {
  const t = fold(text);
  const q = fold(query);
  if (!q) return 0;
  if (!t) return null;

  let score = 0;
  let ti = 0;
  let streak = 0;
  const positions = [];

  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    const found = t.indexOf(ch, ti);
    if (found === -1) return null; // faltou uma letra: não casa

    const isWordStart = found === 0 || /[\s/\-_.]/.test(t[found - 1]);
    streak = found === ti && qi > 0 ? streak + 1 : 0;

    score += 1 + streak * 4 + (isWordStart ? 6 : 0);
    positions.push(found);
    ti = found + 1;
  }

  // Casar num nome curto é mais relevante do que num nome comprido
  score += Math.max(0, 20 - t.length / 4);
  return { score, positions };
}

/*
  FUNÇÃO: fuzzyFind
  PARA QUE SERVE: Alimenta o seletor rápido (Ctrl+O). Com a busca vazia, mostra
  as notas mexidas por último — que é quase sempre o que você quer abrir.
*/
export function fuzzyFind(query, { limit = 50 } = {}) {
  const files = metadataCache.getAllFiles();

  if (!query || !query.trim()) {
    return files
      .slice()
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map(f => ({ path: f.path, label: f.basename, folder: f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '', positions: [], score: 0 }));
  }

  const results = [];
  for (const f of files) {
    // Tenta casar com o nome; se não, com o caminho inteiro (para achar por pasta)
    const byName = fuzzyScore(f.basename, query);
    const byPath = byName ? null : fuzzyScore(f.path, query);
    const hit = byName || byPath;
    if (!hit) continue;

    results.push({
      path: f.path,
      label: f.basename,
      folder: f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '',
      positions: byName ? hit.positions : [],
      score: hit.score + (byName ? 30 : 0), // casar no nome vale mais que na pasta
    });
  }

  return results.sort((a, b) => b.score - a.score).slice(0, limit);
}

/*
  FUNÇÃO: searchContent
  PARA QUE SERVE: Busca dentro do texto de todas as notas.
  Aceita expressão regular (para quem quiser) e devolve as linhas que bateram,
  já com as posições do destaque prontas para a tela pintar.
*/
export function searchContent(query, { regex = false, caseSensitive = false, limit = 200 } = {}) {
  if (!query || !query.trim()) return [];

  let matcher;
  if (regex) {
    try {
      matcher = new RegExp(query, caseSensitive ? 'g' : 'gi');
    } catch {
      return []; // regex inválida enquanto o usuário ainda digita: não é erro
    }
  }

  const needle = caseSensitive ? query : fold(query);
  const results = [];
  let total = 0;

  for (const file of metadataCache.getAllFiles()) {
    const content = metadataCache.getContent(file.path);
    if (!content) continue;

    // Filtro rápido: se a nota inteira não contém o termo, nem quebra em linhas
    if (!regex) {
      const hay = caseSensitive ? content : fold(content);
      if (!hay.includes(needle)) continue;
    }

    const lines = content.split('\n');
    const hits = [];

    for (let i = 0; i < lines.length && total < limit; i++) {
      const line = lines[i];
      const ranges = [];

      if (regex) {
        matcher.lastIndex = 0;
        let m;
        while ((m = matcher.exec(line)) !== null) {
          ranges.push([m.index, m.index + m[0].length]);
          if (m[0].length === 0) matcher.lastIndex++; // evita laço infinito
        }
      } else {
        const hay = caseSensitive ? line : fold(line);
        let from = 0, at;
        while ((at = hay.indexOf(needle, from)) !== -1) {
          ranges.push([at, at + needle.length]);
          from = at + needle.length;
        }
      }

      if (ranges.length) {
        hits.push({ line: i, text: line.trim().slice(0, 240), ranges, rawLine: line });
        total += ranges.length;
      }
    }

    if (hits.length) {
      results.push({ path: file.path, basename: file.basename, hits, count: hits.length });
    }
  }

  return results.sort((a, b) => b.count - a.count);
}

/*
  FUNÇÃO: searchByTag
  PARA QUE SERVE: Clicar numa tag mostra tudo que a usa — incluindo as subtags
  (clicar em #faculdade também traz #faculdade/calculo).
*/
export function searchByTag(tag) {
  const wanted = fold(tag).replace(/^#/, '');
  const out = new Set();
  for (const { tag: t } of metadataCache.getAllTags()) {
    const ft = fold(t);
    if (ft === wanted || ft.startsWith(`${wanted}/`)) {
      for (const p of metadataCache.getNotesWithTag(t)) out.add(p);
    }
  }
  return Array.from(out);
}

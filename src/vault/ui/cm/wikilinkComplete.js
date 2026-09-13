/*
  =============================================================================
  ARQUIVO: src/vault/ui/cm/wikilinkComplete.js
  PARA QUE SERVE: Quando você digita "[[", abre a listinha com os nomes das suas
  notas para escolher. É o gesto mais usado do Obsidian — é assim que o cofre vai
  ficando conectado sem esforço.

  DETALHE QUE FAZ DIFERENÇA: a lista também oferece "Criar nova nota: X" quando
  o que você digitou não existe ainda. Isso é o coração do método: você escreve o
  link primeiro e a nota nasce depois, quando você tiver tempo.
  =============================================================================
*/

import { autocompletion } from '@codemirror/autocomplete';
import { metadataCache } from '../../core/metadataCache.js';
import { fuzzyFind } from '../../core/search.js';
import { sugestoesDeLink } from '../../core/deckBridge.js';

/*
  FONTE 1: nomes de notas depois de "[["
*/
function wikilinkSource(context) {
  // Procura um "[[" aberto antes do cursor, na mesma linha, ainda não fechado
  const line = context.state.doc.lineAt(context.pos);
  const before = line.text.slice(0, context.pos - line.from);
  const open = before.lastIndexOf('[[');
  if (open === -1) return null;
  const typed = before.slice(open + 2);
  if (typed.includes(']]')) return null; // esse link já foi fechado

  // Insere o nome escolhido e fecha os colchetes, com o cursor depois do "]]"
  const inserir = (texto) => (view, _completion, from, to) => {
    view.dispatch({
      changes: { from, to, insert: `${texto}]]` },
      selection: { anchor: from + texto.length + 2 },
    });
  };

  const options = fuzzyFind(typed, { limit: 25 }).map(r => ({
    label: r.label,
    detail: r.folder || undefined,
    type: 'text',
    apply: inserir(r.label),
  }));

  /*
    Além das notas, oferecemos os BARALHOS e GRUPOS. É o que permite escrever um
    resumo e amarrá-lo à matéria: você digita [[Cálc e o baralho "Cálculo I"
    aparece na lista. Sem isso, ligar uma nota a um baralho exigiria decorar o
    nome exato — e ninguém faria.
  */
  const alvo = typed.trim().toLowerCase();
  for (const s of sugestoesDeLink()) {
    if (alvo && !s.label.toLowerCase().includes(alvo)) continue;
    options.push({
      label: s.label,
      detail: s.detalhe,
      type: s.kind === 'baralho' ? 'class' : 'namespace',
      boost: 1, // logo abaixo das notas, mas acima do "criar nova"
      apply: inserir(s.label),
    });
  }

  // Nada existente com esse nome? Oferece criar.
  const trimmed = typed.trim();
  if (trimmed && !metadataCache.resolve(trimmed)) {
    options.push({
      label: trimmed,
      detail: 'criar nota nova',
      type: 'keyword',
      boost: -10, // sempre por último, para não atrapalhar quem só quer escolher
      apply: (view, _c, from, to) => {
        view.dispatch({
          changes: { from, to, insert: `${trimmed}]]` },
          selection: { anchor: from + trimmed.length + 2 },
        });
      },
    });
  }

  if (!options.length) return null;

  return {
    from: line.from + open + 2,
    options,
    // Deixa o CodeMirror filtrar sozinho enquanto você continua digitando
    validFor: /^[^\]\n]*$/,
  };
}

/*
  FONTE 2: tags já existentes depois de "#"
  Evita você criar #estudos e #estudo separadas por engano — o maior jeito de
  bagunçar um cofre de notas ao longo do tempo.
*/
function tagSource(context) {
  const match = context.matchBefore(/#[\p{L}\p{N}_/-]*/u);
  if (!match || (match.from === match.to && !context.explicit)) return null;

  const typed = match.text.slice(1).toLowerCase();
  const options = metadataCache.getAllTags()
    .filter(t => t.tag.toLowerCase().includes(typed))
    .slice(0, 25)
    .map(t => ({
      label: `#${t.tag}`,
      detail: `${t.count} nota${t.count > 1 ? 's' : ''}`,
      type: 'keyword',
    }));

  if (!options.length) return null;
  return { from: match.from, options, validFor: /^#[\p{L}\p{N}_/-]*$/u };
}

export function vaultCompletion() {
  return autocompletion({
    override: [wikilinkSource, tagSource],
    activateOnTyping: true,
    closeOnBlur: true,
    icons: false,
  });
}

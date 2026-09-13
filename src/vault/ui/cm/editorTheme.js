/*
  =============================================================================
  ARQUIVO: src/vault/ui/cm/editorTheme.js
  PARA QUE SERVE: A aparência do editor de texto. Cores, espaçamento, tamanho de
  título, como fica um link, uma tag, uma tarefa.

  As cores vêm de variáveis CSS (--cofre-*) definidas em vault.css. Assim dá para
  trocar o tema inteiro num lugar só, sem caçar cor no meio do código.
  =============================================================================
*/

import { EditorView } from '@codemirror/view';

export const vaultEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    fontSize: '16px',
    color: 'var(--cofre-texto)',
    backgroundColor: 'transparent',
  },
  '.cm-scroller': {
    fontFamily: "'Inter', 'Outfit', -apple-system, system-ui, sans-serif",
    lineHeight: '1.75',
    padding: '8px 0 45vh 0', // respiro no fim: dá para escrever sem colar no rodapé
    overflow: 'auto',
  },
  '.cm-content': {
    maxWidth: '780px',
    margin: '0 auto',
    padding: '24px 28px',
    caretColor: 'var(--cofre-destaque)',
  },
  '.cm-line': { padding: '0 2px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cofre-destaque)', borderLeftWidth: '2px' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
    backgroundColor: 'var(--cofre-selecao)',
  },
  '.cm-activeLine': { backgroundColor: 'transparent' },

  // --- Títulos ---
  '.cm-h1': { fontSize: '1.85em', fontWeight: '700', lineHeight: '1.3', marginTop: '0.7em', color: 'var(--cofre-titulo)' },
  '.cm-h2': { fontSize: '1.5em', fontWeight: '700', lineHeight: '1.35', marginTop: '0.7em', color: 'var(--cofre-titulo)' },
  '.cm-h3': { fontSize: '1.25em', fontWeight: '650', marginTop: '0.6em', color: 'var(--cofre-titulo)' },
  '.cm-h4': { fontSize: '1.1em', fontWeight: '650', color: 'var(--cofre-titulo)' },
  '.cm-h5, .cm-h6': { fontSize: '1em', fontWeight: '650', color: 'var(--cofre-texto-fraco)' },

  // --- Ênfases ---
  '.cm-strong': { fontWeight: '700', color: 'var(--cofre-titulo)' },
  '.cm-em': { fontStyle: 'italic' },
  '.cm-strike': { textDecoration: 'line-through', opacity: '0.6' },
  '.cm-highlight': { backgroundColor: 'var(--cofre-marcatexto)', color: '#1a1a1a', borderRadius: '3px', padding: '0 3px' },
  '.cm-inline-code': {
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    fontSize: '0.9em',
    backgroundColor: 'var(--cofre-codigo-fundo)',
    color: 'var(--cofre-codigo-texto)',
    borderRadius: '4px',
    padding: '2px 5px',
  },
  '.cm-fence-line': {
    backgroundColor: 'var(--cofre-codigo-fundo)',
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    fontSize: '0.9em',
  },

  // --- Bloco de propriedades (frontmatter) ---
  '.cm-frontmatter': {
    fontSize: '11px',
    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
    color: 'var(--cofre-texto-fraco)',
    opacity: '0.5',
    lineHeight: '1.5',
    borderLeft: '2px solid var(--cofre-borda)',
    paddingLeft: '9px',
  },

  // --- Citação ---
  '.cm-quote-line': {
    borderLeft: '3px solid var(--cofre-destaque)',
    paddingLeft: '14px',
    color: 'var(--cofre-texto-fraco)',
    fontStyle: 'italic',
  },

  // --- Wikilinks ---
  '.cm-wikilink': {
    color: 'var(--cofre-link)',
    cursor: 'pointer',
    borderBottom: '1px solid transparent',
  },
  '.cm-wikilink:hover': { borderBottomColor: 'var(--cofre-link)' },
  '.cm-wikilink-broken': {
    color: 'var(--cofre-link-quebrado)',
    borderBottom: '1px dashed var(--cofre-link-quebrado)',
  },
  '.cm-wikilink-embed': { fontStyle: 'italic' },
  '.cm-wikilink-raw': { color: 'var(--cofre-link)', opacity: '0.75' },
  '.cm-wikilink-raw-broken': { color: 'var(--cofre-link-quebrado)', opacity: '0.75' },

  // --- Tags ---
  '.cm-tag-pill': {
    display: 'inline-block',
    backgroundColor: 'var(--cofre-tag-fundo)',
    color: 'var(--cofre-tag-texto)',
    borderRadius: '10px',
    padding: '1px 9px',
    fontSize: '0.85em',
    cursor: 'pointer',
    lineHeight: '1.5',
  },
  '.cm-tag-pill:hover': { filter: 'brightness(1.25)' },
  '.cm-tag-raw': { color: 'var(--cofre-tag-texto)' },

  // --- Listas e tarefas ---
  '.cm-bullet': { color: 'var(--cofre-destaque)', fontWeight: '700', paddingRight: '6px' },
  '.cm-task-box': {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '17px',
    height: '17px',
    marginRight: '9px',
    border: '2px solid var(--cofre-borda-forte)',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    verticalAlign: '-3px',
    userSelect: 'none',
  },
  '.cm-task-box:hover': { borderColor: 'var(--cofre-destaque)' },
  '.cm-task-done': {
    backgroundColor: 'var(--cofre-sucesso)',
    borderColor: 'var(--cofre-sucesso)',
    color: '#fff',
  },
  '.cm-task-line-done': { color: 'var(--cofre-texto-fraco)', textDecoration: 'line-through' },

  // --- Imagens ---
  '.cm-image-wrap': { display: 'block', margin: '10px 0' },
  '.cm-image': {
    maxWidth: '100%',
    borderRadius: '10px',
    border: '1px solid var(--cofre-borda)',
    display: 'block',
  },

  // --- Lista de sugestões do [[ ---
  '.cm-tooltip.cm-tooltip-autocomplete': {
    border: '1px solid var(--cofre-borda)',
    backgroundColor: 'var(--cofre-fundo-flutuante)',
    borderRadius: '10px',
    boxShadow: '0 12px 34px rgba(0,0,0,.45)',
    overflow: 'hidden',
  },
  '.cm-tooltip-autocomplete > ul': {
    fontFamily: "'Inter', system-ui, sans-serif",
    maxHeight: '260px',
  },
  '.cm-tooltip-autocomplete > ul > li': { padding: '7px 13px', color: 'var(--cofre-texto)' },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--cofre-destaque)',
    color: '#fff',
  },
  '.cm-completionDetail': { color: 'var(--cofre-texto-fraco)', fontStyle: 'normal', fontSize: '0.85em', marginLeft: '10px' },
}, { dark: true });

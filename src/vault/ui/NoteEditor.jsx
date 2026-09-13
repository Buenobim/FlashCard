/*
  =============================================================================
  ARQUIVO: src/vault/ui/NoteEditor.jsx
  PARA QUE SERVE: A área onde você escreve. É uma "casquinha" React em volta do
  CodeMirror 6 — o mesmo motor de edição que o Obsidian usa por baixo.

  DECISÃO IMPORTANTE: o editor é criado UMA vez e reaproveitado ao trocar de nota
  (só o conteúdo é substituído). Recriar o editor a cada troca custaria uns 100ms
  visíveis e perderia o histórico de desfazer. Por isso o useEffect de criação tem
  lista de dependências vazia.
  =============================================================================
*/

import { useEffect, useRef } from 'react';
import { EditorView, keymap, drawSelection, dropCursor, highlightActiveLine, placeholder } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { history, historyKeymap, defaultKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { completionKeymap } from '@codemirror/autocomplete';
import { searchKeymap } from '@codemirror/search';

import { livePreview } from './cm/livePreview.js';
import { vaultCompletion } from './cm/wikilinkComplete.js';
import { vaultEditorTheme } from './cm/editorTheme.js';
import { colarImagem } from './cm/pasteImage.js';
import { metadataCache } from '../core/metadataCache.js';

export default function NoteEditor({ path, initialContent, onChange, onOpenLink, onOpenTag, onAviso, readOnly = false }) {
  const hostRef = useRef(null);
  const viewRef = useRef(null);
  const pathRef = useRef(path);

  /*
    Guardamos os callbacks numa "caixinha" para o editor sempre chamar a versão
    mais nova SEM precisar ser recriado quando o React redesenha o componente.

    A atualização acontece dentro de um useEffect, e não solta no corpo da função:
    mexer numa ref durante a renderização é proibido pelo React (a renderização
    precisa ser previsível e sem efeito colateral). Como o editor só lê essa caixa
    dentro de eventos — clique, digitação — que sempre acontecem DEPOIS da
    renderização, o efeito chega a tempo.
  */
  const handlers = useRef({ onChange, onOpenLink, onOpenTag, onAviso });
  useEffect(() => {
    handlers.current = { onChange, onOpenLink, onOpenTag, onAviso };
  }, [onChange, onOpenLink, onOpenTag, onAviso]);

  const readOnlyComp = useRef(new Compartment());

  // --- Cria o editor uma única vez ---
  useEffect(() => {
    if (!hostRef.current) return;

    const state = EditorState.create({
      doc: initialContent || '',
      extensions: [
        history(),
        drawSelection(),
        dropCursor(),
        highlightActiveLine(),
        EditorView.lineWrapping,
        markdown(),
        vaultEditorTheme,
        placeholder('Escreva aqui. Use [[ para ligar esta nota a outra.'),

        livePreview({
          resolveLink: (target) => metadataCache.resolve(target),
          onOpenLink: (target, opts) => handlers.current.onOpenLink?.(target, opts),
          onOpenTag: (tag) => handlers.current.onOpenTag?.(tag),
        }),
        vaultCompletion(),
        colarImagem({ aoFalhar: (msg) => handlers.current.onAviso?.(msg) }),

        keymap.of([...completionKeymap, ...searchKeymap, ...historyKeymap, ...defaultKeymap, indentWithTab]),
        readOnlyComp.current.of(EditorState.readOnly.of(readOnly)),

        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;
          handlers.current.onChange?.(pathRef.current, update.state.doc.toString());
        }),
      ],
    });

    const view = new EditorView({ state, parent: hostRef.current });
    viewRef.current = view;
    view.focus();

    return () => { view.destroy(); viewRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
    --- Troca de nota ---
    Substitui o texto inteiro sem destruir o editor. O `pathRef` é atualizado
    ANTES do dispatch: sem isso, a mudança de conteúdo dispararia o onChange
    ainda apontando para a nota anterior — e salvaria o texto no arquivo errado.
    Esse é o tipo de bug que só aparece depois e corrompe dados de verdade.
  */
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (pathRef.current === path) return;

    pathRef.current = path;
    const incoming = initialContent || '';
    if (view.state.doc.toString() === incoming) return;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: incoming },
      selection: { anchor: 0 },
      // Anula o histórico entre notas diferentes: Ctrl+Z numa nota não pode
      // ressuscitar o texto de outra.
      annotations: [],
    });
    view.scrollDOM.scrollTop = 0;
    view.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  // --- Somente leitura (usado ao pré-visualizar) ---
  useEffect(() => {
    viewRef.current?.dispatch({
      effects: readOnlyComp.current.reconfigure(EditorState.readOnly.of(readOnly)),
    });
  }, [readOnly]);

  return <div className="cofre-editor" ref={hostRef} />;
}

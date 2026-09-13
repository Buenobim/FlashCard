/*
  =============================================================================
  ARQUIVO: src/vault/ui/DeckNoteEditor.jsx
  PARA QUE SERVE: A aba "Anotações" dentro do baralho.

  É uma folha em branco, sem limite de tamanho, onde você escreve o que quiser:
  texto corrido, títulos, listas, tarefas e prints colados com Ctrl+V.

  O PONTO IMPORTANTE: isto NÃO é um caderninho separado escondido dentro do
  baralho. É uma nota do Cofre. A mesma nota aparece na barra lateral, dentro da
  pasta do grupo (Faculdade/), entra na busca, nos backlinks e no grafo ligada à
  matéria. Você escreve num lugar só e encontra por vários caminhos.
  =============================================================================
*/

import { useState, useEffect, useCallback } from 'react';
import { FileText, ExternalLink, Loader2 } from 'lucide-react';

import NoteEditor from './NoteEditor.jsx';
import { vault } from '../core/vaultManager.js';
import { metadataCache } from '../core/metadataCache.js';
import { garantirNotaDoBaralho } from '../core/deckNotes.js';

export default function DeckNoteEditor({ baralho, onAbrirNoCofre }) {
  const [caminho, setCaminho] = useState(null);
  const [erro, setErro] = useState(null);
  const [aviso, setAviso] = useState(null);

  /*
    Acha a nota deste baralho (ou cria, na primeira vez que você abre a aba).
    Criar só quando você ABRE a aba é de propósito: quem nunca usar anotações não
    fica com dezenas de notas vazias poluindo o cofre e o grafo.
  */
  useEffect(() => {
    let vivo = true;
    setCaminho(null);
    setErro(null);

    if (!baralho?.id) { setErro('Salve o baralho uma vez antes de anotar.'); return; }

    (async () => {
      try {
        const p = await garantirNotaDoBaralho(vault, baralho);
        if (vivo) setCaminho(p);
      } catch (e) {
        console.error('[Anotações] Não consegui abrir a nota do baralho:', e);
        if (vivo) setErro('Não consegui abrir as anotações deste baralho.');
      }
    })();

    return () => { vivo = false; };
  }, [baralho?.id, baralho?.title, baralho?.category]);

  const aoDigitar = useCallback((p, texto) => vault.modify(p, texto), []);

  if (erro) {
    return <div style={estilos.centro}><p style={estilos.aviso}>{erro}</p></div>;
  }

  if (!caminho) {
    return (
      <div style={estilos.centro}>
        <Loader2 size={18} className="bueno-spin" />
        <span style={{ marginLeft: 8 }}>Abrindo suas anotações…</span>
      </div>
    );
  }

  return (
    <div style={estilos.container}>
      <div style={estilos.barra}>
        <span style={estilos.caminho}>
          <FileText size={13} /> {caminho.replace(/\.md$/, '')}
        </span>
        <span style={estilos.dica}>
          Escreva à vontade · <strong>Ctrl+V</strong> cola print · <strong>[[</strong> liga a outra nota
        </span>
        <button style={estilos.botaoCofre} onClick={() => onAbrirNoCofre?.(caminho)} title="Abrir esta nota numa aba do Cofre">
          <ExternalLink size={13} /> Abrir no Cofre
        </button>
      </div>

      {aviso && (
        <div style={estilos.faixaAviso}>
          {aviso}
          <button onClick={() => setAviso(null)} style={estilos.fechar}>✕</button>
        </div>
      )}

      <div style={estilos.folha}>
        <NoteEditor
          key={caminho}
          path={caminho}
          initialContent={metadataCache.getContent(caminho)}
          onChange={aoDigitar}
          onAviso={setAviso}
          onOpenLink={(alvo) => {
            const destino = metadataCache.resolve(alvo);
            if (destino && !metadataCache.isExternal(destino)) onAbrirNoCofre?.(destino);
          }}
        />
      </div>
    </div>
  );
}

const estilos = {
  container: { display: 'flex', flexDirection: 'column', height: '72vh', minHeight: '480px' },
  barra: {
    display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
    padding: '9px 4px 12px',
  },
  caminho: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    fontSize: '13px', fontWeight: 600, color: '#E8933F',
  },
  dica: { fontSize: '12px', color: 'rgba(255,255,255,.45)' },
  botaoCofre: {
    marginLeft: 'auto',
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'transparent', border: '1px solid rgba(255,255,255,.16)',
    color: 'rgba(255,255,255,.72)', borderRadius: '8px',
    padding: '6px 11px', fontSize: '12.5px', cursor: 'pointer', fontFamily: 'inherit',
  },
  folha: {
    flex: 1, minHeight: 0, overflow: 'hidden',
    background: 'rgba(255,255,255,.025)',
    border: '1px solid rgba(255,255,255,.08)',
    borderRadius: '14px',
  },
  centro: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '320px', color: 'rgba(255,255,255,.5)', fontSize: '14px',
  },
  aviso: { fontSize: '14px' },
  faixaAviso: {
    display: 'flex', alignItems: 'center', gap: '10px',
    margin: '0 0 10px', padding: '10px 13px',
    background: 'rgba(232,147,63,.12)', border: '1px solid rgba(232,147,63,.4)',
    borderRadius: '10px', color: '#f0c48a', fontSize: '13px',
  },
  fechar: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: 'inherit', cursor: 'pointer', fontSize: '15px',
  },
};

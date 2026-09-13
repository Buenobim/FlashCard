/*
  =============================================================================
  ARQUIVO: src/vault/ui/Palette.jsx
  PARA QUE SERVE: A caixinha que abre no meio da tela. Ela tem dois modos:

    Ctrl+O  -> SELETOR RÁPIDO: digite parte do nome e pule para a nota.
    Ctrl+P  -> PALETA DE COMANDOS: digite o que quer fazer ("grafo", "nova nota",
               "flashcards") e execute sem procurar botão nenhum.

  POR QUE ISSO IMPORTA MAIS DO QUE PARECE: é o que permite a plataforma crescer
  sem a tela virar uma parede de botões. Cada módulo novo (Finanças, Hábitos,
  Sonhos) só registra seus comandos aqui e fica alcançável por duas teclas.
  =============================================================================
*/

import { useState, useEffect, useRef, useMemo } from 'react';
import { FileText, CornerDownLeft, Plus } from 'lucide-react';
import { fuzzyFind, fuzzyScore } from '../core/search.js';
import { metadataCache } from '../core/metadataCache.js';

export default function Palette({ modo, comandos, onFechar, onAbrirNota, onCriarNota }) {
  const [consulta, setConsulta] = useState('');
  const [indice, setIndice] = useState(0);
  const inputRef = useRef(null);
  const listaRef = useRef(null);

  useEffect(() => { setConsulta(''); setIndice(0); inputRef.current?.focus(); }, [modo]);

  /*
    Monta a lista de opções conforme o modo. No seletor de notas, se o que você
    digitou não existe, a última opção é sempre "criar" — escrever a nota que
    falta é a ação mais natural depois de não encontrá-la.
  */
  const itens = useMemo(() => {
    if (modo === 'comandos') {
      const termo = consulta.trim();
      if (!termo) return comandos;
      return comandos
        .map(c => ({ c, s: fuzzyScore(c.titulo, termo) }))
        .filter(x => x.s)
        .sort((a, b) => b.s.score - a.s.score)
        .map(x => x.c);
    }

    const notas = fuzzyFind(consulta, { limit: 40 }).map(r => ({
      id: r.path,
      titulo: r.label,
      detalhe: r.folder,
      tipo: 'nota',
      acao: () => onAbrirNota(r.path),
    }));

    const termo = consulta.trim();
    if (termo && !metadataCache.resolve(termo)) {
      notas.push({
        id: `__criar__${termo}`,
        titulo: `Criar "${termo}"`,
        detalhe: 'nota nova',
        tipo: 'criar',
        acao: () => onCriarNota(termo),
      });
    }
    return notas;
  }, [modo, consulta, comandos, onAbrirNota, onCriarNota]);

  // Mantém o item selecionado sempre visível ao navegar com as setas
  useEffect(() => {
    const el = listaRef.current?.children[indice];
    el?.scrollIntoView({ block: 'nearest' });
  }, [indice]);

  useEffect(() => { setIndice(0); }, [consulta]);

  const executar = (item) => {
    if (!item) return;
    onFechar();
    // Espera o fechamento pintar antes de agir: evita a tela "pular"
    setTimeout(() => item.acao(), 0);
  };

  const aoTeclar = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setIndice(i => Math.min(itens.length - 1, i + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setIndice(i => Math.max(0, i - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); executar(itens[indice]); }
    else if (e.key === 'Escape') { e.preventDefault(); onFechar(); }
  };

  return (
    <div className="cofre-modal-fundo" onMouseDown={onFechar}>
      <div className="cofre-paleta" onMouseDown={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          value={consulta}
          onChange={(e) => setConsulta(e.target.value)}
          onKeyDown={aoTeclar}
          placeholder={modo === 'comandos' ? 'Digite um comando...' : 'Digite o nome de uma nota...'}
          className="cofre-paleta-campo"
        />

        <div className="cofre-paleta-lista" ref={listaRef}>
          {itens.length === 0 && (
            <div className="cofre-paleta-vazio">Nada encontrado.</div>
          )}

          {itens.map((item, i) => (
            <div
              key={item.id || item.titulo}
              className={`cofre-paleta-item${i === indice ? ' selecionado' : ''}`}
              onMouseEnter={() => setIndice(i)}
              onMouseDown={(e) => { e.preventDefault(); executar(item); }}
            >
              <span className="cofre-paleta-icone">
                {item.tipo === 'criar' ? <Plus size={14} /> : item.icone ? <item.icone size={14} /> : <FileText size={14} />}
              </span>
              <span className="cofre-paleta-titulo">{item.titulo}</span>
              {item.detalhe && <span className="cofre-paleta-detalhe">{item.detalhe}</span>}
              {item.atalho && <kbd className="cofre-paleta-atalho">{item.atalho}</kbd>}
            </div>
          ))}
        </div>

        <div className="cofre-paleta-rodape">
          <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
          <span><kbd><CornerDownLeft size={10} /></kbd> abrir</span>
          <span><kbd>esc</kbd> fechar</span>
        </div>
      </div>
    </div>
  );
}

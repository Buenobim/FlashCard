/*
  =============================================================================
  ARQUIVO: src/vault/ui/SearchPanel.jsx
  PARA QUE SERVE: A busca global (Ctrl+Shift+F) e o painel de tags.

  Procura dentro do TEXTO de todas as notas e mostra as linhas encontradas com o
  trecho destacado. Como tudo já está em memória, o resultado aparece enquanto
  você digita — sem botão "buscar", sem espera.
  =============================================================================
*/

import { useState, useMemo } from 'react';
import { Search, Regex, CaseSensitive, Hash } from 'lucide-react';
import { searchContent, searchByTag } from '../core/search.js';
import { metadataCache, basename } from '../core/metadataCache.js';
import { useVaultVersion } from './useVault.js';

/*
  FUNÇÃO: destacar
  PARA QUE SERVE: Quebra a linha encontrada em pedaços e marca só os trechos que
  bateram com a busca. Feito com fatias de string em vez de HTML montado na mão —
  assim é impossível uma nota com "<script>" no texto virar problema na tela.
*/
function destacar(texto, ranges) {
  const partes = [];
  let cursor = 0;
  for (const [ini, fim] of ranges) {
    if (ini > cursor) partes.push({ t: texto.slice(cursor, ini), marca: false });
    partes.push({ t: texto.slice(ini, fim), marca: true });
    cursor = fim;
  }
  if (cursor < texto.length) partes.push({ t: texto.slice(cursor), marca: false });
  return partes;
}

export default function SearchPanel({ onOpen }) {
  const version = useVaultVersion();
  const [consulta, setConsulta] = useState('');
  const [regex, setRegex] = useState(false);
  const [caixaAlta, setCaixaAlta] = useState(false);
  const [tagAtiva, setTagAtiva] = useState(null);

  const resultados = useMemo(
    () => (tagAtiva ? [] : searchContent(consulta, { regex, caseSensitive: caixaAlta })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [consulta, regex, caixaAlta, version, tagAtiva]
  );

  const notasDaTag = useMemo(
    () => (tagAtiva ? searchByTag(tagAtiva) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tagAtiva, version]
  );

  const tags = useMemo(() => metadataCache.getAllTags(), [version]);
  const totalAchados = resultados.reduce((soma, r) => soma + r.count, 0);

  return (
    <div className="cofre-painel">
      <div className="cofre-painel-topo">
        <span className="cofre-painel-titulo">Buscar</span>
        <div className="cofre-painel-acoes">
          <button
            className={caixaAlta ? 'ativo' : ''}
            onClick={() => setCaixaAlta(v => !v)}
            title="Diferenciar maiúsculas de minúsculas"
          ><CaseSensitive size={15} /></button>
          <button
            className={regex ? 'ativo' : ''}
            onClick={() => setRegex(v => !v)}
            title="Usar expressão regular"
          ><Regex size={15} /></button>
        </div>
      </div>

      <div className="cofre-busca-campo">
        <Search size={14} />
        <input
          value={consulta}
          onChange={(e) => { setConsulta(e.target.value); setTagAtiva(null); }}
          placeholder="Procurar em todas as notas..."
          autoFocus
        />
      </div>

      <div className="cofre-painel-corpo">
        {/* --- Resultados de texto --- */}
        {!tagAtiva && consulta && (
          <p className="cofre-resumo-busca">
            {totalAchados === 0
              ? 'Nada encontrado.'
              : `${totalAchados} ocorrência${totalAchados > 1 ? 's' : ''} em ${resultados.length} nota${resultados.length > 1 ? 's' : ''}`}
          </p>
        )}

        {!tagAtiva && resultados.map(r => (
          <div key={r.path} className="cofre-resultado">
            <button className="cofre-resultado-titulo" onClick={() => onOpen(r.path)}>
              {r.basename}
              <span className="cofre-contador">{r.count}</span>
            </button>
            {r.hits.slice(0, 6).map((h, i) => (
              <button key={i} className="cofre-resultado-linha" onClick={() => onOpen(r.path)}>
                {destacar(h.text, h.ranges).map((p, j) =>
                  p.marca ? <mark key={j}>{p.t}</mark> : <span key={j}>{p.t}</span>
                )}
              </button>
            ))}
          </div>
        ))}

        {/* --- Notas de uma tag --- */}
        {tagAtiva && (
          <>
            <p className="cofre-resumo-busca">
              Notas com <strong>#{tagAtiva}</strong> ({notasDaTag.length})
              <button className="cofre-limpar" onClick={() => setTagAtiva(null)}>limpar</button>
            </p>
            {notasDaTag.map(p => (
              <button key={p} className="cofre-item-lista" onClick={() => onOpen(p)}>
                {basename(p)}
              </button>
            ))}
          </>
        )}

        {/* --- Nuvem de tags --- */}
        {!consulta && !tagAtiva && (
          <div className="cofre-secao">
            <div className="cofre-secao-topo">
              <Hash size={13} /><span>Tags</span><span className="cofre-contador">{tags.length}</span>
            </div>
            <div className="cofre-nuvem-tags">
              {tags.length === 0 && <p className="cofre-vazio-mini">Escreva #assim dentro de uma nota para criar tags.</p>}
              {tags.map(t => (
                <button key={t.tag} className="cofre-tag-chip" onClick={() => setTagAtiva(t.tag)}>
                  #{t.tag}<span>{t.count}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

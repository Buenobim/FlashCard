/*
  =============================================================================
  ARQUIVO: src/vault/ui/BacklinksPanel.jsx
  PARA QUE SERVE: A barra da direita. Mostra, da nota aberta:

    1. QUEM CITA ESTA NOTA (backlinks) — a funcionalidade mais valiosa do Obsidian.
       Você escreve uma nota sobre "Juros Compostos" e, sem fazer nada, descobre
       que ela é citada por "Finanças 2026" e por "Meta: casa própria". As conexões
       aparecem sozinhas.
    2. DE QUEM ESTA NOTA FALA (links de saída)
    3. LINKS QUEBRADOS — notas que você prometeu escrever e ainda não escreveu.
    4. SUMÁRIO — os títulos, para pular direto a uma seção.

  Cada backlink mostra a FRASE onde a citação aparece, não só o nome. Ver o
  contexto é o que faz a informação ser útil sem precisar abrir a outra nota.
  =============================================================================
*/

import { useMemo } from 'react';
import { Link2, ArrowUpRight, AlertCircle, List, Plus, Layers, FolderOpen } from 'lucide-react';
import { metadataCache, basename } from '../core/metadataCache.js';
import { useVaultVersion } from './useVault.js';

/*
  FUNÇÃO: contextosDoLink
  PARA QUE SERVE: Acha, dentro da nota que cita, as linhas onde o link aparece.
  É o que transforma "Finanças 2026" numa informação de verdade:
  "...aplicando [[Juros Compostos]] no aporte mensal..."
*/
function contextosDoLink(origem, alvoBasename) {
  const conteudo = metadataCache.getContent(origem);
  const meta = metadataCache.getMetadata(origem);
  if (!conteudo || !meta) return [];

  const linhas = conteudo.split('\n');
  const alvo = alvoBasename.toLowerCase();
  const saida = [];

  for (const link of [...meta.links, ...meta.embeds]) {
    if (link.target.toLowerCase().replace(/\.md$/, '') !== alvo) continue;
    const texto = (linhas[link.position.line] || '').trim();
    if (texto && !saida.includes(texto)) saida.push(texto.slice(0, 220));
  }
  return saida;
}

function Secao({ icone: Icone, titulo, contagem, children, vazio }) {
  return (
    <div className="cofre-secao">
      <div className="cofre-secao-topo">
        <Icone size={13} />
        <span>{titulo}</span>
        <span className="cofre-contador">{contagem}</span>
      </div>
      <div className="cofre-secao-corpo">
        {contagem === 0 ? <p className="cofre-vazio-mini">{vazio}</p> : children}
      </div>
    </div>
  );
}

export default function BacklinksPanel({ path, onOpen, onCreateNote }) {
  const version = useVaultVersion();

  const dados = useMemo(() => {
    if (!path || !metadataCache.getFile(path)) return null;

    const nome = basename(path);
    const meta = metadataCache.getMetadata(path);

    return {
      nome,
      backlinks: metadataCache.getBacklinks(path).map(origem => ({
        path: origem,
        nome: basename(origem),
        contextos: contextosDoLink(origem, nome),
      })),
      /*
        Um link de saída pode apontar para uma NOTA, para um BARALHO ou para um
        GRUPO de estudo. Aqui traduzimos o identificador interno para o nome que
        você reconhece — sem isso a lista mostraria "baralho:set-1779938021203",
        que não diz nada a ninguém.
      */
      saida: metadataCache.getForwardLinks(path).map(destino => {
        const ext = metadataCache.getExternal(destino);
        if (!ext) return { path: destino, nome: basename(destino), tipo: 'nota' };
        return {
          path: destino,
          nome: ext.label,
          tipo: ext.kind,
          detalhe: ext.kind === 'baralho'
            ? `${ext.cardCount} ${ext.cardCount === 1 ? 'cartão' : 'cartões'}`
            : 'grupo de estudo',
        };
      }),
      quebrados: metadataCache.getUnresolved(path),
      titulos: meta?.headings || [],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, version]);

  if (!dados) {
    return (
      <div className="cofre-painel">
        <div className="cofre-painel-topo"><span className="cofre-painel-titulo">Conexões</span></div>
        <p className="cofre-vazio">Abra uma nota para ver as conexões dela.</p>
      </div>
    );
  }

  return (
    <div className="cofre-painel">
      <div className="cofre-painel-topo">
        <span className="cofre-painel-titulo">Conexões</span>
      </div>

      <div className="cofre-painel-corpo">
        <Secao
          icone={Link2}
          titulo="Citam esta nota"
          contagem={dados.backlinks.length}
          vazio="Nenhuma nota aponta para cá ainda."
        >
          {dados.backlinks.map(b => (
            <div key={b.path} className="cofre-backlink">
              <button className="cofre-backlink-titulo" onClick={() => onOpen(b.path)}>
                {b.nome}
              </button>
              {b.contextos.map((c, i) => (
                <button key={i} className="cofre-backlink-contexto" onClick={() => onOpen(b.path)}>
                  {c}
                </button>
              ))}
            </div>
          ))}
        </Secao>

        <Secao
          icone={ArrowUpRight}
          titulo="Esta nota cita"
          contagem={dados.saida.length}
          vazio="Esta nota ainda não liga para nenhuma outra."
        >
          {dados.saida.map(s => (
            <button key={s.path} className="cofre-item-lista" onClick={() => onOpen(s.path)}>
              {s.tipo === 'baralho' && <Layers size={12} className="cofre-icone-baralho" />}
              {s.tipo === 'grupo' && <FolderOpen size={12} className="cofre-icone-grupo" />}
              <span className="cofre-item-nome">{s.nome}</span>
              {s.detalhe && <small className="cofre-item-detalhe">{s.detalhe}</small>}
            </button>
          ))}
        </Secao>

        <Secao
          icone={AlertCircle}
          titulo="Ainda não existem"
          contagem={dados.quebrados.length}
          vazio="Nenhum link solto."
        >
          {dados.quebrados.map(nome => (
            <button
              key={nome}
              className="cofre-item-lista cofre-item-quebrado"
              onClick={() => onCreateNote(nome)}
              title={`Criar a nota "${nome}"`}
            >
              <Plus size={12} /> {nome}
            </button>
          ))}
        </Secao>

        <Secao
          icone={List}
          titulo="Sumário"
          contagem={dados.titulos.length}
          vazio="Use # para criar títulos."
        >
          {dados.titulos.map((h, i) => (
            <div key={i} className="cofre-sumario-item" style={{ paddingLeft: (h.level - 1) * 12 }}>
              {h.heading}
            </div>
          ))}
        </Secao>
      </div>
    </div>
  );
}

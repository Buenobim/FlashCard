/*
  =============================================================================
  ARQUIVO: src/vault/ui/Explorer.jsx
  PARA QUE SERVE: A lista de arquivos da barra da esquerda, em forma de pastas.

  DETALHE DE ARQUITETURA: no cofre não existe "pasta" de verdade. Existem só notas
  com caminho ("Faculdade/Cálculo I.md"). As pastas são DEDUZIDAS desses caminhos
  na hora de desenhar. Isso simplifica tudo: mover uma nota é só mudar o texto do
  caminho, e nunca sobra pasta órfã sem nada dentro.
  =============================================================================
*/

import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown, FileText, FolderOpen, Folder, Plus, FolderPlus, Users } from 'lucide-react';
import { metadataCache } from '../core/metadataCache.js';
import { SHARED_FOLDER } from '../storage/cloudSync.js';
import { useVaultVersion } from './useVault.js';

/*
  FUNÇÃO: buildTree
  PARA QUE SERVE: Transforma a lista plana de caminhos numa árvore de pastas.
    ["A/B/nota.md", "A/outra.md"]  ->  A > B > nota.md ; A > outra.md
*/
function buildTree(files) {
  const root = { name: '', path: '', folders: new Map(), files: [] };

  for (const file of files) {
    const parts = file.path.split('/');
    const fileName = parts.pop();
    let node = root;

    for (const part of parts) {
      if (!node.folders.has(part)) {
        node.folders.set(part, {
          name: part,
          path: node.path ? `${node.path}/${part}` : part,
          folders: new Map(),
          files: [],
        });
      }
      node = node.folders.get(part);
    }
    node.files.push({ ...file, name: fileName });
  }

  // Ordena: pastas primeiro (alfabética), depois arquivos (alfabética)
  const sortNode = (node) => {
    node.files.sort((a, b) => a.basename.localeCompare(b.basename, 'pt-BR'));
    node.folders = new Map([...node.folders.entries()].sort((a, b) => a[0].localeCompare(b[0], 'pt-BR')));
    for (const child of node.folders.values()) sortNode(child);
  };
  sortNode(root);

  return root;
}

function FolderRow({ node, depth, activePath, collapsed, onToggle, onOpen, onContextMenu }) {
  const isOpen = !collapsed.has(node.path);
  const isShared = node.path === SHARED_FOLDER;

  return (
    <>
      <div
        className="cofre-arvore-linha cofre-arvore-pasta"
        style={{ paddingLeft: 8 + depth * 13 }}
        onClick={() => onToggle(node.path)}
        onContextMenu={(e) => onContextMenu(e, { type: 'pasta', path: node.path })}
        title={node.path}
      >
        {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {isShared
          ? <Users size={14} className="cofre-icone-compartilhado" />
          : (isOpen ? <FolderOpen size={14} /> : <Folder size={14} />)}
        <span className="cofre-arvore-nome">{node.name}</span>
      </div>

      {isOpen && (
        <>
          {[...node.folders.values()].map(child => (
            <FolderRow
              key={child.path} node={child} depth={depth + 1}
              activePath={activePath} collapsed={collapsed}
              onToggle={onToggle} onOpen={onOpen} onContextMenu={onContextMenu}
            />
          ))}
          {node.files.map(file => (
            <FileRow
              key={file.path} file={file} depth={depth + 1}
              active={file.path === activePath} onOpen={onOpen} onContextMenu={onContextMenu}
            />
          ))}
        </>
      )}
    </>
  );
}

function FileRow({ file, depth, active, onOpen, onContextMenu }) {
  return (
    <div
      className={`cofre-arvore-linha cofre-arvore-arquivo${active ? ' ativo' : ''}`}
      style={{ paddingLeft: 8 + depth * 13 }}
      onClick={(e) => onOpen(file.path, { newTab: e.ctrlKey || e.metaKey })}
      onContextMenu={(e) => onContextMenu(e, { type: 'nota', path: file.path })}
      title={file.path}
    >
      <FileText size={13} />
      <span className="cofre-arvore-nome">{file.basename}</span>
    </div>
  );
}

export default function Explorer({ activePath, onOpen, onCreateNote, onCreateFolder, onContextMenu }) {
  const version = useVaultVersion();
  const [collapsed, setCollapsed] = useState(() => new Set());

  // "version" não é usado aqui dentro de propósito: ele é o gatilho que manda
  // remontar a árvore quando o cofre muda. O índice em si vive fora do React.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tree = useMemo(() => buildTree(metadataCache.getAllFiles()), [version]);
  const total = metadataCache.getAllFiles().length;

  const toggle = (path) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path); else next.add(path);
      return next;
    });
  };

  return (
    <div className="cofre-painel">
      <div className="cofre-painel-topo">
        <span className="cofre-painel-titulo">Arquivos</span>
        <div className="cofre-painel-acoes">
          <button onClick={() => onCreateNote('')} title="Nova nota"><Plus size={15} /></button>
          <button onClick={onCreateFolder} title="Nova pasta"><FolderPlus size={15} /></button>
        </div>
      </div>

      <div className="cofre-painel-corpo">
        {total === 0 && (
          <p className="cofre-vazio">
            Nenhuma nota ainda.<br />
            Clique no <strong>+</strong> para escrever a primeira.
          </p>
        )}

        {[...tree.folders.values()].map(node => (
          <FolderRow
            key={node.path} node={node} depth={0}
            activePath={activePath} collapsed={collapsed}
            onToggle={toggle} onOpen={onOpen} onContextMenu={onContextMenu}
          />
        ))}
        {tree.files.map(file => (
          <FileRow
            key={file.path} file={file} depth={0}
            active={file.path === activePath} onOpen={onOpen} onContextMenu={onContextMenu}
          />
        ))}
      </div>

      <div className="cofre-painel-rodape">
        {total} {total === 1 ? 'nota' : 'notas'}
      </div>
    </div>
  );
}

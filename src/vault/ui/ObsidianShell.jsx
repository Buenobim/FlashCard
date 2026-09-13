/*
  =============================================================================
  ARQUIVO: src/vault/ui/ObsidianShell.jsx
  PARA QUE SERVE: É a CASCA da plataforma inteira — a janela do Obsidian.

    [trilho] [ painel lateral ] [ abas + conteúdo | divisão ] [ conexões ]

  O CONCEITO CENTRAL (e o motivo de tudo ficar lógico): existe UM tipo de
  recipiente, a ABA. Dentro de uma aba pode morar qualquer coisa:
      - uma nota (editor)
      - o grafo
      - o módulo de Flashcards, Finanças, Hábitos, Sonhos...
  Como é tudo aba, você pode colocar seus flashcards à esquerda e a nota de
  estudo à direita, lado a lado. Foi assim que o Obsidian escapou de virar uma
  parede de telas separadas — e é o que faz seus módulos deixarem de ser ilhas.

  IMPORTANTE PARA A ARQUITETURA: esta casca NÃO conhece Flashcards, Finanças nem
  nenhum módulo. Ela recebe de fora a função `renderModulo`. Assim o cofre não
  depende do resto do app, e o resto do app não depende do cofre — cada um pode
  mudar sem quebrar o outro.
  =============================================================================
*/

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Files, Search as SearchIcon, Network, LayoutGrid, PanelRight,
  X, Plus, Columns2, FileText, Pencil, Trash2, Copy, RefreshCw, Cloud, CloudOff,
} from 'lucide-react';

import { vault } from '../core/vaultManager.js';
import { metadataCache, basename } from '../core/metadataCache.js';
import { isCloudAvailable, SHARED_FOLDER } from '../storage/cloudSync.js';
import { useVaultVersion, useSyncState, useHotkeys } from './useVault.js';

import Explorer from './Explorer.jsx';
import SearchPanel from './SearchPanel.jsx';
import BacklinksPanel from './BacklinksPanel.jsx';
import GraphView from './GraphView.jsx';
import NoteEditor from './NoteEditor.jsx';
import Palette from './Palette.jsx';
import { ContextMenu, PromptModal } from './dialogs.jsx';

const novoId = () => Math.random().toString(36).slice(2, 9);

export default function ObsidianShell({ activeProfile, modulos = [], renderModulo, onTrocarPerfil }) {
  // Só chamamos o gancho: ele redesenha esta tela quando o cofre muda (por exemplo,
  // quando a nuvem traz uma nota nova). Não precisamos LER o número que ele devolve.
  useVaultVersion();
  const sincronizando = useSyncState();

  const [carregando, setCarregando] = useState(true);
  const [painelEsquerdo, setPainelEsquerdo] = useState('arquivos'); // 'arquivos' | 'busca' | 'modulos' | null
  const [painelDireito, setPainelDireito] = useState(true);
  const [paleta, setPaleta] = useState(null);      // 'notas' | 'comandos' | null
  const [menu, setMenu] = useState(null);          // menu do botão direito
  const [dialogo, setDialogo] = useState(null);    // caixa de digitar/confirmar

  // Os grupos são as colunas da divisão de tela. Cada um tem suas próprias abas.
  const [grupos, setGrupos] = useState([{ id: 'g1', abas: [], ativa: null }]);
  const [grupoAtivo, setGrupoAtivo] = useState('g1');

  /* ======================================================================
     ABERTURA DO COFRE
  ====================================================================== */
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    vault.init(activeProfile).then(() => { if (vivo) setCarregando(false); });

    // Rede de segurança: se fechar a aba do navegador, grava o que estava pendente
    const aoFechar = () => vault.flush();
    window.addEventListener('beforeunload', aoFechar);
    return () => {
      vivo = false;
      window.removeEventListener('beforeunload', aoFechar);
      vault.flush();
    };
  }, [activeProfile]);

  /* ======================================================================
     MANIPULAÇÃO DE ABAS
  ====================================================================== */

  const grupo = grupos.find(g => g.id === grupoAtivo) || grupos[0];
  const abaAtiva = grupo?.abas.find(a => a.id === grupo.ativa) || null;
  const notaAtiva = abaAtiva?.tipo === 'nota' ? abaAtiva.path : null;

  const abrirAba = useCallback((nova, { novaAba = false } = {}) => {
    setGrupos(anteriores => anteriores.map(g => {
      if (g.id !== grupoAtivo) return g;

      // Já está aberta neste grupo? Só foca nela.
      const existente = g.abas.find(a =>
        a.tipo === nova.tipo && a.path === nova.path && a.modulo === nova.modulo);
      if (existente && !novaAba) return { ...g, ativa: existente.id };

      const aba = { ...nova, id: novoId() };
      return { ...g, abas: [...g.abas, aba], ativa: aba.id };
    }));
  }, [grupoAtivo]);

  const abrirNota = useCallback((path, opcoes = {}) => {
    if (!metadataCache.getFile(path)) return;
    abrirAba({ tipo: 'nota', path, titulo: basename(path) }, { novaAba: opcoes.newTab });
  }, [abrirAba]);

  const fecharAba = useCallback((idGrupo, idAba) => {
    setGrupos(anteriores => {
      const atualizados = anteriores.map(g => {
        if (g.id !== idGrupo) return g;
        const restantes = g.abas.filter(a => a.id !== idAba);
        const ativa = g.ativa === idAba ? (restantes[restantes.length - 1]?.id ?? null) : g.ativa;
        return { ...g, abas: restantes, ativa };
      });
      // Um grupo dividido que ficou vazio é fechado (mas nunca o último)
      const sobrando = atualizados.filter(g => g.abas.length > 0);
      if (sobrando.length === 0) return [{ id: 'g1', abas: [], ativa: null }];
      if (sobrando.length !== atualizados.length) {
        setGrupoAtivo(sobrando[0].id);
        return sobrando;
      }
      return atualizados;
    });
  }, []);

  const dividirTela = useCallback(() => {
    setGrupos(anteriores => {
      if (anteriores.length >= 3) return anteriores; // três colunas já é o limite útil
      const id = `g${novoId()}`;
      const atual = anteriores.find(g => g.id === grupoAtivo);
      const clone = atual?.abas.find(a => a.id === atual.ativa);
      const abas = clone ? [{ ...clone, id: novoId() }] : [];
      setGrupoAtivo(id);
      return [...anteriores, { id, abas, ativa: abas[0]?.id ?? null }];
    });
  }, [grupoAtivo]);

  /* ======================================================================
     AÇÕES SOBRE NOTAS
  ====================================================================== */

  const criarNota = useCallback((nomeSugerido = '', pasta = '') => {
    setDialogo({
      titulo: 'Nova nota',
      descricao: 'Use "/" para colocar dentro de uma pasta. Ex.: Faculdade/Cálculo I',
      valorInicial: nomeSugerido || (pasta ? `${pasta}/Sem título` : 'Sem título'),
      rotuloConfirmar: 'Criar',
      onConfirmar: async (nome) => {
        setDialogo(null);
        const caminho = await vault.create(nome, `# ${basename(nome)}\n\n`);
        abrirNota(caminho);
      },
    });
  }, [abrirNota]);

  const renomear = useCallback((path) => {
    setDialogo({
      titulo: 'Renomear nota',
      descricao: 'Todos os [[links]] que apontam para ela serão corrigidos automaticamente.',
      valorInicial: path,
      rotuloConfirmar: 'Renomear',
      onConfirmar: async (novo) => {
        setDialogo(null);
        const novoCaminho = await vault.rename(path, novo);
        // As abas que mostravam a nota antiga precisam apontar para o novo caminho
        setGrupos(gs => gs.map(g => ({
          ...g,
          abas: g.abas.map(a => a.path === path
            ? { ...a, path: novoCaminho, titulo: basename(novoCaminho) }
            : a),
        })));
      },
    });
  }, []);

  const apagar = useCallback((path) => {
    const citacoes = metadataCache.getBacklinks(path).length;
    setDialogo({
      titulo: `Apagar "${basename(path)}"?`,
      descricao: citacoes > 0
        ? `Atenção: ${citacoes} nota${citacoes > 1 ? 's citam' : ' cita'} esta aqui. ${citacoes > 1 ? 'Esses links ficarão' : 'Esse link ficará'} quebrado. Não dá para desfazer.`
        : 'Esta nota será removida deste aparelho e da nuvem. Não dá para desfazer.',
      somenteConfirmar: true,
      perigo: true,
      rotuloConfirmar: 'Apagar',
      onConfirmar: async () => {
        setDialogo(null);
        await vault.delete(path);
        setGrupos(gs => gs.map(g => {
          const restantes = g.abas.filter(a => a.path !== path);
          return { ...g, abas: restantes, ativa: restantes.some(a => a.id === g.ativa) ? g.ativa : (restantes[0]?.id ?? null) };
        }));
      },
    });
  }, []);

  /*
    seguirLink: clicar num [[link]].
    Se a nota existir, abre. Se NÃO existir, cria na hora e já abre — é o gesto
    que faz o cofre crescer naturalmente enquanto você escreve.
  */
  const seguirLink = useCallback(async (alvo, opcoes = {}) => {
    const existente = metadataCache.resolve(alvo);

    // O link pode apontar para um BARALHO ou um GRUPO, não só para uma nota
    if (existente && metadataCache.isExternal(existente)) {
      abrirExterno(metadataCache.getExternal(existente));
      return;
    }
    if (existente) { abrirNota(existente, opcoes); return; }

    const caminho = await vault.create(alvo, `# ${alvo}\n\n`);
    abrirNota(caminho);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abrirNota]);

  /*
    abrirExterno: clicar num baralho abre os Flashcards JÁ naquele baralho;
    clicar num grupo abre os Flashcards filtrados por aquele grupo.
    É o que fecha o ciclo: do mapa direto para o estudo, sem procurar nada.
  */
  const abrirExterno = useCallback((ext) => {
    if (!ext) return;
    const mod = modulos.find(m => m.key === 'flashcards');
    if (!mod) return;
    abrirAba({
      tipo: 'modulo',
      modulo: 'flashcards',
      titulo: ext.kind === 'baralho' ? ext.label : `Flashcards · ${ext.label}`,
      baralhoId: ext.kind === 'baralho' ? ext.ref : null,
      grupo: ext.kind === 'grupo' ? ext.ref : null,
    }, { novaAba: true });
  }, [abrirAba, modulos]);

  /*
    abrirAlvo: recebe um identificador que pode ser o caminho de uma nota OU o id
    de um baralho/grupo, e abre a coisa certa. Existe para as listas do painel de
    conexões, onde os dois tipos aparecem misturados.
  */
  const abrirAlvo = useCallback((id, opcoes = {}) => {
    if (metadataCache.isExternal(id)) { abrirExterno(metadataCache.getExternal(id)); return; }
    abrirNota(id, opcoes);
  }, [abrirExterno, abrirNota]);

  /*
    abrirNoDoGrafo: traduz o clique numa bolinha do grafo para a ação certa.
    Uma bolinha pode ser um grupo, um baralho, uma nota, ou algo que você citou
    mas ainda não escreveu (e nesse caso a gente cria na hora).
  */
  const abrirNoDoGrafo = useCallback((no) => {
    if (!no) return;
    if (metadataCache.isExternal(no.id)) { abrirExterno(metadataCache.getExternal(no.id)); return; }
    if (no.real) { abrirNota(no.id); return; }
    seguirLink(no.label); // fantasma: cria a nota que faltava
  }, [abrirExterno, abrirNota, seguirLink]);

  /* ======================================================================
     COMANDOS (o que aparece no Ctrl+P)
  ====================================================================== */
  const comandos = useMemo(() => [
    { id: 'nova', titulo: 'Nova nota', icone: Plus, atalho: 'Ctrl+N', acao: () => criarNota() },
    { id: 'grafo', titulo: 'Abrir o Grafo do conhecimento', icone: Network, atalho: 'Ctrl+G', acao: () => abrirAba({ tipo: 'grafo', titulo: 'Grafo' }) },
    { id: 'busca', titulo: 'Buscar em todas as notas', icone: SearchIcon, atalho: 'Ctrl+Shift+F', acao: () => setPainelEsquerdo('busca') },
    { id: 'arquivos', titulo: 'Mostrar os arquivos', icone: Files, acao: () => setPainelEsquerdo('arquivos') },
    { id: 'dividir', titulo: 'Dividir a tela', icone: Columns2, acao: dividirTela },
    { id: 'conexoes', titulo: 'Mostrar/esconder as conexões', icone: PanelRight, acao: () => setPainelDireito(v => !v) },
    { id: 'compartilhada', titulo: 'Nova nota compartilhada (Bruno + Bruna)', icone: Plus, acao: () => criarNota(`${SHARED_FOLDER}/Sem título`) },
    { id: 'sincronizar', titulo: 'Sincronizar com a nuvem agora', icone: RefreshCw, acao: () => vault.syncWithCloud() },
    { id: 'perfil', titulo: 'Trocar de perfil', icone: LayoutGrid, acao: () => { vault.flush(); onTrocarPerfil?.(); } },
    ...modulos.map(m => ({
      id: `mod-${m.key}`,
      titulo: `Abrir ${m.titulo}`,
      icone: m.icone,
      detalhe: 'módulo',
      acao: () => abrirAba({ tipo: 'modulo', modulo: m.key, titulo: m.titulo }),
    })),
  ], [criarNota, abrirAba, dividirTela, modulos, onTrocarPerfil]);

  /* ======================================================================
     ATALHOS DE TECLADO
  ====================================================================== */
  useHotkeys(useMemo(() => ({
    'mod+o': () => setPaleta('notas'),
    'mod+p': () => setPaleta('comandos'),
    'mod+n': () => criarNota(),
    'mod+g': () => abrirAba({ tipo: 'grafo', titulo: 'Grafo' }),
    'mod+shift+f': () => setPainelEsquerdo('busca'),
    'mod+b': () => setPainelEsquerdo(p => (p ? null : 'arquivos')),
    'mod+\\': dividirTela,
    'mod+w': () => { if (abaAtiva) fecharAba(grupo.id, abaAtiva.id); },
    'escape': () => { setPaleta(null); setMenu(null); },
  }), [criarNota, abrirAba, dividirTela, abaAtiva, grupo, fecharAba]));

  /* ======================================================================
     MENU DO BOTÃO DIREITO
  ====================================================================== */
  const abrirMenuContexto = useCallback((evento, alvo) => {
    evento.preventDefault();
    const itens = alvo.type === 'nota'
      ? [
        { titulo: 'Abrir em nova aba', icone: FileText, acao: () => abrirNota(alvo.path, { newTab: true }) },
        { titulo: 'Abrir ao lado', icone: Columns2, acao: () => { dividirTela(); setTimeout(() => abrirNota(alvo.path), 0); } },
        { separador: true },
        { titulo: 'Renomear', icone: Pencil, acao: () => renomear(alvo.path) },
        { titulo: 'Duplicar', icone: Copy, acao: async () => {
          const novo = await vault.create(alvo.path.replace(/\.md$/i, ' (cópia).md'), metadataCache.getContent(alvo.path));
          abrirNota(novo);
        } },
        { separador: true },
        { titulo: 'Apagar', icone: Trash2, perigo: true, acao: () => apagar(alvo.path) },
      ]
      : [
        { titulo: 'Nova nota nesta pasta', icone: Plus, acao: () => criarNota('', alvo.path) },
      ];
    setMenu({ x: evento.clientX, y: evento.clientY, itens });
  }, [abrirNota, dividirTela, renomear, apagar, criarNota]);

  /* ======================================================================
     RENDERIZAÇÃO
  ====================================================================== */

  const conteudoDaAba = (aba) => {
    if (!aba) {
      return (
        <div className="cofre-tela-vazia">
          <Network size={40} />
          <h2>Seu cofre</h2>
          <p>
            <kbd>Ctrl</kbd>+<kbd>O</kbd> abre uma nota &nbsp;·&nbsp;
            <kbd>Ctrl</kbd>+<kbd>P</kbd> lista tudo que dá para fazer
          </p>
          <button className="cofre-botao-primario" onClick={() => criarNota()}>
            <Plus size={15} /> Escrever a primeira nota
          </button>
        </div>
      );
    }

    if (aba.tipo === 'grafo') return <GraphView activePath={notaAtiva} onAbrirNo={abrirNoDoGrafo} />;

    if (aba.tipo === 'modulo') {
      /*
        Os módulos recebem uma "chave de acesso" à casca: com ela, o Cérebro
        Digital consegue abrir Finanças numa aba, e qualquer módulo consegue
        abrir uma nota do cofre. Sem isso, os módulos ficariam presos dentro da
        própria aba, sem conversar com o resto — que é justamente o problema que
        essa reforma veio resolver.
      */
      const api = {
        abrirModulo: (chave) => {
          const m = modulos.find(x => x.key === chave);
          if (m) abrirAba({ tipo: 'modulo', modulo: m.key, titulo: m.titulo });
        },
        abrirNota: seguirLink,
        abrirGrafo: () => abrirAba({ tipo: 'grafo', titulo: 'Grafo' }),
        // O que a aba pediu ao ser aberta pelo grafo (um baralho ou um grupo)
        baralhoId: aba.baralhoId || null,
        grupo: aba.grupo || null,
      };
      return <div className="cofre-modulo">{renderModulo?.(aba.modulo, api)}</div>;
    }

    const arquivo = metadataCache.getFile(aba.path);
    if (!arquivo) return <div className="cofre-tela-vazia"><p>Esta nota não existe mais.</p></div>;

    return (
      <NoteEditor
        key={aba.id}
        path={aba.path}
        initialContent={metadataCache.getContent(aba.path)}
        onChange={(caminho, texto) => vault.modify(caminho, texto)}
        onOpenLink={seguirLink}
        onOpenTag={() => setPainelEsquerdo('busca')}
      />
    );
  };

  if (carregando) {
    return <div className="cofre-carregando"><RefreshCw size={22} className="girando" /> Abrindo o cofre...</div>;
  }

  return (
    <div className="cofre-app">
      {/* ------- TRILHO DE ÍCONES (extrema esquerda) ------- */}
      <nav className="cofre-trilho">
        <button className={painelEsquerdo === 'arquivos' ? 'ativo' : ''} onClick={() => setPainelEsquerdo(p => p === 'arquivos' ? null : 'arquivos')} title="Arquivos (Ctrl+B)"><Files size={19} /></button>
        <button className={painelEsquerdo === 'busca' ? 'ativo' : ''} onClick={() => setPainelEsquerdo(p => p === 'busca' ? null : 'busca')} title="Buscar (Ctrl+Shift+F)"><SearchIcon size={19} /></button>
        <button onClick={() => abrirAba({ tipo: 'grafo', titulo: 'Grafo' })} title="Grafo (Ctrl+G)"><Network size={19} /></button>
        <button className={painelEsquerdo === 'modulos' ? 'ativo' : ''} onClick={() => setPainelEsquerdo(p => p === 'modulos' ? null : 'modulos')} title="Módulos"><LayoutGrid size={19} /></button>

        <div className="cofre-trilho-fim">
          <span className="cofre-nuvem" title={isCloudAvailable() ? 'Conectado à nuvem' : 'Offline — tudo continua salvo aqui'}>
            {sincronizando ? <RefreshCw size={16} className="girando" /> : isCloudAvailable() ? <Cloud size={16} /> : <CloudOff size={16} />}
          </span>
          <button className="cofre-avatar" onClick={() => { vault.flush(); onTrocarPerfil?.(); }} title={`${activeProfile} — trocar de perfil`}>
            {(activeProfile || '?').split(' ').map(p => p[0]).slice(0, 2).join('')}
          </button>
        </div>
      </nav>

      {/* ------- PAINEL LATERAL ESQUERDO ------- */}
      {painelEsquerdo && (
        <aside className="cofre-lateral">
          {painelEsquerdo === 'arquivos' && (
            <Explorer
              activePath={notaAtiva}
              onOpen={abrirNota}
              onCreateNote={(pasta) => criarNota('', pasta)}
              onCreateFolder={() => criarNota('Nova pasta/Sem título')}
              onContextMenu={abrirMenuContexto}
            />
          )}
          {painelEsquerdo === 'busca' && <SearchPanel onOpen={abrirNota} />}
          {painelEsquerdo === 'modulos' && (
            <div className="cofre-painel">
              <div className="cofre-painel-topo"><span className="cofre-painel-titulo">Módulos</span></div>
              <div className="cofre-painel-corpo">
                {modulos.map(m => (
                  <button
                    key={m.key}
                    className="cofre-modulo-botao"
                    onClick={() => abrirAba({ tipo: 'modulo', modulo: m.key, titulo: m.titulo })}
                  >
                    <span className="cofre-modulo-icone" style={{ background: m.cor }}><m.icone size={15} /></span>
                    <span>
                      <strong>{m.titulo}</strong>
                      <small>{m.descricao}</small>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>
      )}

      {/* ------- ÁREA CENTRAL: um bloco por grupo (divisão de tela) ------- */}
      <main className="cofre-centro">
        {grupos.map(g => {
          const ativa = g.abas.find(a => a.id === g.ativa) || null;
          return (
            <section
              key={g.id}
              className={`cofre-grupo${g.id === grupoAtivo ? ' focado' : ''}`}
              onMouseDown={() => setGrupoAtivo(g.id)}
            >
              <div className="cofre-abas">
                <div className="cofre-abas-lista">
                  {g.abas.map(aba => (
                    <div
                      key={aba.id}
                      className={`cofre-aba${aba.id === g.ativa ? ' ativa' : ''}`}
                      onMouseDown={() => setGrupos(gs => gs.map(x => x.id === g.id ? { ...x, ativa: aba.id } : x))}
                      onAuxClick={(e) => { if (e.button === 1) fecharAba(g.id, aba.id); }}
                      title={aba.path || aba.titulo}
                    >
                      {aba.tipo === 'grafo' ? <Network size={12} /> : aba.tipo === 'modulo' ? <LayoutGrid size={12} /> : <FileText size={12} />}
                      <span>{aba.titulo}</span>
                      <button className="cofre-aba-fechar" onClick={(e) => { e.stopPropagation(); fecharAba(g.id, aba.id); }}>
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="cofre-abas-acoes">
                  <button onClick={() => criarNota()} title="Nova nota (Ctrl+N)"><Plus size={15} /></button>
                  <button onClick={dividirTela} title="Dividir a tela (Ctrl+\)"><Columns2 size={15} /></button>
                  {g.id === grupoAtivo && (
                    <button onClick={() => setPainelDireito(v => !v)} title="Conexões" className={painelDireito ? 'ativo' : ''}>
                      <PanelRight size={15} />
                    </button>
                  )}
                </div>
              </div>

              <div className="cofre-conteudo">{conteudoDaAba(ativa)}</div>
            </section>
          );
        })}
      </main>

      {/* ------- PAINEL DIREITO: conexões da nota aberta ------- */}
      {painelDireito && (
        <aside className="cofre-lateral cofre-lateral-direita">
          <BacklinksPanel
            path={notaAtiva}
            onOpen={abrirAlvo}
            onCreateNote={(nome) => seguirLink(nome)}
          />
        </aside>
      )}

      {/* ------- CAMADAS FLUTUANTES ------- */}
      {paleta && (
        <Palette
          modo={paleta}
          comandos={comandos}
          onFechar={() => setPaleta(null)}
          onAbrirNota={abrirNota}
          onCriarNota={async (nome) => { const p = await vault.create(nome, `# ${nome}\n\n`); abrirNota(p); }}
        />
      )}
      {menu && <ContextMenu {...menu} onFechar={() => setMenu(null)} />}
      {dialogo && <PromptModal {...dialogo} onCancelar={() => setDialogo(null)} />}
    </div>
  );
}

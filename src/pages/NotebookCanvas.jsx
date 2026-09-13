/*
  =============================================================================
  ARQUIVO: src/pages/NotebookCanvas.jsx
  PARA QUE SERVE: É o "Caderno" infinito de cada baralho. Usa o Excalidraw 
  (biblioteca 100% gratuita e open-source de canvas infinito) para você:
    • Escrever à CANETA livremente (com pressão no tablet/stylus).
    • Marcar com MARCA-TEXTO (ferramenta de destaque).
    • Colar PRINTS (Ctrl+V) e inserir FOTOS do celular (câmera/galeria).
    • Escrever TEXTOS, criar formas, setas, notas adesivas.
    • Zoom e rolagem INFINITOS, desfazer/refazer.
  Tudo é salvo automaticamente: na hora no navegador e, em segundo plano, na nuvem
  (dividido em pedaços), para acompanhar o baralho em qualquer aparelho.

  NOVO RECURSO: Botão "Sincronizar Nuvem" que faz o salvamento forçado das alterações
  locais e puxa as novidades da nuvem (por exemplo, do seu tablet), mesclando as
  duas de forma inteligente para que nenhum desenho novo seja apagado!
  =============================================================================
*/

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { Excalidraw } from '@excalidraw/excalidraw';
import '@excalidraw/excalidraw/index.css';
import { RefreshCw } from 'lucide-react'; // Ícone elegante de atualização
import {
  getNotebookLocal, saveNotebookLocal,
  loadNotebookFromCloud, saveNotebookToCloud,
} from '../utils/db';

/*
  FUNÇÃO AUXILIAR: mergeElements
  PARA QUE SERVE: Combina os desenhos locais com os desenhos da nuvem de forma inteligente.
  Em vez de um apagar o outro, ela analisa o ID de cada elemento desenhado e mantém
  a versão mais recente (comparando a propriedade "version" e "updatedAt").
*/
function mergeElements(localElements = [], cloudElements = []) {
  const elementMap = new Map();
  
  // Adiciona primeiro tudo o que foi feito localmente
  localElements.forEach(el => {
    if (el && el.id) elementMap.set(el.id, el);
  });
  
  // Adiciona ou substitui com os dados da nuvem se forem mais recentes
  cloudElements.forEach(cloudEl => {
    if (!cloudEl || !cloudEl.id) return;
    const localEl = elementMap.get(cloudEl.id);
    if (!localEl) {
      // Elemento novo vindo da nuvem (ex: desenhado no tablet)
      elementMap.set(cloudEl.id, cloudEl);
    } else {
      // Se o elemento existe em ambos, compara qual versão é mais nova
      const cloudVersion = cloudEl.version || 0;
      const localVersion = localEl.version || 0;
      const cloudTime = cloudEl.updatedAt || 0;
      const localTime = localEl.updatedAt || 0;
      
      if (cloudVersion > localVersion || cloudTime > localTime) {
        elementMap.set(cloudEl.id, cloudEl);
      }
    }
  });
  
  return Array.from(elementMap.values());
}

/*
  COMPONENTE: NotebookCanvas
  PARAMETROS (PROPS) QUE RECEBE:
    - deckId: O identificador do baralho (para separar os cadernos de cada baralho).
    - profile: O perfil ativo (para separar os cadernos de cada estudante na nuvem).
*/
export default function NotebookCanvas({ deckId, profile }) {
  const apiRef = useRef(null);
  const saveTimer = useRef(null);
  const loadingRef = useRef(true);
  const dirtyRef = useRef(false);

  /*
    AS DUAS TRAVAS DE SEGURANÇA CONTRA PERDA DE DESENHO.

    O caderno já apagou desenho de verdade, e foi assim: se a leitura da nuvem
    falhava e não havia cópia local, o canvas abria em BRANCO — e o branco era
    salvo por cima do que estava guardado, sem avisar nada.

    - carregouOk: só liberamos o salvamento depois que soubermos, com certeza,
      o que já existia. Enquanto não souber, o caderno não grava nada.
    - tinhaConteudo: se abrimos com desenho e agora a tela está vazia, é quase
      certo que foi acidente, não intenção. Nesse caso não gravamos e avisamos.
      Para esvaziar de propósito existe o botão "Limpar caderno".
  */
  const carregouOkRef = useRef(false);
  const tinhaConteudoRef = useRef(false);
  const [aviso, setAviso] = useState(null);
  
  const [initialData, setInitialData] = useState(undefined);
  const [ready, setReady] = useState(false);
  
  // Estados para controlar o processo do botão de Sincronizar
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState('Salvo localmente');

  /*
    EFEITO DE CARREGAMENTO INICIAL:
    Busca os dados locais e na nuvem, faz a união inteligente (merge) deles
    para garantir que você não perca nenhum desenho feito offline ou em outro dispositivo.
  */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let localData = null;
      let cloudData = null;
      let nuvemFalhou = false;

      // 1. Tenta carregar a cópia local (IndexedDB)
      const localJson = await getNotebookLocal(deckId);
      if (localJson) {
        try { localData = JSON.parse(localJson); } catch (e) { /* ignora */ }
      }

      // 2. Tenta carregar do servidor Firebase na Nuvem
      try {
        const cloudJson = await loadNotebookFromCloud(profile, deckId);
        if (cloudJson) {
          try { cloudData = JSON.parse(cloudJson); } catch (e) { /* ignora */ }
        }
      } catch (e) {
        // ATENÇÃO: antes esse erro era ignorado, e era daí que vinha a perda de
        // desenho. Agora ele é registrado e BLOQUEIA o salvamento.
        nuvemFalhou = true;
        console.error('[Caderno] Falha ao ler da nuvem:', e.message);
      }

      if (!cancelled) {
        let merged = null;

        // Se temos dados nos dois lugares, fazemos a mesclagem inteligente
        if (localData && cloudData) {
          const mergedElements = mergeElements(localData.elements, cloudData.elements);
          const mergedFiles = { ...(localData.files || {}), ...(cloudData.files || {}) };
          merged = {
            elements: mergedElements,
            appState: cloudData.appState || localData.appState || {},
            files: mergedFiles,
          };
          
          // Salva essa união de dados localmente para ficar atualizado
          await saveNotebookLocal(deckId, JSON.stringify(merged));
        } else {
          // Se só tem em um dos lugares, usa o que estiver disponível
          merged = cloudData || localData || null;
        }

        if (merged) {
          setInitialData({
            elements: merged.elements || [],
            appState: merged.appState || {},
            files: merged.files || {},
          });
        }

        /*
          A DECISÃO QUE EVITA A PERDA:
          Só liberamos o salvamento se soubermos o que já existia. Se a nuvem
          falhou E não havia cópia local, nós NÃO sabemos — então o caderno abre
          somente para leitura, com um aviso, em vez de abrir em branco e apagar
          o que estava guardado.
        */
        const semNoticia = nuvemFalhou && !localData;
        carregouOkRef.current = !semNoticia;
        tinhaConteudoRef.current = (merged?.elements || []).length > 0;

        if (semNoticia) {
          setAviso('Não consegui carregar seu caderno (sem internet ou a nuvem não respondeu). Para não apagar o que já está salvo, o salvamento está PAUSADO. Recarregue quando voltar a conexão.');
        } else if (nuvemFalhou) {
          setAviso('Sem conexão com a nuvem — estou usando a cópia deste aparelho. O que você desenhar agora sobe assim que a internet voltar.');
        }

        setReady(true);
        setTimeout(() => { loadingRef.current = false; }, 1500);
      }
    })();

    return () => { cancelled = true; };
  }, [deckId, profile]);

  /*
    FUNÇÃO INTERNA: persist
    PARA QUE SERVE: Salva o estado atual do Excalidraw no LocalStorage e envia
    para o Firebase em segundo plano de forma silenciosa.
  */
  const persist = useCallback(async () => {
    const api = apiRef.current;
    if (!api) return;

    // TRAVA 1: não sabemos o que já existia — não gravamos nada.
    if (!carregouOkRef.current) {
      setSyncStatus('Salvamento pausado (o caderno não pôde ser carregado)');
      return;
    }

    try {
      const elements = api.getSceneElements();

      // TRAVA 2: abriu com desenho e agora está vazio? Isso é acidente.
      if (elements.length === 0 && tinhaConteudoRef.current) {
        setSyncStatus('Não salvei: a tela está vazia e havia desenho guardado');
        setAviso('Percebi que a tela ficou vazia mas existe desenho salvo. Não gravei por cima. Recarregue a página para trazer seu caderno de volta — ou use "Limpar caderno" se quiser mesmo apagar.');
        return;
      }

      const appState = api.getAppState();
      const files = api.getFiles();

      const saveData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        files,
      };

      const json = JSON.stringify(saveData);

      // A cópia local vem PRIMEIRO e é a que importa: ela é o seguro contra a
      // internet cair. Se ela falhar, o usuário precisa saber na hora.
      const okLocal = await saveNotebookLocal(deckId, json);
      if (!okLocal) {
        setSyncStatus('⚠️ Falha ao salvar neste aparelho');
        setAviso('Não consegui gravar o caderno neste aparelho. Não feche a página: tire um print do seu desenho antes de sair.');
        return;
      }

      if (elements.length > 0) tinhaConteudoRef.current = true;
      dirtyRef.current = false;

      const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setSyncStatus(`Salvo neste aparelho às ${hora}`);
      setAviso(null);

      // A nuvem vem depois e não bloqueia. Mas o erro NÃO é mais engolido.
      saveNotebookToCloud(profile, deckId, json)
        .then(ok => setSyncStatus(ok ? `Salvo e sincronizado às ${hora}` : `Salvo neste aparelho às ${hora} (nuvem pendente)`))
        .catch(err => {
          console.error('[Caderno] Falha ao enviar para a nuvem:', err.message);
          setSyncStatus(`Salvo neste aparelho às ${hora} (nuvem pendente)`);
        });
    } catch (e) {
      console.error('[Caderno] Falha ao salvar:', e.message);
      setSyncStatus('⚠️ Erro ao salvar — veja o console');
    }
  }, [deckId, profile]);

  /*
    FUNÇÃO INTERNA: handleManualSync
    PARA QUE SERVE: É disparada quando você clica no botão "Sincronizar Nuvem".
    1. Salva imediatamente o que você desenhou agora.
    2. Busca o que está na nuvem (que pode ter vindo do tablet).
    3. Junta as duas telas desenhadas sem apagar nada!
    4. Atualiza a tela sem recarregar a página.
  */
  const handleManualSync = async () => {
    if (isSyncing || !apiRef.current) return;
    setIsSyncing(true);
    setSyncStatus('Sincronizando...');

    try {
      const api = apiRef.current;
      const elements = api.getSceneElements();
      const appState = api.getAppState();
      const files = api.getFiles();

      // Primeiro, salva o estado atual na nuvem
      const localData = {
        elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          currentItemFontFamily: appState.currentItemFontFamily,
          zoom: appState.zoom,
          scrollX: appState.scrollX,
          scrollY: appState.scrollY,
        },
        files,
      };
      const localJson = JSON.stringify(localData);
      await saveNotebookLocal(deckId, localJson);
      await saveNotebookToCloud(profile, deckId, localJson);

      // Depois, baixa as novidades da nuvem (que podem ter vindo de outro tablet/computador)
      const cloudJson = await loadNotebookFromCloud(profile, deckId);
      if (cloudJson) {
        const cloudData = JSON.parse(cloudJson);
        
        // Combina o que está desenhado na tela com o que veio da nuvem
        const mergedElements = mergeElements(elements, cloudData.elements || []);
        const mergedFiles = { ...(files || {}), ...(cloudData.files || {}) };

        // 1. Primeiro adicionamos os arquivos das imagens ao registro interno do Excalidraw
        if (Object.keys(mergedFiles).length > 0) {
          api.addFiles(Object.values(mergedFiles));
        }

        // 2. Aguardamos um breve instante (150ms) para o Excalidraw processar as imagens
        // antes de forçar o desenho delas na tela. Sem esse delay, o canvas tenta
        // desenhar a imagem antes dela ser indexada na memória, resultando em tela/caixa vazia.
        await new Promise((resolve) => {
          setTimeout(async () => {
            // 3. Atualiza a tela de desenho com a união dos elementos novos
            api.updateScene({
              elements: mergedElements,
              appState: {
                ...api.getAppState(),
                ...(cloudData.appState || {}),
              }
            });
            resolve();
          }, 150);
        });

        // Salva a versão combinada localmente
        const finalJson = JSON.stringify({
          elements: mergedElements,
          appState: cloudData.appState || appState,
          files: mergedFiles
        });
        await saveNotebookLocal(deckId, finalJson);
        await saveNotebookToCloud(profile, deckId, finalJson).catch(() => {});
      }

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSyncStatus(`Sincronizado com sucesso às ${now}!`);
    } catch (e) {
      console.error(e);
      setSyncStatus('Erro ao sincronizar. Verifique a internet.');
    } finally {
      setIsSyncing(false);
      dirtyRef.current = false;
    }
  };

  /*
    CALLBACK: handleChange
    PARA QUE SERVE: Escuta qualquer traço de lápis ou mudança na tela do caderno
    para marcar como pendente de salvamento ("dirty").
  */
  /*
    FUNÇÃO INTERNA: limparCaderno
    PARA QUE SERVE: A trava de segurança impede gravar uma tela vazia por cima do
    seu desenho. Este botão é a saída oficial para quando esvaziar é MESMO o que
    você quer — com confirmação, porque não dá para desfazer.
  */
  const limparCaderno = async () => {
    const api = apiRef.current;
    if (!api) return;
    const qtd = api.getSceneElements().length;
    const texto = qtd > 0
      ? `Apagar os ${qtd} elementos deste caderno? Isso não pode ser desfeito.`
      : 'O caderno já está vazio. Deseja gravar assim mesmo?';
    if (!window.confirm(texto)) return;

    api.updateScene({ elements: [] });
    tinhaConteudoRef.current = false; // libera a trava, foi decisão sua
    carregouOkRef.current = true;
    setAviso(null);
    await persist();
  };

  const handleChange = useCallback(() => {
    if (loadingRef.current) return;
    dirtyRef.current = true;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(persist, 2500);
  }, [persist]);

  useEffect(() => {
    return () => {
      clearTimeout(saveTimer.current);
      if (dirtyRef.current) persist();
    };
  }, [persist]);

  if (!ready) {
    return (
      <div style={styles.canvasWrap}>
        <div style={styles.loadingIndicator}>Abrindo o caderno…</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Barra de Ações com o botão Sincronizar */}
      <div style={styles.syncBar}>
        <span style={styles.syncStatus}>{syncStatus}</span>
        <button
          onClick={limparCaderno}
          style={{ ...styles.syncBtn, background: 'transparent', color: '#c96', border: '1px solid rgba(204,153,102,.4)' }}
          title="Apagar TUDO deste caderno de propósito"
        >
          Limpar caderno
        </button>
        <button
          onClick={handleManualSync}
          disabled={isSyncing}
          style={isSyncing ? { ...styles.syncBtn, ...styles.syncBtnDisabled } : styles.syncBtn}
        >
          <RefreshCw size={14} className={isSyncing ? 'bueno-spin' : ''} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar Nuvem'}
        </button>
      </div>

      {/*
        AVISO VISÍVEL. Antes, quando algo dava errado o app não dizia nada e o
        desenho sumia calado. Agora o problema aparece na tela, em português.
      */}
      {aviso && (
        <div style={styles.aviso}>
          <span>{aviso}</span>
          <button onClick={() => setAviso(null)} style={styles.avisoFechar}>✕</button>
        </div>
      )}

      <div style={styles.canvasWrap}>
        <Excalidraw
          initialData={initialData}
          excalidrawAPI={(api) => { apiRef.current = api; }}
          onChange={handleChange}
          theme="light"
          langCode="pt-BR"
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
            },
          }}
        />
      </div>
    </div>
  );
}

/* Estilos visuais locais para a barra de sincronização e o caderno */
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    width: '100%',
  },
  syncBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#15171A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '10px',
    padding: '8px 16px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  syncStatus: {
    fontSize: '12px',
    color: '#99A1AC',
    fontWeight: '500',
  },
  syncBtn: {
    background: 'var(--primary-gradient)',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    boxShadow: '0 4px 10px rgba(232, 147, 63, 0.2)',
    transition: 'all 0.2s ease',
  },
  syncBtnDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  canvasWrap: {
    position: 'relative',
    width: '100%',
    height: '80vh',
    minHeight: '520px',
    borderRadius: '14px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 8px 30px rgba(0,0,0,0.25)',
  },
  aviso: {
    display: 'flex', alignItems: 'flex-start', gap: '10px',
    margin: '0 0 10px', padding: '11px 14px',
    background: 'rgba(232,147,63,.12)',
    border: '1px solid rgba(232,147,63,.42)',
    borderRadius: '10px',
    color: '#f0c48a', fontSize: '13px', lineHeight: 1.55,
  },
  avisoFechar: {
    marginLeft: 'auto', background: 'none', border: 'none',
    color: 'inherit', cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 2px',
  },
  loadingIndicator: {
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#99A1AC',
    fontSize: '15px',
    fontWeight: '600',
    background: 'rgba(255,255,255,0.02)',
  },
};

// Injeta uma animação de giro (spin) simples na página para o ícone de sincronização
const extraStyles = `
@keyframes buenoSpin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.bueno-spin {
  animation: buenoSpin 1s linear infinite;
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraStyles;
  document.head.appendChild(styleSheet);
}

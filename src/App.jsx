/*
  =============================================================================
  ARQUIVO: src/App.jsx
  PARA QUE SERVE: Este é o "Coração Central" ou o "Gerente Geral" do aplicativo. 
  Ele é responsável por carregar os dados salvos do navegador quando o aplicativo abre, 
  decidir qual tela deve ser exibida ao usuário (o Painel, o Editor ou os Jogos de Estudo), 
  e conectar todas as engrenagens do nosso sistema para que funcionem em perfeita harmonia.
  =============================================================================
*/

import React, { useState, useEffect } from 'react';

// 1. IMPORTANDO O BANCO DE DADOS LOCAL E NUVEM
import { 
  getSets, 
  saveSets, 
  getStats, 
  saveStats, 
  exportBackup, 
  importBackup,
  syncDecksWithCloud,
  syncStatsWithCloud
} from './utils/db';

// 2. IMPORTANDO NOSSOS COMPONENTES E PÁGINAS ESTRUTURADAS
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CreateEditSet from './pages/CreateEditSet';
import FlashcardMode from './pages/FlashcardMode';
import LearnMode from './pages/LearnMode';
import MatchMode from './pages/MatchMode';
import TestMode from './pages/TestMode';

export default function App() {
  // 3. ESTADOS GLOBAIS (Variáveis que guardam o estado do app em tempo real)
  
  // page: diz qual tela está aberta na sua frente no momento
  // Valores possíveis: 'dashboard' (painel), 'create' (criar), 'edit' (editar),
  // 'flashcard_mode' (cartões), 'learn_mode' (aprender), 'match_mode' (combinar), 'test_mode' (simulado)
  const [currentPage, setCurrentPage] = useState('dashboard');
  
  // sets: guarda a lista completa de todos os seus conjuntos de flashcards
  const [sets, setSets] = useState([]);
  
  // stats: guarda suas estatísticas gerais (total de sessões concluídas e recorde de tempo)
  const [stats, setStats] = useState({ setsStudied: 0, cardsMastered: 0, bestMatchTime: null });
  
  // selectedSet: guarda qual conjunto você escolheu no painel para estudar no momento
  const [selectedSet, setSelectedSet] = useState(null);

  // 4. EFEITO DE INICIALIZAÇÃO (Roda uma única vez quando o aplicativo abre)
  // Ele vai nas gavetas do LocalStorage buscar seus dados salvos para exibir na tela!
  useEffect(() => {
    const loadedSets = getSets();
    const loadedStats = getStats();
    setSets(loadedSets);
    setStats(loadedStats);
  }, []);

  // 5. EFETUA SINCRONIZAÇÃO EM NUVEM (Supabase) EM SEGUNDO PLANO:
  // Se você tiver configurado as chaves do Supabase, o app irá puxar seus baralhos 
  // atualizados de outros aparelhos automaticamente de forma invisível.
  useEffect(() => {
    async function performCloudSync() {
      // Sincroniza baralhos
      const syncedDecks = await syncDecksWithCloud();
      if (syncedDecks) {
        setSets(syncedDecks);
      }
      // Sincroniza recordes e estatísticas
      const syncedStats = await syncStatsWithCloud();
      if (syncedStats) {
        setStats(syncedStats);
      }
    }
    performCloudSync();
  }, []);

  /*
    FUNÇÃO GLOBAL: handleNavigate
    PARA QUE SERVE: Troca a tela visível do aplicativo (ex: sai do painel e abre o jogo Combinar).
    Além disso, ela garante que o scroll da tela volte para o topo automaticamente.
  */
  const handleNavigate = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /*
    FUNÇÃO GLOBAL: handleSaveSet
    PARA QUE SERVE: Disparada pelo Editor quando você salva um baralho.
    Se for um baralho novo, ela o adiciona na lista. Se for um antigo editado, 
    ela substitui as informações antigas pelas novas, e então grava tudo no navegador.
  */
  const handleSaveSet = (updatedSet) => {
    let newSetsList = [];
    const exists = sets.some(s => s.id === updatedSet.id);

    if (exists) {
      // Caso 1: Editando um baralho que já existia (atualiza o item na lista)
      newSetsList = sets.map(s => s.id === updatedSet.id ? updatedSet : s);
    } else {
      // Caso 2: Baralho novo (adiciona no final da lista)
      newSetsList = [...sets, updatedSet];
    }

    // Salva na memória do navegador e atualiza a tela
    saveSets(newSetsList);
    setSets(newSetsList);
  };

  /*
    FUNÇÃO GLOBAL: handleDeleteSet
    PARA QUE SERVE: Exclui permanentemente um baralho de estudos da memória local 
    ao confirmar a remoção na lista do painel.
  */
  const handleDeleteSet = (setId) => {
    const updated = sets.filter(s => s.id !== setId);
    saveSets(updated);
    setSets(updated);
  };

  /*
    FUNÇÃO GLOBAL: handleCompleteSession
    PARA QUE SERVE: Sempre que você termina uma rodada de flashcards, um teste do modo Aprender 
    ou envia o Simulado final, o app comemora somando +1 nas suas estatísticas gerais!
  */
  const handleCompleteSession = () => {
    const newStats = {
      ...stats,
      setsStudied: stats.setsStudied + 1
    };
    saveStats(newStats);
    setStats(newStats);
  };

  /*
    FUNÇÃO GLOBAL: handleSaveRecord
    PARA QUE SERVE: Dispara ao vencer o jogo Combinar. Se o seu tempo for menor do que 
    o recorde que você já tinha, o app grava essa nova conquista e atualiza a tela inicial!
  */
  const handleSaveRecord = (newTime) => {
    const newStats = {
      ...stats,
      bestMatchTime: newTime
    };
    saveStats(newStats);
    setStats(newStats);
  };

  /*
    FUNÇÃO GLOBAL: handleExportBackup
    PARA QUE SERVE: Aciona a rotina para compilar todos os baralhos criados em um 
    arquivo .json e inicia o download no seu aparelho de forma segura.
  */
  const handleExportBackup = () => {
    exportBackup();
  };

  /*
    FUNÇÃO GLOBAL: handleImportBackup
    PARA QUE SERVE: Recebe as informações lidas de um arquivo de backup carregado 
    pelo usuário, valida os dados, os injeta na memória e recarrega a tela para 
    exibir os novos baralhos imediatamente.
  */
  const handleImportBackup = (jsonText) => {
    const result = importBackup(jsonText);
    if (result.success) {
      // Se deu certo, atualiza os estados locais para refletirem as listas importadas
      setSets(getSets());
      setStats(getStats());
      alert(result.message);
    } else {
      alert(result.message);
    }
  };

  // 5. ROTEAMENTO DINÂMICO E RENDERIZAÇÃO DAS TELAS:
  // Dependendo do valor de "currentPage", guardamos na variável "pageContent" a tela correspondente.
  let pageContent = null;

  switch (currentPage) {
    case 'dashboard':
      pageContent = (
        <Dashboard 
          sets={sets} 
          stats={stats} 
          onNavigate={handleNavigate}
          onSelectSet={setSelectedSet}
          onDeleteSet={handleDeleteSet}
        />
      );
      break;

    case 'create':
      pageContent = (
        <CreateEditSet 
          setEditData={null}
          onSaveSet={handleSaveSet}
          onNavigate={handleNavigate}
        />
      );
      break;

    case 'edit':
      pageContent = (
        <CreateEditSet 
          setEditData={selectedSet}
          onSaveSet={handleSaveSet}
          onNavigate={handleNavigate}
        />
      );
      break;

    case 'flashcard_mode':
      pageContent = (
        <FlashcardMode 
          set={selectedSet}
          onNavigate={handleNavigate}
          onCompleteSession={handleCompleteSession}
        />
      );
      break;

    case 'learn_mode':
      pageContent = (
        <LearnMode 
          set={selectedSet}
          onNavigate={handleNavigate}
          onCompleteSession={handleCompleteSession}
        />
      );
      break;

    case 'match_mode':
      pageContent = (
        <MatchMode 
          set={selectedSet}
          stats={stats}
          onNavigate={handleNavigate}
          onSaveRecord={handleSaveRecord}
        />
      );
      break;

    case 'test_mode':
      pageContent = (
        <TestMode 
          set={selectedSet}
          onNavigate={handleNavigate}
          onCompleteSession={handleCompleteSession}
        />
      );
      break;

    default:
      pageContent = (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <h2>Ops! Página não encontrada.</h2>
          <button onClick={() => handleNavigate('dashboard')} className="btn-primary" style={{ marginTop: '20px' }}>
            Ir para o Painel Inicial
          </button>
        </div>
      );
  }

  return (
    <>
      {/* MENU SUPERIOR GLOBAL (Sempre visível) */}
      <Navbar 
        onNavigate={handleNavigate}
        currentPage={currentPage}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />

      {/* ÁREA DE CONTEÚDO DINÂMICA DA TELA ATIVA */}
      <main style={{ paddingBottom: '40px' }}>
        {pageContent}
      </main>
    </>
  );
}

/*
  =============================================================================
  ARQUIVO: src/App.jsx
  PARA QUE SERVE: Este é o "Coração Central" ou o "Gerente Geral" do aplicativo. 
  Ele é responsável por carregar os dados salvos do navegador quando o aplicativo abre, 
  decidir qual tela deve ser exibida ao usuário (o Painel, o Editor ou os Jogos de Estudo), 
  e conectar todas as engrenagens do nosso sistema para que funcionem em perfeita harmonia.
  =============================================================================
*/

import { useState, useEffect } from 'react';

// 1. IMPORTANDO O BANCO DE DADOS LOCAL E NUVEM
// Adicionamos as funções getProfiles e saveProfiles para carregar e salvar a lista de estudantes
import { 
  getSets, 
  saveSets, 
  getStats, 
  saveStats, 
  exportBackup, 
  importBackup,
  syncDecksWithCloud,
  syncStatsWithCloud,
  getCategories,
  saveCategories,
  syncCategoriesWithCloud,
  getProfiles,
  saveProfiles,
  getHabits,
  saveHabits,
  syncHabitsWithCloud,
  getFinance,
  saveFinance,
  syncFinanceWithCloud,
  migrateFinanceToShared,
  getDreams,
  saveDreams,
  syncDreamsWithCloud,
  getDocuments,
  saveDocuments,
  syncDocumentsWithCloud,
  getMindMap,
  saveMindMap,
  syncMindMapWithCloud,
  buildEssentialMindMap,
  getStudyMaterials,
  saveStudyMaterials,
  syncStudyMaterialsWithCloud,
  syncDiarioDeEstudoComNuvem,
  // Exclusão de verdade (com "lápide", para o baralho não ressuscitar no outro
  // aparelho), prévia da importação e o selo de status da nuvem.
  registrarExclusaoDeBaralho,
  analisarBackup,
  assinarEstadoDaNuvem
} from './utils/db';

// Importamos a conexão do Firebase para verificar o status online do banco
import { db as firestoreDb } from './utils/firebase';

// Importamos o componente de visualização de Sincronização
import SyncModal from './components/SyncModal';

// A telinha que mostra a PRÉVIA do arquivo antes de qualquer coisa ser gravada,
// e que separa "adicionar conteúdo" de "restaurar backup".
import ImportBackupModal from './components/ImportBackupModal';

// 2. IMPORTANDO NOSSOS COMPONENTES E PÁGINAS ESTRUTURADAS
// Importamos também a tela de seleção de perfis (Netflix-style)
import ProfileSelect from './pages/ProfileSelect';
// Telas da plataforma: cada uma agora abre DENTRO de uma aba do Cofre
import GeneralReport from './pages/GeneralReport';
import HabitsMode from './pages/HabitsMode';
import FinanceMode from './pages/FinanceMode';
import DreamsMode from './pages/DreamsMode';
import DocumentsMode from './pages/DocumentsMode';
import BrunoMindMap from './pages/BrunoMindMap';
import DailyWorkoutMode from './pages/DailyWorkoutMode';
import BrainInboxModal from './components/BrainInboxModal';

// 3. O COFRE (plataforma estilo Obsidian) — a nova casca de tudo
import OrganizerShell from './components/OrganizerShell.jsx';
import FlashcardsModule from './modules/FlashcardsModule';
import { sincronizarBaralhos } from './vault/core/deckBridge.js';
import './vault/vault.css';
import {
  GraduationCap, Wallet, Target, Sparkles, FolderOpen, BarChart3, Brain, Dumbbell,
} from 'lucide-react';

export default function App() {
  // 3. ESTADOS GLOBAIS (Variáveis que guardam o estado do app em tempo real)
  
  // profiles: guarda a lista de todos os estudantes cadastrados no aplicativo
  const [profiles, setProfiles] = useState(() => getProfiles());

  // activeProfile: guarda o nome do estudante ativo no momento. 
  // Ele tenta ler do navegador para não pedir para você escolher toda vez que abrir.
  const [activeProfile, setActiveProfile] = useState(() => {
    return localStorage.getItem('flashcard_active_profile') || null;
  });

  // OBSERVAÇÃO: não existe mais um "currentPage" aqui. Quem decide o que está na
  // tela agora é o sistema de ABAS do Cofre, e cada aba guarda a própria posição.
  // O App.jsx voltou a ter uma única responsabilidade: cuidar dos DADOS.

  // sets: guarda a lista completa de todos os seus conjuntos de flashcards do perfil ativo
  const [sets, setSets] = useState([]);

  // stats: guarda suas estatísticas gerais (total de sessões concluídas e recorde de tempo) do perfil ativo
  const [stats, setStats] = useState({ setsStudied: 0, cardsMastered: 0, bestMatchTime: null });

  // isSyncModalOpen: controla a abertura da tela de sincronização
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  // statusDaNuvem: o selo honesto do salvamento — quantos baralhos ainda estão
  // esperando a nuvem confirmar, qual foi a última recusa e quando foi a última
  // sincronização de verdade. Antes isso só existia no console do navegador.
  const [statusDaNuvem, setStatusDaNuvem] = useState({ pendentes: 0, exclusoesPendentes: 0, ultimoErro: '', ultimaSincronizacao: null, conectado: false });

  // arquivoParaImportar: guarda o texto do arquivo escolhido e a prévia dele
  // enquanto você decide o que fazer (adicionar ou restaurar).
  const [arquivoParaImportar, setArquivoParaImportar] = useState(null);

  // categories: guarda os grupos de estudos criados para classificação de baralhos do perfil ativo
  const [categories, setCategories] = useState([]);

  // isSyncing: controla se o aplicativo está baixando dados da nuvem para evitar conflitos
  const [isSyncing, setIsSyncing] = useState(false);

  // habits: guarda a lista de hábitos (metas/tarefas gamificadas) do perfil ativo
  const [habits, setHabits] = useState([]);

  // finance: guarda os dados financeiros (transações, contas fixas e meta) do perfil ativo
  const [finance, setFinance] = useState({ transactions: [], recurring: [], budget: null, initialBalance: 0 });

  // dreams / documents: acervos COMPARTILHADOS do casal (Quadro dos Sonhos e Documentos)
  const [dreams, setDreams] = useState([]);
  const [documents, setDocuments] = useState([]);

  // mindMap: guarda o Cérebro Digital (Mapa Mental de Vida) do estudante ativo
  const [mindMap, setMindMap] = useState(null);
  const [studyMaterials, setStudyMaterials] = useState([]);

  // selectedCategoryFilter: guarda o filtro de categoria selecionado ao clicar numa esfera do cérebro
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(null);

  // isInboxOpen: controla se o modal da Caixa de Entrada Rápida (Brain Inbox) está visível
  const [isInboxOpen, setIsInboxOpen] = useState(false);

  /*
    EFEITO DE PERFIL ATIVO:
    Sempre que o estudante ativo muda (ou no início do app), esta função limpa os dados antigos
    e carrega as informações do novo estudante selecionado tanto do LocalStorage quanto do Firebase.
  */
  useEffect(() => {
    if (!activeProfile) {
      // Se não houver ninguém logado, limpa tudo para não misturar os dados
      setSets([]);
      setStats({ setsStudied: 0, cardsMastered: 0, bestMatchTime: null });
      setCategories([]);
      setHabits([]);
      setFinance({ transactions: [], recurring: [], budget: null, initialBalance: 0 });
      setMindMap(null);
      setStudyMaterials([]);
      return;
    }

    // 1. Carrega os dados locais específicos desse estudante
    const loadedSets = getSets(activeProfile);
    const loadedStats = getStats(activeProfile);
    const loadedCategories = getCategories(activeProfile);
    const loadedHabits = getHabits(activeProfile);
    const loadedFinance = getFinance();
    const loadedStudyMaterials = getStudyMaterials(activeProfile);
    // O Cérebro é montado a partir dos GRUPOS: cada grupo vira uma esfera-mãe e
    // os baralhos/materiais dele viram os filhos dessa esfera.
    const loadedMindMap = getMindMap(activeProfile, loadedSets, loadedCategories, loadedStudyMaterials);

    setSets(loadedSets);
    setStats(loadedStats);
    setCategories(loadedCategories);
    setHabits(loadedHabits);
    setFinance(loadedFinance);
    setMindMap(loadedMindMap);
    setStudyMaterials(loadedStudyMaterials);
    setDreams(getDreams());
    setDocuments(getDocuments());

    // 2. Efetua a sincronização em nuvem do Firebase específica para este estudante
    async function performCloudSync() {
      setIsSyncing(true); // Bloqueia a interface para edição enquanto sincroniza
      try {
        // Sincroniza baralhos (acervo privado deste perfil)
        const syncedDecks = await syncDecksWithCloud(activeProfile);
        if (syncedDecks) {
          setSets(syncedDecks);
        }
        // Sincroniza recordes e estatísticas
        const syncedStats = await syncStatsWithCloud(activeProfile);
        if (syncedStats) {
          setStats(syncedStats);
        }
        // Sincroniza grupos de estudo
        const syncedCats = await syncCategoriesWithCloud(activeProfile);
        if (syncedCats) {
          setCategories(syncedCats);
        }
        // Sincroniza hábitos
        const syncedHabits = await syncHabitsWithCloud(activeProfile);
        if (syncedHabits) {
          setHabits(syncedHabits);
        }
        // Sincroniza os materiais de estudo ANTES do Cérebro: o mapa precisa
        // saber quais materiais existem para pendurá-los no grupo certo.
        const syncedStudyMaterials = await syncStudyMaterialsWithCloud(activeProfile);
        if (syncedStudyMaterials) setStudyMaterials(syncedStudyMaterials);
        // Sincroniza o Cérebro Digital (Mapa Mental)
        const syncedMindMap = await syncMindMapWithCloud(
          activeProfile,
          syncedDecks || loadedSets,
          syncedCats || loadedCategories,
          syncedStudyMaterials || loadedStudyMaterials
        );
        if (syncedMindMap) {
          setMindMap(syncedMindMap);
        }
        // Migra (uma vez) o financeiro antigo separado por perfil para o acervo
        // COMPARTILHADO do casal, carimbando quem criou cada lançamento.
        const migratedFinance = await migrateFinanceToShared();
        if (migratedFinance) {
          setFinance(migratedFinance);
        }
        // Sincroniza finanças (acervo compartilhado)
        const syncedFinance = await syncFinanceWithCloud();
        if (syncedFinance) {
          setFinance(syncedFinance);
        }
        // Sincroniza o Quadro dos Sonhos (compartilhado)
        const syncedDreams = await syncDreamsWithCloud();
        if (syncedDreams) {
          setDreams(syncedDreams);
        }
        // Sincroniza os Documentos (compartilhado)
        const syncedDocuments = await syncDocumentsWithCloud();
        if (syncedDocuments) {
          setDocuments(syncedDocuments);
        }
        // Sincroniza o DIÁRIO DE ESTUDO (é dele que sai a sequência de dias
        // seguidos). Estudar no celular e continuar no computador tem que somar,
        // não zerar.
        await syncDiarioDeEstudoComNuvem(activeProfile);
      } finally {
        setIsSyncing(false); // Libera a interface após concluir
      }
    }
    
    performCloudSync();
  }, [activeProfile]);

  /*
    EFEITO: liga a tela no selo da nuvem.
    Toda vez que um baralho sobe, falha ou é confirmado, o app fica sabendo — e
    o botãozinho da nuvem, lá em cima, para de mentir que está tudo certo.
  */
  useEffect(() => {
    return assinarEstadoDaNuvem(setStatusDaNuvem);
  }, []);

  /*
    EFEITO: mantém o Cofre sabendo quais baralhos e grupos existem.

    Sempre que você cria, apaga ou renomeia um baralho, o índice do Cofre é
    atualizado — e o Grafo se redesenha sozinho mostrando a matéria nova no lugar
    certo, pendurada no grupo dela. É isso que faz o mapa ser o mapa dos seus
    ESTUDOS e não um desenho separado que precisa ser mantido à mão.
  */
  useEffect(() => {
    sincronizarBaralhos(sets, categories);
  }, [sets, categories]);

  /*
    Mantém o Cérebro alinhado com a realidade: cada grupo de estudos é uma
    esfera-mãe ligada ao centro, e os baralhos e materiais daquele grupo são os
    filhos dela. Criou um baralho novo? Ele nasce já pendurado no grupo certo.
  */
  useEffect(() => {
    if (!activeProfile || !mindMap) return;
    const essentialMap = buildEssentialMindMap(mindMap, sets, categories, studyMaterials);
    if (JSON.stringify(essentialMap) !== JSON.stringify(mindMap)) {
      saveMindMap(essentialMap, activeProfile);
      setMindMap(essentialMap);
    }
  }, [activeProfile, sets, categories, studyMaterials, mindMap]);

  /*
    FUNÇÃO GLOBAL: sairDoPerfil
    PARA QUE SERVE: Volta para a tela "Quem vai estudar hoje?".
    (A navegação entre TELAS não mora mais aqui: agora cada aba do Cofre cuida da
    sua própria navegação. O App.jsx voltou a ser só o guardião dos DADOS, que é
    o papel que ele deveria ter desde o começo.)
  */
  const sairDoPerfil = () => {
    setActiveProfile(null);
    localStorage.removeItem('flashcard_active_profile');
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

    // Salva na memória do navegador específica deste perfil e atualiza a tela.
    // DEVOLVEMOS o resultado: se a gravação falhar (memória do navegador cheia),
    // o editor precisa saber para pintar "NÃO SALVOU" em vermelho na sua frente,
    // em vez de o erro morrer no console onde ninguém olha.
    const resultado = saveSets(newSetsList, activeProfile);
    setSets(newSetsList);
    return resultado;
  };

  /*
    FUNÇÃO GLOBAL: handleDeleteSet
    PARA QUE SERVE: Exclui permanentemente um baralho de estudos da memória local 
    do estudante ativo ao confirmar a remoção na lista do painel.
  */
  const handleDeleteSet = (setId) => {
    const updated = sets.filter(s => s.id !== setId);
    const resultado = saveSets(updated, activeProfile);
    if (!resultado.ok) {
      alert(`Não consegui apagar: ${resultado.motivo}`);
      return;
    }
    // A "lápide": registra que VOCÊ mandou apagar este baralho. É ela que manda
    // a nuvem apagar de verdade e impede que o celular (que ainda tinha o
    // baralho) o ressuscite na próxima sincronização.
    registrarExclusaoDeBaralho(setId, activeProfile);
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
    saveStats(newStats, activeProfile);
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
    saveStats(newStats, activeProfile);
    setStats(newStats);
  };


  /*
    FUNÇÃO GLOBAL: handleSaveCategory
    PARA QUE SERVE: Adiciona um novo grupo de estudos à lista do estudante ativo, 
    salvando na memória do navegador e subindo a atualização para o Firebase.
  */
  const handleSaveCategory = (newCat) => {
    const updated = [...categories, newCat];
    saveCategories(updated, activeProfile);
    setCategories(updated);
  };

  /*
    FUNÇÃO GLOBAL: handleSaveHabits
    PARA QUE SERVE: Recebe a lista atualizada de hábitos (após criar, concluir ou apagar),
    salva na memória do navegador do estudante ativo e sobe a atualização para o Firebase.
  */
  const handleSaveHabits = (updatedHabits) => {
    saveHabits(updatedHabits, activeProfile);
    setHabits(updatedHabits);
  };

  /*
    FUNÇÃO GLOBAL: handleSaveFinance
    PARA QUE SERVE: Recebe o objeto financeiro atualizado (após lançar, editar ou apagar
    uma transação/conta fixa), salva na memória do navegador do estudante ativo e sobe
    a atualização para o Firebase.
  */
  const handleSaveFinance = (updatedFinance) => {
    saveFinance(updatedFinance);
    setFinance(updatedFinance);
  };

  /*
    FUNÇÕES GLOBAIS: handleSaveDreams / handleSaveDocuments
    PARA QUE SERVEM: Gravam os acervos compartilhados (local + nuvem) e atualizam a tela.
  */
  const handleSaveDreams = (updatedDreams) => {
    saveDreams(updatedDreams);
    setDreams(updatedDreams);
  };

  const handleSaveDocuments = (updatedDocuments) => {
    saveDocuments(updatedDocuments);
    setDocuments(updatedDocuments);
  };

  /*
    FUNÇÃO GLOBAL: handleSaveMindMap
    PARA QUE SERVE: Grava as alterações do Mapa Mental (BRUNO OS — O Cérebro Digital)
    no navegador do estudante ativo E sincroniza em nuvem no Firebase.
  */
  const handleSaveMindMap = (updatedMindMap) => {
    saveMindMap(updatedMindMap, activeProfile);
    setMindMap(updatedMindMap);
  };

  const handleSaveStudyMaterials = (updatedMaterials) => {
    saveStudyMaterials(updatedMaterials, activeProfile);
    setStudyMaterials(updatedMaterials);
  };

  /*
    FUNÇÃO GLOBAL: handleExportBackup
    PARA QUE SERVE: Aciona a rotina para compilar todos os baralhos criados pelo estudante ativo 
    em um arquivo .json e inicia o download no seu aparelho de forma segura.
  */
  const handleExportBackup = () => {
    exportBackup(activeProfile);
  };

  /*
    FUNÇÃO GLOBAL: handleImportBackup
    PARA QUE SERVE: Recebe as informações lidas de um arquivo de backup carregado 
    pelo usuário, valida os dados, os injeta na memória do estudante ativo e recarrega a tela para 
    exibir os novos baralhos imediatamente.
  */
  const handleImportBackup = (jsonText) => {
    // NADA é gravado aqui. Primeiro conferimos o arquivo inteiro e mostramos a
    // prévia; quem decide o que fazer é você, na telinha de confirmação.
    const previa = analisarBackup(jsonText, activeProfile);
    setArquivoParaImportar({ texto: jsonText, previa });
  };

  /*
    FUNÇÃO GLOBAL: confirmarImportacao
    PARA QUE SERVE: executa a decisão tomada na telinha de prévia.
      'adicionar' -> junta o conteúdo novo, preservando tudo o que já existe;
      'restaurar' -> substitui o acervo (guardando antes uma cópia de segurança).
  */
  const confirmarImportacao = (modo) => {
    const arquivo = arquivoParaImportar;
    setArquivoParaImportar(null);
    if (!arquivo) return;

    const result = importBackup(arquivo.texto, activeProfile, modo);
    if (result.success) {
      setSets(getSets(activeProfile));
      setStats(getStats(activeProfile));
    }
    alert(result.message);
  };

  // =========================================================================
  // BYPASS DA TELA DE SELEÇÃO: Se nenhum estudante foi selecionado,
  // renderiza a tela "Quem vai estudar hoje?" e interrompe a renderização do Dashboard.
  // =========================================================================
  if (!activeProfile) {
    return (
      <ProfileSelect 
        profiles={profiles}
        onSelectProfile={(name) => {
          setActiveProfile(name);
          localStorage.setItem('flashcard_active_profile', name);
        }}
        onCreateProfile={(name) => {
          const updated = [...profiles, name];
          saveProfiles(updated);
          setProfiles(updated);
        }}
        onDeleteProfile={(name) => {
          const updated = profiles.filter(p => p !== name);
          saveProfiles(updated);
          setProfiles(updated);
          // Limpa a gaveta do LocalStorage deste perfil excluído
          localStorage.removeItem(`flashcard_app_sets_v1_${name}`);
          localStorage.removeItem(`flashcard_app_stats_v1_${name}`);
          localStorage.removeItem(`flashcard_app_categories_v1_${name}`);
          localStorage.removeItem(`flashcard_app_sync_code_v1_${name}`);
        }}
      />
    );
  }

  // =========================================================================
  // A CASCA DA PLATAFORMA — O COFRE (estilo Obsidian)
  //
  // Antes, cada módulo era uma TELA CHEIA e só dava para ver um por vez. Agora
  // existe uma casca só, com abas: seus Flashcards podem ficar do lado esquerdo
  // e a nota de estudo do lado direito, ao mesmo tempo. Tudo que era tela virou
  // aba, e tudo que é aba pode ser ligado por [[links]] às suas notas.
  // =========================================================================

  /*
    CATÁLOGO DE MÓDULOS
    Esta lista é a ÚNICA fonte da verdade sobre o que existe na plataforma. Ela
    alimenta ao mesmo tempo o painel lateral "Módulos" e a paleta de comandos
    (Ctrl+P). Para acrescentar um módulo novo no futuro, some uma linha aqui e
    um "case" no renderModulo abaixo — mais nada.
  */
  const modulos = [
    { key: 'flashcards', titulo: 'Flashcards',        descricao: 'Cartões 3D, quizzes e jogos de memória', icone: GraduationCap, cor: '#E8933F' },
    { key: 'mapa',       titulo: 'Cérebro Digital',   descricao: 'Seu mapa mental em 3D',                  icone: Brain,         cor: '#7AA2F7' },
    { key: 'financas',   titulo: 'Finanças',          descricao: 'Contas, salário e relatórios do mês',    icone: Wallet,        cor: '#3ECF8E' },
    { key: 'habitos',    titulo: 'Hábitos',           descricao: 'Sequências, XP e progresso diário',      icone: Target,        cor: '#45C4A0' },
    { key: 'sonhos',     titulo: 'Quadro dos Sonhos', descricao: 'Os objetivos de vocês dois',             icone: Sparkles,      cor: '#E77950' },
    { key: 'documentos', titulo: 'Documentos',        descricao: 'Arquivos e links importantes',           icone: FolderOpen,    cor: '#6FA8D6' },
    { key: 'treino',     titulo: 'Treino do Dia',     descricao: 'Sua revisão diária guiada',              icone: Dumbbell,      cor: '#D96A8F' },
    { key: 'relatorio',  titulo: 'Relatório Geral',   descricao: 'A visão do casal',                       icone: BarChart3,     cor: '#9C7BD9' },
  ];

  /*
    De-para entre os destinos ANTIGOS (que as telas já existentes usam quando
    chamam onNavigate) e as chaves de módulo NOVAS. Isso é o que permite não
    mexer no código do Cérebro Digital, das Finanças e dos Hábitos: eles
    continuam pedindo "me leve para dashboard", e a tradução acontece aqui.
  */
  const DESTINO_PARA_MODULO = {
    dashboard: 'flashcards',
    habits: 'habitos',
    finance: 'financas',
    dreams: 'sonhos',
    docs: 'documentos',
    general_report: 'relatorio',
    dailyWorkout: 'treino',
    menu: 'mapa',
  };

  /*
    renderModulo: entrega o conteúdo de uma aba de módulo.
    O `api` vem da casca e permite ao módulo abrir OUTRA aba (é assim que clicar
    numa esfera do Cérebro Digital abre as Finanças ao lado).
  */
  const renderModulo = (chave, api) => {
    const irPara = (destino) => {
      const alvo = DESTINO_PARA_MODULO[destino];
      if (alvo) api.abrirModulo(alvo);
    };

    switch (chave) {
      case 'flashcards':
        return (
          <FlashcardsModule
            baralhoInicial={api.baralhoId}
            grupoInicial={api.grupo}
            onAbrirNoCofre={api.abrirNota}
            sets={sets}
            stats={stats}
            categories={categories}
            activeProfile={activeProfile}
            isSyncing={isSyncing}
            isOnline={!!firestoreDb}
            statusDaNuvem={statusDaNuvem}
            onSaveSet={handleSaveSet}
            onDeleteSet={handleDeleteSet}
            onCompleteSession={handleCompleteSession}
            onSaveRecord={handleSaveRecord}
            onAddCategory={handleSaveCategory}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onOpenSync={() => setIsSyncModalOpen(true)}
            onLogoutProfile={sairDoPerfil}
            initialCategoryFilter={selectedCategoryFilter}
            studyMaterials={studyMaterials}
            onSaveStudyMaterials={handleSaveStudyMaterials}
          />
        );

      case 'mapa':
        return (
          <BrunoMindMap
            mindMap={mindMap}
            onSaveMindMap={handleSaveMindMap}
            onNavigate={irPara}
            onOpenStudy={({ deckId, category, label }) => api.abrirModulo('flashcards', {
              baralhoId: deckId || null,
              grupo: deckId ? null : category,
              titulo: label || 'Flashcards',
            })}
            categories={categories}
            onSelectCategoryFilter={(cat) => setSelectedCategoryFilter(cat)}
            activeProfile={activeProfile}
            onStartDailyWorkout={() => api.abrirModulo('treino')}
            onOpenBrainInbox={() => setIsInboxOpen(true)}
          />
        );

      case 'financas':
        return (
          <FinanceMode
            finance={finance}
            onSaveFinance={handleSaveFinance}
            onNavigate={irPara}
            activeProfile={activeProfile}
          />
        );

      case 'habitos':
        return (
          <HabitsMode
            habits={habits}
            onSaveHabits={handleSaveHabits}
            onNavigate={irPara}
            activeProfile={activeProfile}
          />
        );

      case 'sonhos':
        return (
          <DreamsMode
            dreams={dreams}
            onSaveDreams={handleSaveDreams}
            onNavigate={irPara}
            activeProfile={activeProfile}
          />
        );

      case 'documentos':
        return (
          <DocumentsMode
            documents={documents}
            onSaveDocuments={handleSaveDocuments}
            onNavigate={irPara}
            activeProfile={activeProfile}
          />
        );

      case 'treino':
        return (
          <DailyWorkoutMode
            activeProfile={activeProfile}
            onBackToMindMap={() => api.abrirModulo('mapa')}
          />
        );

      case 'relatorio':
        return <GeneralReport onNavigate={irPara} />;

      default:
        return <div style={{ padding: 40 }}>Módulo desconhecido: {chave}</div>;
    }
  };

  return (
    <>
      <OrganizerShell
        activeProfile={activeProfile}
        renderSection={(section, api) => renderModulo(section === 'metas' ? 'sonhos' : section, api)}
        onTrocarPerfil={sairDoPerfil}
      />

      {/* MODAL DE SINCRONIZAÇÃO NA NUVEM (exibe o código e vincula aparelhos) */}
      <SyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        isOnline={!!firestoreDb}
        statusDaNuvem={statusDaNuvem}
      />

      {/* PRÉVIA DA IMPORTAÇÃO: mostra o que o arquivo traz e separa
          "adicionar conteúdo" de "restaurar backup" antes de gravar. */}
      {arquivoParaImportar && (
        <ImportBackupModal
          previa={arquivoParaImportar.previa}
          onConfirmar={confirmarImportacao}
          onClose={() => setArquivoParaImportar(null)}
        />
      )}

      {/* MODAL DE CAIXA DE ENTRADA RÁPIDA (BRAIN INBOX) */}
      <BrainInboxModal
        isOpen={isInboxOpen}
        onClose={() => setIsInboxOpen(false)}
        activeProfile={activeProfile}
        onSetsUpdated={() => setSets(getSets(activeProfile))}
      />
    </>
  );
}

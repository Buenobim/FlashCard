/*
  =============================================================================
  ARQUIVO: src/utils/db.js
  PARA QUE SERVE: Este é o "Gerente Geral do Banco de Dados". Ele trabalha em modo 
  duplo (Híbrido) para dar a você a maior segurança possível:
  1. BANCO LOCAL (LocalStorage): Carrega e salva os cartões em 0 milissegundos, 
     garantindo que o app abra na hora e funcione mesmo se você estiver sem internet.
  2. BANCO NA NUVEM (Supabase): Sincroniza em segundo plano. Tudo o que você criar 
     ou editar no computador é guardado na internet de forma segura e aparece 
     automaticamente no seu celular!
  =============================================================================
*/

import { supabase } from './supabase';

// Chaves que identificam as pastas de arquivos dentro da memória local do seu navegador
const STORAGE_SETS_KEY = 'flashcard_app_sets_v1';
const STORAGE_STATS_KEY = 'flashcard_app_stats_v1';

// 1. DADOS DE EXEMPLO (Iniciais):
// Baralhos de boas-vindas criados na rocha para demonstração
const DEFAULT_SETS = [
  {
    id: 'default-viagem-ingles',
    title: '🇺🇸 Vocabulário Útil para Viagem',
    description: 'Frases e palavras essenciais para sobreviver no exterior e se comunicar de forma básica.',
    cards: [
      { id: 'v1', term: 'Hello! Good morning.', definition: 'Olá! Bom dia.' },
      { id: 'v2', term: 'Where is the bathroom, please?', definition: 'Onde fica o banheiro, por favor?' },
      { id: 'v3', term: 'How much does this cost?', definition: 'Quanto custa isto?' },
      { id: 'v4', term: 'Thank you very much!', definition: 'Muito obrigado!' },
      { id: 'v5', term: 'Can I have some water, please?', definition: 'Você poderia me dar um pouco de água, por favor?' },
      { id: 'v6', term: 'I do not speak English very well.', definition: 'Eu não falo inglês muito bem.' }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: 'default-capitais',
    title: '🧠 Capitais do Mundo',
    description: 'Um teste rápido de geografia para exercitar sua mente associando países às suas capitais.',
    cards: [
      { id: 'c1', term: 'Brasil', definition: 'Brasília' },
      { id: 'c2', term: 'França', definition: 'Paris' },
      { id: 'c3', term: 'Japão', definition: 'Tóquio' },
      { id: 'c4', term: 'Reino Unido', definition: 'Londres' },
      { id: 'c5', term: 'Itália', definition: 'Roma' },
      { id: 'c6', term: 'Canadá', definition: 'Ottawa' }
    ],
    createdAt: new Date().toISOString()
  }
];

const DEFAULT_STATS = {
  setsStudied: 0,
  cardsMastered: 0,
  bestMatchTime: null,
};

/*
  FUNÇÃO: getSets
  PARA QUE SERVE: Lê instantaneamente a lista de baralhos lida da memória local do navegador.
*/
export function getSets() {
  try {
    const rawSets = localStorage.getItem(STORAGE_SETS_KEY);
    if (!rawSets) {
      saveSets(DEFAULT_SETS);
      return DEFAULT_SETS;
    }
    return JSON.parse(rawSets);
  } catch (error) {
    console.error('Erro ao ler os conjuntos do LocalStorage:', error);
    return DEFAULT_SETS;
  }
}

/*
  FUNÇÃO: saveSets
  PARA QUE SERVE: Salva os baralhos localmente na hora E envia as alterações para a nuvem
  do Supabase de forma assíncrona (em segundo plano), mantendo tudo sincronizado!
*/
export function saveSets(sets) {
  try {
    // 1. Salva localmente para velocidade instantânea
    localStorage.setItem(STORAGE_SETS_KEY, JSON.stringify(sets));

    // 2. Se o Supabase estiver configurado, espelha as alterações na nuvem
    if (supabase) {
      const localIds = sets.map(s => s.id);
      
      // Remove da nuvem os baralhos que foram excluídos localmente
      supabase.from('flashcard_decks')
        .delete()
        .not('id', 'in', `(${localIds.join(',')})`)
        .then(() => {
          // Salva ou atualiza os baralhos na nuvem
          const promises = sets.map(deck => 
            supabase.from('flashcard_decks').upsert({
              id: deck.id,
              title: deck.title,
              description: deck.description || '',
              cards: deck.cards || []
            })
          );
          return Promise.all(promises);
        })
        .catch(err => console.warn('Erro ao atualizar dados na nuvem Supabase:', err.message));
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar os conjuntos:', error);
    return false;
  }
}

/*
  FUNÇÃO: getStats
  PARA QUE SERVE: Lê suas conquistas e recordes da memória local.
*/
export function getStats() {
  try {
    const rawStats = localStorage.getItem(STORAGE_STATS_KEY);
    if (!rawStats) {
      saveStats(DEFAULT_STATS);
      return DEFAULT_STATS;
    }
    return JSON.parse(rawStats);
  } catch (error) {
    console.error('Erro ao ler as estatísticas:', error);
    return DEFAULT_STATS;
  }
}

/*
  FUNÇÃO: saveStats
  PARA QUE SERVE: Salva recordes e estatísticas no seu computador E atualiza o cofre do Supabase.
*/
export function saveStats(stats) {
  try {
    // 1. Salva localmente
    localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(stats));

    // 2. Envia para o Supabase
    if (supabase) {
      supabase.from('flashcard_stats')
        .upsert({
          id: 'global_stats',
          stats_data: stats
        })
        .catch(err => console.warn('Erro ao salvar estatísticas na nuvem Supabase:', err.message));
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar as estatísticas:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncDecksWithCloud
  PARA QUE SERVE: Roda silenciosamente ao abrir o app. Ela busca os cartões da internet:
  - Se a internet tiver baralhos novos, ela atualiza o seu computador/celular.
  - Se você acabou de conectar o Supabase, ela envia os seus baralhos locais para a nuvem!
*/
export async function syncDecksWithCloud() {
  if (!supabase) return null;
  try {
    const { data: cloudDecks, error } = await supabase
      .from('flashcard_decks')
      .select('*');

    if (error) throw error;

    const localDecks = getSets();

    if (cloudDecks && cloudDecks.length > 0) {
      // Nuvem tem dados! Vamos atualizar o armazenamento local.
      const formattedDecks = cloudDecks.map(d => ({
        id: d.id,
        title: d.title,
        description: d.description || '',
        cards: d.cards || [],
        createdAt: d.created_at || new Date().toISOString()
      }));
      
      localStorage.setItem(STORAGE_SETS_KEY, JSON.stringify(formattedDecks));
      return formattedDecks;
    } else if (localDecks && localDecks.length > 0) {
      // Nuvem está vazia (primeira conexão), vamos subir o nosso progresso local
      for (const deck of localDecks) {
        await supabase.from('flashcard_decks').upsert({
          id: deck.id,
          title: deck.title,
          description: deck.description || '',
          cards: deck.cards || []
        });
      }
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar baralhos com a nuvem:', err.message);
  }
  return null;
}

/*
  FUNÇÃO ASSÍNCRONA: syncStatsWithCloud
  PARA QUE SERVE: Sincroniza recordes do jogo Combinar e sessões de estudo com a nuvem, 
  mantendo sempre a sua melhor conquista registrada!
*/
export async function syncStatsWithCloud() {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('flashcard_stats')
      .select('*')
      .eq('id', 'global_stats')
      .single();

    if (error && error.code !== 'PGRST116') throw error; // Ignora se a tabela na nuvem estiver vazia

    const localStats = getStats();

    if (data && data.stats_data) {
      // Combina local e nuvem, priorizando sempre a melhor marca/maior número de estudos
      const mergedStats = {
        setsStudied: Math.max(localStats.setsStudied || 0, data.stats_data.setsStudied || 0),
        cardsMastered: Math.max(localStats.cardsMastered || 0, data.stats_data.cardsMastered || 0),
        bestMatchTime: (localStats.bestMatchTime === null)
          ? data.stats_data.bestMatchTime
          : (data.stats_data.bestMatchTime === null)
            ? localStats.bestMatchTime
            : Math.min(localStats.bestMatchTime, data.stats_data.bestMatchTime)
      };
      
      localStorage.setItem(STORAGE_STATS_KEY, JSON.stringify(mergedStats));
      return mergedStats;
    } else {
      // Sobe as estatísticas locais para o banco na nuvem
      await supabase.from('flashcard_stats').upsert({
        id: 'global_stats',
        stats_data: localStats
      });
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar estatísticas:', err.message);
  }
  return null;
}

/*
  FUNÇÃO: exportBackup
  PARA QUE SERVE: Gera um arquivo de backup local em formato JSON.
*/
export function exportBackup() {
  const sets = getSets();
  const stats = getStats();
  
  const backupData = {
    app: 'AplicativoFlashcards',
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    sets: sets,
    stats: stats
  };
  
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `backup_meus_flashcards_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/*
  FUNÇÃO: importBackup
  PARA QUE SERVE: Restaura os dados lidos de um arquivo de backup .json lido pelo usuário.
*/
export function importBackup(jsonContent) {
  try {
    const data = JSON.parse(jsonContent);
    
    if (data.app !== 'AplicativoFlashcards' || !Array.isArray(data.sets)) {
      throw new Error('Formato de arquivo inválido.');
    }
    
    saveSets(data.sets);
    if (data.stats) {
      saveStats(data.stats);
    }
    
    return { success: true, message: `${data.sets.length} conjuntos de flashcards importados com sucesso!` };
  } catch (error) {
    console.error('Erro ao importar backup:', error);
    return { success: false, message: 'Falha ao importar: o arquivo está corrompido ou é inválido.' };
  }
}

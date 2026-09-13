/*
  =============================================================================
  ARQUIVO: src/utils/db.js
  PARA QUE SERVE: Este é o "Gerente Geral do Banco de Dados". Ele trabalha em modo 
  duplo (Híbrido) para dar a você a maior segurança possível:
  1. BANCO LOCAL (LocalStorage): Carrega e salva os cartões em 0 milissegundos, 
     garantindo que o app abra na hora e funcione mesmo se você estiver sem internet.
  2. BANCO NA NUVEM (Firebase): Sincroniza em segundo plano. Tudo o que você criar 
     ou editar no computador é guardado na internet de forma segura e aparece 
     automaticamente no seu celular!
  =============================================================================
*/

import { db } from './firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
// O IndexedDB do Cofre também guarda a cópia local do Caderno (o LocalStorage
// era pequeno demais para desenhos com fotos coladas).
import { getMeta as idbGetMeta, setMeta as idbSetMeta, deleteMeta as idbDeleteMeta } from '../vault/storage/idb.js';
// A conta da repetição espaçada (SM-2) mora num arquivo só, sem tela, para poder
// ser conferida com `npm run testar`. Aqui o banco apenas a aplica.
import { aplicarNota, NOTAS } from '../estudo/trilhaCore.js';
// As CONTAS da sincronização e da conferência de backup moram num arquivo sem
// tela e sem internet (sincroniaCore), para poderem ser testadas com
// `npm run testar`. Aqui o banco só as aplica.
import {
  juntarBaralhosLocalENuvem,
  validarConteudoDeBackup,
  compararComOAcervo,
  assinaturaDeConteudo,
  BACKUP_APP_ID,
} from './sincroniaCore.js';

export { juntarBaralhosLocalENuvem, validarConteudoDeBackup, compararComOAcervo };

// Chaves que identificam as pastas de arquivos dentro da memória local do seu navegador
const STORAGE_SETS_KEY = 'flashcard_app_sets_v1';
const STORAGE_STATS_KEY = 'flashcard_app_stats_v1';
const STORAGE_SYNC_KEY = 'flashcard_app_sync_code_v1';
const STORAGE_CATEGORIES_KEY = 'flashcard_app_categories_v1';
const STORAGE_PROFILES_KEY = 'flashcard_app_profiles_v1';
const STORAGE_HABITS_KEY = 'flashcard_app_habits_v1';
const STORAGE_FINANCE_KEY = 'flashcard_app_finance_v1';
const STORAGE_INBOX_KEY = 'flashcard_app_inbox_v1';
const STORAGE_STUDY_MATERIALS_KEY = 'flashcard_app_study_materials_v1';

// Perfis de Estudantes padrão
const DEFAULT_PROFILES = ['Bruno Bueno', 'Bruna Bueno'];

// Grupos de estudo padrão
const DEFAULT_CATEGORIES = ['Faculdade', 'Inglês', 'IA', 'BIM'];

// Funções auxiliares para gerar chaves de LocalStorage exclusivas por perfil
const getSetsKey = (profile) => profile ? `${STORAGE_SETS_KEY}_${profile}` : STORAGE_SETS_KEY;
const getStatsKey = (profile) => profile ? `${STORAGE_STATS_KEY}_${profile}` : STORAGE_STATS_KEY;
const getSyncKey = (profile) => profile ? `${STORAGE_SYNC_KEY}_${profile}` : STORAGE_SYNC_KEY;
const getCategoriesKey = (profile) => profile ? `${STORAGE_CATEGORIES_KEY}_${profile}` : STORAGE_CATEGORIES_KEY;
const getHabitsKey = (profile) => profile ? `${STORAGE_HABITS_KEY}_${profile}` : STORAGE_HABITS_KEY;
const getFinanceKey = (profile) => profile ? `${STORAGE_FINANCE_KEY}_${profile}` : STORAGE_FINANCE_KEY;
const getInboxKey = (profile) => profile ? `${STORAGE_INBOX_KEY}_${profile}` : STORAGE_INBOX_KEY;
const getStudyMaterialsKey = (profile) => profile ? `${STORAGE_STUDY_MATERIALS_KEY}_${profile}` : STORAGE_STUDY_MATERIALS_KEY;

export function getStudyMaterials(profile) {
  try {
    const raw = localStorage.getItem(getStudyMaterialsKey(profile));
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Erro ao ler materiais de estudo:', error);
    return [];
  }
}

export function saveStudyMaterials(materials, profile) {
  try {
    localStorage.setItem(getStudyMaterialsKey(profile), JSON.stringify(materials));
    if (db && profile) {
      const syncCode = deckCloudId(profile);
      const localIds = materials.map((item) => item.id);
      getDocs(collection(db, 'users', syncCode, 'studyMaterials')).then((snapshot) => {
        snapshot.forEach((cloudDoc) => {
          if (!localIds.includes(cloudDoc.id)) {
            deleteDoc(doc(db, 'users', syncCode, 'studyMaterials', cloudDoc.id)).catch(console.warn);
          }
        });
      }).catch(console.warn);

      materials.forEach((item) => {
        setDoc(doc(db, 'users', syncCode, 'studyMaterials', item.id), item, { merge: true }).catch(console.warn);
      });
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar materiais de estudo:', error);
    return false;
  }
}

export async function syncStudyMaterialsWithCloud(profile) {
  if (!db || !profile) return null;
  try {
    const syncCode = deckCloudId(profile);
    const snapshot = await getDocs(collection(db, 'users', syncCode, 'studyMaterials'));
    const localItems = getStudyMaterials(profile);
    if (snapshot.empty) {
      if (localItems.length) saveStudyMaterials(localItems, profile);
      return localItems;
    }
    const cloudItems = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    localStorage.setItem(getStudyMaterialsKey(profile), JSON.stringify(cloudItems));
    return cloudItems;
  } catch (error) {
    console.warn('Modo Offline: materiais de estudo locais mantidos.', error.message);
    return null;
  }
}

/*
  FUNÇÃO: getProfiles
  PARA QUE SERVE: Lê a lista de estudantes cadastrados. Se não existir, 
  inicia com os nomes "Bruno Bueno" e "Bruna Bueno".
*/
export function getProfiles() {
  try {
    const raw = localStorage.getItem(STORAGE_PROFILES_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(DEFAULT_PROFILES));
      return DEFAULT_PROFILES;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao obter perfis:', error);
    return DEFAULT_PROFILES;
  }
}

/*
  FUNÇÃO: saveProfiles
  PARA QUE SERVE: Salva a lista atualizada de estudantes no navegador.
*/
export function saveProfiles(profiles) {
  try {
    localStorage.setItem(STORAGE_PROFILES_KEY, JSON.stringify(profiles));
    return true;
  } catch (error) {
    console.error('Erro ao salvar perfis:', error);
    return false;
  }
}

/*
  FUNÇÃO: getCategories
  PARA QUE SERVE: Retorna a lista de grupos de estudo salvos localmente do estudante ativo.
*/
export function getCategories(profile) {
  try {
    const raw = localStorage.getItem(getCategoriesKey(profile));
    if (!raw) {
      saveCategories(DEFAULT_CATEGORIES, profile);
      return DEFAULT_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler categorias:', error);
    return DEFAULT_CATEGORIES;
  }
}

/*
  FUNÇÃO: saveCategories
  PARA QUE SERVE: Salva a lista de grupos de estudo na gaveta e nuvem do estudante ativo.
*/
export function saveCategories(categories, profile) {
  try {
    localStorage.setItem(getCategoriesKey(profile), JSON.stringify(categories));
    if (db) {
      const syncCode = deckCloudId(profile);
      setDoc(doc(db, 'users', syncCode, 'categories', 'list'), {
        items: categories
      }, { merge: true }).catch(err => console.warn('Erro ao salvar grupos na nuvem:', err));
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar categorias:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncCategoriesWithCloud
  PARA QUE SERVE: Sincroniza os grupos de estudo da nuvem do estudante ativo.
*/
export async function syncCategoriesWithCloud(profile) {
  if (!db) return null;
  try {
    const syncCode = deckCloudId(profile);
    const docRef = doc(db, 'users', syncCode, 'categories', 'list');
    const docSnap = await getDoc(docRef);
    
    const localCategories = getCategories(profile);

    if (docSnap.exists() && docSnap.data().items) {
      const cloudItems = docSnap.data().items;
      const merged = Array.from(new Set([...localCategories, ...cloudItems]));
      localStorage.setItem(getCategoriesKey(profile), JSON.stringify(merged));
      return merged;
    } else {
      await setDoc(docRef, {
        items: localCategories
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Modo Offline: Erro ao sincronizar grupos de estudo:', err.message);
  }
  return null;
}

/*
  =============================================================================
  IDENTIDADE NA NUVEM (SIMPLIFICADA — SEM DIGITAR CÓDIGO)
  A partir de agora NÃO existe mais "digitar/trocar código de sincronização".
  Tudo é automático e fixo:
    • SHARED_CLOUD_ID: um ÚNICO endereço fixo na nuvem para os BARALHOS e GRUPOS
      de estudo. Qualquer perfil, em qualquer aparelho, lê e grava no MESMO lugar
      — ou seja, um acervo de flashcards COMPARTILHADO por todos.
    • personalCloudId(perfil): um endereço fixo e automático, por pessoa, usado só
      para os dados PRIVADOS (recordes, hábitos e finanças), para que o dinheiro e
      os hábitos de cada um NÃO se misturem.
  Nada disso precisa (nem pode) ser digitado ou trocado pelo usuário.
  =============================================================================
*/

// Endereço ÚNICO e compartilhado dos baralhos/grupos na nuvem (igual para todos).
const SHARED_CLOUD_ID = 'FC-FAMILIA-BUENO';

// Endereços pessoais fixos que o Bruno e a Bruna JÁ usavam (mantidos para não
// perder recordes/hábitos/finanças que já estavam salvos sob eles na nuvem).
const FIXED_PERSONAL_CODES = {
  'Bruno Bueno': 'FC-FT6M-6E3U',
  'Bruna Bueno': 'FC-8KIP-ASZU',
};

/*
  FUNÇÃO: personalCloudId
  PARA QUE SERVE: Devolve o endereço PRIVADO na nuvem de um perfil (recordes, hábitos
  e finanças). Para Bruno e Bruna usa os códigos que eles já tinham; para qualquer
  outro perfil, gera um código ESTÁVEL a partir do nome (o mesmo nome sempre gera o
  mesmo código, em qualquer aparelho), sem o usuário precisar digitar nada.
*/
function personalCloudId(profile) {
  if (profile && FIXED_PERSONAL_CODES[profile]) return FIXED_PERSONAL_CODES[profile];
  const name = (profile || 'default').trim().toLowerCase();
  let h1 = 0x811c9dc5;
  let h2 = 0x1000193;
  for (let i = 0; i < name.length; i++) {
    const c = name.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  let combined = (h1.toString(36) + h2.toString(36)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  while (combined.length < 8) combined += 'X';
  return `FC-${combined.slice(0, 4)}-${combined.slice(4, 8)}`;
}

/*
  FUNÇÃO: deckCloudId
  PARA QUE SERVE: Devolve o endereço PRIVADO na nuvem dos BARALHOS e GRUPOS de um
  perfil. Cada pessoa (Bruno, Bruna, ...) tem o SEU próprio acervo de flashcards —
  NÃO é mais compartilhado. O sufixo "-DECKS" garante um endereço NOVO e limpo, sem
  os baralhos velhos que ficaram em códigos antigos (evita ressuscitar o que foi
  apagado). O mesmo perfil sempre gera o mesmo endereço, em qualquer aparelho.
*/
export function deckCloudId(profile) {
  return `${personalCloudId(profile)}-DECKS`;
}

/*
  FUNÇÃO: getSyncCode
  PARA QUE SERVE: Mantida apenas para compatibilidade e para exibir na telinha de
  status da nuvem. Não é mais usada para gravar/ler os baralhos de fato.
*/
export function getSyncCode() {
  return SHARED_CLOUD_ID;
}

// 1. DADOS DE EXEMPLO (Iniciais):
// Baralhos de boas-vindas criados na rocha para demonstração
const DEFAULT_SETS = [
  {
    id: 'default-viagem-ingles',
    title: '🇺🇸 Vocabulário Útil para Viagem',
    description: 'Frases e palavras essenciais para sobreviver no exterior e se comunicar de forma básica.',
    category: 'Inglês',
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
    category: 'Faculdade',
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
  PARA QUE SERVE: Lê a lista de baralhos lida da memória local do navegador do estudante ativo.
*/
export function getSets(profile) {
  try {
    const rawSets = localStorage.getItem(getSetsKey(profile));
    // IMPORTANTE: se não houver baralhos salvos, devolvemos uma lista VAZIA.
    // Antes semeávamos baralhos de exemplo ("Capitais do Mundo" etc.) aqui, mas
    // isso fazia esses baralhos "voltarem" toda vez que a gaveta ficava vazia
    // (inclusive re-enviando para a nuvem). Cada perfil começa limpo.
    if (!rawSets) return [];
    return JSON.parse(rawSets);
  } catch (error) {
    console.error('Erro ao ler os conjuntos do LocalStorage:', error);
    return [];
  }
}

/*
  FUNÇÃO: paraNuvem
  PARA QUE SERVE: monta o objeto exato que vai virar um documento do Firestore.

  POR QUE ELA EXISTE: o formato do baralho na nuvem era escrito à mão em DOIS
  lugares (aqui no salvamento e lá no sincronizador). Quando a TRILHA nasceu, o
  campo `blocos` foi acrescentado — e um campo esquecido em um dos dois lugares
  significaria a matéria inteira sumindo ao trocar de aparelho. Com um lugar só,
  isso não pode mais acontecer.
*/
function paraNuvem(deck) {
  // A data de criação é calculada UMA vez e reaproveitada: se o baralho antigo
  // não tiver o carimbo `updatedAt`, ele herda a data de criação — e NÃO a hora
  // atual. Se herdasse "agora", todo baralho antigo da nuvem pareceria recém
  // editado e venceria qualquer alteração de verdade feita no aparelho.
  const criadoEm = deck.createdAt || new Date().toISOString();
  return {
    id: deck.id,
    title: deck.title,
    description: deck.description || '',
    category: deck.category || 'Sem Grupo',
    cards: deck.cards || [],
    // A TRILHA: a ordem dos blocos e todo o conteúdo que não é flashcard
    // (anotações, prints, links, fórmulas, pegadinhas). Sem esta linha, o
    // aparelho novo receberia os cartões soltos e perderia a matéria montada.
    blocos: deck.blocos || [],
    subItems: deck.subItems || [],
    subConnections: deck.subConnections || [],
    createdAt: criadoEm,
    // Carimbo de QUANDO este baralho mudou pela última vez. É o juiz do
    // desempate entre o que está no computador e o que está no celular.
    updatedAt: deck.updatedAt || criadoEm
  };
}

/*
  =============================================================================
  O SELO DA NUVEM — "salvo no aparelho", "subindo", "sincronizado" ou "FALHOU"

  POR QUE ISSO EXISTE: antes, quando a nuvem recusava uma gravação, o erro ia
  parar no console do navegador (onde ninguém olha) e o app continuava com cara
  de que estava tudo certo. Agora todo envio passa por aqui: o que ainda não foi
  confirmado fica na FILA, o último erro fica guardado e a tela consegue mostrar
  a verdade para você.
  =============================================================================
*/
const estadoDaNuvem = {
  pendentes: 0,              // baralhos gravados no aparelho mas ainda não confirmados pela nuvem
  exclusoesPendentes: 0,     // exclusões que ainda não chegaram na nuvem
  ultimoErro: '',            // a última recusa da nuvem, em português
  ultimaSincronizacao: null, // quando a nuvem confirmou pela última vez
};
const ouvintesDaNuvem = new Set();

/*
  FUNÇÃO: getStatusDaNuvem
  PARA QUE SERVE: devolve a fotografia atual do selo (usada pela telinha da nuvem).
*/
export function getStatusDaNuvem() {
  return { ...estadoDaNuvem, conectado: !!db };
}

/*
  FUNÇÃO: assinarEstadoDaNuvem
  PARA QUE SERVE: a tela "assina" as mudanças do selo e é avisada sempre que algo
  sobe, falha ou é confirmado. Devolve a função de cancelar a assinatura.
*/
export function assinarEstadoDaNuvem(ouvinte) {
  ouvintesDaNuvem.add(ouvinte);
  ouvinte(getStatusDaNuvem());
  return () => ouvintesDaNuvem.delete(ouvinte);
}

function avisarEstadoDaNuvem() {
  const status = getStatusDaNuvem();
  ouvintesDaNuvem.forEach(fn => {
    try { fn(status); } catch { /* uma tela quebrada não pode derrubar o salvamento */ }
  });
}

// Gavetas de controle da sincronização (uma por perfil):
//  - pendentes: ids de baralhos esperando confirmação da nuvem
//  - excluidos: ids que VOCÊ mandou apagar (as "lápides"), para que nenhum
//               aparelho desatualizado ressuscite o que já foi apagado
//  - enviados:  a assinatura da última versão que a nuvem confirmou, para não
//               reenviar baralho que não mudou
const getPendentesKey = (profile) => `flashcard_deck_pendentes_v1_${profile || 'default'}`;
const getExclusoesKey = (profile) => `flashcard_deck_excluidos_v1_${profile || 'default'}`;
const getEnviadosKey = (profile) => `flashcard_deck_enviados_v1_${profile || 'default'}`;

function lerJson(chave, padrao) {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : padrao;
  } catch {
    return padrao;
  }
}

function gravarJson(chave, valor) {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch (e) {
    console.warn('Não consegui gravar o controle de sincronização:', e.message);
    return false;
  }
}

/*
  FUNÇÃO: assinaturaDoBaralho
  PARA QUE SERVE: um "resumo" do conteúdo do baralho (sem a data). Se a assinatura
  não mudou, o baralho não mudou — e não precisa ser reenviado para a nuvem.
*/
function assinaturaDoBaralho(deck) {
  const limpo = paraNuvem(deck);
  delete limpo.updatedAt;
  return JSON.stringify(limpo);
}

function lerPendentes(profile) { return lerJson(getPendentesKey(profile), []); }
function lerExclusoes(profile) { return lerJson(getExclusoesKey(profile), []); }

function atualizarContadores(profile) {
  estadoDaNuvem.pendentes = lerPendentes(profile).length;
  estadoDaNuvem.exclusoesPendentes = lerExclusoes(profile).filter(x => !x.enviada).length;
  avisarEstadoDaNuvem();
}

function marcarPendente(profile, deckId, pendente) {
  const fila = new Set(lerPendentes(profile));
  if (pendente) fila.add(deckId); else fila.delete(deckId);
  gravarJson(getPendentesKey(profile), Array.from(fila));
  atualizarContadores(profile);
}

function registrarEnviado(profile, deckId, assinatura) {
  const enviados = lerJson(getEnviadosKey(profile), {});
  enviados[deckId] = assinatura;
  gravarJson(getEnviadosKey(profile), enviados);
}

/*
  FUNÇÃO: registrarExclusaoDeBaralho
  PARA QUE SERVE: guarda a "lápide" de um baralho que VOCÊ mandou apagar e manda
  a nuvem apagá-lo. A lápide também é gravada na nuvem, para que o seu celular
  fique sabendo do que foi apagado no computador (e vice-versa).

  POR QUE ISSO É IMPORTANTE: é a única maneira de o app diferenciar "este baralho
  foi apagado de propósito" de "este baralho ainda não chegou neste aparelho".
  Sem isso, sincronizar ou apagava demais, ou ressuscitava o que já tinha morrido.
*/
export function registrarExclusaoDeBaralho(deckId, profile) {
  if (!deckId) return;
  const lista = lerExclusoes(profile).filter(x => x.id !== deckId);
  lista.push({ id: deckId, em: new Date().toISOString(), enviada: false });
  gravarJson(getExclusoesKey(profile), lista);

  const enviados = lerJson(getEnviadosKey(profile), {});
  delete enviados[deckId];
  gravarJson(getEnviadosKey(profile), enviados);
  marcarPendente(profile, deckId, false);
  atualizarContadores(profile);

  if (db) enviarExclusoesPendentes(profile).catch(err => console.warn('Exclusão ficou na fila:', err.message));
}

/*
  FUNÇÃO: enviarExclusoesPendentes
  PARA QUE SERVE: leva para a nuvem as exclusões que ficaram na fila (por exemplo,
  as que você fez sem internet). Só marca como "enviada" quando a nuvem confirma.
*/
async function enviarExclusoesPendentes(profile) {
  if (!db) return;
  const syncCode = deckCloudId(profile);
  const lista = lerExclusoes(profile);
  let mudou = false;
  for (const lapide of lista) {
    if (lapide.enviada) continue;
    try {
      await deleteDoc(doc(db, 'users', syncCode, 'decks', lapide.id));
      await setDoc(doc(db, 'users', syncCode, 'exclusoes', lapide.id), { em: lapide.em }, { merge: true });
      lapide.enviada = true;
      mudou = true;
    } catch (err) {
      estadoDaNuvem.ultimoErro = `Uma exclusão ainda não chegou na nuvem: ${err.message}`;
      avisarEstadoDaNuvem();
    }
  }
  if (mudou) gravarJson(getExclusoesKey(profile), lista);
  atualizarContadores(profile);
}

/*
  FUNÇÃO: carimbarAlteracoes
  PARA QUE SERVE: põe a data e hora (`updatedAt`) SOMENTE nos baralhos que de fato
  mudaram. É esse carimbo que permite ao sincronizador saber quem foi editado por
  último — o computador ou o celular — em vez de simplesmente deixar um dos lados
  atropelar o outro.
*/
function carimbarAlteracoes(sets, profile) {
  const anteriores = new Map(getSets(profile).map(d => [d.id, d]));
  const agora = new Date().toISOString();
  return (sets || []).map(deck => {
    const antigo = anteriores.get(deck.id);
    const mudou = !antigo || assinaturaDoBaralho(antigo) !== assinaturaDoBaralho(deck);
    return {
      ...deck,
      updatedAt: mudou ? agora : (antigo.updatedAt || deck.updatedAt || deck.createdAt || agora),
    };
  });
}

/*
  FUNÇÃO: enviarBaralhoParaNuvem
  PARA QUE SERVE: sobe UM baralho e só tira ele da fila quando a nuvem CONFIRMA.
  Se a nuvem recusar, o baralho continua na fila (e o selo fica vermelho) até a
  próxima sincronização conseguir.
*/
function enviarBaralhoParaNuvem(deck, profile, syncCode) {
  marcarPendente(profile, deck.id, true);
  const assinatura = assinaturaDoBaralho(deck);
  return setDoc(doc(db, 'users', syncCode, 'decks', deck.id), paraNuvem(deck), { merge: true })
    .then(() => {
      registrarEnviado(profile, deck.id, assinatura);
      marcarPendente(profile, deck.id, false);
      estadoDaNuvem.ultimoErro = '';
      estadoDaNuvem.ultimaSincronizacao = new Date().toISOString();
      avisarEstadoDaNuvem();
    })
    .catch(err => {
      estadoDaNuvem.ultimoErro = `O baralho "${deck.title || deck.id}" está salvo no aparelho, mas ainda não subiu: ${err.message}`;
      avisarEstadoDaNuvem();
    });
}

/*
  FUNÇÃO: saveSets
  PARA QUE SERVE: Salva os baralhos localmente na hora E envia as alterações para a
  nuvem do Firebase sob a gaveta do estudante ativo.

  O QUE ELA DEVOLVE: um objeto { ok, motivo }. Antes devolvia só `true`/`false` e
  ninguém olhava — quando o LocalStorage enchia, o erro ia para o console (onde
  você nunca veria) e a alteração se perdia EM SILÊNCIO. Agora o editor recebe o
  motivo e pinta o selo de "NÃO SALVOU" em vermelho na sua frente.

  O QUE ELA NÃO FAZ MAIS (e por quê): esta função NÃO apaga nada da nuvem.
  Ela varria a nuvem e apagava todo documento cujo id não estivesse na lista
  local — ou seja, um aparelho desatualizado (ou que ainda nem tinha terminado de
  baixar) apagava baralhos criados no outro. Faltar aqui não quer dizer "apagado".
  Exclusão de verdade agora só acontece por `registrarExclusaoDeBaralho`, quando
  VOCÊ manda apagar.
*/
export function saveSets(sets, profile) {
  // 1. Carimba o horário só de quem mudou (precisa acontecer ANTES de gravar por
  //    cima, porque usa a versão anterior para comparar).
  const carimbados = carimbarAlteracoes(sets, profile);

  // 2. Salva localmente para velocidade instantânea
  try {
    localStorage.setItem(getSetsKey(profile), JSON.stringify(carimbados));
  } catch (error) {
    const cheio = error && (error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014);
    console.error('Erro ao salvar os conjuntos:', error);
    return {
      ok: false,
      motivo: cheio
        ? 'A memória do navegador encheu. Apague prints antigos ou quebre este baralho em dois — nada foi gravado.'
        : `Não consegui gravar no navegador: ${error.message}`
    };
  }

  // 3. Se o Firebase estiver configurado, sobe SOMENTE o que mudou
  if (db) {
    try {
      const syncCode = deckCloudId(profile);
      const enviados = lerJson(getEnviadosKey(profile), {});
      const naFila = new Set(lerPendentes(profile));

      // Aproveita a carona para tentar de novo as exclusões que ficaram presas
      enviarExclusoesPendentes(profile).catch(err => console.warn('Exclusões ainda na fila:', err.message));

      carimbados.forEach(deck => {
        const jaConfirmado = enviados[deck.id] === assinaturaDoBaralho(deck) && !naFila.has(deck.id);
        if (jaConfirmado) return; // não mexeu, não sobe
        enviarBaralhoParaNuvem(deck, profile, syncCode);
      });
    } catch (error) {
      // A cópia local já está gravada: a nuvem falhar não é perda de dado.
      estadoDaNuvem.ultimoErro = `Modo offline: gravado só neste aparelho (${error.message}).`;
      avisarEstadoDaNuvem();
      console.warn('Modo Offline: baralhos gravados só no aparelho.', error.message);
    }
  }

  return { ok: true, motivo: '' };
}

/*
  FUNÇÃO: getStats
  PARA QUE SERVE: Lê suas conquistas e recordes da memória local do estudante ativo.
*/
export function getStats(profile) {
  try {
    const rawStats = localStorage.getItem(getStatsKey(profile));
    if (!rawStats) {
      saveStats(DEFAULT_STATS, profile);
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
  PARA QUE SERVE: Salva recordes e estatísticas do estudante ativo localmente e na nuvem.
*/
export function saveStats(stats, profile) {
  try {
    // 1. Salva localmente
    localStorage.setItem(getStatsKey(profile), JSON.stringify(stats));

    // 2. Envia para o Firebase
    if (db) {
      const syncCode = personalCloudId(profile);
      setDoc(doc(db, 'users', syncCode, 'stats', 'global_stats'), {
        stats_data: stats
      }, { merge: true }).catch(err => console.warn('Erro ao salvar estatísticas na nuvem Firebase:', err.message));
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar as estatísticas:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncDecksWithCloud
  PARA QUE SERVE: Roda silenciosamente ao abrir o app. Sincroniza baralhos do estudante ativo.
*/
// Marca (por perfil) que a "puxada autoritativa" única já rodou neste aparelho.
const DECK_AUTHPULL_PREFIX = 'flashcard_deck_authpull_v3';

export async function syncDecksWithCloud(profile) {
  if (!db) return null;
  try {
    const syncCode = deckCloudId(profile);

    // 1. Primeiro leva embora o que VOCÊ mandou apagar (inclusive o que ficou
    //    preso porque você estava sem internet).
    await enviarExclusoesPendentes(profile);

    // 2. Lê as lápides da nuvem: o que foi apagado no computador precisa sumir
    //    do celular também.
    const exclusoesLocais = lerExclusoes(profile);
    const apagados = new Set(exclusoesLocais.map(x => x.id));
    try {
      const lapides = await getDocs(collection(db, 'users', syncCode, 'exclusoes'));
      lapides.forEach(d => apagados.add(d.id));
    } catch (e) {
      // Sem as lápides da nuvem, o pior que acontece é um baralho apagado em
      // outro aparelho continuar aparecendo aqui até a próxima sincronização.
      console.warn('Não consegui ler a lista de exclusões da nuvem:', e.message);
    }

    const snapshot = await getDocs(collection(db, 'users', syncCode, 'decks'));
    const formattedCloud = snapshot.docs
      .map(docSnap => paraNuvem(docSnap.data()))
      .filter(deck => !apagados.has(deck.id));

    // 3. PRIMEIRA VEZ NESTE APARELHO (uma única vez por perfil):
    // A nuvem MANDA. Substitui o local pelo que estiver na nuvem — inclusive
    // lista vazia — e NÃO re-envia nada. Isso conserta de vez os perfis que
    // ficaram com baralhos trocados/duplicados entre Bruno e Bruna, sem o risco
    // de uma cópia velha guardada no navegador voltar a subir para a nuvem.
    // Num aparelho novo isso é inofensivo: a gaveta local está vazia mesmo.
    const authKey = `${DECK_AUTHPULL_PREFIX}_${profile}`;
    if (!localStorage.getItem(authKey)) {
      localStorage.setItem(getSetsKey(profile), JSON.stringify(formattedCloud));
      localStorage.setItem(authKey, '1');
      estadoDaNuvem.ultimaSincronizacao = new Date().toISOString();
      atualizarContadores(profile);
      return formattedCloud;
    }

    // 4. DAQUI PARA FRENTE É JUNÇÃO, NUNCA SUBSTITUIÇÃO.
    // Antes, se a nuvem tivesse qualquer coisa, o conteúdo local era jogado fora
    // inteiro — e tudo o que você tivesse escrito sem internet ia junto. Agora as
    // duas listas são juntadas pela regra de ouro (ver juntarBaralhosLocalENuvem)
    // e o que é mais novo aqui sobe para lá.
    const { lista, paraSubir } = juntarBaralhosLocalENuvem({
      locais: getSets(profile),
      nuvem: formattedCloud,
      pendentes: lerPendentes(profile),
      excluidos: Array.from(apagados),
    });

    try {
      localStorage.setItem(getSetsKey(profile), JSON.stringify(lista));
    } catch (e) {
      estadoDaNuvem.ultimoErro = `A memória do navegador não aceitou os baralhos da nuvem: ${e.message}`;
      avisarEstadoDaNuvem();
      return null;
    }

    for (const deck of paraSubir) {
      await enviarBaralhoParaNuvem(deck, profile, syncCode);
    }

    estadoDaNuvem.ultimaSincronizacao = new Date().toISOString();
    atualizarContadores(profile);
    return lista;
  } catch (err) {
    estadoDaNuvem.ultimoErro = `Modo offline: não consegui falar com a nuvem (${err.message}).`;
    avisarEstadoDaNuvem();
    console.warn('Modo Offline: Não foi possível sincronizar baralhos com a nuvem Firebase:', err.message);
  }
  return null;
}

/*
  =============================================================================
  RECUPERAÇÃO DE BARALHOS ANTIGOS (roda uma única vez por aparelho)
  Com o tempo o app mudou o nome da "gaveta" onde os baralhos ficam salvos no
  navegador (e o endereço na nuvem). Baralhos criados nas versões antigas podem ter
  ficado "órfãos" numa gaveta/código anterior. As funções abaixo varrem TODAS as
  gavetas e códigos antigos (no navegador E na nuvem) e trazem tudo de volta para o
  acervo compartilhado — sem o usuário precisar fazer nada.
  =============================================================================
*/

// Marca no navegador que a varredura de recuperação já rodou (para não repetir).
const RECOVERY_FLAG = 'flashcard_legacy_recovery_v2_done';

/*
  FUNÇÃO: mergeDecks
  PARA QUE SERVE: Junta duas listas de baralhos SEM duplicar (pela id). Em caso de
  conflito de mesma id, mantém a versão com MAIS cartões (para nunca perder conteúdo).
*/
export function mergeDecks(listA, listB) {
  const byId = new Map();
  const put = (deck) => {
    if (!deck || !deck.id) return;
    const norm = {
      id: deck.id,
      title: deck.title || 'Baralho recuperado',
      description: deck.description || '',
      category: deck.category || 'Sem Grupo',
      cards: Array.isArray(deck.cards) ? deck.cards : [],
      // A trilha viaja junto: sem esta linha, juntar duas listas de baralhos
      // devolveria os cartões e jogaria fora a matéria montada em blocos.
      blocos: Array.isArray(deck.blocos) ? deck.blocos : [],
      subItems: Array.isArray(deck.subItems) ? deck.subItems : [],
      subConnections: Array.isArray(deck.subConnections) ? deck.subConnections : [],
      createdAt: deck.createdAt || new Date().toISOString(),
    };
    const existing = byId.get(norm.id);
    if (!existing || norm.cards.length > existing.cards.length) {
      byId.set(norm.id, norm);
    }
  };
  (listA || []).forEach(put);
  (listB || []).forEach(put);
  return Array.from(byId.values());
}

/*
  FUNÇÃO ASSÍNCRONA: recoverLegacyDecks
  PARA QUE SERVE: Procura baralhos antigos em TODO lugar possível e devolve a lista
  unificada (já sem duplicatas):
    1) Todas as chaves do LocalStorage que guardam baralhos (com OU sem perfil).
    2) Todos os códigos de sincronização antigos guardados no navegador — busca os
       baralhos de cada um deles no Firestore.
    3) Os códigos fixos conhecidos (Bruno/Bruna) e o endereço compartilhado.
  Roda só uma vez por aparelho (guardado por RECOVERY_FLAG).
*/
export async function recoverLegacyDecks() {
  // DESLIGADA de propósito. Antes esta rotina varria todas as gavetas do navegador
  // e todos os códigos antigos da nuvem e "juntava" tudo mantendo sempre a versão
  // com MAIS cartões. Isso RESSUSCITAVA baralhos e cartões que o usuário já tinha
  // apagado (e misturava os baralhos entre os perfis). Agora cada perfil tem o seu
  // próprio acervo privado (ver deckCloudId) e as exclusões valem de verdade, então
  // esta recuperação não deve mais rodar. Mantida apenas para não quebrar quem a
  // importa. Marca a flag para não tentar nada em nenhum aparelho.
  try {
    localStorage.setItem(RECOVERY_FLAG, '1');
  } catch (e) { /* ignora */ }
  return null;
}

/*
  FUNÇÃO ASSÍNCRONA: syncStatsWithCloud
  PARA QUE SERVE: Sincroniza recordes do estudante ativo.
*/
export async function syncStatsWithCloud(profile) {
  if (!db) return null;
  try {
    const syncCode = personalCloudId(profile);
    const docRef = doc(db, 'users', syncCode, 'stats', 'global_stats');
    const docSnap = await getDoc(docRef);

    const localStats = getStats(profile);

    if (docSnap.exists() && docSnap.data().stats_data) {
      const cloudData = docSnap.data().stats_data;
      // Combina local e nuvem, priorizando sempre a melhor marca/maior número de estudos
      const mergedStats = {
        setsStudied: Math.max(localStats.setsStudied || 0, cloudData.setsStudied || 0),
        cardsMastered: Math.max(localStats.cardsMastered || 0, cloudData.cardsMastered || 0),
        bestMatchTime: (localStats.bestMatchTime === null)
          ? cloudData.bestMatchTime
          : (cloudData.bestMatchTime === null)
            ? localStats.bestMatchTime
            : Math.min(localStats.bestMatchTime, cloudData.bestMatchTime)
      };
      
      localStorage.setItem(getStatsKey(profile), JSON.stringify(mergedStats));
      return mergedStats;
    } else {
      // Sobe as estatísticas locais para o banco na nuvem
      await setDoc(docRef, {
        stats_data: localStats
      }, { merge: true });
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar estatísticas no Firebase:', err.message);
  }
  return null;
}

/*
  =============================================================================
  MÓDULO DE HÁBITOS (Fase 2 da plataforma)
  Segue exatamente o mesmo padrão híbrido dos baralhos: salva na hora no
  LocalStorage (velocidade) e espelha na nuvem do Firebase (backup/multi-aparelho),
  tudo isolado por perfil do estudante.
  =============================================================================
*/

/*
  FUNÇÃO: getHabits
  PARA QUE SERVE: Lê a lista de hábitos do estudante ativo. Começa VAZIA (sem exemplos),
  pois cada pessoa cria os próprios hábitos.
*/
export function getHabits(profile) {
  try {
    const raw = localStorage.getItem(getHabitsKey(profile));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler os hábitos:', error);
    return [];
  }
}

/*
  FUNÇÃO: saveHabits
  PARA QUE SERVE: Salva os hábitos localmente na hora E espelha na nuvem do Firebase
  sob a gaveta exclusiva do estudante ativo (removendo da nuvem os que foram apagados).
*/
export function saveHabits(habits, profile) {
  try {
    // 1. Salva localmente para velocidade instantânea
    localStorage.setItem(getHabitsKey(profile), JSON.stringify(habits));

    // 2. Se o Firebase estiver configurado, espelha as alterações na nuvem
    if (db) {
      const syncCode = personalCloudId(profile);
      const localIds = habits.map(h => h.id);

      // Remove da nuvem os hábitos que foram excluídos localmente
      getDocs(collection(db, 'users', syncCode, 'habits')).then(snapshot => {
        snapshot.forEach(cloudDoc => {
          if (!localIds.includes(cloudDoc.id)) {
            deleteDoc(doc(db, 'users', syncCode, 'habits', cloudDoc.id)).catch(err => console.warn(err));
          }
        });
      }).catch(err => console.warn('Erro ao ler hábitos da nuvem:', err));

      // Salva ou atualiza cada hábito na nuvem
      habits.forEach(habit => {
        setDoc(doc(db, 'users', syncCode, 'habits', habit.id), {
          id: habit.id,
          name: habit.name,
          emoji: habit.emoji || '✅',
          color: habit.color || '#14b8a6',
          history: habit.history || {},
          createdAt: habit.createdAt || new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Erro ao atualizar hábito na nuvem:', err));
      });
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar os hábitos:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncHabitsWithCloud
  PARA QUE SERVE: Roda ao abrir o app. Se a nuvem tem hábitos, baixa e atualiza a tela.
  Se a nuvem está vazia, sobe os hábitos locais para lá.
*/
export async function syncHabitsWithCloud(profile) {
  if (!db) return null;
  try {
    const syncCode = personalCloudId(profile);
    const snapshot = await getDocs(collection(db, 'users', syncCode, 'habits'));
    const cloudHabits = snapshot.docs.map(doc => doc.data());

    const localHabits = getHabits(profile);

    if (cloudHabits && cloudHabits.length > 0) {
      // Nuvem tem dados! Atualiza o armazenamento local.
      const formatted = cloudHabits.map(h => ({
        id: h.id,
        name: h.name,
        emoji: h.emoji || '✅',
        color: h.color || '#14b8a6',
        history: h.history || {},
        createdAt: h.createdAt || new Date().toISOString()
      }));
      localStorage.setItem(getHabitsKey(profile), JSON.stringify(formatted));
      return formatted;
    } else if (localHabits && localHabits.length > 0) {
      // Nuvem vazia: sobe os hábitos locais
      for (const habit of localHabits) {
        await setDoc(doc(db, 'users', syncCode, 'habits', habit.id), {
          id: habit.id,
          name: habit.name,
          emoji: habit.emoji || '✅',
          color: habit.color || '#14b8a6',
          history: habit.history || {},
          createdAt: habit.createdAt || new Date().toISOString()
        }, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar hábitos com a nuvem Firebase:', err.message);
  }
  return null;
}

/*
  =============================================================================
  MÓDULO FINANCEIRO (Fase 3 da plataforma)
  Guarda os dados financeiros do estudante ativo de forma híbrida:
    - LocalStorage: um único objeto { transactions, recurring, budget }.
    - Firebase: as transações (com recibos) ficam numa subcoleção "finance_tx"
      (uma por documento, para escalar sem estourar o limite de 1MB por doc),
      e as configurações (contas fixas + meta de gastos) num doc "finance/settings".
  =============================================================================
*/

// Estrutura padrão vazia das finanças.
// initialBalance = dinheiro que a pessoa JÁ tinha guardado antes de começar a usar o
// app (o "quanto tenho hoje"). Entra no saldo em conta SEM virar receita do mês.
const DEFAULT_FINANCE = { transactions: [], recurring: [], budget: null, initialBalance: 0 };

// Chave LOCAL ÚNICA e compartilhada das finanças. O dinheiro é do casal (Bruno +
// Bruna), então fica num acervo só — igual ao Quadro dos Sonhos e aos Documentos.
// Cada lançamento guarda quem o criou no campo "author".
const STORAGE_FINANCE_SHARED_KEY = 'plataforma_finance_shared_v1';
// Marca (uma vez por aparelho) que a migração do financeiro antigo (que era separado
// por perfil) para o acervo compartilhado já foi feita.
const FINANCE_MIGRATION_FLAG = 'flashcard_finance_shared_migrated_v1';

/*
  FUNÇÃO: getFinance
  PARA QUE SERVE: Lê os dados financeiros COMPARTILHADOS do LocalStorage.
*/
export function getFinance() {
  try {
    const raw = localStorage.getItem(STORAGE_FINANCE_SHARED_KEY);
    if (!raw) return { ...DEFAULT_FINANCE };
    const parsed = JSON.parse(raw);
    return {
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
      budget: typeof parsed.budget === 'number' ? parsed.budget : null,
      initialBalance: typeof parsed.initialBalance === 'number' ? parsed.initialBalance : 0,
    };
  } catch (error) {
    console.error('Erro ao ler as finanças:', error);
    return { ...DEFAULT_FINANCE };
  }
}

/*
  FUNÇÃO: saveFinance
  PARA QUE SERVE: Salva as finanças COMPARTILHADAS localmente na hora E espelha na nuvem
  do Firebase, sob o endereço compartilhado do casal (SHARED_CLOUD_ID).
*/
export function saveFinance(finance) {
  try {
    // 1. Salva localmente para velocidade instantânea
    localStorage.setItem(STORAGE_FINANCE_SHARED_KEY, JSON.stringify(finance));

    // 2. Se o Firebase estiver configurado, espelha na nuvem (acervo compartilhado)
    if (db) {
      const syncCode = SHARED_CLOUD_ID;

      // 2a. Configurações fixas (contas recorrentes + meta de gastos + saldo inicial)
      setDoc(doc(db, 'users', syncCode, 'finance', 'settings'), {
        recurring: finance.recurring || [],
        budget: finance.budget ?? null,
        initialBalance: finance.initialBalance ?? 0
      }, { merge: true }).catch(err => console.warn('Erro ao salvar config financeira na nuvem:', err));

      // 2b. Transações — remove da nuvem as que foram excluídas localmente
      const localIds = (finance.transactions || []).map(t => t.id);
      getDocs(collection(db, 'users', syncCode, 'finance_tx')).then(snapshot => {
        snapshot.forEach(cloudDoc => {
          if (!localIds.includes(cloudDoc.id)) {
            deleteDoc(doc(db, 'users', syncCode, 'finance_tx', cloudDoc.id)).catch(err => console.warn(err));
          }
        });
      }).catch(err => console.warn('Erro ao ler transações da nuvem:', err));

      // 2c. Salva/atualiza cada transação
      (finance.transactions || []).forEach(tx => {
        setDoc(doc(db, 'users', syncCode, 'finance_tx', tx.id), tx, { merge: true })
          .catch(err => console.warn('Erro ao salvar transação na nuvem:', err));
      });
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar as finanças:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncFinanceWithCloud
  PARA QUE SERVE: Roda ao abrir o app. Lê o acervo financeiro COMPARTILHADO da nuvem.
  Se a nuvem tem dados, baixa e atualiza a tela. Se está vazia, sobe os dados locais.
*/
export async function syncFinanceWithCloud() {
  if (!db) return null;
  try {
    const syncCode = SHARED_CLOUD_ID;

    const txSnap = await getDocs(collection(db, 'users', syncCode, 'finance_tx'));
    const cloudTx = txSnap.docs.map(d => d.data());

    const setSnap = await getDoc(doc(db, 'users', syncCode, 'finance', 'settings'));
    const cloudSettings = setSnap.exists() ? setSnap.data() : null;

    const local = getFinance();

    const cloudHasData =
      (cloudTx && cloudTx.length > 0) ||
      (cloudSettings && ((cloudSettings.recurring && cloudSettings.recurring.length > 0) || cloudSettings.budget != null || cloudSettings.initialBalance));

    if (cloudHasData) {
      // Nuvem tem dados! Atualiza o armazenamento local.
      const merged = {
        transactions: cloudTx || [],
        recurring: (cloudSettings && cloudSettings.recurring) || local.recurring || [],
        budget: (cloudSettings && cloudSettings.budget != null) ? cloudSettings.budget : local.budget,
        initialBalance: (cloudSettings && typeof cloudSettings.initialBalance === 'number') ? cloudSettings.initialBalance : (local.initialBalance || 0)
      };
      localStorage.setItem(STORAGE_FINANCE_SHARED_KEY, JSON.stringify(merged));
      return merged;
    } else if (local.transactions.length > 0 || local.recurring.length > 0 || local.budget != null || local.initialBalance) {
      // Nuvem vazia: sobe os dados locais
      await setDoc(doc(db, 'users', syncCode, 'finance', 'settings'), {
        recurring: local.recurring,
        budget: local.budget ?? null,
        initialBalance: local.initialBalance ?? 0
      }, { merge: true });
      for (const tx of local.transactions) {
        await setDoc(doc(db, 'users', syncCode, 'finance_tx', tx.id), tx, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar finanças com a nuvem Firebase:', err.message);
  }
  return null;
}

/*
  FUNÇÃO ASSÍNCRONA: migrateFinanceToShared
  PARA QUE SERVE: Junta (uma ÚNICA vez por aparelho) todo o financeiro que ficava
  SEPARADO por perfil — no navegador e na nuvem — dentro do novo acervo COMPARTILHADO
  do casal, carimbando em cada lançamento QUEM o criou (author). É não-destrutivo:
  só soma, nunca apaga. Assim ninguém perde o que já tinha lançado.
*/
export async function migrateFinanceToShared() {
  try {
    if (localStorage.getItem(FINANCE_MIGRATION_FLAG)) return null;

    const txById = new Map();
    const recById = new Map();
    let budget = null;
    let initialBalance = 0;

    const absorb = (fin, author) => {
      if (!fin) return;
      (fin.transactions || []).forEach(t => {
        if (!t || !t.id) return;
        const prev = txById.get(t.id);
        txById.set(t.id, { ...t, author: t.author || (prev && prev.author) || author || '' });
      });
      (fin.recurring || []).forEach(r => {
        if (!r || !r.id) return;
        const prev = recById.get(r.id);
        recById.set(r.id, { ...r, author: r.author || (prev && prev.author) || author || '' });
      });
      if (budget == null && typeof fin.budget === 'number') budget = fin.budget;
      if (typeof fin.initialBalance === 'number' && fin.initialBalance > initialBalance) initialBalance = fin.initialBalance;
    };

    const readCloudFinance = async (ns) => {
      const txSnap = await getDocs(collection(db, 'users', ns, 'finance_tx'));
      const setSnap = await getDoc(doc(db, 'users', ns, 'finance', 'settings'));
      return {
        transactions: txSnap.docs.map(d => d.data()),
        recurring: (setSnap.exists() && setSnap.data().recurring) || [],
        budget: setSnap.exists() ? setSnap.data().budget : null,
        initialBalance: setSnap.exists() ? setSnap.data().initialBalance : 0,
      };
    };

    // 1) O que já estiver no acervo compartilhado (nuvem) tem prioridade
    if (db) {
      try { absorb(await readCloudFinance(SHARED_CLOUD_ID), ''); } catch (e) { /* ignora */ }
    }

    // 2) Financeiro LOCAL antigo, gaveta por gaveta de cada perfil no navegador
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${STORAGE_FINANCE_KEY}_`)) continue;
      const author = key.slice(STORAGE_FINANCE_KEY.length + 1); // nome do perfil dono da gaveta
      try { absorb(JSON.parse(localStorage.getItem(key)), author); } catch (e) { /* ignora */ }
    }

    // 3) Financeiro na NUVEM antigo, no código pessoal de cada perfil
    if (db) {
      for (const p of getProfiles()) {
        try { absorb(await readCloudFinance(personalCloudId(p)), p); } catch (e) { /* ignora */ }
      }
    }

    const merged = {
      transactions: Array.from(txById.values()),
      recurring: Array.from(recById.values()),
      budget,
      initialBalance,
    };

    // Grava no acervo compartilhado (local + nuvem) e marca a migração como concluída.
    saveFinance(merged);
    localStorage.setItem(FINANCE_MIGRATION_FLAG, '1');
    return merged;
  } catch (e) {
    console.warn('Falha ao migrar finanças para o acervo compartilhado:', e.message);
    return null;
  }
}

/*
  =============================================================================
  MÓDULO QUADRO DOS SONHOS (compartilhado entre todos os perfis)
  Os sonhos são do casal — ficam num único acervo, igual aos baralhos:
  LocalStorage numa chave única (sem perfil) + nuvem sob o SHARED_CLOUD_ID.
  =============================================================================
*/

const STORAGE_DREAMS_KEY = 'plataforma_dreams_v1';

export function getDreams() {
  try {
    const raw = localStorage.getItem(STORAGE_DREAMS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Erro ao ler os sonhos:', error);
    return [];
  }
}

export function saveDreams(dreams) {
  try {
    localStorage.setItem(STORAGE_DREAMS_KEY, JSON.stringify(dreams));
    if (db) {
      const localIds = dreams.map(d => d.id);
      getDocs(collection(db, 'users', SHARED_CLOUD_ID, 'dreams')).then(snapshot => {
        snapshot.forEach(cloudDoc => {
          if (!localIds.includes(cloudDoc.id)) {
            deleteDoc(doc(db, 'users', SHARED_CLOUD_ID, 'dreams', cloudDoc.id)).catch(err => console.warn(err));
          }
        });
      }).catch(err => console.warn('Erro ao ler sonhos da nuvem:', err));

      dreams.forEach(dream => {
        setDoc(doc(db, 'users', SHARED_CLOUD_ID, 'dreams', dream.id), dream, { merge: true })
          .catch(err => console.warn('Erro ao salvar sonho na nuvem:', err));
      });
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar os sonhos:', error);
    return false;
  }
}

export async function syncDreamsWithCloud() {
  if (!db) return null;
  try {
    const snapshot = await getDocs(collection(db, 'users', SHARED_CLOUD_ID, 'dreams'));
    const cloudDreams = snapshot.docs.map(d => d.data());
    const localDreams = getDreams();

    if (cloudDreams.length > 0) {
      localStorage.setItem(STORAGE_DREAMS_KEY, JSON.stringify(cloudDreams));
      return cloudDreams;
    } else if (localDreams.length > 0) {
      for (const dream of localDreams) {
        await setDoc(doc(db, 'users', SHARED_CLOUD_ID, 'dreams', dream.id), dream, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar sonhos:', err.message);
  }
  return null;
}

/*
  =============================================================================
  MÓDULO DOCUMENTOS (compartilhado entre todos os perfis)
  Repositório da família: cada documento é um doc próprio no Firestore
  (arquivos pequenos em base64 ou links), espelhado no LocalStorage.
  =============================================================================
*/

const STORAGE_DOCUMENTS_KEY = 'plataforma_documents_v1';

export function getDocuments() {
  try {
    const raw = localStorage.getItem(STORAGE_DOCUMENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error('Erro ao ler os documentos:', error);
    return [];
  }
}

export function saveDocuments(documents) {
  try {
    localStorage.setItem(STORAGE_DOCUMENTS_KEY, JSON.stringify(documents));
    if (db) {
      const localIds = documents.map(d => d.id);
      getDocs(collection(db, 'users', SHARED_CLOUD_ID, 'documents')).then(snapshot => {
        snapshot.forEach(cloudDoc => {
          if (!localIds.includes(cloudDoc.id)) {
            deleteDoc(doc(db, 'users', SHARED_CLOUD_ID, 'documents', cloudDoc.id)).catch(err => console.warn(err));
          }
        });
      }).catch(err => console.warn('Erro ao ler documentos da nuvem:', err));

      documents.forEach(d => {
        setDoc(doc(db, 'users', SHARED_CLOUD_ID, 'documents', d.id), d, { merge: true })
          .catch(err => console.warn('Erro ao salvar documento na nuvem:', err));
      });
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar os documentos:', error);
    return false;
  }
}

export async function syncDocumentsWithCloud() {
  if (!db) return null;
  try {
    const snapshot = await getDocs(collection(db, 'users', SHARED_CLOUD_ID, 'documents'));
    const cloudDocuments = snapshot.docs.map(d => d.data());
    const localDocuments = getDocuments();

    if (cloudDocuments.length > 0) {
      localStorage.setItem(STORAGE_DOCUMENTS_KEY, JSON.stringify(cloudDocuments));
      return cloudDocuments;
    } else if (localDocuments.length > 0) {
      for (const d of localDocuments) {
        await setDoc(doc(db, 'users', SHARED_CLOUD_ID, 'documents', d.id), d, { merge: true });
      }
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar documentos:', err.message);
  }
  return null;
}

/*
  =============================================================================
  MÓDULO CADERNO (anotações livres por baralho — canvas infinito da tldraw)
  Cada baralho tem um "caderno" próprio (desenhos à caneta, fotos, textos, marca-
  texto). Guardamos de forma híbrida:
    - LocalStorage: um JSON por baralho (rápido, abre na hora, funciona offline).
    - Firebase: o MESMO JSON, PARTIDO em pedaços (chunks) numa subcoleção — porque
      um caderno com fotos passa fácil do limite de 1MB por documento do Firestore.
  Fica sob o MESMO endereço privado dos baralhos do perfil (deckCloudId), então o
  caderno acompanha o baralho em qualquer aparelho (celular, tablet, computador).
  =============================================================================
*/

const notebookLocalKey = (deckId) => `plataforma_notebook_${deckId}`;
const NOTEBOOK_CHUNK_SIZE = 700000; // ~700 mil caracteres por documento (seguro < 1MB)

/*
  CÓPIA LOCAL DO CADERNO — agora no IndexedDB, não mais no LocalStorage.

  POR QUE MUDOU: o LocalStorage tem teto de ~5MB para o site inteiro. Um caderno
  com dois ou três prints colados passa disso sozinho. Quando estourava, o
  navegador lançava erro, a função devolvia `false` em silêncio e a cópia local
  simplesmente NÃO existia. Aí, na próxima vez que você abrisse o caderno, o app
  dependia 100% da leitura da nuvem — e se ela falhasse, a tela vinha em branco e
  o branco era salvo por cima do seu desenho.

  O IndexedDB não tem esse teto (são centenas de MB) e é o mesmo banco onde as
  notas do Cofre já moram com segurança.
*/
export async function getNotebookLocal(deckId) {
  try {
    const guardado = await idbGetMeta(`notebook:${deckId}`, null);
    if (guardado) return guardado;

    // Migração: se ainda existir uma cópia antiga no LocalStorage, aproveita e
    // move para o IndexedDB — assim ninguém perde o que já estava salvo.
    const antigo = localStorage.getItem(notebookLocalKey(deckId));
    if (antigo) {
      await idbSetMeta(`notebook:${deckId}`, antigo);
      localStorage.removeItem(notebookLocalKey(deckId));
      return antigo;
    }
    return null;
  } catch (e) {
    console.warn('[Caderno] Não consegui ler a cópia local:', e.message);
    return null;
  }
}

export async function saveNotebookLocal(deckId, json) {
  try {
    await idbSetMeta(`notebook:${deckId}`, json);
    return true;
  } catch (e) {
    // Falhar aqui é grave: sem cópia local, o caderno fica refém da internet.
    console.error('[Caderno] FALHA ao gravar a cópia local:', e.message);
    return false;
  }
}

export async function loadNotebookFromCloud(profile, deckId) {
  if (!db) return null;
  try {
    const ns = deckCloudId(profile);
    const metaSnap = await getDoc(doc(db, 'users', ns, 'notebooks', deckId));
    if (!metaSnap.exists()) return null;
    const chunkCount = metaSnap.data().chunkCount || 0;
    let json = '';
    for (let i = 0; i < chunkCount; i++) {
      const partSnap = await getDoc(doc(db, 'users', ns, 'notebooks', deckId, 'parts', String(i)));
      if (partSnap.exists()) json += partSnap.data().data || '';
    }
    return json || null;
  } catch (e) {
    console.warn('Erro ao carregar caderno da nuvem:', e.message);
    return null;
  }
}

export async function saveNotebookToCloud(profile, deckId, json) {
  if (!db) return false;
  try {
    const ns = deckCloudId(profile);
    const chunks = [];
    for (let i = 0; i < json.length; i += NOTEBOOK_CHUNK_SIZE) chunks.push(json.slice(i, i + NOTEBOOK_CHUNK_SIZE));

    // Grava cada pedaço do caderno
    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(db, 'users', ns, 'notebooks', deckId, 'parts', String(i)), { i, data: chunks[i] });
    }
    // Remove pedaços antigos que sobraram (caso o caderno tenha diminuído)
    const existing = await getDocs(collection(db, 'users', ns, 'notebooks', deckId, 'parts'));
    for (const d of existing.docs) {
      const idx = parseInt(d.id, 10);
      if (!isNaN(idx) && idx >= chunks.length) {
        await deleteDoc(doc(db, 'users', ns, 'notebooks', deckId, 'parts', d.id)).catch(() => {});
      }
    }
    // Grava a "capa" (metadata) com a contagem de pedaços
    await setDoc(doc(db, 'users', ns, 'notebooks', deckId), {
      deckId, chunkCount: chunks.length, updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('Erro ao salvar caderno na nuvem:', e.message);
    return false;
  }
}

/*
  =============================================================================
  MÓDULO AULAS (a aula da faculdade, em HTML, guardada dentro da matéria)

  O QUE É: cada matéria (baralho) pode guardar as aulas que você teve, uma por
  uma — "Aula 01", "Aula 02" — e cada aula é uma PÁGINA HTML pronta, do jeito
  que ela foi entregue. A página abre dentro do app, com o visual dela intacto.

  POR QUE O HTML NÃO MORA DENTRO DO BARALHO: o baralho é gravado no
  LocalStorage (teto de ~5MB para o site TODO) e espelhado num documento do
  Firestore (teto de 1MB por documento). Uma única aula com imagens embutidas
  estoura os dois sozinha — e o baralho INTEIRO deixaria de salvar, levando
  junto os flashcards e a trilha. Por isso a aula segue o mesmo caminho já
  provado do Caderno:

    - no baralho fica só a FICHA da aula (título, número, data, tamanho);
    - o HTML em si vai para o IndexedDB (centenas de MB, sem aperto);
    - e para a nuvem PARTIDO em pedaços, numa subcoleção só dele.

  Endereço na nuvem: users/<deckCloudId>/aulas/<aulaId>/parts/<n>
  Fica sob o mesmo endereço privado dos baralhos do perfil, então a aula
  acompanha a matéria em qualquer aparelho.
  =============================================================================
*/

const AULA_CHUNK_SIZE = 700000; // ~700 mil caracteres por documento (seguro < 1MB)

/*
  comLimiteDeTempo: promete devolver uma resposta em no máximo X milissegundos.

  POR QUE ISSO PRECISA EXISTIR: quando o aparelho está sem internet, a leitura
  do Firestore NÃO devolve erro na hora — ela fica pendurada esperando a rede
  voltar. Sem um limite, abrir uma aula com o wi-fi caído deixaria a tela em
  "Abrindo a aula…" para sempre. Com o limite, a tela desiste da nuvem e segue.
*/
function comLimiteDeTempo(promessa, ms, valorPadrao = null) {
  return Promise.race([
    promessa,
    new Promise((resolve) => setTimeout(() => resolve(valorPadrao), ms)),
  ]).catch(() => valorPadrao);
}

/* Cópia local da aula (IndexedDB — o mesmo banco do Caderno e do Cofre). */
export async function getAulaLocal(aulaId) {
  try {
    return await idbGetMeta(`aula:${aulaId}`, null);
  } catch (e) {
    console.warn('[Aula] Não consegui ler a cópia local:', e.message);
    return null;
  }
}

export async function saveAulaLocal(aulaId, html) {
  try {
    await idbSetMeta(`aula:${aulaId}`, html);
    return true;
  } catch (e) {
    // Falhar aqui é grave: sem cópia local a aula fica refém da internet.
    console.error('[Aula] FALHA ao gravar a cópia local:', e.message);
    return false;
  }
}

export async function deleteAulaLocal(aulaId) {
  try {
    await idbDeleteMeta(`aula:${aulaId}`);
    return true;
  } catch (e) {
    console.warn('[Aula] Não consegui apagar a cópia local:', e.message);
    return false;
  }
}

export async function loadAulaFromCloud(profile, aulaId) {
  if (!db) return null;
  try {
    const ns = deckCloudId(profile);
    const metaSnap = await getDoc(doc(db, 'users', ns, 'aulas', aulaId));
    if (!metaSnap.exists()) return null;
    const chunkCount = metaSnap.data().chunkCount || 0;
    let html = '';
    for (let i = 0; i < chunkCount; i++) {
      const partSnap = await getDoc(doc(db, 'users', ns, 'aulas', aulaId, 'parts', String(i)));
      if (partSnap.exists()) html += partSnap.data().data || '';
    }
    return html || null;
  } catch (e) {
    console.warn('[Aula] Erro ao carregar da nuvem:', e.message);
    return null;
  }
}

export async function saveAulaToCloud(profile, aulaId, html) {
  if (!db) return false;
  try {
    const ns = deckCloudId(profile);
    const chunks = [];
    for (let i = 0; i < html.length; i += AULA_CHUNK_SIZE) chunks.push(html.slice(i, i + AULA_CHUNK_SIZE));

    for (let i = 0; i < chunks.length; i++) {
      await setDoc(doc(db, 'users', ns, 'aulas', aulaId, 'parts', String(i)), { i, data: chunks[i] });
    }
    // Se a aula encolheu, os pedaços que sobraram viram lixo: apaga.
    const existing = await getDocs(collection(db, 'users', ns, 'aulas', aulaId, 'parts'));
    for (const d of existing.docs) {
      const idx = parseInt(d.id, 10);
      if (!isNaN(idx) && idx >= chunks.length) {
        await deleteDoc(doc(db, 'users', ns, 'aulas', aulaId, 'parts', d.id)).catch(() => {});
      }
    }
    await setDoc(doc(db, 'users', ns, 'aulas', aulaId), {
      aulaId, chunkCount: chunks.length, updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn('[Aula] Erro ao salvar na nuvem:', e.message);
    return false;
  }
}

export async function deleteAulaFromCloud(profile, aulaId) {
  if (!db) return false;
  try {
    const ns = deckCloudId(profile);
    const existing = await getDocs(collection(db, 'users', ns, 'aulas', aulaId, 'parts'));
    for (const d of existing.docs) {
      await deleteDoc(doc(db, 'users', ns, 'aulas', aulaId, 'parts', d.id)).catch(() => {});
    }
    await deleteDoc(doc(db, 'users', ns, 'aulas', aulaId)).catch(() => {});
    return true;
  } catch (e) {
    console.warn('[Aula] Erro ao apagar da nuvem:', e.message);
    return false;
  }
}

/*
  carregarAula: o jeito certo de abrir uma aula.
  Tenta o aparelho primeiro (abre na hora, funciona sem internet). Se aqui não
  tiver — porque a aula foi criada no computador e você está no celular — busca
  na nuvem e JÁ GUARDA a cópia local, para a próxima vez ser instantânea.
*/
export async function carregarAula(profile, aulaId) {
  const local = await getAulaLocal(aulaId);
  if (local) return { html: local, origem: 'aparelho' };

  // 12 segundos é generoso para uma aula grande e curto o bastante para você
  // não ficar olhando para uma tela parada quando a internet está fora.
  const nuvem = await comLimiteDeTempo(loadAulaFromCloud(profile, aulaId), 12000, null);
  if (nuvem) {
    await saveAulaLocal(aulaId, nuvem);
    return { html: nuvem, origem: 'nuvem' };
  }
  return { html: null, origem: 'nenhuma' };
}

/*
  salvarAula: grava no aparelho e manda para a nuvem.

  A ORDEM IMPORTA e é de propósito: o IndexedDB vem primeiro e é o ÚNICO que
  decide se o salvamento deu certo. A nuvem é espelho.

  E A NUVEM NÃO É ESPERADA — de propósito também. Sem internet, o `setDoc` do
  Firestore não devolve erro: ele guarda a escrita e fica pendurado até a rede
  voltar. Se a tela esperasse por ele, o botão ficaria em "Salvando…" para
  sempre e você acharia que a aula se perdeu — quando na verdade ela já estava
  gravada no aparelho. Disparamos a subida e seguimos; ela termina sozinha, e
  se falhar de vez o aviso aparece no console (nunca engolimos o erro).
*/
export async function salvarAula(profile, aulaId, html) {
  const gravouLocal = await saveAulaLocal(aulaId, html);
  if (!gravouLocal) {
    return { ok: false, motivo: 'Não consegui gravar a aula neste aparelho. Nada foi salvo.' };
  }
  saveAulaToCloud(profile, aulaId, html).then((foi) => {
    if (!foi) console.warn(`[Aula] ${aulaId} ficou só no aparelho por enquanto.`);
  });
  return { ok: true, motivo: '' };
}

/* apagarAula: tira a aula do aparelho E da nuvem (a ficha sai junto com o baralho). */
export async function apagarAula(profile, aulaId) {
  await deleteAulaLocal(aulaId);
  await deleteAulaFromCloud(profile, aulaId);
}

/*
  =============================================================================
  CÓPIA DE SEGURANÇA: EXPORTAR, CONFERIR, ADICIONAR E RESTAURAR

  A DIFERENÇA QUE FALTAVA: "adicionar uma aula" e "restaurar um backup" são duas
  coisas MUITO diferentes, e antes eram a mesma função — importar um arquivinho
  com uma aula APAGAVA todos os seus outros baralhos, sem aviso e sem volta.
  Agora:
    - ADICIONAR  -> junta o conteúdo novo e não encosta em nada que já existe.
    - RESTAURAR  -> substitui tudo, mas só depois de mostrar a prévia, pedir
                    confirmação e guardar uma cópia do estado anterior.
  =============================================================================
*/

// Onde fica a cópia do estado anterior a uma restauração (a rede de proteção).
const getCopiaSegurancaKey = (profile) => `flashcard_backup_antes_de_restaurar_${profile || 'default'}`;

export function exportBackup(profile) {
  const sets = getSets(profile);
  const stats = getStats(profile);

  const backupData = {
    app: BACKUP_APP_ID,
    version: '1.1.0',
    profile: profile || '',
    exportDate: new Date().toISOString(),
    sets: sets,
    stats: stats
  };

  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(backupData, null, 2))}`;
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', jsonString);
  downloadAnchor.setAttribute('download', `backup_meus_flashcards_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/*
  FUNÇÃO: analisarBackup
  PARA QUE SERVE: lê o arquivo e devolve a prévia SEM gravar nada. É ela que
  alimenta a telinha de confirmação ("vou adicionar 12 baralhos; 2 já existem").
*/
export function analisarBackup(jsonContent, profile) {
  let data;
  try {
    data = JSON.parse(jsonContent);
  } catch {
    return { valido: false, erro: 'O arquivo está corrompido: não consegui ler o conteúdo.' };
  }
  const conferido = validarConteudoDeBackup(data);
  if (!conferido.valido) return conferido;

  return {
    valido: true,
    erro: '',
    problemas: conferido.problemas || [],
    temEstatisticas: !!conferido.stats,
    resumo: compararComOAcervo(conferido.sets, getSets(profile)),
    acervoAtual: getSets(profile).length,
  };
}

/*
  FUNÇÃO: importBackup
  PARA QUE SERVE: coloca no acervo o conteúdo de um arquivo .json, de dois jeitos:

    modo 'adicionar' (o padrão e o que você usa no dia a dia):
      - baralho igual a um que você já tem  -> ignorado (importar duas vezes o
        mesmo arquivo NÃO duplica nada);
      - baralho com o mesmo id mas conteúdo diferente -> entra como CÓPIA, com id
        novo e "(importado)" no título. O seu continua intacto;
      - baralho novo -> entra;
      - estatísticas e histórico NÃO são tocados.

    modo 'restaurar' (só a partir da confirmação explícita na tela):
      - guarda uma cópia do estado atual antes de qualquer coisa;
      - substitui os baralhos e as estatísticas pelo arquivo.
*/
export function importBackup(jsonContent, profile, modo = 'adicionar') {
  let data;
  try {
    data = JSON.parse(jsonContent);
  } catch {
    return { success: false, message: 'Falha ao importar: o arquivo está corrompido ou é inválido.' };
  }

  const conferido = validarConteudoDeBackup(data);
  if (!conferido.valido) {
    // NADA foi alterado: a validação acontece toda antes da primeira gravação.
    return { success: false, message: `Falha ao importar: ${conferido.erro}` };
  }

  const atuais = getSets(profile);

  if (modo === 'restaurar') {
    // Rede de proteção: guarda o estado anterior antes de substituir.
    try {
      localStorage.setItem(getCopiaSegurancaKey(profile), JSON.stringify({
        em: new Date().toISOString(),
        sets: atuais,
        stats: getStats(profile),
      }));
    } catch (e) {
      console.warn('Não consegui guardar a cópia de segurança antes de restaurar:', e.message);
    }

    const resultado = saveSets(conferido.sets, profile);
    if (!resultado.ok) {
      return { success: false, message: `Falha ao restaurar: ${resultado.motivo}` };
    }
    if (conferido.stats) saveStats(conferido.stats, profile);
    return {
      success: true,
      message: `Backup restaurado: ${conferido.sets.length} baralhos. O acervo anterior (${atuais.length} baralhos) ficou guardado neste aparelho.`,
    };
  }

  // ----- MODO ADICIONAR -----
  const porId = new Map(atuais.map(d => [d.id, d]));
  const finais = [...atuais];
  let novos = 0, ignorados = 0, copias = 0;

  conferido.sets.forEach(deck => {
    const existente = porId.get(deck.id);
    if (!existente) {
      finais.push(deck);
      porId.set(deck.id, deck);
      novos++;
      return;
    }
    if (assinaturaDeConteudo(existente) === assinaturaDeConteudo(deck)) {
      ignorados++; // já está aqui, idêntico: não duplica
      return;
    }
    const copia = {
      ...deck,
      id: `${deck.id}-imp-${Date.now().toString(36)}-${copias}`,
      title: `${deck.title} (importado)`,
      createdAt: new Date().toISOString(),
    };
    finais.push(copia);
    porId.set(copia.id, copia);
    copias++;
  });

  if (novos === 0 && copias === 0) {
    return { success: true, message: 'Nada novo para adicionar: esse conteúdo já está no seu acervo.' };
  }

  const resultado = saveSets(finais, profile);
  if (!resultado.ok) {
    return { success: false, message: `Falha ao adicionar: ${resultado.motivo}` };
  }

  const partes = [];
  if (novos) partes.push(`${novos} baralho(s) novo(s)`);
  if (copias) partes.push(`${copias} cópia(s) de baralhos que já existiam`);
  if (ignorados) partes.push(`${ignorados} ignorado(s) por serem idênticos`);
  return {
    success: true,
    message: `Conteúdo adicionado: ${partes.join(', ')}. Seus ${atuais.length} baralhos anteriores continuam aqui.`,
  };
}

/*
  =============================================================================
  MÓDULO BRUNO OS: O CÉREBRO DIGITAL (MAPA MENTAL INTERATIVO)
  Funções para carregar, salvar e sincronizar o Mapa Mental de Vida no navegador
  e na nuvem do Firebase Firestore.
  =============================================================================
*/

// Chave local para salvar a estrutura do cérebro por estudante no LocalStorage
const getMindMapStorageKey = (profile) => `bruno_os_mindmap_v1_${profile || 'default'}`;

// Mapa mental padrão do Bruno (carregado caso o estudante abra pela primeira vez)
export const DEFAULT_MIND_MAP = {
  center: { 
    label: "BRUNO", 
    sub: "(CÉREBRO)", 
    desc: "O centro de tudo.\nTudo que orbita aqui é o que constrói meus dias: trabalho, estudos, faculdade, finanças, hábitos e futuro.\n\nClique em qualquer esfera para abrir o painel e acessar seus aplicativos integrados!" 
  },
  groups: [
    { id: "g1", name: "Estudos & Faculdade", color: "#a855f7", nodes: [
      // --- FACULDADE ---
      { id: "n1", label: "Faculdade", note: "Matérias, provas e flashcards de estudos da faculdade.", w: 3, appType: "flashcards", category: "Faculdade", parentId: null },
      
      { id: "n1_1", label: "Cálculo I", note: "Limites, derivadas e introdução às integrais.", w: 2, appType: "flashcards", category: "Faculdade", parentId: "n1" },
      
      { id: "n1_2", label: "Cálculo II", note: "Integrais duplas/triplas, equações diferenciais e superfícies.", w: 2, appType: "flashcards", category: "Faculdade", parentId: "n1" },
      { id: "n1_2_1", label: "Derivadas Parciais", note: "Derivadas direcionais e vetor gradiente.", w: 1, appType: "flashcards", category: "Faculdade", parentId: "n1_2" },
      { id: "n1_2_2", label: "Integrais Múltiplas", note: "Integrais duplas e triplas.", w: 1, appType: "flashcards", category: "Faculdade", parentId: "n1_2" },
      { id: "n1_2_2_1", label: "Coordenadas Polares & Esféricas", note: "Mudança de variáveis em integrais triplas.", w: 1, appType: "flashcards", category: "Faculdade", parentId: "n1_2_2" },

      { id: "n1_3", label: "Ergonomia do Trabalho", note: "Biomecânica, postura, normas regulamentadoras e análise ergonômica.", w: 2, appType: "flashcards", category: "Faculdade", parentId: "n1" },
      { id: "n1_3_1", label: "Análise Biomecânica", note: "Cargas, articulações e posturas no ambiente de trabalho.", w: 1, appType: "flashcards", category: "Faculdade", parentId: "n1_3" },
      { id: "n1_3_2", label: "Norma Regulamentadora NR-17", note: "Requisitos de adaptação das condições de trabalho.", w: 1, appType: "flashcards", category: "Faculdade", parentId: "n1_3" },

      { id: "n1_4", label: "Química Geral", note: "Estequiometria, ligações químicas e reações.", w: 2, appType: "flashcards", category: "Faculdade", parentId: "n1" },
      { id: "n1_4_1", label: "Estequiometria", note: "Cálculos de massa, mol e reagente limitante.", w: 1, appType: "flashcards", category: "Faculdade", parentId: "n1_4" },

      // --- PROGRAMAÇÃO ---
      { id: "n2", label: "Programação", note: "Base técnica: lógica, código, prática diária.", w: 3, appType: "flashcards", category: "IA", parentId: null },
      { id: "n2_1", label: "Front-end & React", note: "Desenvolvimento de interfaces modernas e interativas.", w: 2, appType: "flashcards", category: "IA", parentId: "n2" },
      { id: "n2_1_1", label: "Componentes & Hooks", note: "useState, useEffect, useRef e fluxo de dados.", w: 1, appType: "flashcards", category: "IA", parentId: "n2_1" },
      { id: "n2_1_2", label: "Canvas 2D/3D & Animações", note: "Renderização visual e física de partículas.", w: 1, appType: "flashcards", category: "IA", parentId: "n2_1" },
      
      { id: "n2_2", label: "IA & Agentes Autônomos", note: "Engenharia de prompts e LLMs.", w: 2, appType: "flashcards", category: "IA", parentId: "n2" },

      // --- IDIOMAS ---
      { id: "n3", label: "Idiomas", note: "Inglês e Chinês para comunicação global.", w: 3, appType: "flashcards", category: "Inglês", parentId: null },
      { id: "n3_1", label: "Inglês", note: "Fluência e comunicação contínua.", w: 2, appType: "flashcards", category: "Inglês", parentId: "n3" },
      { id: "n3_1_1", label: "Phrasal Verbs", note: "Verbos compostos e expressões idiomáticas.", w: 1, appType: "flashcards", category: "Inglês", parentId: "n3_1" },
      { id: "n3_1_2", label: "Vocabulário de Negócios", note: "Termos corporativos e reuniões em inglês.", w: 1, appType: "flashcards", category: "Inglês", parentId: "n3_1" },

      { id: "n3_2", label: "Chinês (Mandarim)", note: "Aprendizado da língua chinesa.", w: 2, appType: "flashcards", category: "Inglês", parentId: "n3" },
      { id: "n3_2_1", label: "Pinyin & Tons", note: "Transcrição fonética e 4 tons do mandarim.", w: 1, appType: "flashcards", category: "Inglês", parentId: "n3_2" },
      { id: "n3_2_2", label: "Ideogramas (Hanzi)", note: "Escrita e reconhecimento de caracteres chineses.", w: 1, appType: "flashcards", category: "Inglês", parentId: "n3_2" },

      { id: "n4", label: "Caderno de Notas", note: "Anotações e esquemas visuais desenhados à mão.", w: 2, appType: "notebook", parentId: null }
    ]},

    { id: "g2", name: "Carreira & Trabalho", color: "#3b82f6", nodes: [
      { id: "n5", label: "Stecla Engenharia", note: "Rotina, entregas e responsabilidades do dia a dia.", w: 3, appType: "docs", parentId: null },
      { id: "n5_1", label: "Gestão de Obras", note: "Acompanhamento no canteiro e controle de prazos.", w: 2, appType: "docs", parentId: "n5" },
      { id: "n5_1_1", label: "Cronograma Físico-Financeiro", note: "Medições, etapas construtivas e desembolso.", w: 1, appType: "docs", parentId: "n5_1" },
      { id: "n5_2", label: "Compatibilização de Projetos", note: "Identificação e resolução de interferências.", w: 2, appType: "docs", parentId: "n5" },

      { id: "n6", label: "BIM & Projetos", note: "Softwares, modelos e compatibilização.", w: 2, appType: "flashcards", category: "BIM", parentId: null },
      { id: "n6_1", label: "Revit & Modelagem 3D", note: "Modelagem paramétrica de edifícios.", w: 2, appType: "flashcards", category: "BIM", parentId: "n6" },
      { id: "n6_1_1", label: "Famílias Paramétricas", note: "Criação de elementos inteligentes no Revit.", w: 1, appType: "flashcards", category: "BIM", parentId: "n6_1" },
      
      { id: "n7", label: "Networking", note: "Pessoas e contatos que abrem portas.", w: 1, parentId: null },
      { id: "n8", label: "Metas 2026", note: "Onde eu quero chegar profissionalmente.", w: 2, appType: "dreams", parentId: null }
    ]},

    { id: "g3", name: "Saúde & Rotina", color: "#22c55e", nodes: [
      { id: "n9", label: "Hábitos Diários", note: "Acompanhamento gamificado com XP e ofensiva.", w: 3, appType: "habits", parentId: null },
      { id: "n9_1", label: "Leitura & Foco", note: "Leitura diária de livros técnicos e desenvolvimento.", w: 2, appType: "habits", parentId: "n9" },
      { id: "n9_2", label: "Hidratação & Suplementação", note: "Metas diárias de saúde.", w: 1, appType: "habits", parentId: "n9" },

      { id: "n10", label: "Treino & Exercício", note: "Constância física diária.", w: 2, appType: "habits", parentId: null },
      { id: "n10_1", label: "Musculação", note: "Treino de força e hipertrofia.", w: 1, appType: "habits", parentId: "n10" },

      { id: "n11", label: "Sono & Mente", note: "Descanso de qualidade e foco.", w: 2, parentId: null }
    ]},

    { id: "g4", name: "Finanças & Futuro", color: "#f59e0b", nodes: [
      { id: "n12", label: "Controle Financeiro", note: "Receitas, despesas, contas fixas e orçamentos.", w: 3, appType: "finance", parentId: null },
      { id: "n12_1", label: "Orçamento Mensal", note: "Planejamento teto de gastos do mês.", w: 2, appType: "finance", parentId: "n12" },
      { id: "n12_2", label: "Contas Fixas", note: "Luz, água, internet, moradia e assinaturas.", w: 1, appType: "finance", parentId: "n12" },

      { id: "n13", label: "Investimentos", note: "Aportes e visão de longo prazo.", w: 2, appType: "finance", parentId: null },
      { id: "n13_1", label: "Renda Fixa", note: "Tesouro Direto e CDBs.", w: 1, appType: "finance", parentId: "n13" },

      { id: "n14", label: "Quadro dos Sonhos", note: "Grandes objetivos e conquistas materiais e pessoais.", w: 2, appType: "dreams", parentId: null }
    ]},

    { id: "g5", name: "Vida a Dois & Casa", color: "#ec4899", nodes: [
      { id: "n15", label: "Esposa & Família", note: "Presença de verdade, tempo de qualidade e amor.", w: 3, parentId: null },
      { id: "n16", label: "Casa & Organização", note: "Manutenção do lar e projetos conjuntos.", w: 2, parentId: null },
      { id: "n17", label: "Documentos", note: "Guarda segura de arquivos importantes da família.", w: 2, appType: "docs", parentId: null }
    ]}
  ]
};

// Remove a antiga árvore demonstrativa e monta o Cérebro a partir dos dados
// que realmente existem no aplicativo. Os IDs n1...n17 pertenciam aos exemplos.
const isLegacyDemoNode = (node) => /^n(?:[1-9]|1[0-7])(?:_|$)/.test(String(node?.id || ''));

// Esferas que o próprio app desenha sozinho (e portanto refaz a cada abertura).
// Tudo que NÃO estiver nesta lista é coisa que você criou à mão e nunca se perde.
const isGeneratedNodeId = (id) => (
  /^(?:deck-|material-|hub-)/.test(String(id || '')) ||
  ['essential-docs', 'essential-goals'].includes(String(id || ''))
);

// Cores de cada órbita de grupo (a 1ª sobra para a Faculdade, como já era)
const GROUP_ORBIT_COLORS = [
  '#8b5cf6', '#38bdf8', '#22c55e', '#f59e0b', '#ec4899',
  '#14b8a6', '#f97316', '#a78bfa', '#60a5fa', '#e879f9'
];

// Nome legível de cada tipo de material de estudo (aparece na descrição da esfera)
const MATERIAL_KIND_LABEL = {
  note: 'Anotação de estudo',
  notebook: 'Caderno visual',
  exercises: 'Lista de exercícios',
  link: 'Link / material de apoio',
};

// "Inglês" -> "ingles": gera um id estável (sem acento e sem espaço) para o
// grupo e para a esfera-mãe daquele grupo.
const slugifyGroupKey = (text = '') => String(text)
  .normalize('NFD').replace(/\p{M}/gu, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'grupo';

const groupIdForCategory = (category) => `cat-${slugifyGroupKey(category)}`;
const hubIdForCategory = (category) => `hub-${slugifyGroupKey(category)}`;

/*
  FUNÇÃO: buildEssentialMindMap
  PARA QUE SERVE: monta o Cérebro Digital em TRÊS NÍVEIS, sempre a partir do que
  existe de verdade no aplicativo:

      BRUNO (Cérebro)  ->  Faculdade (o grupo)  ->  os baralhos e materiais do grupo
                        ->  Inglês (o grupo)     ->  os baralhos e materiais do grupo

  Ou seja: cada GRUPO de estudos ganha a sua própria esfera-mãe ligada ao Cérebro,
  e tudo que está guardado dentro daquele grupo (baralhos de cartões E materiais
  como anotações, cadernos, listas e links) fica pendurado nela.

  REGRA DE OURO: nada que você criou à mão pode desaparecer. As esferas e grupos
  que você mesmo fez são preservados (com cor, visibilidade e ramificações), e
  apenas as esferas automáticas (grupos, baralhos e materiais) são redesenhadas.
*/
export function buildEssentialMindMap(mapData, sets = [], categories = [], materials = []) {
  const source = mapData && Array.isArray(mapData.groups) ? mapData : DEFAULT_MIND_MAP;

  const previousGroupsById = new Map();
  const previousGroupsByName = new Map();
  const previousNodeById = new Map();
  const previousNodeByDeckId = new Map();
  const previousNodeByLabel = new Map();

  const customStudyNodes = [];
  const customLifeNodes = [];
  const customGroups = [];
  // Guarda em QUAL órbita cada esfera sua estava, para ela não mudar de grupo
  const studyNodeOrigin = new Map();

  // 1. Separa o que é AUTOMÁTICO (será redesenhado) do que é SEU (será preservado)
  (source.groups || []).forEach((group) => {
    previousGroupsById.set(String(group.id), group);
    previousGroupsByName.set(String(group.name || '').trim().toLowerCase(), group);

    (group.nodes || []).forEach((node) => {
      if (!node) return;
      const nid = String(node.id || '');
      if (nid) previousNodeById.set(nid, node);
      if (node.deckId) previousNodeByDeckId.set(String(node.deckId), node);
      if (node.label) previousNodeByLabel.set(String(node.label).trim().toLowerCase(), node);
    });

    const customNodes = (group.nodes || []).filter((node) => (
      !isLegacyDemoNode(node) && !isGeneratedNodeId(node.id)
    ));

    const isStudyGroup = group.id === 'g1'
      || String(group.id || '').startsWith('cat-')
      || /faculdade|estudo/i.test(group.name || '');
    const isLifeGroup = group.id === 'g5' || /vida|casa|organiza/i.test(group.name || '');

    if (isStudyGroup) {
      customNodes.forEach((node) => studyNodeOrigin.set(String(node.id), {
        groupId: String(group.id || ''),
        groupName: String(group.name || ''),
      }));
      customStudyNodes.push(...customNodes);
    } else if (isLifeGroup) {
      customLifeNodes.push(...customNodes);
    } else {
      // Grupos que você criou continuam existindo mesmo vazios (recém-criados)
      customGroups.push({ ...group, nodes: customNodes });
    }
  });

  // 2. Descobre a ordem dos grupos de estudo: primeiro os grupos cadastrados,
  //    depois qualquer grupo que apareça só nos baralhos/materiais.
  const deckList = Array.isArray(sets) ? sets : [];
  const materialList = Array.isArray(materials) ? materials : [];
  const categoryOf = (item) => String(item?.category || 'Faculdade').trim() || 'Faculdade';

  const orderedCategories = [];
  const addCategory = (name) => {
    const clean = String(name || '').trim();
    if (!clean) return;
    if (!orderedCategories.some((item) => item.toLowerCase() === clean.toLowerCase())) {
      orderedCategories.push(clean);
    }
  };
  (Array.isArray(categories) ? categories : []).forEach(addCategory);
  deckList.forEach((set) => addCategory(categoryOf(set)));
  materialList.forEach((material) => addCategory(categoryOf(material)));

  const categoryByHubId = new Map(orderedCategories.map((cat) => [hubIdForCategory(cat), cat]));
  const categoryBySlug = new Map(orderedCategories.map((cat) => [slugifyGroupKey(cat), cat]));

  // Em qual grupo de estudos a esfera estava desenhada antes
  const originCategoryOf = (node) => {
    const origin = studyNodeOrigin.get(String(node?.id));
    if (!origin) return null;
    if (origin.groupId.startsWith('cat-')) {
      const fromId = categoryBySlug.get(origin.groupId.slice(4));
      if (fromId) return fromId;
    }
    return categoryBySlug.get(slugifyGroupKey(origin.groupName)) || null;
  };

  // 3. Mantém cada família de esferas criadas à mão junto do grupo certo: quem
  //    manda é a esfera RAIZ (a mãe mais antiga da linhagem), senão o filho iria
  //    para um grupo e a mãe para outro, quebrando a ramificação.
  const studyNodeById = new Map(customStudyNodes.map((node) => [String(node.id), node]));
  const rootCategoryOf = (node) => {
    let current = node;
    const visited = new Set();
    while (current && !visited.has(String(current.id))) {
      visited.add(String(current.id));
      const parentId = String(current.parentId || '');
      if (categoryByHubId.has(parentId)) return categoryByHubId.get(parentId);
      if (!studyNodeById.has(parentId)) break;
      current = studyNodeById.get(parentId);
    }
    // Onde a esfera estava desenhada vale mais do que o campo "category" — o
    // editor de esferas preenche esse campo com o próprio nome do balão.
    return originCategoryOf(current) || (current?.category ? String(current.category) : null);
  };

  const studyNodesByCategory = new Map();
  const looseStudyNodes = [];
  customStudyNodes.forEach((node) => {
    const rootCategory = rootCategoryOf(node);
    const key = rootCategory ? rootCategory.toLowerCase() : null;
    if (key && orderedCategories.some((cat) => cat.toLowerCase() === key)) {
      if (!studyNodesByCategory.has(key)) studyNodesByCategory.set(key, []);
      studyNodesByCategory.get(key).push(node);
    } else {
      looseStudyNodes.push(node);
    }
  });

  // Encurta títulos compridos para caberem dentro da esfera
  const compactLabel = (title = '') => {
    if (/física geral e experimental ii\s*-\s*atividade\s*0?2/i.test(title)) return 'Física II · Ativ. 02';
    if (/física geral e experimental ii/i.test(title)) return 'Física Geral II';
    if (/c[aá]culo integral e diferencial ii\s*-\s*atividade\s*0?2/i.test(title)) return 'Cálculo II · Ativ. 02';
    if (/química geral e experimental/i.test(title)) return 'Química Geral';
    return title.length > 28 ? `${title.slice(0, 26).trim()}…` : title;
  };

  /*
    FUNÇÃO AUXILIAR: dedupeNodes
    PARA QUE SERVE: Garante a hierarquia de 3 níveis perfeita (Mãe: Cérebro -> Filho: Grupo/Faculdade -> Filhos do Filho: Baralhos/Materiais).
    Ela impede que existam esferas duplicadas ou que cartões antigos fiquem soltos sem estar pendurados na sua esfera-mãe de grupo.
  */
  const dedupeNodes = (hubNode, childNodes) => {
    const seenIds = new Set([String(hubNode.id)]);
    const seenLabels = new Set([String(hubNode.label || '').trim().toLowerCase()]);
    const seenDeckIds = new Set();
    const kept = [hubNode];

    childNodes.forEach((node) => {
      const id = String(node.id);
      const rawLabel = String(node.label || '').trim();
      const compactedLabel = compactLabel(rawLabel).toLowerCase();
      const deckId = node.deckId ? String(node.deckId) : (id.startsWith('deck-') ? id.slice(5) : null);

      if (seenIds.has(id)) return;
      if (deckId && seenDeckIds.has(deckId)) return;
      if (compactedLabel && seenLabels.has(compactedLabel)) return;

      seenIds.add(id);
      if (deckId) seenDeckIds.add(deckId);
      if (compactedLabel) seenLabels.add(compactedLabel);

      // Encurta o rótulo para visualização impecável dentro da esfera
      kept.push({
        ...node,
        label: compactLabel(rawLabel)
      });
    });
    return kept;
  };

  // 4. Monta uma órbita para cada grupo de estudos que tenha conteúdo
  const categoryGroups = orderedCategories.map((category, index) => {
    const key = category.toLowerCase();
    const hubId = hubIdForCategory(category);

    const deckNodes = deckList
      .filter((set) => categoryOf(set).toLowerCase() === key)
      .map((set) => {
        const rawTitle = set.title || 'Baralho';
        const compacted = compactLabel(rawTitle).toLowerCase();
        const prevNode = previousNodeById.get(`deck-${set.id}`) ||
                         previousNodeByDeckId.get(String(set.id)) ||
                         previousNodeByLabel.get(compacted) ||
                         previousNodeByLabel.get(rawTitle.toLowerCase());
        const existingMatch = (studyNodesByCategory.get(key) || []).find(n => String(n.deckId) === String(set.id) || String(n.id) === `deck-${set.id}`);

        return {
          id: `deck-${set.id}`,
          label: compactLabel(rawTitle),
          note: `${rawTitle}\n${(set.cards || []).length} cartões de estudo neste baralho.`,
          w: (set.cards || []).length >= 20 ? 3 : 2,
          appType: 'flashcards',
          category,
          deckId: set.id,
          parentId: hubId,
          relatedNodeIds: prevNode?.relatedNodeIds || existingMatch?.relatedNodeIds || set.relatedNodeIds || []
        };
      });

    const materialNodes = materialList
      .filter((material) => categoryOf(material).toLowerCase() === key)
      .map((material) => {
        const existingMatch = (studyNodesByCategory.get(key) || []).find(n => String(n.materialId) === String(material.id) || String(n.id) === `material-${material.id}`);
        const prevNode = previousNodeById.get(`material-${material.id}`);
        return {
          id: `material-${material.id}`,
          label: compactLabel(material.title || 'Material'),
          note: `${material.title || 'Material'}\n${MATERIAL_KIND_LABEL[material.type] || 'Material de estudo'} guardado no grupo ${category}.`,
          w: 2,
          appType: 'flashcards',
          category,
          materialId: material.id,
          materialType: material.type || 'note',
          parentId: hubId,
          relatedNodeIds: prevNode?.relatedNodeIds || existingMatch?.relatedNodeIds || material.relatedNodeIds || []
        };
      });

    // Esferas suas que pertencem a este grupo:
    // Garante que se o parentId for nulo, antigo ou inválido, ela nasça pendurada
    // na esfera-mãe do grupo (hubId, ex: hub-faculdade).
    const ownNodes = (studyNodesByCategory.get(key) || []).map((node) => {
      const pId = String(node.parentId || '');
      const validParent = pId && pId !== hubId && (
        deckNodes.some(d => String(d.id) === pId) ||
        materialNodes.some(m => String(m.id) === pId) ||
        studyNodesByCategory.get(key).some(s => String(s.id) === pId)
      );
      return {
        ...node,
        parentId: validParent ? pId : hubId,
        relatedNodeIds: node.relatedNodeIds || []
      };
    });

    const childNodes = [...deckNodes, ...materialNodes, ...ownNodes];
    if (childNodes.length === 0) return null;

    const previousGroup = previousGroupsById.get(groupIdForCategory(category))
      || previousGroupsByName.get(key);
    const prevHubNode = previousNodeById.get(hubId) ||
                        previousNodeByLabel.get(category.toLowerCase()) ||
                        previousGroupsById.get(groupIdForCategory(category)) ||
                        previousGroupsByName.get(key);

    const hubNode = {
      id: hubId,
      label: category,
      note: `Grupo de estudos ${category}.\n${deckNodes.length} ${deckNodes.length === 1 ? 'baralho' : 'baralhos'} e ${materialNodes.length} ${materialNodes.length === 1 ? 'material' : 'materiais'} dentro dele.`,
      w: 3,
      appType: 'flashcards',
      category,
      isGroupHub: true,
      parentId: null,
      relatedNodeIds: prevHubNode?.relatedNodeIds || previousGroup?.relatedNodeIds || []
    };

    return {
      id: groupIdForCategory(category),
      name: category,
      color: previousGroup?.color || GROUP_ORBIT_COLORS[index % GROUP_ORBIT_COLORS.length],
      hidden: !!previousGroup?.hidden,
      nodes: dedupeNodes(hubNode, childNodes),
    };
  }).filter(Boolean);

  // 5. Esferas de estudo suas que não pertencem a nenhum grupo cadastrado
  const looseStudyGroup = looseStudyNodes.length > 0 ? [{
    id: 'g1',
    name: 'Estudos',
    color: previousGroupsById.get('g1')?.color || '#a78bfa',
    hidden: !!previousGroupsById.get('g1')?.hidden,
    nodes: looseStudyNodes,
  }] : [];

  const previousLifeGroup = previousGroupsById.get('g5');

  return {
    version: 4,
    center: {
      label: source.center?.label || 'BRUNO',
      sub: '(CÉREBRO)',
      desc: 'Seu centro de organização. Cada grupo é uma esfera ligada ao Cérebro, e dentro dela ficam os baralhos, materiais e balões daquele grupo.',
    },
    groups: [
      ...categoryGroups,
      ...looseStudyGroup,
      {
        id: 'g5',
        name: 'Vida & Organização',
        color: previousLifeGroup?.color || '#ec4899',
        hidden: !!previousLifeGroup?.hidden,
        nodes: [
          {
            id: 'essential-docs',
            label: 'Documentos',
            note: 'Arquivos e links importantes da família.',
            w: 2,
            appType: 'docs',
            parentId: null,
          },
          {
            id: 'essential-goals',
            label: 'Metas',
            note: 'Objetivos, planos e conquistas importantes.',
            w: 2,
            appType: 'dreams',
            parentId: null,
          },
          ...customLifeNodes,
        ],
      },
      ...customGroups,
    ],
  };
}

/*
  FUNÇÃO: getMindMap
  PARA QUE SERVE: Lê o mapa mental salvo do LocalStorage do navegador para o estudante ativo.
  Se for a primeira vez ou se houverem novos nós de demonstração, mescla-os automaticamente.
*/
export function getMindMap(profile, sets = [], categories = [], materials = []) {
  try {
    const raw = localStorage.getItem(getMindMapStorageKey(profile));
    if (!raw) return buildEssentialMindMap(DEFAULT_MIND_MAP, sets, categories, materials);
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.groups)) return buildEssentialMindMap(DEFAULT_MIND_MAP, sets, categories, materials);
    return buildEssentialMindMap(parsed, sets, categories, materials);
  } catch (error) {
    console.error('Erro ao ler o mapa mental:', error);
    return buildEssentialMindMap(DEFAULT_MIND_MAP, sets, categories, materials);
  }
}

/*
  FUNÇÃO: saveMindMap
  PARA QUE SERVE: Salva as alterações do mapa mental (nódulos, grupos, cores, links)
  no LocalStorage do estudante ativo E envia em background para a nuvem do Firebase.
*/
export function saveMindMap(mapData, profile) {
  try {
    // 1. Salva localmente para resposta instantânea na tela
    localStorage.setItem(getMindMapStorageKey(profile), JSON.stringify(mapData));

    // 2. Se o Firebase estiver configurado, salva em nuvem sob o código do perfil
    if (db && profile) {
      const syncCode = getSyncCode(profile);
      setDoc(doc(db, 'users', syncCode, 'mindmap', 'data'), {
        mapData,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Erro ao salvar mapa mental na nuvem:', err));
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar o mapa mental:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncMindMapWithCloud
  PARA QUE SERVE: Ao abrir o aplicativo, busca a versão mais recente do mapa mental
  na nuvem do Firebase. Se existir, mescla nós padrão e atualiza a tela do computador/celular.
*/
export async function syncMindMapWithCloud(profile, sets = [], categories = [], materials = []) {
  if (!db || !profile) return null;
  try {
    const syncCode = getSyncCode(profile);
    const docSnap = await getDoc(doc(db, 'users', syncCode, 'mindmap', 'data'));

    if (docSnap.exists()) {
      let cloudData = docSnap.data().mapData;
      if (cloudData && Array.isArray(cloudData.groups)) {
        cloudData = buildEssentialMindMap(cloudData, sets, categories, materials);

        // Salva a versão mesclada no LocalStorage e atualiza o Firebase
        localStorage.setItem(getMindMapStorageKey(profile), JSON.stringify(cloudData));
        setDoc(doc(db, 'users', syncCode, 'mindmap', 'data'), {
          mapData: cloudData,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => console.warn('Erro ao atualizar mapa mental na nuvem:', err));

        return cloudData;
      }
    } else {
      // Se não existir na nuvem ainda, sobe o mapa local
      const localMap = getMindMap(profile, sets, categories, materials);
      await setDoc(doc(db, 'users', syncCode, 'mindmap', 'data'), {
        mapData: localMap,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      return localMap;
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar o mapa mental com o Firebase:', err.message);
  }
  return null;
}

/*
  =============================================================================
   MÓDULO DE REPETIÇÃO ESPAÇADA E TREINO DIÁRIO (CÉREBRO DIGITAL)
  =============================================================================
*/

/*
  FUNÇÃO: getDailyReviewCards
  PARA QUE SERVE: Varre todos os baralhos do estudante ativo e identifica quais 
  cartões estão vencidos para revisão HOJE de acordo com a Curva do Esquecimento.
  Também calcula a "Saúde Visual" de cada categoria para colorir as auras 3D do Cérebro.
*/
export function getDailyReviewCards(profile) {
  try {
    const sets = getSets(profile);
    const now = new Date();
    const nowMs = now.getTime();

    let dueCards = [];
    let totalCardsCount = 0;
    const categoryHealth = {}; // Ex: { "Faculdade": "green" | "yellow" | "red" }
    const categoryStats = {};  // Contagem de cartões vencidos por categoria

    sets.forEach(set => {
      const category = set.category || 'Geral';
      if (!categoryStats[category]) {
        categoryStats[category] = { total: 0, due: 0, overdueDaysMax: 0 };
      }

      (set.cards || []).forEach(card => {
        totalCardsCount++;
        categoryStats[category].total++;

        // Verifica se a data de próxima revisão já venceu ou se nunca foi estudado
        const nextReviewMs = card.nextReviewDate ? new Date(card.nextReviewDate).getTime() : 0;
        const isDue = nextReviewMs <= nowMs;

        if (isDue) {
          categoryStats[category].due++;
          dueCards.push({
            ...card,
            setId: set.id,
            setTitle: set.title,
            category: category
          });
        }
      });
    });

    // Se houver menos de 10 cartões vencidos, pegamos alguns cartões adicionais para completar a meta diária de 10
    if (dueCards.length < 10) {
      const existingIds = new Set(dueCards.map(c => c.id));
      for (const set of sets) {
        for (const card of (set.cards || [])) {
          if (dueCards.length >= 15) break;
          if (!existingIds.has(card.id)) {
            dueCards.push({
              ...card,
              setId: set.id,
              setTitle: set.title,
              category: set.category || 'Geral'
            });
            existingIds.add(card.id);
          }
        }
        if (dueCards.length >= 15) break;
      }
    }

    // Calcula a Saúde Neural de cada categoria para colorir as esferas 3D no Cérebro
    Object.keys(categoryStats).forEach(cat => {
      const stat = categoryStats[cat];
      if (stat.due === 0) {
        categoryHealth[cat] = 'green'; // 100% em dia! Aura verde limão.
      } else if (stat.due <= 3) {
        categoryHealth[cat] = 'yellow'; // Requer atenção leve. Aura amarela.
      } else {
        categoryHealth[cat] = 'red'; // Muito atrasado! Aura vermelha pulsante.
      }
    });

    return {
      dueCards: dueCards.slice(0, 15), // Máximo de 15 cartões por treino rápido de 5 min
      totalDueCount: dueCards.length,
      categoryHealth,
      totalCardsCount
    };
  } catch (error) {
    console.error('Erro ao calcular cartões de treino diário:', error);
    return { dueCards: [], totalDueCount: 0, categoryHealth: {}, totalCardsCount: 0 };
  }
}

/*
  FUNÇÃO: recordCardReviewResult
  PARA QUE SERVE: Atualiza o agendamento de um cartão quando você o responde —
  no Treino Diário, na Trilha, em qualquer lugar.

  O QUE MUDOU AQUI (e por que importa muito):
  A conta antiga era uma escadinha fixa: 1 → 3 → 7 → 14 → 30 dias, igual para
  todo mundo. Ela tratava o cartão que você sabe de olhos fechados igual ao que
  você erra desde março. Resultado prático: você gastava metade da revisão
  matando o que já sabia.

  Agora quem manda é o SM-2 (o motor do Anki), que mora em `estudo/trilhaCore`:
  cada cartão carrega uma FACILIDADE própria e o intervalo cresce de acordo com
  o quanto CUSTOU lembrar. O que é fácil some por meses; o que é difícil bate na
  sua porta toda semana.

  COMPATIBILIDADE: o 4º parâmetro aceita as duas linguagens.
    • `true`/`false`  — como as telas antigas sempre chamaram (vira Bom / Errei).
    • 0, 1, 2, 3      — as quatro notas da Trilha (Errei, Difícil, Bom, Fácil).
  Assim o Treino Diário continua funcionando sem uma linha alterada.
*/
export function recordCardReviewResult(profile, setId, cardId, resultado) {
  try {
    const sets = getSets(profile);
    const setIndex = sets.findIndex(s => s.id === setId);
    if (setIndex === -1) return false;

    const set = sets[setIndex];
    const cardIndex = (set.cards || []).findIndex(c => c.id === cardId);
    if (cardIndex === -1) return false;

    const nota = typeof resultado === 'number'
      ? Math.max(0, Math.min(3, resultado))
      : (resultado ? NOTAS.BOM : NOTAS.ERREI);

    const cards = [...set.cards];
    cards[cardIndex] = aplicarNota(cards[cardIndex], nota, new Date());

    sets[setIndex] = { ...set, cards };
    saveSets(sets, profile);
    return true;
  } catch (error) {
    console.error('Erro ao registrar resultado de revisão do cartão:', error);
    return false;
  }
}

/*
  =============================================================================
   O DIÁRIO DE ESTUDO — a parte que te faz voltar amanhã
  =============================================================================
  O app já contava "sessões concluídas" num número solto, que não dizia nada.
  O diário guarda um registro POR DIA: quantas respostas, quantos acertos e
  quantos minutos. Disso saem duas coisas que mexem com quem estuda de verdade:

    • a SEQUÊNCIA (quantos dias seguidos você apareceu). Não estudar hoje passa
      a ter um custo visível, e isso sozinho segura a rotina nas semanas ruins;
    • o HISTÓRICO, para você ver que a semana rendeu mesmo quando a sensação é
      de que não rendeu.

  Fica no LocalStorage e sobe para a nuvem como um documento pequeno (um objeto
  com uma linha por dia), separado dos baralhos — não disputa espaço com eles.
*/
const STORAGE_DIARIO_KEY = 'flashcard_app_diario_estudo_v1';
const getDiarioKey = (profile) => (profile ? `${STORAGE_DIARIO_KEY}_${profile}` : STORAGE_DIARIO_KEY);

/* O dia de HOJE no fuso de quem estuda (nunca em UTC: às 22h de Brasília o UTC
   já virou o dia seguinte, e a sua sequência quebraria sozinha). */
export function diaDeHoje(data = new Date()) {
  const d = data instanceof Date ? data : new Date(data);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getDiarioDeEstudo(profile) {
  try {
    const bruto = localStorage.getItem(getDiarioKey(profile));
    return bruto ? JSON.parse(bruto) : {};
  } catch (error) {
    console.error('Erro ao ler o diário de estudo:', error);
    return {};
  }
}

/*
  registrarSessaoDeEstudo: soma uma sessão no dia de hoje. Chamada no fim de
  toda sessão da Trilha.
*/
export function registrarSessaoDeEstudo(profile, sessao = {}) {
  try {
    const diario = getDiarioDeEstudo(profile);
    const hoje = diaDeHoje();
    const antes = diario[hoje] || { respostas: 0, acertos: 0, segundos: 0, sessoes: 0, blocos: 0 };

    diario[hoje] = {
      respostas: antes.respostas + (Number(sessao.respondidos) || 0),
      acertos: antes.acertos + (Number(sessao.acertos) || 0),
      segundos: antes.segundos + (Number(sessao.segundos) || 0),
      blocos: antes.blocos + (Number(sessao.lidos) || 0),
      sessoes: antes.sessoes + 1,
    };

    localStorage.setItem(getDiarioKey(profile), JSON.stringify(diario));

    if (db && profile) {
      setDoc(doc(db, 'users', personalCloudId(profile), 'estudo', 'diario'), { dias: diario }, { merge: true })
        .catch(err => console.warn('Erro ao salvar o diário de estudo na nuvem:', err.message));
    }
    return diario;
  } catch (error) {
    console.error('Erro ao registrar a sessão de estudo:', error);
    return null;
  }
}

/*
  resumoDoEstudo: o que a tela mostra — o de hoje, a sequência de dias seguidos
  e os últimos sete dias para o gráfico de barrinhas.

  REGRA DA SEQUÊNCIA: ela conta para trás a partir de hoje. Se você ainda não
  estudou hoje, a contagem começa em ONTEM — senão a sequência de 40 dias
  apareceria zerada toda manhã, o que seria desanimador e mentiroso.
*/
export function resumoDoEstudo(profile, agora = new Date()) {
  const diario = getDiarioDeEstudo(profile);
  const hoje = diaDeHoje(agora);
  const doDia = diario[hoje] || { respostas: 0, acertos: 0, segundos: 0, sessoes: 0, blocos: 0 };

  const cursor = new Date(agora);
  if (!diario[hoje]) cursor.setDate(cursor.getDate() - 1);

  let sequencia = 0;
  for (let i = 0; i < 400; i++) {
    if (!diario[diaDeHoje(cursor)]) break;
    sequencia += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const ultimos7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(agora);
    d.setDate(d.getDate() - i);
    const chave = diaDeHoje(d);
    ultimos7.push({ dia: chave, ...(diario[chave] || { respostas: 0, acertos: 0, segundos: 0, sessoes: 0 }) });
  }

  return { hoje: doDia, sequencia, ultimos7 };
}

export async function syncDiarioDeEstudoComNuvem(profile) {
  if (!db || !profile) return null;
  try {
    const ref = doc(db, 'users', personalCloudId(profile), 'estudo', 'diario');
    const snap = await getDoc(ref);
    const local = getDiarioDeEstudo(profile);

    if (!snap.exists()) {
      if (Object.keys(local).length) await setDoc(ref, { dias: local }, { merge: true });
      return local;
    }

    // Junta os dois lados pegando sempre o MAIOR número de cada dia. Estudar no
    // celular e no computador no mesmo dia não pode fazer um apagar o outro.
    const nuvem = snap.data().dias || {};
    const juntos = { ...local };
    Object.entries(nuvem).forEach(([dia, valores]) => {
      const meu = juntos[dia];
      if (!meu || (valores.respostas || 0) > (meu.respostas || 0)) juntos[dia] = valores;
    });

    localStorage.setItem(getDiarioKey(profile), JSON.stringify(juntos));
    return juntos;
  } catch (error) {
    console.warn('Modo Offline: diário de estudo local mantido.', error.message);
    return null;
  }
}

/*
  =============================================================================
   MÓDULO DA CAIXA DE ENTRADA RÁPIDA (BRAIN INBOX)
  =============================================================================
*/

/*
  FUNÇÃO: getBrainInbox
  PARA QUE SERVE: Lê as notas/prints rápidos colados na caixa de entrada do Cérebro.
*/
export function getBrainInbox(profile) {
  try {
    const raw = localStorage.getItem(getInboxKey(profile));
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (error) {
    console.error('Erro ao ler Caixa de Entrada:', error);
    return [];
  }
}

/*
  FUNÇÃO: saveBrainInbox
  PARA QUE SERVE: Salva a lista de notas/prints rápidos da caixa de entrada localmente e no Firebase.
*/
export function saveBrainInbox(inboxItems, profile) {
  try {
    localStorage.setItem(getInboxKey(profile), JSON.stringify(inboxItems));
    if (db && profile) {
      const syncCode = getSyncCode(profile);
      setDoc(doc(db, 'users', syncCode, 'inbox', 'data'), {
        items: inboxItems,
        updatedAt: new Date().toISOString()
      }, { merge: true }).catch(err => console.warn('Erro ao salvar Caixa de Entrada na nuvem:', err));
    }
    return true;
  } catch (error) {
    console.error('Erro ao salvar Caixa de Entrada:', error);
    return false;
  }
}

/*
  FUNÇÃO ASSÍNCRONA: syncBrainInboxWithCloud
  PARA QUE SERVE: Sincroniza os itens rápidos da caixa de entrada com a nuvem do Firebase.
*/
export async function syncBrainInboxWithCloud(profile) {
  if (!db || !profile) return null;
  try {
    const syncCode = getSyncCode(profile);
    const docSnap = await getDoc(doc(db, 'users', syncCode, 'inbox', 'data'));
    if (docSnap.exists()) {
      const items = docSnap.data().items;
      if (Array.isArray(items)) {
        localStorage.setItem(getInboxKey(profile), JSON.stringify(items));
        return items;
      }
    }
  } catch (err) {
    console.warn('Modo Offline: Não foi possível sincronizar Caixa de Entrada:', err.message);
  }
  return null;
}

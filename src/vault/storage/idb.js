/*
  =============================================================================
  ARQUIVO: src/vault/storage/idb.js
  PARA QUE SERVE: É o "disco rígido" do Cofre dentro do navegador.

  POR QUE NÃO LocalStorage (que o resto do app usa)? Porque o LocalStorage tem um
  teto de ~5MB para o site INTEIRO — e ele já está sendo dividido com os baralhos,
  os cadernos com fotos, finanças e hábitos. Um cofre de notas ali dentro estouraria
  e, pior, quebraria os flashcards junto. O IndexedDB é o banco de dados de verdade
  do navegador: centenas de MB, guarda arquivos binários e é assíncrono (não trava
  a tela enquanto lê).

  IMPORTANTE: este arquivo usa um banco SEPARADO ("bueno_vault"). Ele NÃO lê e NÃO
  escreve em nada do flashcard. Os dados antigos ficam intocados.
  =============================================================================
*/

const DB_NAME = 'bueno_vault';
const DB_VERSION = 1;

export const STORE_NOTES = 'notes';   // as notas .md
export const STORE_ASSETS = 'assets'; // imagens e anexos (Blob)
export const STORE_META = 'meta';     // controle interno (marcadores de sync)

let dbPromise = null;

/*
  FUNÇÃO: openDB
  PARA QUE SERVE: Abre (e, na primeira vez, CRIA) o banco. Guardamos a promessa
  numa variável para que 50 chamadas simultâneas abram o banco uma vez só.
*/
export function openDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Este navegador não tem IndexedDB.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // Só roda quando o banco não existe ou a versão subiu: é onde criamos as "gavetas"
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        // A chave de cada nota é o seu CAMINHO ("Estudos/Cálculo.md"), igual a um
        // arquivo de verdade. Simples de entender e impossível de duplicar.
        const notes = db.createObjectStore(STORE_NOTES, { keyPath: 'path' });
        notes.createIndex('mtime', 'mtime');   // para "notas recentes"
        notes.createIndex('scope', 'scope');   // 'privado' ou 'compartilhado'
      }
      if (!db.objectStoreNames.contains(STORE_ASSETS)) {
        db.createObjectStore(STORE_ASSETS, { keyPath: 'path' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

/*
  FUNÇÃO AUXILIAR: tx
  PARA QUE SERVE: Embrulha o jeito antigo (baseado em eventos) do IndexedDB numa
  Promise moderna, para o resto do código poder usar async/await sem sofrimento.
*/
async function tx(storeName, mode, work) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let result;
    try {
      result = work(store);
    } catch (err) {
      reject(err);
      return;
    }
    transaction.oncomplete = () => resolve(result?.__req ? result.__req.result : result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

// Converte um pedido do IndexedDB numa Promise individual
const req = (r) => new Promise((res, rej) => {
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

// ---------------------------------------------------------------------------
// NOTAS
// ---------------------------------------------------------------------------

/*
  getAllNotes: lê o cofre inteiro de uma vez.
  Roda uma vez na abertura do app. Depois disso tudo vive em memória, e é por
  isso que abrir uma nota é instantâneo.
*/
export async function getAllNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = db.transaction(STORE_NOTES, 'readonly').objectStore(STORE_NOTES);
    const r = store.getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

export async function getNote(path) {
  const db = await openDB();
  const store = db.transaction(STORE_NOTES, 'readonly').objectStore(STORE_NOTES);
  return req(store.get(path));
}

export async function putNote(note) {
  await tx(STORE_NOTES, 'readwrite', (store) => store.put(note));
  return note;
}

/*
  putNotes: grava várias notas numa transação só.
  Usado quando a nuvem devolve um lote — gravar de uma vez é ordens de grandeza
  mais rápido do que abrir uma transação por nota.
*/
export async function putNotes(notes) {
  if (!notes.length) return;
  await tx(STORE_NOTES, 'readwrite', (store) => {
    for (const n of notes) store.put(n);
  });
}

export async function deleteNote(path) {
  await tx(STORE_NOTES, 'readwrite', (store) => store.delete(path));
}

// ---------------------------------------------------------------------------
// ANEXOS (imagens coladas com Ctrl+V, PDFs...)
// ---------------------------------------------------------------------------

export async function putAsset(path, blob, extra = {}) {
  await tx(STORE_ASSETS, 'readwrite', (store) =>
    store.put({ path, blob, size: blob.size, type: blob.type, mtime: Date.now(), ...extra })
  );
}

export async function getAsset(path) {
  const db = await openDB();
  const store = db.transaction(STORE_ASSETS, 'readonly').objectStore(STORE_ASSETS);
  return req(store.get(path));
}

export async function getAllAssetPaths() {
  const db = await openDB();
  const store = db.transaction(STORE_ASSETS, 'readonly').objectStore(STORE_ASSETS);
  return req(store.getAllKeys());
}

export async function deleteAsset(path) {
  await tx(STORE_ASSETS, 'readwrite', (store) => store.delete(path));
}

// ---------------------------------------------------------------------------
// CONTROLE INTERNO (marcadores de sincronização, preferências do cofre)
// ---------------------------------------------------------------------------

export async function getMeta(key, fallback = null) {
  const db = await openDB();
  const store = db.transaction(STORE_META, 'readonly').objectStore(STORE_META);
  const row = await req(store.get(key));
  return row ? row.value : fallback;
}

export async function setMeta(key, value) {
  await tx(STORE_META, 'readwrite', (store) => store.put({ key, value }));
}

/*
  deleteMeta: apaga de vez uma chave interna.
  Usado quando um conteúdo pesado deixa de existir (por exemplo, a AULA em HTML
  de uma matéria apagada). Sem isto, o arquivo continuaria ocupando espaço no
  IndexedDB para sempre, mesmo depois de você excluir a aula.
*/
export async function deleteMeta(key) {
  await tx(STORE_META, 'readwrite', (store) => store.delete(key));
}

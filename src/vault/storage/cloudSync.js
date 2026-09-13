/*
  =============================================================================
  ARQUIVO: src/vault/storage/cloudSync.js
  PARA QUE SERVE: Leva e traz as notas do Cofre entre este aparelho e o Firebase.

  COMO OS ENDEREÇOS FUNCIONAM (foi o que você escolheu):
    - Notas PRIVADAS  -> ficam no endereço pessoal do perfil, o MESMO esquema já
      usado pelos baralhos (deckCloudId). As notas do Bruno não aparecem para a
      Bruna e vice-versa.
    - Notas na pasta "Compartilhado/" -> vão para um endereço único do casal.
      Os dois enxergam e editam. É a única pasta que atravessa os perfis.

  COMO RESOLVEMOS CONFLITO: vence quem salvou por último (mtime maior). É simples,
  previsível e correto para um cofre pessoal — sem merge automático que embaralha
  texto pelas costas do usuário.

  APAGAR: nunca some de verdade na hora. Gravamos uma "lápide" (deleted: true) com
  a hora. Sem isso, apagar uma nota no celular faria o computador simplesmente
  reenviá-la de volta na próxima sincronização, e a nota nunca morreria.
  =============================================================================
*/

import { db } from '../../utils/firebase';
import { collection, doc, setDoc, getDocs, getDoc, deleteDoc } from 'firebase/firestore';
import { deckCloudId } from '../../utils/db';

// Endereço do acervo que Bruno e Bruna dividem (pasta "Compartilhado/")
const SHARED_VAULT_ID = 'VAULT-BUENO-COMPARTILHADO';

// Nome da pasta mágica que torna uma nota compartilhada
export const SHARED_FOLDER = 'Compartilhado';

// Limite seguro por documento do Firestore (o teto real é 1MB)
const CHUNK_SIZE = 700000;

/*
  FUNÇÃO: scopeOf
  PARA QUE SERVE: Decide, olhando só o caminho, se a nota é privada ou do casal.
  Regra única e visível: está dentro de "Compartilhado/"? Então é compartilhada.
*/
export function scopeOf(path) {
  return String(path).startsWith(`${SHARED_FOLDER}/`) ? 'compartilhado' : 'privado';
}

/*
  FUNÇÕES: encodePath / decodePath
  PARA QUE SERVEM: O Firestore não aceita "/" no nome de um documento (barra separa
  coleções). Trocamos por "|", que por sua vez é proibido nos nomes de nota — assim
  a conversão é sempre reversível, sem ambiguidade.
*/
export const encodePath = (path) => String(path).replace(/\//g, '|');
export const decodePath = (id) => String(id).replace(/\|/g, '/');

// Coleção certa para o escopo da nota
function notesCollection(profile, scope) {
  const ns = scope === 'compartilhado' ? SHARED_VAULT_ID : deckCloudId(profile);
  return { ns, ref: collection(db, 'users', ns, 'vaultNotes') };
}

/*
  FUNÇÃO: pushNote
  PARA QUE SERVE: Envia UMA nota para a nuvem. Se ela for grande demais para caber
  num documento (nota cheia de imagens coladas), o texto é partido em pedaços numa
  subcoleção — a mesma técnica que o Caderno já usa hoje.
*/
export async function pushNote(profile, note) {
  if (!db) return false;
  try {
    const scope = note.scope || scopeOf(note.path);
    const { ns } = notesCollection(profile, scope);
    const id = encodePath(note.path);
    const content = note.content || '';

    if (content.length <= CHUNK_SIZE) {
      await setDoc(doc(db, 'users', ns, 'vaultNotes', id), {
        path: note.path,
        content,
        chunked: false,
        chunkCount: 0,
        mtime: note.mtime || Date.now(),
        ctime: note.ctime || note.mtime || Date.now(),
        author: note.author || profile || null,
        deleted: false,
      });
      // Limpa pedaços de uma versão anterior que era grande
      await clearChunks(ns, id, 0);
    } else {
      const chunks = [];
      for (let i = 0; i < content.length; i += CHUNK_SIZE) chunks.push(content.slice(i, i + CHUNK_SIZE));
      for (let i = 0; i < chunks.length; i++) {
        await setDoc(doc(db, 'users', ns, 'vaultNotes', id, 'parts', String(i)), { i, data: chunks[i] });
      }
      await clearChunks(ns, id, chunks.length);
      await setDoc(doc(db, 'users', ns, 'vaultNotes', id), {
        path: note.path,
        content: '',
        chunked: true,
        chunkCount: chunks.length,
        mtime: note.mtime || Date.now(),
        ctime: note.ctime || note.mtime || Date.now(),
        author: note.author || profile || null,
        deleted: false,
      });
    }
    return true;
  } catch (err) {
    console.warn('[Cofre] Falha ao enviar nota para a nuvem:', err.message);
    return false;
  }
}

// Remove pedaços sobrando quando a nota encolheu
async function clearChunks(ns, id, keepFrom) {
  try {
    const existing = await getDocs(collection(db, 'users', ns, 'vaultNotes', id, 'parts'));
    for (const d of existing.docs) {
      const idx = parseInt(d.id, 10);
      if (!isNaN(idx) && idx >= keepFrom) {
        await deleteDoc(doc(db, 'users', ns, 'vaultNotes', id, 'parts', d.id)).catch(() => {});
      }
    }
  } catch { /* subcoleção pode nem existir; tudo bem */ }
}

/*
  FUNÇÃO: pushTombstone
  PARA QUE SERVE: Marca na nuvem que a nota foi apagada, com a hora. É o que faz
  a exclusão viajar de um aparelho para o outro em vez de ressuscitar.
*/
export async function pushTombstone(profile, path, scope) {
  if (!db) return false;
  try {
    const { ns } = notesCollection(profile, scope || scopeOf(path));
    const id = encodePath(path);
    await clearChunks(ns, id, 0);
    await setDoc(doc(db, 'users', ns, 'vaultNotes', id), {
      path, content: '', chunked: false, chunkCount: 0,
      deleted: true, mtime: Date.now(),
    }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[Cofre] Falha ao registrar exclusão na nuvem:', err.message);
    return false;
  }
}

/*
  FUNÇÃO: readOneFromCloud
  PARA QUE SERVE: Reconstrói o texto de uma nota, juntando os pedaços se ela for
  grande.
*/
async function readOneFromCloud(ns, snapshot) {
  const data = snapshot.data();
  if (!data.chunked) return data.content || '';
  let text = '';
  for (let i = 0; i < (data.chunkCount || 0); i++) {
    const part = await getDoc(doc(db, 'users', ns, 'vaultNotes', snapshot.id, 'parts', String(i)));
    if (part.exists()) text += part.data().data || '';
  }
  return text;
}

/*
  FUNÇÃO: pullAll
  PARA QUE SERVE: Baixa TUDO que existe na nuvem para este perfil: as notas
  privadas dele mais a pasta compartilhada do casal.
  Devolve uma lista pronta para o comparador decidir o que fazer.
*/
export async function pullAll(profile) {
  if (!db) return { notes: [], tombstones: [], online: false };

  const notes = [];
  const tombstones = [];

  const namespaces = [
    { ns: deckCloudId(profile), scope: 'privado' },
    { ns: SHARED_VAULT_ID, scope: 'compartilhado' },
  ];

  for (const { ns, scope } of namespaces) {
    try {
      const snap = await getDocs(collection(db, 'users', ns, 'vaultNotes'));
      for (const d of snap.docs) {
        const data = d.data();
        const path = data.path || decodePath(d.id);
        if (data.deleted) {
          tombstones.push({ path, mtime: data.mtime || 0, scope });
          continue;
        }
        notes.push({
          path,
          content: await readOneFromCloud(ns, d),
          mtime: data.mtime || 0,
          ctime: data.ctime || data.mtime || 0,
          author: data.author || null,
          scope,
        });
      }
    } catch (err) {
      console.warn(`[Cofre] Não consegui ler o acervo "${ns}":`, err.message);
    }
  }

  return { notes, tombstones, online: true };
}

export const isCloudAvailable = () => !!db;

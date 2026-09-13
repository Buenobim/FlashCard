/*
  =============================================================================
  ARQUIVO: src/vault/core/vaultManager.js
  PARA QUE SERVE: É o "gerente do cofre". Toda criação, edição, renomeação ou
  exclusão de nota passa por AQUI — e só por aqui.

  POR QUE ESSA REGRA IMPORTA: se a tela pudesse gravar direto no banco, cada tela
  precisaria lembrar de reindexar os links, avisar o grafo, empurrar para a nuvem
  e atualizar o explorador. Uma hora alguém esquece um passo e o app fica
  inconsistente. Com um gerente único, existe UM lugar onde essa sequência mora.

  A ORDEM QUE ELE SEMPRE SEGUE:
    1. atualiza a memória (índice)  -> a tela responde na hora
    2. grava no IndexedDB           -> não perde se fechar o navegador
    3. envia para o Firebase        -> chega nos outros aparelhos
  A tela nunca espera os passos 2 e 3. É isso que dá a sensação de instantâneo.
  =============================================================================
*/

import { metadataCache, basename } from './metadataCache.js';
import { rewriteWikilinks } from './linkRewriter.js';
import { vaultEvents, VaultEvent } from './events.js';
import * as idb from '../storage/idb.js';
import { pushNote, pushTombstone, pullAll, scopeOf, isCloudAvailable, SHARED_FOLDER } from '../storage/cloudSync.js';

const SAVE_DEBOUNCE_MS = 400;    // espera você parar de digitar para gravar no disco
const CLOUD_DEBOUNCE_MS = 2500;  // espera mais um pouco para falar com a nuvem

class VaultManager {
  constructor() {
    this.profile = null;
    this.ready = false;
    this.saveTimers = new Map();
    this.cloudTimers = new Map();
    this.syncing = false;
  }

  // -------------------------------------------------------------------------
  // ABERTURA DO COFRE
  // -------------------------------------------------------------------------

  /*
    init: abre o cofre de um perfil.
    Estratégia deliberada: mostra o que está no disco PRIMEIRO (rápido, funciona
    offline) e só então conversa com a nuvem em segundo plano. Você nunca fica
    olhando uma tela de "carregando" por causa da internet.
  */
  async init(profile) {
    this.profile = profile;
    this.ready = false;

    const local = await idb.getAllNotes().catch(() => []);
    metadataCache.rebuild(local);
    this.ready = true;
    vaultEvents.emit(VaultEvent.READY, { count: local.length, profile });

    this.syncWithCloud();
    return local.length;
  }

  /*
    syncWithCloud: compara o que existe aqui com o que existe na nuvem.
    Três decisões possíveis por nota:
      - só existe na nuvem            -> baixa
      - existe nos dois, nuvem é mais nova -> baixa
      - só existe aqui, ou é mais nova     -> sobe
    Mais as lápides (exclusões) que precisam ser aplicadas localmente.
  */
  async syncWithCloud() {
    if (!isCloudAvailable() || this.syncing) return;
    this.syncing = true;
    vaultEvents.emit(VaultEvent.SYNC_STATE, { syncing: true });

    try {
      const { notes: cloudNotes, tombstones } = await pullAll(this.profile);
      const incoming = [];

      for (const remote of cloudNotes) {
        const localFile = metadataCache.getFile(remote.path);
        if (!localFile || remote.mtime > localFile.mtime) {
          incoming.push({
            path: remote.path,
            content: remote.content,
            mtime: remote.mtime,
            ctime: remote.ctime || remote.mtime,
            scope: remote.scope,
            author: remote.author,
          });
        }
      }

      // Aplica exclusões vindas de outro aparelho
      for (const stone of tombstones) {
        const localFile = metadataCache.getFile(stone.path);
        if (localFile && stone.mtime > localFile.mtime) {
          await idb.deleteNote(stone.path);
          metadataCache.removeFile(stone.path);
          vaultEvents.emit(VaultEvent.FILE_DELETED, { path: stone.path, fromCloud: true });
        }
      }

      if (incoming.length) {
        await idb.putNotes(incoming);
        for (const n of incoming) {
          const existed = metadataCache.getFile(n.path);
          metadataCache.addFile(n);
          vaultEvents.emit(existed ? VaultEvent.FILE_MODIFIED : VaultEvent.FILE_CREATED,
            { path: n.path, fromCloud: true });
        }
      }

      // Sobe o que está só aqui ou mais novo aqui
      const cloudByPath = new Map(cloudNotes.map(n => [n.path, n]));
      for (const file of metadataCache.getAllFiles()) {
        const remote = cloudByPath.get(file.path);
        if (!remote || file.mtime > remote.mtime) {
          await pushNote(this.profile, {
            path: file.path,
            content: metadataCache.getContent(file.path),
            mtime: file.mtime,
            ctime: file.ctime,
            scope: file.scope,
            author: this.profile,
          });
        }
      }
    } catch (err) {
      console.warn('[Cofre] Sincronização falhou (o cofre continua funcionando offline):', err.message);
    } finally {
      this.syncing = false;
      vaultEvents.emit(VaultEvent.SYNC_STATE, { syncing: false });
    }
  }

  // -------------------------------------------------------------------------
  // OPERAÇÕES SOBRE NOTAS
  // -------------------------------------------------------------------------

  /*
    create: cria uma nota nova. Se o nome já existir, acrescenta um número no fim
    em vez de sobrescrever — perder texto por acidente não é uma opção.
  */
  async create(rawPath, content = '', { silent = false } = {}) {
    const path = this.uniquePath(this.normalizePath(rawPath));
    const now = Date.now();
    const note = { path, content, mtime: now, ctime: now, scope: scopeOf(path), author: this.profile };

    metadataCache.addFile(note);
    await idb.putNote(note);
    if (!silent) vaultEvents.emit(VaultEvent.FILE_CREATED, { path });
    this.scheduleCloudPush(path);
    return path;
  }

  /*
    modify: registra que o texto mudou.
    A memória atualiza NA HORA (a tela e os backlinks reagem imediatamente); o
    disco e a nuvem são adiados para não gravar a cada tecla digitada.
  */
  modify(path, content) {
    const file = metadataCache.getFile(path);
    if (!file) return;

    file.mtime = Date.now();
    metadataCache.indexOne(path, content);
    vaultEvents.emit(VaultEvent.FILE_MODIFIED, { path });

    clearTimeout(this.saveTimers.get(path));
    this.saveTimers.set(path, setTimeout(async () => {
      await idb.putNote({
        path, content,
        mtime: file.mtime, ctime: file.ctime,
        scope: file.scope, author: this.profile,
      });
    }, SAVE_DEBOUNCE_MS));

    this.scheduleCloudPush(path);
  }

  /*
    rename: renomear é a operação mais perigosa de um cofre de notas — se os links
    não forem atualizados junto, tudo que apontava para a nota vira link quebrado.
    Por isso aqui a gente REESCREVE os [[links]] de todas as notas que citavam ela.
    É o "Rename Refactoring" do Obsidian.
  */
  async rename(oldPath, rawNewPath) {
    const file = metadataCache.getFile(oldPath);
    if (!file) return null;

    const newPath = this.uniquePath(this.normalizePath(rawNewPath));
    if (newPath === oldPath) return oldPath;

    const oldName = basename(oldPath);
    const newName = basename(newPath);
    const referrers = metadataCache.getBacklinks(oldPath);

    // 1. Move a própria nota
    const content = metadataCache.getContent(oldPath);
    const now = Date.now();
    const moved = { path: newPath, content, mtime: now, ctime: file.ctime, scope: scopeOf(newPath), author: this.profile };

    metadataCache.removeFile(oldPath);
    await idb.deleteNote(oldPath);
    metadataCache.addFile(moved);
    await idb.putNote(moved);

    // 2. Conserta os links de quem apontava para ela
    if (oldName !== newName) {
      for (const ref of referrers) {
        if (ref === oldPath) continue;
        const text = metadataCache.getContent(ref);
        const fixed = rewriteWikilinks(text, oldName, newName);
        if (fixed !== text) {
          const rf = metadataCache.getFile(ref);
          if (rf) rf.mtime = Date.now();
          metadataCache.indexOne(ref, fixed);
          await idb.putNote({ path: ref, content: fixed, mtime: rf?.mtime || Date.now(), ctime: rf?.ctime, scope: rf?.scope, author: this.profile });
          this.scheduleCloudPush(ref);
          vaultEvents.emit(VaultEvent.FILE_MODIFIED, { path: ref });
        }
      }
    }

    // 3. Na nuvem, o caminho antigo precisa de lápide (senão a nota volta duplicada)
    pushTombstone(this.profile, oldPath, file.scope);
    this.scheduleCloudPush(newPath);

    vaultEvents.emit(VaultEvent.FILE_RENAMED, { oldPath, newPath });
    return newPath;
  }

  async delete(path) {
    const file = metadataCache.getFile(path);
    if (!file) return;

    clearTimeout(this.saveTimers.get(path));
    clearTimeout(this.cloudTimers.get(path));

    metadataCache.removeFile(path);
    await idb.deleteNote(path);
    pushTombstone(this.profile, path, file.scope);
    vaultEvents.emit(VaultEvent.FILE_DELETED, { path });
  }

  /*
    renameFolder: mover uma pasta é só renomear todas as notas dentro dela.
    Reaproveita rename(), então os links também são consertados. Nada de lógica
    duplicada com regra ligeiramente diferente.
  */
  async renameFolder(oldFolder, newFolder) {
    const affected = metadataCache.getAllFiles()
      .filter(f => f.path === oldFolder || f.path.startsWith(`${oldFolder}/`));
    for (const f of affected) {
      const rest = f.path.slice(oldFolder.length);
      await this.rename(f.path, `${newFolder}${rest}`);
    }
  }

  // -------------------------------------------------------------------------
  // AUXILIARES
  // -------------------------------------------------------------------------

  /*
    normalizePath: limpa o caminho digitado pelo usuário.
    Proíbe "|" porque é o caractere que usamos para codificar a barra na nuvem —
    deixar passar quebraria a sincronização de um jeito difícil de descobrir.
  */
  normalizePath(input) {
    let p = String(input || 'Sem título')
      .replace(/[|\\]/g, '-')
      .replace(/^\/+|\/+$/g, '')
      .replace(/\/{2,}/g, '/')
      .trim();
    if (!p) p = 'Sem título';
    if (!/\.md$/i.test(p)) p += '.md';
    return p;
  }

  // Se "Ideias.md" já existe, devolve "Ideias 2.md", "Ideias 3.md"...
  uniquePath(path) {
    if (!metadataCache.getFile(path)) return path;
    const dir = path.includes('/') ? path.slice(0, path.lastIndexOf('/') + 1) : '';
    const name = basename(path);
    for (let i = 2; i < 999; i++) {
      const candidate = `${dir}${name} ${i}.md`;
      if (!metadataCache.getFile(candidate)) return candidate;
    }
    return `${dir}${name} ${Date.now()}.md`;
  }

  scheduleCloudPush(path) {
    if (!isCloudAvailable()) return;
    clearTimeout(this.cloudTimers.get(path));
    this.cloudTimers.set(path, setTimeout(() => {
      const file = metadataCache.getFile(path);
      if (!file) return;
      pushNote(this.profile, {
        path,
        content: metadataCache.getContent(path),
        mtime: file.mtime,
        ctime: file.ctime,
        scope: file.scope,
        author: this.profile,
      });
    }, CLOUD_DEBOUNCE_MS));
  }

  /*
    flush: grava imediatamente tudo que ainda estava esperando o tempo do debounce.
    Chamado quando você fecha a aba ou troca de perfil — é a rede de segurança
    contra perder os últimos segundos de digitação.
  */
  async flush() {
    for (const [path, timer] of this.saveTimers) {
      clearTimeout(timer);
      const file = metadataCache.getFile(path);
      if (!file) continue;
      await idb.putNote({
        path, content: metadataCache.getContent(path),
        mtime: file.mtime, ctime: file.ctime, scope: file.scope, author: this.profile,
      });
    }
    this.saveTimers.clear();
    for (const [path, timer] of this.cloudTimers) {
      clearTimeout(timer);
      const file = metadataCache.getFile(path);
      if (file) await pushNote(this.profile, {
        path, content: metadataCache.getContent(path),
        mtime: file.mtime, ctime: file.ctime, scope: file.scope, author: this.profile,
      });
    }
    this.cloudTimers.clear();
  }
}

export const vault = new VaultManager();
export { SHARED_FOLDER };

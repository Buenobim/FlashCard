/*
  =============================================================================
  ARQUIVO: src/vault/core/metadataCache.js
  PARA QUE SERVE: É a MEMÓRIA do cofre — e o coração de tudo que faz o Obsidian
  parecer mágico.

  A ideia: ler todas as notas do disco UMA vez ao abrir o app e montar, em memória,
  um mapa de quem aponta para quem. Depois disso:
    - abrir uma nota      -> instantâneo (já está na memória)
    - ver os backlinks    -> instantâneo (é uma consulta num Map)
    - desenhar o grafo    -> instantâneo (o grafo JÁ está pronto aqui)
    - buscar              -> instantâneo

  Sem esse índice, cada uma dessas coisas precisaria varrer o cofre inteiro de novo,
  e o app ficaria lento assim que passasse de umas 50 notas.

  OS TRÊS MAPAS QUE IMPORTAM:
    forwardLinks  -> "de quais notas EU falo"           (A aponta para B)
    backlinks     -> "quem fala de MIM"                 (B é citada por A)
    unresolved    -> links para notas que ainda NÃO existem (o Obsidian mostra em
                     cinza no grafo; é o convite para você escrever a próxima nota)
  =============================================================================
*/

import { parseNote } from './parser.js';
import { vaultEvents, VaultEvent } from './events.js';

/*
  FUNÇÃO: normalizeLink
  PARA QUE SERVE: Um link [[Cálculo I]] tem que achar o arquivo "Faculdade/Cálculo I.md".
  Esta função reduz qualquer forma escrita a uma chave comparável: minúscula, sem
  acento, sem ".md", sem barras. É o que permite escrever [[calculo i]] e funcionar.
*/
const stripAccents = new RegExp('[\u0300-\u036f]', 'g');

export function normalizeLink(link) {
  return String(link || '')
    .replace(/\.md$/i, '')
    .normalize('NFD').replace(stripAccents, '') // tira acentos
    .trim()
    .toLowerCase();
}

// "Faculdade/Cálculo I.md" -> "Cálculo I"
export function basename(path) {
  const file = String(path).split('/').pop() || '';
  return file.replace(/\.md$/i, '');
}

// "Faculdade/Cálculo I.md" -> "Faculdade"   |   "Nota.md" -> ""
export function dirname(path) {
  const parts = String(path).split('/');
  parts.pop();
  return parts.join('/');
}

export class MetadataCache {
  constructor() {
    this.reset();
  }

  reset() {
    /** path -> { path, name, basename, mtime, ctime, size, scope } */
    this.files = new Map();
    /** path -> conteúdo cru em Markdown */
    this.contents = new Map();
    /** path -> resultado do parser (links, tags, headings, tasks, frontmatter) */
    this.metadata = new Map();

    /** path -> Set de paths que ESTA nota cita */
    this.forwardLinks = new Map();
    /** path -> Set de paths que citam ESTA nota */
    this.backlinks = new Map();
    /** path -> Set de nomes de notas citadas que ainda não existem */
    this.unresolved = new Map();

    /** chave normalizada -> path real (para resolver [[link]] -> arquivo) */
    this.nameIndex = new Map();
    /** tag -> Set de paths */
    this.tagIndex = new Map();

    /*
      EXTERNOS: coisas que fazem parte do seu conhecimento mas NÃO são arquivos de
      texto — hoje, os grupos de estudo (Faculdade, Inglês...) e os baralhos de
      flashcards.

      POR QUE ELES MORAM AQUI DENTRO: porque o índice é quem responde "isso
      existe?". Se os baralhos ficassem de fora, escrever [[Cálculo I]] numa nota
      apontaria para o vazio, mesmo você tendo um baralho com esse nome. Com eles
      registrados, a nota e o baralho ficam ligados de verdade — e o grafo deixa
      de ser um mapa de notas soltas para virar o mapa dos seus ESTUDOS.
    */
    /** id -> { id, label, kind, parent, ref } */
    this.externals = new Map();
    /** chave normalizada -> id do externo */
    this.externalIndex = new Map();
  }

  // -------------------------------------------------------------------------
  // CONSTRUÇÃO DO ÍNDICE
  // -------------------------------------------------------------------------

  /*
    rebuild: monta o índice do zero a partir da lista de notas vinda do disco.
    Duas passadas de propósito:
      1ª) registra TODAS as notas e seus nomes;
      2ª) só então resolve os links — senão um link para uma nota que aparece
          depois na lista seria marcado como inexistente por engano.
  */
  rebuild(notes) {
    this.reset();

    for (const note of notes) {
      this.files.set(note.path, {
        path: note.path,
        name: note.path.split('/').pop(),
        basename: basename(note.path),
        mtime: note.mtime || Date.now(),
        ctime: note.ctime || note.mtime || Date.now(),
        size: (note.content || '').length,
        scope: note.scope || 'privado',
      });
      this.contents.set(note.path, note.content || '');
      this.nameIndex.set(normalizeLink(basename(note.path)), note.path);
      // O caminho completo também resolve, para desempatar notas de mesmo nome
      this.nameIndex.set(normalizeLink(note.path), note.path);
    }

    for (const note of notes) this.indexOne(note.path, note.content || '');

    vaultEvents.emit(VaultEvent.METADATA_UPDATED, { full: true });
  }

  /*
    indexOne: (re)indexa UMA nota. Chamada a cada vez que você para de digitar.
    É barata porque só refaz os links dessa nota, não do cofre inteiro.
  */
  indexOne(path, content) {
    // 1. Apaga os vínculos antigos desta nota (senão links removidos ficariam vivos)
    const oldTargets = this.forwardLinks.get(path);
    if (oldTargets) {
      for (const target of oldTargets) this.backlinks.get(target)?.delete(path);
    }
    for (const [tag, set] of this.tagIndex) {
      set.delete(path);
      if (!set.size) this.tagIndex.delete(tag);
    }

    // 2. Lê a nota
    const meta = parseNote(content);
    this.metadata.set(path, meta);
    this.contents.set(path, content);

    // 3. Refaz os vínculos
    const targets = new Set();
    const missing = new Set();

    for (const link of [...meta.links, ...meta.embeds]) {
      if (!link.target) continue;               // [[#Seção]] aponta para si mesma
      const resolved = this.resolve(link.target);
      if (resolved && resolved !== path) {
        targets.add(resolved);
        if (!this.backlinks.has(resolved)) this.backlinks.set(resolved, new Set());
        this.backlinks.get(resolved).add(path);
      } else if (!resolved) {
        missing.add(link.target);
      }
    }

    this.forwardLinks.set(path, targets);
    this.unresolved.set(path, missing);

    // 4. Tags
    for (const t of meta.tags) {
      if (!this.tagIndex.has(t.tag)) this.tagIndex.set(t.tag, new Set());
      this.tagIndex.get(t.tag).add(path);
    }

    // Mantém o tamanho em dia para o explorador mostrar certo
    const f = this.files.get(path);
    if (f) f.size = content.length;
  }

  /*
    addFile: registra uma nota nova no índice.
    Detalhe importante: uma nota nova pode RESOLVER links que antes estavam
    quebrados em outras notas. Por isso reindexamos quem apontava para o nome dela.
  */
  addFile(note) {
    this.files.set(note.path, {
      path: note.path,
      name: note.path.split('/').pop(),
      basename: basename(note.path),
      mtime: note.mtime || Date.now(),
      ctime: note.ctime || Date.now(),
      size: (note.content || '').length,
      scope: note.scope || 'privado',
    });
    this.nameIndex.set(normalizeLink(basename(note.path)), note.path);
    this.nameIndex.set(normalizeLink(note.path), note.path);
    this.indexOne(note.path, note.content || '');
    this.reindexReferrersOf(basename(note.path));
    vaultEvents.emit(VaultEvent.METADATA_UPDATED, { path: note.path });
  }

  removeFile(path) {
    const name = basename(path);

    const targets = this.forwardLinks.get(path);
    if (targets) for (const t of targets) this.backlinks.get(t)?.delete(path);

    // Quem citava esta nota agora tem um link quebrado — precisa reindexar
    const referrers = Array.from(this.backlinks.get(path) || []);

    this.files.delete(path);
    this.contents.delete(path);
    this.metadata.delete(path);
    this.forwardLinks.delete(path);
    this.backlinks.delete(path);
    this.unresolved.delete(path);
    this.nameIndex.delete(normalizeLink(name));
    this.nameIndex.delete(normalizeLink(path));
    for (const set of this.tagIndex.values()) set.delete(path);

    for (const r of referrers) if (this.contents.has(r)) this.indexOne(r, this.contents.get(r));

    vaultEvents.emit(VaultEvent.METADATA_UPDATED, { path });
  }

  /*
    reindexReferrersOf: reindexa toda nota que tinha um link quebrado com este nome.
    É o que faz o link cinza virar link azul no instante em que a nota é criada.
  */
  reindexReferrersOf(name) {
    const key = normalizeLink(name);
    for (const [path, missing] of this.unresolved) {
      for (const m of missing) {
        if (normalizeLink(m) === key) {
          this.indexOne(path, this.contents.get(path) || '');
          break;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // EXTERNOS (grupos de estudo e baralhos de flashcards)
  // -------------------------------------------------------------------------

  /*
    setExternals: entrega ao índice a lista atual de grupos e baralhos.
    Chamada toda vez que os baralhos mudam (criou, apagou, renomeou).

    Depois de registrar, REINDEXA todas as notas. Isso é o que faz um [[Cálculo I]]
    escrito ontem, quando o baralho ainda não existia, se conectar sozinho no
    momento em que você cria o baralho hoje.
  */
  setExternals(items) {
    this.externals = new Map();
    this.externalIndex = new Map();

    for (const item of items) {
      this.externals.set(item.id, item);
      // O nome legível também resolve, para [[Cálculo I]] achar o baralho
      const chave = normalizeLink(item.label);
      if (!this.externalIndex.has(chave)) this.externalIndex.set(chave, item.id);
      // E o id explícito também, para quem quiser ser específico
      this.externalIndex.set(normalizeLink(item.id), item.id);
    }

    for (const [path, content] of this.contents) this.indexOne(path, content);
    vaultEvents.emit(VaultEvent.METADATA_UPDATED, { externals: true });
  }

  getExternal(id) {
    return this.externals.get(id) || null;
  }

  getAllExternals() {
    return Array.from(this.externals.values());
  }

  isExternal(id) {
    return this.externals.has(id);
  }

  // -------------------------------------------------------------------------
  // CONSULTAS
  // -------------------------------------------------------------------------

  /*
    resolve: dado o texto dentro de [[...]], descobre a que ele se refere.
    Ordem: caminho exato -> nome de nota -> nome de baralho/grupo.
    As notas vêm primeiro de propósito: se você tem uma nota E um baralho com o
    mesmo nome, o link abre o que dá para EDITAR.
  */
  resolve(link) {
    if (!link) return null;
    const clean = String(link).trim();
    if (this.files.has(clean)) return clean;
    if (this.files.has(`${clean}.md`)) return `${clean}.md`;

    const chave = normalizeLink(clean);
    return this.nameIndex.get(chave) || this.externalIndex.get(chave) || null;
  }

  getBacklinks(path) {
    return Array.from(this.backlinks.get(path) || []);
  }

  getForwardLinks(path) {
    return Array.from(this.forwardLinks.get(path) || []);
  }

  getUnresolved(path) {
    return Array.from(this.unresolved.get(path) || []);
  }

  getMetadata(path) {
    return this.metadata.get(path) || null;
  }

  getContent(path) {
    return this.contents.get(path) ?? '';
  }

  getFile(path) {
    return this.files.get(path) || null;
  }

  getAllFiles() {
    return Array.from(this.files.values());
  }

  getAllTags() {
    return Array.from(this.tagIndex.entries())
      .map(([tag, set]) => ({ tag, count: set.size }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }

  getNotesWithTag(tag) {
    return Array.from(this.tagIndex.get(tag) || []);
  }

  /*
    getOrphans: notas que ninguém cita e que não citam ninguém.
    O Obsidian destaca essas porque geralmente é onde o conhecimento fica perdido.
  */
  getOrphans() {
    return this.getAllFiles()
      .filter(f => !(this.backlinks.get(f.path)?.size) && !(this.forwardLinks.get(f.path)?.size))
      .map(f => f.path);
  }

  /*
    getBrokenLinks: todos os links apontando para notas que não existem.
    Vira a lista "escreva estas notas em seguida".
  */
  getBrokenLinks() {
    const out = [];
    for (const [path, missing] of this.unresolved) {
      for (const m of missing) out.push({ from: path, target: m });
    }
    return out;
  }

  /*
    buildGraph: entrega o grafo já pronto para desenhar. É o mapa dos seus estudos.

    QUATRO TIPOS DE NÓ:
      grupo    -> Faculdade, Inglês, IA, BIM (os grupos de estudo)
      baralho  -> cada baralho de flashcards, pendurado no seu grupo
      nota     -> suas notas de texto
      fantasma -> algo citado num [[link]] que ainda não existe

    DOIS TIPOS DE LIGAÇÃO:
      estrutural -> Faculdade → Cálculo I. Vem da organização dos baralhos,
                    é automática, você não precisa escrever nada.
      link       -> nota ↔ baralho ou nota ↔ nota. Vem dos [[links]] que você
                    escreve. É onde o conhecimento realmente se amarra.
  */
  buildGraph({ includeUnresolved = true } = {}) {
    const nodes = new Map();
    const edges = [];

    // 1. Grupos de estudo e baralhos
    for (const ext of this.externals.values()) {
      nodes.set(ext.id, {
        id: ext.id,
        label: ext.label,
        kind: ext.kind,          // 'grupo' | 'baralho'
        real: true,
        degree: 0,
        ref: ext.ref,            // id do baralho de verdade, para poder abrir
        cardCount: ext.cardCount || 0,
      });
    }

    // 2. As notas
    for (const f of this.files.values()) {
      nodes.set(f.path, {
        id: f.path, label: f.basename, kind: 'nota',
        real: true, degree: 0, scope: f.scope,
      });
    }

    // 3. Ligação estrutural: cada baralho pendurado no seu grupo
    for (const ext of this.externals.values()) {
      if (!ext.parent || !nodes.has(ext.parent) || !nodes.has(ext.id)) continue;
      edges.push({ from: ext.parent, to: ext.id, estrutural: true });
      nodes.get(ext.parent).degree++;
      nodes.get(ext.id).degree++;
    }

    // 4. Os [[links]] que você escreveu
    for (const [from, targets] of this.forwardLinks) {
      for (const to of targets) {
        if (!nodes.has(to) || !nodes.has(from)) continue;
        edges.push({ from, to });
        nodes.get(from).degree++;
        nodes.get(to).degree++;
      }
    }

    if (includeUnresolved) {
      for (const [from, missing] of this.unresolved) {
        for (const name of missing) {
          const ghostId = `ghost:${normalizeLink(name)}`;
          if (!nodes.has(ghostId)) {
            nodes.set(ghostId, { id: ghostId, label: name, kind: 'fantasma', real: false, degree: 0 });
          }
          if (!nodes.has(from)) continue;
          edges.push({ from, to: ghostId });
          nodes.get(from).degree++;
          nodes.get(ghostId).degree++;
        }
      }
    }

    return { nodes: Array.from(nodes.values()), edges };
  }
}

// O índice é único no app inteiro.
export const metadataCache = new MetadataCache();

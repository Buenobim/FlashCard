/*
  =============================================================================
  ARQUIVO: src/pages/subBrainCore.js
  PARA QUE SERVE: É o MIOLO do Sub-Cérebro — só contas e regras, nenhuma tela.
  Aqui moram:
    - as cores e degradês das esferas;
    - a REGRA DA HIERARQUIA (quem é cartão mãe, quem é filho, de quem é a
      anotação) em buildCardIndex;
    - o desenho da TEIA da visão Micro em buildMicroLayout (onde cada bolinha
      fica na tela, sem nenhuma encostar na outra).

  POR QUE ESTE ARQUIVO É SEPARADO: por não ter nada de React nem de tela, ele
  pode ser conferido sozinho, com um teste simples, sem abrir o navegador. Se a
  conta da teia quebrar, a gente descobre antes de você ver.

  A HIERARQUIA EM DUAS LINHAS:
    - cartão com `parentId` vazio  = CARTÃO MÃE (nasce direto da matéria)
    - cartão com `parentId` = id   = FILHO daquele cartão
    - sub-item com `parentCardId`  = pertence ÀQUELE cartão (senão, ao baralho)
  Cartões antigos, sem `parentId`, continuam funcionando: viram cartões mãe.
  =============================================================================
*/

/* ======================================================================
   CORES E DEGRADÊS 3D
   ====================================================================== */
export const hexToRgba = (hex, alpha) => {
  let c = (hex || '#3b82f6').replace('#', '');
  if (c.length === 3) c = c.split('').map((x) => x + x).join('');
  const num = parseInt(c, 16);
  return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
};

export const mixColor = (c1, c2, weight) => {
  const parse = (c) => {
    let hex = (c || '#3b82f6').replace('#', '');
    if (hex.length === 3) hex = hex.split('').map((x) => x + x).join('');
    const n = parseInt(hex, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const w = Math.max(0, Math.min(1, weight));
  const r = Math.round(r1 + (r2 - r1) * w);
  const g = Math.round(g1 + (g2 - g1) * w);
  const b = Math.round(b1 + (b2 - b1) * w);
  return `rgb(${r},${g},${b})`;
};

export const ORBIT_COLORS = {
  flashcards: '#E8933F',
  aula:       '#F472B6',
  note:       '#60A5FA',
  notebook:   '#A78BFA',
  exercises:  '#34D399',
  link:       '#F59E0B',
};

export const newId = (prefix) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

/* ======================================================================
   IMAGENS: mesma compressão do editor de cartões (print de 2MB vira ~35KB)
   ====================================================================== */
export function compressImage(base64Str) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 600;
      const MAX_HEIGHT = 400;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    img.onerror = () => resolve('');
  });
}

/* ======================================================================
   O ÍNDICE DA ÁRVORE: quem é filho de quem, quem é anotação de quem
   ====================================================================== */
/*
  buildCardIndex: lê a lista crua de cartões e sub-itens e devolve o mapa da
  família já resolvido e à prova de bagunça:
    - pai que não existe mais -> o filho vira cartão mãe (não some!)
    - cartão apontando pra si mesmo ou ciclo (A->B->A) -> vira cartão mãe
*/
export function buildCardIndex(cards = [], subItems = []) {
  const byId = new Map();
  cards.forEach((c) => byId.set(c.id, c));

  // 1. Resolve o pai de cada cartão, ignorando referências quebradas e ciclos
  const parentOf = new Map();
  cards.forEach((card) => {
    let parent = card.parentId && card.parentId !== card.id && byId.has(card.parentId)
      ? card.parentId
      : null;

    if (parent) {
      const seen = new Set([card.id]);
      let cursor = parent;
      while (cursor) {
        if (seen.has(cursor)) { parent = null; break; }
        seen.add(cursor);
        const up = byId.get(cursor);
        cursor = up && up.parentId && byId.has(up.parentId) ? up.parentId : null;
      }
    }
    parentOf.set(card.id, parent);
  });

  // 2. Monta a lista de filhos e a lista de cartões mãe
  const childrenOf = new Map();
  const roots = [];
  cards.forEach((card) => {
    const parent = parentOf.get(card.id);
    if (parent) {
      if (!childrenOf.has(parent)) childrenOf.set(parent, []);
      childrenOf.get(parent).push(card);
    } else {
      roots.push(card);
    }
  });

  // 3. Distribui os sub-itens: os que têm dono (parentCardId) e os do baralho
  const subsOf = new Map();
  const looseSubs = [];
  subItems.forEach((si) => {
    const owner = si.parentCardId && byId.has(si.parentCardId) ? si.parentCardId : null;
    if (owner) {
      if (!subsOf.has(owner)) subsOf.set(owner, []);
      subsOf.get(owner).push(si);
    } else {
      looseSubs.push(si);
    }
  });

  // 4. Profundidade de cada cartão (0 = cartão mãe)
  const depthOf = new Map();
  const walk = (card, depth) => {
    depthOf.set(card.id, depth);
    (childrenOf.get(card.id) || []).forEach((child) => walk(child, depth + 1));
  };
  roots.forEach((root) => walk(root, 0));

  return { byId, parentOf, childrenOf, subsOf, looseSubs, roots, depthOf };
}

/*
  descendantIds: todos os netos, bisnetos… de um cartão. Serve para NÃO deixar
  o usuário escolher um filho como "cartão mãe" do próprio pai (o que criaria
  um nó cego na árvore).
*/
export function descendantIds(cardId, childrenOf) {
  const out = new Set();
  const stack = [...(childrenOf.get(cardId) || [])];
  while (stack.length) {
    const card = stack.pop();
    if (out.has(card.id)) continue;
    out.add(card.id);
    (childrenOf.get(card.id) || []).forEach((c) => stack.push(c));
  }
  return out;
}

/*
  flattenTree: devolve os cartões em ordem de árvore (mãe, depois seus filhos,
  depois o próximo ramo), já com a profundidade.
*/
export function flattenTree(index) {
  const out = [];
  const push = (card, depth) => {
    out.push({ card, depth });
    (index.childrenOf.get(card.id) || []).forEach((child) => push(child, depth + 1));
  };
  index.roots.forEach((root) => push(root, 0));
  return out;
}

/* ======================================================================
   O GRAFO DA VISÃO MICRO (posições orgânicas, estilo teia)
   ====================================================================== */

/*
  CORES POR TIPO — é assim que você lê o mapa de longe, sem precisar de legenda:
    amarelo = flashcard   |   azul = anotação   |   rosa = link
    roxo    = caderno     |   verde = exercícios |   pink = aula
*/
export const MICRO_COLORS = {
  card:      '#EFD03C',
  aula:      '#F472B6',
  note:      '#4C9BE8',
  link:      '#E879C8',
  notebook:  '#A78BFA',
  exercises: '#34D399',
};

// Tamanho das bolinhas: a mãe é um pouco maior, o resto é quase igual
export const nodeRadiusFor = (depth, kind) =>
  kind === 'sub' ? 25 : (depth === 0 ? 33 : 27);

/* Números da simulação (foram acertados rodando `npm run testar`) */
const DIST_IDEAL   = 165;    // distância que uma ligação gosta de ter
const FORCA_MOLA   = 0.055;  // o quanto uma ligação puxa mãe e filho
const FORCA_REPUL  = 42000;  // o quanto duas bolinhas se empurram
const ALCANCE_REP  = 900;    // além disso, nem se enxergam (deixa o cálculo leve)
const GRAVIDADE    = 0.012;  // puxão fraco para o meio, senão o mapa se espalha sem fim
const PASSOS       = 500;    // rodadas da simulação
const PASSO_MAX    = 34;     // o quanto uma bolinha pode andar por rodada

/*
  Sorteio SEM sorteio: a mesma nota sempre nasce no mesmo lugar. Isso importa
  porque o mapa é recalculado a cada gravação — se fosse aleatório, as bolinhas
  dançariam pela tela toda vez que você digitasse uma letra.
*/
const hashTexto = (txt) => {
  let h = 2166136261;
  for (let i = 0; i < txt.length; i++) {
    h ^= txt.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
};

/*
  buildMicroLayout: monta o mapa da visão Micro.

  COMO A CONTA FUNCIONA (em português):
    1. Cada cartão/anotação vira uma bolinha; cada vínculo (mãe→filho,
       cartão→anotação) vira um fio.
    2. Todas as bolinhas se EMPURRAM (para nunca ficarem em cima da outra) e
       cada fio PUXA as duas pontas (para o que é ligado ficar perto).
    3. Um puxão fraco para o meio impede que os pedaços soltos escapem da tela.
    4. No fim, uma passada de desempate afasta o que ainda ficou encostado.
  O resultado é a teia orgânica: ramos com muitos filhos formam cachos, cartões
  soltos ficam espalhados em volta.

  Parâmetros:
    index     -> resultado de buildCardIndex
    collapsed -> Set com os ids dos ramos recolhidos
    subMeta   -> função que devolve { label } de um sub-item
*/
export function buildMicroLayout({ index, collapsed = new Set(), subMeta, passos = PASSOS }) {
  const metaDoSub = subMeta || ((si) => ({ label: si.title || 'Item' }));

  /*
    Quando um ramo está recolhido, o selo "+N" na bolinha precisa dizer quanta
    coisa está escondida ALI DENTRO — filhos, netos e as anotações de todos
    eles. Se contasse só os filhos diretos, o número mentiria.
  */
  const contarEscondidos = (cardId) => {
    const filhos = index.childrenOf.get(cardId) || [];
    const subs = index.subsOf.get(cardId) || [];
    return filhos.length + subs.length + filhos.reduce((acc, f) => acc + contarEscondidos(f.id), 0);
  };

  // ---------- 1. Lista de bolinhas e de fios ----------
  const nodes = [];
  const arestas = [];

  const criarNo = (dados) => {
    const n = { ...dados, children: [], hiddenCount: 0, glow: 0, alpha: 1 };
    n.indice = nodes.length;
    nodes.push(n);
    return n;
  };

  const visitarCartao = (card, depth, paiNo) => {
    const no = criarNo({
      key: `card:${card.id}`,
      kind: 'card',
      id: card.id,
      label: card.term || 'Cartão sem título',
      depth,
      color: MICRO_COLORS.card,
      parentKey: paiNo ? paiNo.key : null,
      r: nodeRadiusFor(depth, 'card'),
    });
    if (paiNo) {
      paiNo.children.push(no);
      arestas.push([paiNo.indice, no.indice]);
    }

    const filhos = index.childrenOf.get(card.id) || [];
    const subs = index.subsOf.get(card.id) || [];

    if (collapsed.has(card.id)) {
      no.hiddenCount = contarEscondidos(card.id);
      return no;
    }

    filhos.forEach((filho) => visitarCartao(filho, depth + 1, no));
    subs.forEach((si) => {
      const sub = criarNo({
        key: `sub:${si.id}`,
        kind: 'sub',
        id: si.id,
        label: metaDoSub(si).label,
        subType: si.type,
        depth: depth + 1,
        color: MICRO_COLORS[si.type] || MICRO_COLORS.note,
        parentKey: no.key,
        r: nodeRadiusFor(depth + 1, 'sub'),
      });
      no.children.push(sub);
      arestas.push([no.indice, sub.indice]);
    });
    return no;
  };

  index.roots.forEach((card) => visitarCartao(card, 0, null));

  // Sub-itens do baralho inteiro (sem dono) ficam soltos no mapa
  index.looseSubs.forEach((si) => criarNo({
    key: `sub:${si.id}`,
    kind: 'sub',
    id: si.id,
    label: metaDoSub(si).label,
    subType: si.type,
    depth: 0,
    color: MICRO_COLORS[si.type] || MICRO_COLORS.note,
    parentKey: null,
    r: nodeRadiusFor(0, 'sub'),
  }));

  const N = nodes.length;
  if (N === 0) return { nodes: [], byKey: new Map(), maxExtent: 400 };

  /*
    Baralho gigante gasta mais conta (cada bolinha olha para todas as outras).
    Passando de ~160 bolinhas, encurtamos a simulação: o desenho fica
    praticamente igual e a tela não engasga ao salvar.
  */
  const rodadas = N > 160 ? 240 : passos;

  // ---------- 2. Ponto de partida (sempre o mesmo para os mesmos dados) ----------
  const espalhar = 95 * Math.sqrt(N);
  nodes.forEach((n) => {
    const a = hashTexto(`${n.key}#angulo`) * Math.PI * 2;
    const d = Math.sqrt(hashTexto(`${n.key}#raio`)) * espalhar;
    n.hx = Math.cos(a) * d;
    n.hy = Math.sin(a) * d;
  });
  // Filho nasce perto da mãe: a teia se forma muito mais rápido e mais bonita
  nodes.forEach((n) => {
    n.children.forEach((f) => {
      const a = hashTexto(`${f.key}#saida`) * Math.PI * 2;
      f.hx = n.hx + Math.cos(a) * DIST_IDEAL;
      f.hy = n.hy + Math.sin(a) * DIST_IDEAL;
    });
  });

  // ---------- 3. A simulação ----------
  const fx = new Float64Array(N);
  const fy = new Float64Array(N);

  for (let passo = 0; passo < rodadas; passo++) {
    const esfriando = 1 - passo / rodadas; // começa solto, termina firme
    fx.fill(0);
    fy.fill(0);

    // Empurrão entre todas as bolinhas
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        let dx = nodes[j].hx - nodes[i].hx;
        let dy = nodes[j].hy - nodes[i].hy;
        let d2 = dx * dx + dy * dy;
        if (d2 > ALCANCE_REP * ALCANCE_REP) continue;
        if (d2 < 1) { // exatamente em cima: desencosta de leve, sem sorteio
          dx = (hashTexto(`${nodes[i].key}|${nodes[j].key}`) - 0.5) * 2;
          dy = (hashTexto(`${nodes[j].key}|${nodes[i].key}`) - 0.5) * 2;
          d2 = Math.max(dx * dx + dy * dy, 0.01);
        }
        const d = Math.sqrt(d2);
        const força = FORCA_REPUL / d2;
        const ux = dx / d;
        const uy = dy / d;
        fx[i] -= ux * força; fy[i] -= uy * força;
        fx[j] += ux * força; fy[j] += uy * força;
      }
    }

    // Puxão dos fios (mãe ↔ filho, cartão ↔ anotação)
    arestas.forEach(([i, j]) => {
      const dx = nodes[j].hx - nodes[i].hx;
      const dy = nodes[j].hy - nodes[i].hy;
      const d = Math.hypot(dx, dy) || 0.01;
      const alvo = DIST_IDEAL + nodes[i].r + nodes[j].r - 55;
      const força = (d - alvo) * FORCA_MOLA;
      const ux = dx / d;
      const uy = dy / d;
      fx[i] += ux * força; fy[i] += uy * força;
      fx[j] -= ux * força; fy[j] -= uy * força;
    });

    // Puxão fraco para o meio
    for (let i = 0; i < N; i++) {
      fx[i] -= nodes[i].hx * GRAVIDADE;
      fy[i] -= nodes[i].hy * GRAVIDADE;
    }

    // Anda (com passo limitado, senão o mapa explode)
    for (let i = 0; i < N; i++) {
      const passoMax = PASSO_MAX * esfriando + 2;
      const d = Math.hypot(fx[i], fy[i]) || 0.01;
      const k = Math.min(d, passoMax) / d;
      nodes[i].hx += fx[i] * k;
      nodes[i].hy += fy[i] * k;
    }
  }

  // ---------- 4. Desempate final: nada pode ficar encostado ----------
  for (let volta = 0; volta < 60; volta++) {
    let encostou = false;
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = b.hx - a.hx;
        const dy = b.hy - a.hy;
        const d = Math.hypot(dx, dy) || 0.01;
        const minimo = a.r + b.r + 26;
        if (d < minimo) {
          const empurra = (minimo - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          a.hx -= ux * empurra; a.hy -= uy * empurra;
          b.hx += ux * empurra; b.hy += uy * empurra;
          encostou = true;
        }
      }
    }
    if (!encostou) break;
  }

  // ---------- 5. Centraliza e mede o tamanho do mapa ----------
  let somaX = 0;
  let somaY = 0;
  nodes.forEach((n) => { somaX += n.hx; somaY += n.hy; });
  const cx = somaX / N;
  const cy = somaY / N;

  let maxExtent = 320;
  nodes.forEach((n, i) => {
    n.hx -= cx;
    n.hy -= cy;
    n.x = n.hx;
    n.y = n.hy;
    n.seq = i;
    n.ph = hashTexto(`${n.key}#fase`) * Math.PI * 2;
    n.sp = 0.4 + hashTexto(`${n.key}#ritmo`) * 0.5;
    n.am = 2 + hashTexto(`${n.key}#balanco`) * 3;
    maxExtent = Math.max(maxExtent, Math.hypot(n.hx, n.hy) + n.r + 60);
  });

  return { nodes, byKey: new Map(nodes.map((n) => [n.key, n])), maxExtent };
}

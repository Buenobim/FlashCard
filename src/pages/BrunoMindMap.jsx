/*
  =============================================================================
  ARQUIVO: src/pages/BrunoMindMap.jsx
  PARA QUE SERVE: Este é o "Cérebro Digital" (BRUNO OS) — o Mapa da Vida em 3D Canvas.
  Ele funciona como a página inicial do aplicativo, onde cada esfera/nódulo representa
  uma área da sua vida (Faculdade, Programação, Finanças, Hábitos, Projetos, etc.).
  Ao clicar em uma esfera, abre-se um painel interativo que permite disparar o seu
  respectivo aplicativo (Flashcards, Caderno de Anotações, Finanças, Hábitos, Sonhos).
  =============================================================================
*/

import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, 
  RotateCcw, 
  Download, 
  Upload, 
  FolderPlus, 
  BookOpen, 
  Edit3, 
  DollarSign, 
  Flame, 
  Star, 
  FileText, 
  X, 
  Trash2,
  Sparkles,
  Zap,
  Inbox,
  Table,
  List,
  LayoutGrid
} from 'lucide-react';
import { getDailyReviewCards, DEFAULT_MIND_MAP } from '../utils/db';
import MindMapSpreadsheetModal from '../components/MindMapSpreadsheetModal';

// Cores pré-definidas para novos grupos de vida no mapa mental
const PALETTE = ["#3b82f6","#a855f7","#06b6d4","#ec4899","#22c55e","#f59e0b","#ef4444","#14b8a6","#8b5cf6","#f97316","#64748b","#eab308"];

export default function BrunoMindMap({ 
  mindMap, 
  onSaveMindMap, 
  onNavigate, 
  categories = [],
  onSelectCategoryFilter,
  activeProfile,
  onStartDailyWorkout,
  onOpenBrainInbox
}) {
  // Referências para elementos HTML e variáveis de animação Canvas
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Estados locais para controlar o painel lateral e os modais de edição
  const [data, setData] = useState(mindMap);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedCore, setSelectedCore] = useState(false);
  const [hoverNode, setHoverNode] = useState(null);
  const [tooltip, setTooltip] = useState({ show: false, x: 0, y: 0, title: '', group: '', groupColor: '', desc: '' });
  
  // Modais de inclusão/edição de nós e grupos
  const [modalNode, setModalNode] = useState(null); // { group, node }
  const [modalGroup, setModalGroup] = useState(null); // group || 'new'
  const [isSpreadsheetOpen, setIsSpreadsheetOpen] = useState(false);
  const [selectedRelatedIds, setSelectedRelatedIds] = useState([]);
  const [viewMode, setViewMode] = useState('3d'); // '3d' ou 'list' (Modo Celular)

  useEffect(() => {
    if (modalNode && modalNode.node) {
      setSelectedRelatedIds(modalNode.node.relatedNodeIds || []);
    } else {
      setSelectedRelatedIds([]);
    }
  }, [modalNode]);

  // Relógio em tempo real no HUD superior
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');

  // Informações de cartões vencidos e saúde visual do Cérebro (Auras 3D)
  const [dueInfo, setDueInfo] = useState({ dueCards: [], totalDueCount: 0, categoryHealth: {} });

  useEffect(() => {
    if (activeProfile) {
      const info = getDailyReviewCards(activeProfile);
      setDueInfo(info);
    }
  }, [activeProfile, mindMap]);

  // 1. Efeito para atualizar o relógio do HUD a cada segundo
  useEffect(() => {
    function updateClock() {
      const d = new Date();
      setTimeStr(d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
      setDateStr(d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }));
    }
    updateClock();
    const timer = setInterval(updateClock, 10000);
    return () => clearInterval(timer);
  }, []);

  // 2. Sincroniza estado interno quando a prop mindMap muda do Firebase/LocalStorage
  useEffect(() => {
    if (mindMap) {
      setData(mindMap);
    }
  }, [mindMap]);

  // Função auxiliar para salvar o mapa localmente e no Firebase
  const updateAndSave = (newData) => {
    setData(newData);
    onSaveMindMap(newData);
  };

  // =========================================================================
  // ENGINE CANVAS 2D/3D DO MAPA MENTAL (PARTÍCULAS, ÓRBITAS E CONEXÕES)
  // =========================================================================
  const viewRef = useRef({ fit: 1, zoom: 1, px: 0, py: 0, mx: 0, my: 0, tpx: 0, tpy: 0 });
  const sceneRef = useRef({ nodes: [], links: [], stars: [], traces: [], time: 0 });
  const ORB_R = 140; // Raio do orbe central (Cérebro do Bruno)

  // Gerador determinístico de números pseudo-aleatórios para manter o mapa estável
  const seeded = (i) => {
    const s = Math.sin(i * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };

  // Recalcula as posições dos grupos, nós e sub-nós no espaço 3D/2D conforme a resolução da tela
  const layoutScene = (currentData, width, height) => {
    if (!currentData || !currentData.groups) return;
    const nodes = [];
    const links = [];
    const nodeObjMap = new Map();
    const G = currentData.groups.length || 1;
    const ar = (width / height) / 1.545;
    const KX = Math.max(0.92, Math.min(1.6, ar));
    const KY = ar < 1 ? Math.max(0.9, Math.min(1.25, 1 / ar * 0.95)) : 1;

    // 1. PASSO 1: Posiciona as esferas principais (Mães de primeiro nível filhas do Cérebro Central)
    currentData.groups.forEach((g, gi) => {
      const base = (-90 + gi * (360 / G)) * Math.PI / 180;
      const allGroupNodes = g.nodes || [];
      // Uma esfera é principal se não tem parentId ou se seu pai é um ID inexistente
      const primaryNodes = allGroupNodes.filter(nd => !nd.parentId || !allGroupNodes.some(p => String(p.id) === String(nd.parentId)));
      const n = primaryNodes.length;
      const spread = Math.min(54, 320 / G) * Math.PI / 180;
      let cxs = 0, cys = 0, maxD = 0;

      primaryNodes.forEach((nd, i) => {
        const t = n === 1 ? 0 : (i / (n - 1) - 0.5);
        const a = base + t * spread + (seeded(gi * 31 + i) - 0.5) * 0.08;
        const r = 290 + (i % 2) * 100 + seeded(gi * 17 + i * 7) * 70;
        const hx = Math.cos(a) * r * KX;
        const hy = Math.sin(a) * r * KY;
        cxs += hx; cys += hy;
        maxD = Math.max(maxD, Math.hypot(hx, hy));
        const rad = 24 + (nd.w || 2) * 7;

        const nodeObj = {
          ref: nd,
          g,
          gi,
          hx,
          hy,
          x: 0,
          y: 0,
          r: rad,
          ph: seeded(gi * 53 + i * 11) * Math.PI * 2,
          sp: 0.45 + seeded(gi * 7 + i * 3) * 0.5,
          am: 7 + seeded(gi * 13 + i) * 10,
          depth: 0.6 + seeded(gi * 3 + i * 5) * 0.7,
          alpha: 1,
          glow: 0
        };
        nodes.push(nodeObj);
        nodeObjMap.set(String(nd.id), nodeObj);
        links.push({
          node: nodeObj,
          bend: (seeded(gi * 23 + i * 9) - 0.5) * 1.7,
          pulses: [seeded(gi * 5 + i), (seeded(gi * 5 + i) + 0.5) % 1]
        });
      });

      g._la = Math.atan2(cxs || 1, cys || 1);
      g._md = maxD || 300;
    });

    // 2. PASSO 2: Posiciona as sub-esferas filhas em órbitas ao redor de suas esferas mães (Filhos do Filho)
    let remainingChildren = [];
    currentData.groups.forEach(g => {
      (g.nodes || []).forEach(nd => {
        if (nd.parentId && !nodeObjMap.has(String(nd.id))) {
          remainingChildren.push({ nd, g });
        }
      });
    });

    let passCount = 0;
    while (remainingChildren.length > 0 && passCount < 10) {
      passCount++;
      const nextRemaining = [];
      const parentGroups = new Map();

      remainingChildren.forEach(item => {
        const pKey = String(item.nd.parentId);
        if (!parentGroups.has(pKey)) {
          parentGroups.set(pKey, []);
        }
        parentGroups.get(pKey).push(item);
      });

      parentGroups.forEach((childItems, parentId) => {
        const parentObj = nodeObjMap.get(String(parentId));
        if (parentObj) {
          const count = childItems.length;
          const parentAngle = Math.atan2(parentObj.hy, parentObj.hx);

          childItems.forEach((item, idx) => {
            const spreadAngle = (idx - (count - 1) / 2) * 0.45;
            const childAngle = parentAngle + spreadAngle;
            const dist = 90 + (idx % 2) * 20;
            const hx = parentObj.hx + Math.cos(childAngle) * dist;
            const hy = parentObj.hy + Math.sin(childAngle) * dist;
            const rad = Math.max(14, Math.round(parentObj.r * 0.75));

            const childObj = {
              ref: item.nd,
              g: item.g,
              gi: parentObj.gi,
              hx,
              hy,
              x: 0,
              y: 0,
              r: rad,
              ph: seeded(parentObj.gi * 53 + idx * 11) * Math.PI * 2,
              sp: 0.45 + seeded(parentObj.gi * 7 + idx * 3) * 0.5,
              am: 5 + seeded(parentObj.gi * 13 + idx) * 6,
              depth: parentObj.depth * 0.85,
              alpha: 1,
              glow: 0,
              parentNode: parentObj
            };

            nodes.push(childObj);
            nodeObjMap.set(item.nd.id, childObj);
            links.push({
              node: childObj,
              parentNode: parentObj,
              bend: (seeded(idx * 17) - 0.5) * 0.8,
              pulses: [seeded(idx * 7), (seeded(idx * 7) + 0.5) % 1]
            });
          });
        } else {
          childItems.forEach(ci => nextRemaining.push(ci));
        }
      });

      remainingChildren = nextRemaining;
    }

    // 3. PASSO 3: ALGORITMO ANTI-COLISÃO (Garante que NENHUMA esfera fique sobreposta)
    for (let iter = 0; iter < 50; iter++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.hx - n1.hx;
          const dy = n2.hy - n1.hy;
          const dist = Math.hypot(dx, dy) || 0.1;
          const minSep = n1.r + n2.r + 38; // Margem de segurança de 38px entre bordas

          if (dist < minSep) {
            const overlap = (minSep - dist) * 0.5;
            const nx = (dx / dist) * overlap;
            const ny = (dy / dist) * overlap;

            n1.hx -= nx;
            n1.hy -= ny;
            n2.hx += nx;
            n2.hy += ny;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }

    // Posições dos títulos dos grupos
    currentData.groups.forEach(g => {
      const hw = (g.name ? g.name.length : 6) * 5.4 + 26;
      const hh = 24;
      let d = (g._md || 300) + 105;
      for (let step = 0; step < 26; step++) {
        const lx = Math.cos(g._la || 0) * d;
        const ly = Math.sin(g._la || 0) * d;
        const hit = nodes.some(n => Math.abs(n.hx - lx) < hw + n.r * 0.75 && Math.abs(n.hy - ly) < hh + n.r * 0.8);
        if (!hit) { g._lx = lx; g._ly = ly; break; }
        d += 26;
      }
      if (!g._lx) { g._lx = Math.cos(g._la || 0) * d; g._ly = Math.sin(g._la || 0) * d; }
    });

    // Calcula escala para caber na tela
    let ex = 620, ey = 420;
    // 4. PASSO 4: MONTA CONEXÕES CRUZADAS ENTRE ESFERAS/GRUPOS (CROSS-LINKS)
    const crossLinks = [];
    const addedCrossPairKeys = new Set();

    nodes.forEach(nodeObj => {
      const relIds = nodeObj.ref?.relatedNodeIds || nodeObj.g?.relatedNodeIds || [];
      if (Array.isArray(relIds) && relIds.length > 0) {
        relIds.forEach(targetIdRaw => {
          const targetIdStr = String(targetIdRaw);
          let targetObj = nodeObjMap.get(targetIdStr);
          if (!targetObj) {
            targetObj = nodes.find(n => 
              String(n.ref?.id) === targetIdStr ||
              String(n.ref?.deckId) === targetIdStr ||
              String(n.g?.id) === targetIdStr ||
              String(n.ref?.category).toLowerCase() === targetIdStr.toLowerCase() ||
              String(n.g?.name).toLowerCase() === targetIdStr.toLowerCase()
            );
          }

          if (targetObj && targetObj !== nodeObj) {
            const k1 = String(nodeObj.ref?.id || nodeObj.hx);
            const k2 = String(targetObj.ref?.id || targetObj.hx);
            const pairKey = [k1, k2].sort().join('<->');
            if (!addedCrossPairKeys.has(pairKey)) {
              addedCrossPairKeys.add(pairKey);
              crossLinks.push({
                sourceNode: nodeObj,
                targetNode: targetObj,
                bend: (seeded(nodes.indexOf(nodeObj) * 13) - 0.5) * 1.8,
                pulses: [seeded(nodes.indexOf(nodeObj) * 11), (seeded(nodes.indexOf(nodeObj) * 11) + 0.5) % 1]
              });
            }
          }
        });
      }
    });

    sceneRef.current.nodes = nodes;
    sceneRef.current.links = links;
    sceneRef.current.crossLinks = crossLinks;
  };

  // Inicializa o fundo de estrelas brilhantes e trilhas de circuitos cibernéticos
  const buildStars = (width, height) => {
    const stars = [];
    const N = Math.round((width * height) / 5200);
    for (let i = 0; i < N; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.25 + 0.25,
        a: Math.random() * 0.6 + 0.18,
        tw: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 1.4,
        d: 0.15 + Math.random() * 0.5
      });
    }
    const traces = [];
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * width, y = Math.random() * height;
      const pts = [[x, y]];
      let cx = x, cy = y;
      for (let k = 0; k < 3 + Math.floor(Math.random() * 3); k++) {
        const horiz = Math.random() > 0.5;
        const len = 40 + Math.random() * 130;
        cx += horiz ? (Math.random() > 0.5 ? len : -len) : 0;
        cy += horiz ? 0 : (Math.random() > 0.5 ? len : -len);
        pts.push([cx, cy]);
      }
      traces.push(pts);
    }
    sceneRef.current.stars = stars;
    sceneRef.current.traces = traces;
  };

  // Loop de renderização principal do Canvas a 60fps
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = null;

    function handleResize() {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const W = window.innerWidth;
      const H = window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildStars(W, H);
      layoutScene(data, W, H);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    function render(now) {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      sceneRef.current.time += dt;
      const T = sceneRef.current.time;

      const W = window.innerWidth;
      const H = window.innerHeight;
      const view = viewRef.current;

      // Parallax suave do mouse
      view.px += (view.tpx - view.px) * 0.06;
      view.py += (view.tpy - view.py) * 0.06;
      const s = view.fit * view.zoom;
      const cx = W / 2 + view.px;
      const cy = H / 2 + view.py;

      // 1. DESENHA O FUNDO CIBERNÉTICO (GRADIENTE + NEBULOSAS + ESTRELAS)
      const bgG = ctx.createRadialGradient(W * 0.5, H * 0.48, 0, W * 0.5, H * 0.48, Math.max(W, H) * 0.78);
      bgG.addColorStop(0, "#131034");
      bgG.addColorStop(0.42, "#0a0a20");
      bgG.addColorStop(1, "#04040d");
      ctx.fillStyle = bgG;
      ctx.fillRect(0, 0, W, H);

      // Nebulosas de fundo
      const blobs = [
        [W * 0.16, H * 0.24, Math.max(W, H) * 0.34, "rgba(80,40,160,.16)"],
        [W * 0.86, H * 0.72, Math.max(W, H) * 0.36, "rgba(20,80,180,.14)"],
        [W * 0.62, H * 0.12, Math.max(W, H) * 0.26, "rgba(150,30,120,.09)"]
      ];
      blobs.forEach(([bx, by, br, bc], i) => {
        const dx = Math.sin(T * 0.00007 + i) * 40;
        const dy = Math.cos(T * 0.00009 + i) * 30;
        const rg = ctx.createRadialGradient(bx + dx, by + dy, 0, bx + dx, by + dy, br);
        rg.addColorStop(0, bc);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      });

      // Estrelas
      sceneRef.current.stars.forEach(st => {
        const a = st.a * (0.55 + 0.45 * Math.sin(T * 0.001 * st.sp + st.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#cfd8ff";
        ctx.beginPath();
        ctx.arc(st.x + view.px * st.d * 0.12, st.y + view.py * st.d * 0.12, st.r, 0, 7);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 2. ATUALIZA POSIÇÃO FLUTUANTE DOS NÓDULOS E VISIBILIDADE DE CONEXÕES
      const nodes = sceneRef.current.nodes;
      const links = sceneRef.current.links;

      nodes.forEach(n => {
        // Uma esfera é visível se seu próprio grupo não está oculto OU se ela possui uma conexão cruzada com outro nó cujo grupo esteja visível
        const hasVisibleCrossLink = (sceneRef.current.crossLinks || []).some(cl => {
          if (cl.sourceNode === n) return !cl.targetNode.g.hidden;
          if (cl.targetNode === n) return !cl.sourceNode.g.hidden;
          return false;
        });

        const isVisible = !n.g.hidden || hasVisibleCrossLink;
        const targetAlpha = isVisible ? 1 : 0;
        n.alpha += (targetAlpha - n.alpha) * 0.09;
        n.glow += ((hoverNode === n || selectedNode === n ? 1 : 0) - n.glow) * 0.12;

        n.x = n.hx + Math.sin(T * 0.00045 * n.sp + n.ph) * n.am
                  + Math.cos(T * 0.00031 * n.sp + n.ph * 1.7) * n.am * 0.55
                  + view.mx * n.depth * 10;
        n.y = n.hy + Math.cos(T * 0.00039 * n.sp + n.ph * 1.3) * n.am
                  + Math.sin(T * 0.00027 * n.sp + n.ph) * n.am * 0.5
                  + view.my * n.depth * 10;
      });

      // Repulsão dinâmica em tempo real para garantir distanciamento sem sobreposições
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          if (n1.alpha < 0.05 || n2.alpha < 0.05) continue;
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.hypot(dx, dy) || 0.1;
          const minDist = n1.r + n2.r + 28;

          if (dist < minDist) {
            const push = (minDist - dist) * 0.5;
            const nx = (dx / dist) * push;
            const ny = (dy / dist) * push;
            n1.x -= nx;
            n1.y -= ny;
            n2.x += nx;
            n2.y += ny;
          }
        }
      }

      // 3. DESENHA CONEXÕES (CURVAS DE BÉZIER E PULSOS DE LUZ)
      links.forEach(l => {
        const n = l.node;
        if (n.alpha < 0.02) return;
        if (l.parentNode && l.parentNode.alpha < 0.02) return; // Oculta a linha da hierarquia se o pai estiver oculto
        const ex = cx + n.x * s;
        const ey = cy + n.y * s;
        let sx, sy;
        if (l.parentNode) {
          sx = cx + l.parentNode.x * s;
          sy = cy + l.parentNode.y * s;
        } else {
          const ang = Math.atan2(n.y, n.x);
          sx = cx + Math.cos(ang) * ORB_R * s * 0.96;
          sy = cy + Math.sin(ang) * ORB_R * s * 0.96;
        }

        // Bezier ctrl points
        const dx = ex - sx, dy = ey - sy, d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d, px = -uy, py = ux;
        const off = l.bend * d * 0.19;
        const c1x = sx + ux * d * 0.34 + px * off;
        const c1y = sy + uy * d * 0.34 + py * off;
        const c2x = ex - ux * d * 0.34 + px * off;
        const c2y = ey - uy * d * 0.34 + py * off;

        const grd = ctx.createLinearGradient(sx, sy, ex, ey);
        const boost = n.glow;
        const col = n.g.color || "#3b82f6";
        grd.addColorStop(0, hexToRgba(col, (0.05 + boost * 0.25) * n.alpha));
        grd.addColorStop(0.55, hexToRgba(col, (0.26 + boost * 0.5) * n.alpha));
        grd.addColorStop(1, hexToRgba(col, (0.5 + boost * 0.5) * n.alpha));

        ctx.strokeStyle = grd;
        ctx.lineWidth = (1.1 + boost * 1.8) * s;
        ctx.shadowColor = hexToRgba(col, 0.6 * n.alpha);
        ctx.shadowBlur = (7 + boost * 16) * s;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Pulsos animados ao longo da linha
        l.pulses.forEach((p, pi) => {
          p += dt * (0.00013 + n.sp * 0.00009) * (1 + boost);
          if (p > 1) p -= 1;
          l.pulses[pi] = p;

          for (let k = 0; k < 4; k++) {
            const t = p - k * 0.022;
            if (t < 0) continue;
            const u = 1 - t;
            const pxPos = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex;
            const pyPos = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey;
            ctx.globalAlpha = (1 - k / 4) * 0.85 * n.alpha;
            ctx.fillStyle = k === 0 ? "#ffffff" : hexToRgba(col, 0.9);
            ctx.beginPath();
            ctx.arc(pxPos, pyPos, (2.4 - k * 0.34) * s, 0, 7);
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        });
      });

      // 3.5. DESENHA CONEXÕES CRUZADAS ENTRE ESFERAS/GRUPOS (CROSS-LINKS)
      (sceneRef.current.crossLinks || []).forEach(cl => {
        const n1 = cl.sourceNode;
        const n2 = cl.targetNode;
        if (!n1 || !n2 || n1.alpha < 0.02 || n2.alpha < 0.02) return;

        const sx = cx + n1.x * s;
        const sy = cy + n1.y * s;
        const ex = cx + n2.x * s;
        const ey = cy + n2.y * s;

        const dx = ex - sx, dy = ey - sy, d = Math.hypot(dx, dy) || 1;
        const ux = dx / d, uy = dy / d, px = -uy, py = ux;
        const off = cl.bend * d * 0.22;
        const c1x = sx + ux * d * 0.34 + px * off;
        const c1y = sy + uy * d * 0.34 + py * off;
        const c2x = ex - ux * d * 0.34 + px * off;
        const c2y = ey - uy * d * 0.34 + py * off;

        const isHighlighted = (hoverNode === n1 || hoverNode === n2 || selectedNode === n1 || selectedNode === n2);
        const boost = isHighlighted ? 1 : Math.max(n1.glow, n2.glow);

        ctx.save();
        ctx.setLineDash([5, 5]);
        ctx.strokeStyle = isHighlighted ? "#38bdf8" : "rgba(6, 182, 212, 0.55)";
        ctx.lineWidth = (1.4 + boost * 1.6) * s;
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = (8 + boost * 14) * s;

        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
        ctx.stroke();
        ctx.restore();

        // Pulsos de energia cibernética ao longo da linha cruzada
        cl.pulses.forEach((p, pi) => {
          p += dt * 0.00028 * (1 + boost);
          if (p > 1) p -= 1;
          cl.pulses[pi] = p;

          const t = p, u = 1 - t;
          const pxPos = u * u * u * sx + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * ex;
          const pyPos = u * u * u * sy + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * ey;

          ctx.fillStyle = "#38bdf8";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 10 * s;
          ctx.beginPath();
          ctx.arc(pxPos, pyPos, (3.2 + boost * 2) * s, 0, Math.PI * 2);
          ctx.fill();
        });
      });

      // 4. DESENHA RÓTULOS DOS GRUPOS NA ÓRBITA
      if (data && data.groups) {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        data.groups.forEach(g => {
          const gx = cx + (g._lx || 0) * s + view.mx * 8;
          const gy = cy + (g._ly || 0) * s + view.my * 8;
          const fs = Math.max(9.5, 13 * s);
          ctx.font = `700 ${fs}px "Inter","Segoe UI",sans-serif`;
          ctx.globalAlpha = g.hidden ? 0.18 : 0.85;
          ctx.shadowColor = "rgba(0,0,20,.8)";
          ctx.shadowBlur = 8;
          ctx.fillStyle = "#ffffff";
          const groupTitle = (g.name || "").toUpperCase();
          const measuredTitle = ctx.measureText(groupTitle).width;
          const safeGx = Math.max(measuredTitle / 2 + 12, Math.min(W - measuredTitle / 2 - 12, gx));
          ctx.fillText(groupTitle, safeGx, gy);
          ctx.shadowBlur = 0;

          // Sublinha do grupo
          const wdt = measuredTitle;
          ctx.globalAlpha *= 0.55;
          ctx.strokeStyle = g.color || "#3b82f6";
          ctx.lineWidth = 1.4 * s;
          ctx.beginPath();
          ctx.moveTo(safeGx - wdt / 2, gy + fs * 0.95);
          ctx.lineTo(safeGx + wdt / 2, gy + fs * 0.95);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
      }

      // 5. DESENHA NÓDULOS (ESFERAS INTERATIVAS DA VIDA)
      nodes.slice().sort((a, b) => a.glow - b.glow).forEach(n => {
        if (n.alpha < 0.02) return;
        const nx = cx + n.x * s;
        const ny = cy + n.y * s;
        const nr = n.r * s * (1 + n.glow * 0.16);
        const col = n.g.color || "#3b82f6";
        ctx.globalAlpha = n.alpha;

        // Halo externo brilhante
        const halo = ctx.createRadialGradient(nx, ny, nr * 0.7, nx, ny, nr * (2.1 + n.glow * 0.9));
        halo.addColorStop(0, hexToRgba(col, 0.34 + n.glow * 0.3));
        halo.addColorStop(1, hexToRgba(col, 0));
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(nx, ny, nr * (2.1 + n.glow * 0.9), 0, 7);
        ctx.fill();

        // Esfera 3D com degradê cromático
        const sf = ctx.createRadialGradient(nx - nr * 0.35, ny - nr * 0.4, nr * 0.05, nx, ny, nr);
        sf.addColorStop(0, mixColor(col, "#ffffff", 0.72));
        sf.addColorStop(0.42, mixColor(col, "#ffffff", 0.14));
        sf.addColorStop(1, mixColor(col, "#000018", 0.46));
        ctx.fillStyle = sf;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.fill();

        // Especular superior
        ctx.globalAlpha = n.alpha * 0.5;
        const sp = ctx.createRadialGradient(nx - nr * 0.36, ny - nr * 0.44, 0, nx - nr * 0.36, ny - nr * 0.44, nr * 0.62);
        sp.addColorStop(0, "rgba(255,255,255,.85)");
        sp.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = sp;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.fill();
        ctx.globalAlpha = n.alpha;

        // Aro externo de vidro
        ctx.strokeStyle = hexToRgba("#ffffff", 0.18 + n.glow * 0.5);
        ctx.lineWidth = (0.9 + n.glow * 1.4) * s;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.stroke();

        // Texto interno do nódulo (ajustado para caber estritamente dentro do diâmetro da bolha)
        const labelStr = String(n.ref.label || '');
        const words = labelStr.split(/\s+/);
        
        let lines = [];
        if (words.length === 1) {
          lines = [words[0]];
        } else if (words.length === 2) {
          lines = [words[0], words[1]];
        } else if (words.length <= 4) {
          const mid = Math.ceil(words.length / 2);
          lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
        } else {
          const p1 = Math.ceil(words.length / 3);
          const p2 = Math.ceil((words.length - p1) / 2) + p1;
          lines = [words.slice(0, p1).join(' '), words.slice(p1, p2).join(' '), words.slice(p2).join(' ')];
        }

        // Calcula tamanho de fonte ideal para a maior linha não ultrapassar os limites da bolha
        let fs = Math.round(nr * 0.35);
        ctx.font = `600 ${fs}px "Inter","Segoe UI",sans-serif`;
        
        const maxAllowedWidth = nr * 1.5; // Limite estrito do diâmetro útil interno da esfera
        lines.forEach(l => {
          const w = ctx.measureText(l).width;
          if (w > maxAllowedWidth && w > 0) {
            fs = Math.floor(fs * (maxAllowedWidth / w));
          }
        });
        
        fs = Math.max(5, Math.min(fs, Math.round(nr * 0.4)));
        ctx.font = `600 ${fs}px "Inter","Segoe UI",sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "rgba(0,0,10,.6)";
        ctx.shadowBlur = 3;
        ctx.fillStyle = "#ffffff";

        const lh = fs * 1.15;
        const y0 = ny - (lines.length - 1) * lh / 2;

        lines.forEach((l, li) => {
          ctx.fillText(l, nx, y0 + li * lh);
        });
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      });

      // 6. DESENHA O ORBE CENTRAL (O CÉREBRO DE BRUNO BUENO)
      const coreX = cx + view.mx * 3;
      const coreY = cy + view.my * 3;
      const R = ORB_R * s;
      const breathe = 1 + Math.sin(T * 0.0011) * 0.028;
      const cr = R * breathe;

      // Aura roxa do cérebro
      const aura = ctx.createRadialGradient(coreX, coreY, cr * 0.6, coreX, coreY, cr * 2.5);
      aura.addColorStop(0, "rgba(130,90,255,.30)");
      aura.addColorStop(0.35, "rgba(90,60,220,.13)");
      aura.addColorStop(1, "rgba(60,40,180,0)");
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(coreX, coreY, cr * 2.5, 0, 7);
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      ctx.arc(coreX, coreY, cr, 0, 7);
      ctx.clip();

      const coreBody = ctx.createRadialGradient(coreX - cr * 0.28, coreY - cr * 0.32, cr * 0.05, coreX, coreY, cr);
      coreBody.addColorStop(0, "#e7dcff");
      coreBody.addColorStop(0.18, "#a684ff");
      coreBody.addColorStop(0.5, "#6d3ce0");
      coreBody.addColorStop(0.82, "#3a1b8f");
      coreBody.addColorStop(1, "#180b45");
      ctx.fillStyle = coreBody;
      ctx.fillRect(coreX - cr, coreY - cr, cr * 2, cr * 2);

      // Vórtices internos de luz do cérebro
      ctx.globalCompositeOperation = "lighter";
      for (let i = 0; i < 4; i++) {
        const a = T * 0.00022 * (i % 2 ? 1 : -1) * (1 + i * 0.3) + i * 1.25;
        const rr = cr * (0.32 + i * 0.14);
        const gg = ctx.createRadialGradient(
          coreX + Math.cos(a) * cr * 0.3, coreY + Math.sin(a) * cr * 0.26, 0,
          coreX + Math.cos(a) * cr * 0.3, coreY + Math.sin(a) * cr * 0.26, rr
        );
        gg.addColorStop(0, i % 2 ? "rgba(120,200,255,.30)" : "rgba(215,140,255,.26)");
        gg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = gg;
        ctx.fillRect(coreX - cr, coreY - cr, cr * 2, cr * 2);
      }

      ctx.globalCompositeOperation = "source-over";
      ctx.restore();

      // Borda luminosa do centro
      ctx.save();
      ctx.strokeStyle = "rgba(190,170,255,.55)";
      ctx.lineWidth = 1.4 * s;
      ctx.shadowColor = "rgba(150,110,255,.9)";
      ctx.shadowBlur = 26 * s;
      ctx.beginPath();
      ctx.arc(coreX, coreY, cr, 0, 7);
      ctx.stroke();
      ctx.restore();

      // Texto do centro: BRUNO (CÉREBRO)
      const centerInfo = (data && data.center) || { label: "BRUNO", sub: "(CÉREBRO)" };
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowColor = "rgba(60,20,140,.9)";
      ctx.shadowBlur = 18 * s;
      ctx.fillStyle = "#fff";
      ctx.font = `700 ${Math.round(44 * s)}px "Inter",sans-serif`;
      ctx.fillText(centerInfo.label || "BRUNO", coreX, coreY - 12 * s);
      ctx.font = `600 ${Math.round(14 * s)}px "Inter",sans-serif`;
      ctx.globalAlpha = 0.75;
      ctx.fillText(centerInfo.sub || "(CÉREBRO)", coreX, coreY + 22 * s);
      ctx.restore();

      animId = requestAnimationFrame(render);
    }

    const preventTouch = (e) => {
      if (e.cancelable) e.preventDefault();
    };

    canvas.addEventListener('touchstart', preventTouch, { passive: false });
    canvas.addEventListener('touchmove', preventTouch, { passive: false });
    canvas.addEventListener('touchend', preventTouch, { passive: false });

    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      canvas.removeEventListener('touchstart', preventTouch);
      canvas.removeEventListener('touchmove', preventTouch);
      canvas.removeEventListener('touchend', preventTouch);
      if (animId) cancelAnimationFrame(animId);
    };
  }, [data]);

  // Conversões auxiliares de cores em Javascript puro
  const hexToRgba = (hexStr, alpha) => {
    if (!hexStr || typeof hexStr !== 'string') return `rgba(59,130,246,${alpha})`;
    const clean = hexStr.replace('#', '');
    const num = parseInt(clean, 16);
    if (isNaN(num)) return `rgba(59,130,246,${alpha})`;
    return `rgba(${(num >> 16) & 255},${(num >> 8) & 255},${num & 255},${alpha})`;
  };

  const mixColor = (a, b, t) => {
    const A = parseInt((a || "#3b82f6").replace('#', ''), 16);
    const B = parseInt((b || "#ffffff").replace('#', ''), 16);
    if (isNaN(A) || isNaN(B)) return a || "#3b82f6";
    const r = Math.round(((A >> 16) & 255) + (((B >> 16) & 255) - ((A >> 16) & 255)) * t);
    const g = Math.round(((A >> 8) & 255) + (((B >> 8) & 255) - ((A >> 8) & 255)) * t);
    const bl = Math.round((A & 255) + ((B & 255) - (A & 255)) * t);
    return `rgb(${r},${g},${bl})`;
  };

  // Interação do Ponteiro e Rato (Arrastar mapa, passar por cima, dar Zoom)
  const dragRef = useRef(null);

  const handlePointerMove = (e) => {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const view = viewRef.current;
    view.mx = (e.clientX / W - 0.5) * 2;
    view.my = (e.clientY / H - 0.5) * 2;

    if (dragRef.current) {
      view.tpx = dragRef.current.px + (e.clientX - dragRef.current.x);
      view.tpy = dragRef.current.py + (e.clientY - dragRef.current.y);
      return;
    }

    // Intercepta se o ponteiro está sobre algum nódulo
    const s = view.fit * view.zoom;
    const cx = W / 2 + view.px;
    const cy = H / 2 + view.py;

    let foundNode = null;
    let minD = 1e9;
    sceneRef.current.nodes.forEach(n => {
      if (n.g.hidden) return;
      const d = Math.hypot(e.clientX - (cx + n.x * s), e.clientY - (cy + n.y * s));
      if (d < n.r * s * 1.12 && d < minD) {
        minD = d;
        foundNode = n;
      }
    });

    if (foundNode !== hoverNode) {
      setHoverNode(foundNode);
      if (foundNode) {
        setTooltip({
          show: true,
          x: Math.min(e.clientX + 16, W - 250),
          y: Math.min(e.clientY + 16, H - 110),
          title: foundNode.ref.label,
          group: foundNode.g.name,
          groupColor: foundNode.g.color,
          desc: foundNode.ref.note || ''
        });
      } else {
        setTooltip(prev => ({ ...prev, show: false }));
      }
    } else if (foundNode) {
      setTooltip(prev => ({
        ...prev,
        x: Math.min(e.clientX + 16, W - 250),
        y: Math.min(e.clientY + 16, H - 110)
      }));
    }
  };

  const handlePointerDown = (e) => {
    dragRef.current = {
      x: e.clientX,
      y: e.clientY,
      px: viewRef.current.tpx,
      py: viewRef.current.tpy,
      moved: false
    };
  };

  const handlePointerUp = (e) => {
    if (dragRef.current) {
      const moved = Math.hypot(e.clientX - dragRef.current.x, e.clientY - dragRef.current.y) > 5;
      dragRef.current = null;
      if (!moved) {
        // Foi um clique simples (não arrastou a tela)
        const W = window.innerWidth;
        const H = window.innerHeight;
        const view = viewRef.current;
        const s = view.fit * view.zoom;
        const cx = W / 2 + view.px;
        const cy = H / 2 + view.py;

        let picked = null;
        let minD = 1e9;
        sceneRef.current.nodes.forEach(n => {
          if (n.g.hidden) return;
          const d = Math.hypot(e.clientX - (cx + n.x * s), e.clientY - (cy + n.y * s));
          if (d < n.r * s * 1.12 && d < minD) {
            minD = d;
            picked = n;
          }
        });

        if (picked) {
          setSelectedNode(picked);
          setSelectedCore(false);
        } else if (Math.hypot(e.clientX - cx, e.clientY - cy) < ORB_R * s) {
          setSelectedCore(true);
          setSelectedNode(null);
        } else {
          setSelectedNode(null);
          setSelectedCore(false);
        }
      }
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const k = e.deltaY > 0 ? 0.92 : 1.08;
    viewRef.current.zoom = Math.max(0.45, Math.min(2.6, viewRef.current.zoom * k));
  };

  // Alterna a exibição de um grupo na legenda inferior
  const toggleGroupHidden = (groupIndex) => {
    const updated = structuredClone(data);
    updated.groups[groupIndex].hidden = !updated.groups[groupIndex].hidden;
    updateAndSave(updated);
  };

  // Exportar backup do Mapa Mental em formato JSON
  const handleExportMindMap = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `bruno-os-cerebro-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // Importar arquivo JSON de backup do Mapa Mental
  const handleImportMindMap = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed || !Array.isArray(parsed.groups)) {
          alert('Arquivo JSON inválido.');
          return;
        }
        updateAndSave(parsed);
      } catch (err) {
        alert('Erro ao ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Dispara o aplicativo associado ao nódulo selecionado no mapa
  const handleLaunchApp = (nodeRef, appTypeOverride) => {
    const appType = appTypeOverride || nodeRef.appType;
    const cat = nodeRef.category || nodeRef.label;

    if (appType === 'flashcards') {
      if (onSelectCategoryFilter) onSelectCategoryFilter(cat);
      onNavigate('dashboard');
    } else if (appType === 'notebook') {
      onNavigate('dashboard');
    } else if (appType === 'finance') {
      onNavigate('finance');
    } else if (appType === 'habits') {
      onNavigate('habits');
    } else if (appType === 'dreams') {
      onNavigate('dreams');
    } else if (appType === 'docs') {
      onNavigate('docs');
    } else if (nodeRef.url) {
      window.open(nodeRef.url, '_blank');
    } else {
      if (onSelectCategoryFilter) onSelectCategoryFilter(cat);
      onNavigate('dashboard');
    }
  };

  return (
    <div className="brain-page" style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#05060f', zIndex: 1 }}>
      {/* 1. CANVAS DA ANIMAÇÃO INTERATIVA DO CÉREBRO */}
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, display: 'block', cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none', overscrollBehavior: 'none' }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* 1.5. MODO LISTA / CELULAR (ESTUDO RÁPIDO OTIMIZADO PARA DISPOSITIVOS MÓVEIS) */}
      {viewMode === 'list' && (
        <div style={{
          position: 'fixed', inset: 0, top: '75px', zIndex: 8,
          background: 'linear-gradient(180deg, rgba(8,9,24,.97), rgba(4,4,12,.99))',
          backdropFilter: 'blur(20px)', padding: '20px 16px 100px', overflowY: 'auto'
        }}>
          <div style={{ maxWidth: '650px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', color: '#fff', fontWeight: '800' }}>📱 Modo Estudo Rápido</h2>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8e97c9' }}>Toque em qualquer matéria para abrir no celular</p>
              </div>
              <button
                onClick={() => setViewMode('3d')}
                className="btn-primary"
                style={{ padding: '8px 14px', fontSize: '11px', gap: '6px' }}
              >
                <Sparkles size={14} /> Voltar ao Mapa 3D
              </button>
            </div>

            {(data?.groups || []).map(group => {
              const nodesInGroup = (group.nodes || []).filter(n => !n.isGroupHub);
              if (nodesInGroup.length === 0) return null;
              return (
                <div key={group.id} style={{
                  background: 'rgba(255,255,255,.04)',
                  border: `1px solid ${hexToRgba(group.color || '#3b82f6', 0.35)}`,
                  borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: group.color || '#3b82f6', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: group.color, boxShadow: `0 0 10px ${group.color}` }} />
                    {group.name} ({nodesInGroup.length})
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
                    {nodesInGroup.map(node => (
                      <div key={node.id} style={{
                        background: 'rgba(12,13,32,.75)',
                        border: '1px solid rgba(140,160,255,.16)',
                        borderRadius: '12px', padding: '14px',
                        display: 'flex', flexDirection: 'column', gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ fontWeight: '700', fontSize: '14.5px', color: '#fff' }}>{node.label}</div>
                          {node.relatedNodeIds && node.relatedNodeIds.length > 0 && (
                            <span style={{ fontSize: '10px', color: '#38bdf8', border: '1px solid rgba(56,189,248,.35)', padding: '2px 6px', borderRadius: '6px' }}>
                              🔗 Conectado
                            </span>
                          )}
                        </div>

                        {node.note && (
                          <div style={{ fontSize: '12px', color: '#8e97c9', lineHeight: '1.4' }}>{node.note}</div>
                        )}

                        <button
                          onClick={() => handleLaunchApp(node)}
                          className="btn-primary"
                          style={{ marginTop: '6px', width: '100%', justifyContent: 'center', padding: '10px', fontSize: '12px', gap: '8px', borderRadius: '10px' }}
                        >
                          <BookOpen size={16} /> Estudar Agora
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. CABEÇALHO HUD (BRAND, RELÓGIO E FERRAMENTAS DE ATALHO) */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 5 }}>
        {/* LOGO BRUNO OS */}
        <div className="brain-internal-brand" style={{ position: 'absolute', top: '24px', left: '28px', display: 'flex', alignItems: 'center', gap: '12px', pointerEvents: 'auto' }}>
          <div style={{ 
            width: '12px', height: '12px', borderRadius: '50%', background: '#8b7bff', 
            boxShadow: '0 0 14px 3px rgba(139,123,255,0.9)', animation: 'pulse 2s infinite' 
          }} />
          <div>
            <h1 style={{ margin: 0, fontSize: '15px', fontWeight: '800', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#fff' }}>
              BRUNO OS
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '11px', letterSpacing: '0.14em', color: '#8e97c9', textTransform: 'uppercase' }}>
              O Cérebro Digital · v2.0
            </p>
          </div>
        </div>

        {/* RELÓGIO DE BRASÍLIA */}
        <div style={{ position: 'absolute', top: '22px', left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'auto' }} className="hide-mobile brain-clock">
          <div style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '0.14em', color: '#e9ecff' }}>
            {timeStr || '--:--'}
          </div>
          <div style={{ fontSize: '10.5px', letterSpacing: '0.18em', color: '#8e97c9', textTransform: 'uppercase', marginTop: '2px' }}>
            {dateStr || '—'}
          </div>
        </div>

        {/* BARRA DE FERRAMENTAS SUPERIOR (BOTÕES DE AÇÃO) */}
        <div className="brain-toolbar" style={{ position: 'absolute', top: '20px', right: '24px', display: 'flex', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
          {/* BOTÃO MODO CELULAR / LISTA RÁPIDA DE ESTUDOS */}
          <button
            onClick={() => setViewMode(prev => prev === '3d' ? 'list' : '3d')}
            className="btn-glass"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#a78bfa',
              borderColor: 'rgba(167, 139, 250, 0.4)',
              background: 'rgba(167, 139, 250, 0.1)'
            }}
            title="Alternar entre Visualização 3D e Lista no Celular"
          >
            {viewMode === '3d' ? <List size={14} color="#a78bfa" /> : <Sparkles size={14} color="#a78bfa" />}
            <span>{viewMode === '3d' ? 'Modo Celular' : 'Modo 3D'}</span>
          </button>

          {/* BOTÃO DO TREINO CEREBRAL DIÁRIO DE 5 MINUTOS */}
          <button
            onClick={onStartDailyWorkout}
            className="brain-action-training"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              backgroundColor: '#D97706',
              color: '#FFFFFF',
              border: '1px solid #F59E0B',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 0 12px rgba(245, 158, 11, 0.4)'
            }}
            title="Iniciar Treino Cerebral de 5 Minutos"
          >
            <Zap size={14} color="#FFF" />
            <span>Treino 5min</span>
            {dueInfo.totalDueCount > 0 && (
              <span style={{
                backgroundColor: '#EF4444',
                color: '#FFF',
                borderRadius: '50%',
                padding: '2px 6px',
                fontSize: '10px',
                fontWeight: '800'
              }}>
                {dueInfo.totalDueCount}
              </span>
            )}
          </button>

          {/* BOTÃO DA CAIXA DE ENTRADA RÁPIDA (BRAIN INBOX) */}
          <button
            onClick={onOpenBrainInbox}
            className="btn-glass brain-action-inbox"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#38BDF8',
              borderColor: 'rgba(56, 189, 248, 0.3)'
            }}
            title="Abrir Caixa de Entrada (Ctrl+V / Anotações Rápida)"
          >
            <Inbox size={14} color="#38BDF8" />
            <span>Capturar</span>
          </button>

          {/* BOTÃO DO EDITOR EM PLANILHA DO CÉREBRO */}
          <button
            onClick={() => setIsSpreadsheetOpen(true)}
            className="btn-glass brain-action-spreadsheet"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#34D399',
              borderColor: 'rgba(52, 211, 153, 0.3)'
            }}
            title="Abrir Editor em Planilha de Todos os Grupos e Esferas"
          >
            <Table size={14} color="#34D399" />
            <span>Planilha</span>
          </button>

          {/* BOTÃO RESTAURAR RAMOS PADRÃO */}
          <button
            onClick={() => {
              if (confirm('Deseja restaurar a árvore de esferas padrão com todas as ramificações em múltiplos níveis?')) {
                const defaultMap = structuredClone(DEFAULT_MIND_MAP);
                updateAndSave(defaultMap);
              }
            }}
            className="btn-glass brain-action-restore"
            style={{
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '11.5px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#A78BFA',
              borderColor: 'rgba(167, 139, 250, 0.3)'
            }}
            title="Recarregar todos os ramos de demonstração em múltiplos níveis"
          >
            <RotateCcw size={14} color="#A78BFA" />
            <span>Restaurar Ramos</span>
          </button>

          <button 
            onClick={() => setModalGroup('new')}
            className="btn-glass brain-action-group"
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            <FolderPlus size={14} style={{ marginRight: '6px' }} /> Novo Grupo
          </button>
          
          <button 
            onClick={() => setModalNode({ group: data.groups[0], node: null })}
            className="btn-primary brain-action-node"
            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '11.5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}
          >
            <Plus size={14} style={{ marginRight: '6px' }} /> Novo balão
          </button>

          <button 
            onClick={() => { viewRef.current.tpx = 0; viewRef.current.tpy = 0; viewRef.current.zoom = 1; }}
            className="btn-glass brain-action-center"
            title="Centralizar Cérebro"
            style={{ padding: '8px 10px', borderRadius: '10px' }}
          >
            <RotateCcw size={14} />
          </button>

          <button 
            onClick={handleExportMindMap}
            className="btn-glass brain-action-export"
            title="Exportar JSON do Cérebro"
            style={{ padding: '8px 10px', borderRadius: '10px' }}
          >
            <Download size={14} />
          </button>

          <button 
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="btn-glass brain-action-import"
            title="Importar JSON do Cérebro"
            style={{ padding: '8px 10px', borderRadius: '10px' }}
          >
            <Upload size={14} />
          </button>
          <input type="file" ref={fileInputRef} accept="application/json" onChange={handleImportMindMap} style={{ display: 'none' }} />
        </div>

        {/* CHIPS DA LEGENDA DOS GRUPOS (CANTO INFERIOR ESQUERDO) */}
        <div className="brain-groups" style={{ position: 'absolute', left: '28px', bottom: '24px', display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '240px', pointerEvents: 'auto' }}>
          <div style={{ fontSize: '9.5px', letterSpacing: '0.22em', color: '#8e97c9', textTransform: 'uppercase', marginBottom: '2px' }}>
            ÁREAS DE VIDA ({data?.groups?.length || 0})
          </div>
          {(data?.groups || []).map((g, gi) => (
            <div
              key={g.id || gi}
              onClick={() => toggleGroupHidden(gi)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '5px 11px 5px 8px', borderRadius: '20px',
                border: '1px solid rgba(140,160,255,.16)',
                background: g.hidden ? 'rgba(14,16,36,.25)' : 'rgba(14,16,36,.65)',
                backdropFilter: 'blur(10px)',
                fontSize: '11px', color: '#e9ecff', cursor: 'pointer',
                opacity: g.hidden ? 0.4 : 1, transition: '0.2s'
              }}
              title="Clique para ocultar/exibir este grupo no mapa"
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.color || '#3b82f6', boxShadow: `0 0 8px ${g.color}` }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
              <span style={{ fontSize: '9.5px', color: '#8e97c9' }}>{(g.nodes || []).length}</span>
            </div>
          ))}
        </div>

        {/* DICA DE NAVEGAÇÃO (CANTO INFERIOR DIREITO) */}
        <div style={{ position: 'absolute', right: '28px', bottom: '24px', textAlign: 'right', fontSize: '10.5px', letterSpacing: '0.1em', color: '#8e97c9', textTransform: 'uppercase', pointerEvents: 'none' }} className="hide-mobile brain-help">
          <div><b>Clique</b> num nódulo para abrir o aplicativo</div>
          <div><b>Arraste</b> para navegar · <b>Scroll</b> para Zoom</div>
        </div>
      </div>

      {/* 3. TOOLTIP AO PASSA O MOUSE SOBRE NÓDULOS */}
      {tooltip.show && (
        <div style={{
          position: 'fixed', left: `${tooltip.x}px`, top: `${tooltip.y}px`, zIndex: 10, pointerEvents: 'none',
          padding: '9px 13px', borderRadius: '11px', background: 'rgba(10,12,30,.88)', border: '1px solid rgba(140,160,255,.2)',
          backdropFilter: 'blur(12px)', fontSize: '12px', maxWidth: '230px', boxShadow: '0 18px 40px rgba(0,0,0,.6)'
        }}>
          <div style={{ fontSize: '9.5px', letterSpacing: '0.18em', textTransform: 'uppercase', color: tooltip.groupColor, marginBottom: '3px' }}>
            {tooltip.group}
          </div>
          <div style={{ fontWeight: '700', color: '#fff' }}>{tooltip.title}</div>
          {tooltip.desc && <div style={{ color: '#8e97c9', fontSize: '11px', marginTop: '4px', lineHeight: '1.4' }}>{tooltip.desc}</div>}
        </div>
      )}

      {/* 4. PAINEL LATERAL DE DETALHES E AÇÕES DE APLICATIVO DO NÓDULO SELECIONADO */}
      <aside className={`brain-details-panel ${selectedNode || selectedCore ? 'open' : ''}`} style={{
        position: 'fixed', top: 0, right: 0, height: '100%', width: '380px', maxWidth: '90vw', zIndex: 12,
        background: 'linear-gradient(180deg, rgba(12,13,32,.95), rgba(8,8,22,.98))',
        borderLeft: '1px solid rgba(140,160,255,.18)', backdropFilter: 'blur(22px)',
        transform: selectedNode || selectedCore ? 'translateX(0)' : 'translateX(105%)',
        transition: 'transform 0.35s cubic-bezier(.6,.05,.2,1)',
        padding: '32px 26px', display: 'flex', flexDirection: 'column', gap: '16px',
        boxShadow: '-30px 0 80px rgba(0,0,0,.6)', pointerEvents: 'auto', overflowY: 'auto'
      }}>
        {/* BOTÃO DE FECHAR PAINEL */}
        <button 
          onClick={() => { setSelectedNode(null); setSelectedCore(false); }}
          style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#8e97c9', cursor: 'pointer' }}
        >
          <X size={22} />
        </button>

        {/* NÓDULO SELECIONADO */}
        {selectedNode && (
          <>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: selectedNode.g.color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: selectedNode.g.color, boxShadow: `0 0 10px ${selectedNode.g.color}` }} />
              {selectedNode.g.name}
            </div>

            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#fff', lineHeight: 1.2 }}>
              {selectedNode.ref.label}
            </h2>

            <p style={{ color: '#b6bde6', fontSize: '13.5px', lineHeight: '1.6', whiteSpace: 'pre-wrap', margin: 0 }}>
              {selectedNode.ref.note || 'Sem descrição cadastrada ainda.'}
            </p>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#8e97c9', border: '1px solid rgba(140,160,255,.16)', padding: '4px 9px', borderRadius: '7px' }}>
                Importância: {selectedNode.ref.w || 2}/3
              </span>
              {selectedNode.ref.category && (
                <span style={{ fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#a855f7', border: '1px solid rgba(168,85,247,.3)', padding: '4px 9px', borderRadius: '7px' }}>
                  Categoria: {selectedNode.ref.category}
                </span>
              )}
            </div>

            <hr style={{ borderColor: 'rgba(140,160,255,.12)', margin: '8px 0' }} />

            {/* SEÇÃO DE DISPARADORES DE APLICATIVOS INTEGRADOS */}
            <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#8b7bff" /> Aplicativos Conectados
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* BOTÃO FLASHCARDS */}
              <button
                onClick={() => handleLaunchApp(selectedNode.ref, 'flashcards')}
                className="btn-primary"
                style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 14px', borderRadius: '12px', gap: '10px' }}
              >
                <BookOpen size={18} />
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: '700', fontSize: '13px' }}>Abrir Estudos</div>
                  <div style={{ fontSize: '10.5px', opacity: 0.85 }}>Baralhos e materiais de {selectedNode.ref.category || selectedNode.ref.label}</div>
                </div>
              </button>

              {/* BOTÃO FINANÇAS */}
              {(selectedNode.g.name.includes('Finan') || selectedNode.ref.appType === 'finance') && (
                <button
                  onClick={() => handleLaunchApp(selectedNode.ref, 'finance')}
                  className="btn-glass"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 14px', borderRadius: '12px', gap: '10px', borderColor: 'rgba(245,158,11,0.4)', background: 'rgba(245,158,11,0.1)' }}
                >
                  <DollarSign size={18} color="#f59e0b" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#f59e0b' }}>Controle Financeiro</div>
                    <div style={{ fontSize: '10.5px', color: '#8e97c9' }}>Abrir módulo financeiro do casal</div>
                  </div>
                </button>
              )}

              {/* BOTÃO HÁBITOS */}
              {(selectedNode.g.name.includes('Saúde') || selectedNode.ref.appType === 'habits') && (
                <button
                  onClick={() => handleLaunchApp(selectedNode.ref, 'habits')}
                  className="btn-glass"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 14px', borderRadius: '12px', gap: '10px', borderColor: 'rgba(34,197,94,0.4)', background: 'rgba(34,197,94,0.1)' }}
                >
                  <Flame size={18} color="#22c55e" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#22c55e' }}>Hábitos Diários</div>
                    <div style={{ fontSize: '10.5px', color: '#8e97c9' }}>Abrir rotina e conquistas com XP</div>
                  </div>
                </button>
              )}

              {/* BOTÃO SONHOS */}
              {(selectedNode.ref.appType === 'dreams') && (
                <button
                  onClick={() => handleLaunchApp(selectedNode.ref, 'dreams')}
                  className="btn-glass"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 14px', borderRadius: '12px', gap: '10px', borderColor: 'rgba(236,72,153,0.4)', background: 'rgba(236,72,153,0.1)' }}
                >
                  <Star size={18} color="#ec4899" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#ec4899' }}>Quadro dos Sonhos</div>
                    <div style={{ fontSize: '10.5px', color: '#8e97c9' }}>Ver metas e visões de futuro</div>
                  </div>
                </button>
              )}

              {/* BOTÃO DOCUMENTOS */}
              {(selectedNode.ref.appType === 'docs') && (
                <button
                  onClick={() => handleLaunchApp(selectedNode.ref, 'docs')}
                  className="btn-glass"
                  style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 14px', borderRadius: '12px', gap: '10px', borderColor: 'rgba(6,182,212,0.4)', background: 'rgba(6,182,212,0.1)' }}
                >
                  <FileText size={18} color="#06b6d4" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: '700', fontSize: '13px', color: '#06b6d4' }}>Guarda de Documentos</div>
                    <div style={{ fontSize: '10.5px', color: '#8e97c9' }}>Ver arquivos seguros da família</div>
                  </div>
                </button>
              )}
            </div>

            {/* SEÇÃO CONEXÕES CRUZADAS NO PAINEL LATERAL */}
            {selectedNode.ref.relatedNodeIds && selectedNode.ref.relatedNodeIds.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: '700', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Sparkles size={14} color="#38bdf8" /> Conexões Cruzadas ({selectedNode.ref.relatedNodeIds.length})
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {selectedNode.ref.relatedNodeIds.map(targetId => {
                    const targetIdStr = String(targetId);
                    const targetNodeObj = sceneRef.current?.nodes?.find(n => 
                      String(n.ref?.id) === targetIdStr || 
                      String(n.g?.id) === targetIdStr || 
                      String(n.g?.name).toLowerCase() === targetIdStr.toLowerCase()
                    );
                    const label = targetNodeObj ? (targetNodeObj.ref?.label || targetNodeObj.g?.name) : targetIdStr;
                    return (
                      <button
                        key={targetId}
                        onClick={() => {
                          if (targetNodeObj) setSelectedNode(targetNodeObj);
                        }}
                        style={{
                          background: 'rgba(6, 182, 212, 0.12)',
                          border: '1px solid rgba(6, 182, 212, 0.35)',
                          color: '#38bdf8',
                          fontSize: '11px',
                          padding: '5px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        🔗 {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AÇÕES DE GERENCIAMENTO DELE */}
            <div className="brain-details-actions" style={{ marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '16px' }}>
              <button 
                onClick={() => setModalNode({ group: selectedNode.g, node: selectedNode.ref })}
                className="btn-glass" style={{ flex: 1, justifyContent: 'center' }}
              >
                <Edit3 size={14} style={{ marginRight: '6px' }} /> Editar Esfera
              </button>
              <button 
                onClick={() => {
                  if (!confirm(`Excluir a esfera "${selectedNode.ref.label}" do cérebro?`)) return;
                  const updated = structuredClone(data);
                  const targetG = updated.groups.find(g => g.id === selectedNode.g.id);
                  if (targetG) {
                    targetG.nodes = targetG.nodes.filter(n => n.id !== selectedNode.ref.id);
                    updateAndSave(updated);
                    setSelectedNode(null);
                  }
                }}
                className="btn-glass" style={{ borderColor: 'rgba(239,68,68,0.4)', color: '#ef4444' }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </>
        )}

        {/* NÓDULO CENTRAL SELECIONADO (O CÉREBRO) */}
        {selectedCore && data?.center && (
          <>
            <div style={{ fontSize: '10px', letterSpacing: '0.22em', textTransform: 'uppercase', color: '#a78bfa', fontWeight: '700' }}>
              Centro Vital
            </div>
            <h2 style={{ margin: 0, fontSize: '26px', fontWeight: '700', color: '#fff' }}>
              {data.center.label} OS
            </h2>
            <p style={{ color: '#b6bde6', fontSize: '13.5px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {data.center.desc}
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <span style={{ fontSize: '10px', color: '#8e97c9', border: '1px solid rgba(140,160,255,.16)', padding: '5px 10px', borderRadius: '8px' }}>
                {data.groups.length} Áreas de Vida
              </span>
              <span style={{ fontSize: '10px', color: '#8e97c9', border: '1px solid rgba(140,160,255,.16)', padding: '5px 10px', borderRadius: '8px' }}>
                {data.groups.reduce((a, g) => a + (g.nodes ? g.nodes.length : 0), 0)} Esferas Ativas
              </span>
            </div>
          </>
        )}
      </aside>

      {/* 5. MODAL DE ADIÇÃO E EDIÇÃO DE ESFERAS (NÓS) */}
      {modalNode && (
        <div className="brain-modal-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(3,4,12,.78)', backdropFilter: 'blur(8px)'
        }}>
          <div className="brain-modal-card" style={{
            width: '440px', maxWidth: '92vw', background: 'linear-gradient(180deg,#12132c,#0a0a1c)',
            border: '1px solid rgba(140,160,255,.2)', borderRadius: '20px', padding: '26px', boxShadow: '0 40px 100px rgba(0,0,0,.8)',
            maxHeight: '90vh', overflowY: 'auto'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>
              {modalNode.node ? 'Editar Esfera' : 'Nova Esfera no Cérebro'}
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', marginBottom: '6px' }}>
                Grupo / Área de Vida
              </label>
              <select
                id="f_g"
                defaultValue={modalNode.group ? modalNode.group.id : data.groups[0].id}
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(140,160,255,.2)', borderRadius: '10px', padding: '10px', color: '#fff' }}
              >
                {data.groups.map(g => (
                  <option key={g.id} value={g.id} style={{ background: '#12132c' }}>{g.name}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', marginBottom: '6px' }}>
                Nome da Esfera
              </label>
              <input
                id="f_l"
                defaultValue={modalNode.node ? modalNode.node.label : ''}
                placeholder="Ex: Prova de Cálculo, Inglês..."
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(140,160,255,.2)', borderRadius: '10px', padding: '10px', color: '#fff' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', marginBottom: '6px' }}>
                Descrição / Anotação
              </label>
              <textarea
                id="f_n"
                defaultValue={modalNode.node ? modalNode.node.note : ''}
                placeholder="O que está acontecendo aqui?"
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(140,160,255,.2)', borderRadius: '10px', padding: '10px', color: '#fff', minHeight: '70px' }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', marginBottom: '6px' }}>
                Esfera Mãe / Pai (Ramificar a partir de)
              </label>
              <select
                id="f_parent"
                defaultValue={modalNode.node ? (modalNode.node.parentId || '') : ''}
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(140,160,255,.2)', borderRadius: '10px', padding: '10px', color: '#fff' }}
              >
                <option value="" style={{ background: '#12132c' }}>(Nenhuma - Esfera Principal)</option>
                {(data?.groups || []).flatMap(g => g.nodes || []).map(n => {
                  if (modalNode.node && n.id === modalNode.node.id) return null;
                  return (
                    <option key={n.id} value={n.id} style={{ background: '#12132c' }}>
                      {n.label}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* SELEÇÃO MÚLTIPLA DE CONEXÕES CRUZADAS (CROSS-LINKS) */}
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#38bdf8', marginBottom: '6px' }}>
                🔗 Conectar a (Outras Esferas ou Grupos)
              </label>
              <div style={{ maxHeight: '110px', overflowY: 'auto', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(56,189,248,.3)', borderRadius: '10px', padding: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {(data?.groups || []).flatMap(g => [
                  { id: g.id, label: `📌 Grupo: ${g.name}` },
                  ...(g.nodes || []).map(n => ({ id: n.id, label: `🔮 ${n.label}` }))
                ]).filter(item => !modalNode.node || item.id !== modalNode.node.id).map(item => {
                  const isChecked = selectedRelatedIds.includes(item.id);
                  return (
                    <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: isChecked ? '#38bdf8' : '#b6bde6', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRelatedIds(prev => [...prev, item.id]);
                          } else {
                            setSelectedRelatedIds(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                      />
                      {item.label}
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', marginBottom: '6px' }}>
                Aplicativo Conectado
              </label>
              <select
                id="f_app"
                defaultValue={modalNode.node ? (modalNode.node.appType || 'flashcards') : 'flashcards'}
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(140,160,255,.2)', borderRadius: '10px', padding: '10px', color: '#fff' }}
              >
                <option value="flashcards" style={{ background: '#12132c' }}>Estudos (baralhos e materiais)</option>
                <option value="notebook" style={{ background: '#12132c' }}>Caderno de Anotações</option>
                <option value="finance" style={{ background: '#12132c' }}>Controle Financeiro</option>
                <option value="habits" style={{ background: '#12132c' }}>Hábitos Diários</option>
                <option value="dreams" style={{ background: '#12132c' }}>Quadro dos Sonhos</option>
                <option value="docs" style={{ background: '#12132c' }}>Documentos</option>
              </select>
            </div>

            <div className="brain-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModalNode(null)} className="btn-glass">Cancelar</button>
              <button
                onClick={() => {
                  const label = document.getElementById("f_l").value.trim();
                  if (!label) return;
                  const note = document.getElementById("f_n").value.trim();
                  const gid = document.getElementById("f_g").value;
                  const appType = document.getElementById("f_app").value;
                  const parentId = document.getElementById("f_parent").value || null;
                  
                  const updated = structuredClone(data);
                  const tg = updated.groups.find(g => g.id === gid);

                  if (!modalNode.node) {
                    // Adiciona nova esfera com conexões cruzadas
                    tg.nodes.push({ id: "n" + Date.now(), label, note, w: 2, appType, category: label, parentId, relatedNodeIds: selectedRelatedIds });
                  } else {
                    // Atualiza esfera existente com conexões cruzadas
                    let origG = updated.groups.find(g => g.nodes && g.nodes.some(n => String(n.id) === String(modalNode.node.id)));
                    if (!origG && modalNode.group) {
                      origG = updated.groups.find(g => String(g.id) === String(modalNode.group.id));
                    }
                    if (origG) {
                      let targetNode = origG.nodes.find(n => String(n.id) === String(modalNode.node.id));
                      if (!targetNode && modalNode.node) {
                        targetNode = modalNode.node;
                        origG.nodes.push(targetNode);
                      }
                      if (targetNode) {
                        targetNode.label = label;
                        targetNode.note = note;
                        targetNode.appType = appType;
                        targetNode.category = label;
                        targetNode.parentId = parentId;
                        targetNode.relatedNodeIds = selectedRelatedIds;
                        if (origG.id !== gid && tg) {
                          origG.nodes = origG.nodes.filter(n => String(n.id) !== String(modalNode.node.id));
                          tg.nodes.push(targetNode);
                        }
                      }
                    }
                  }
                  updateAndSave(updated);
                  setModalNode(null);
                  setSelectedNode(null);
                }}
                className="btn-primary"
              >
                {modalNode.node ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. MODAL DE CRIAÇÃO DE GRUPO */}
      {modalGroup && (
        <div className="brain-modal-overlay" style={{
          position: 'fixed', inset: 0, zIndex: 20, display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(3,4,12,.78)', backdropFilter: 'blur(8px)'
        }}>
          <div className="brain-modal-card brain-modal-card-small" style={{
            width: '400px', maxWidth: '92vw', background: 'linear-gradient(180deg,#12132c,#0a0a1c)',
            border: '1px solid rgba(140,160,255,.2)', borderRadius: '20px', padding: '26px', boxShadow: '0 40px 100px rgba(0,0,0,.8)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '15px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#fff' }}>
              Novo Grupo de Vida
            </h3>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8e97c9', marginBottom: '6px' }}>
                Nome da Área de Vida
              </label>
              <input
                id="g_n"
                placeholder="Ex: Projetos Pessoais, Espiritualidade..."
                style={{ width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(140,160,255,.2)', borderRadius: '10px', padding: '10px', color: '#fff' }}
              />
            </div>

            <div className="brain-modal-actions" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button onClick={() => setModalGroup(null)} className="btn-glass">Cancelar</button>
              <button
                onClick={() => {
                  const name = document.getElementById("g_n").value.trim();
                  if (!name) return;
                  const updated = structuredClone(data);
                  const color = PALETTE[updated.groups.length % PALETTE.length];
                  updated.groups.push({ id: "g" + Date.now(), name, color, nodes: [] });
                  updateAndSave(updated);
                  setModalGroup(null);
                }}
                className="btn-primary"
              >
                Criar Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL DO EDITOR EM PLANILHA DO CÉREBRO */}
      <MindMapSpreadsheetModal
        isOpen={isSpreadsheetOpen}
        onClose={() => setIsSpreadsheetOpen(false)}
        mindMap={data}
        onSaveMindMap={updateAndSave}
        categories={categories}
      />
    </div>
  );
}

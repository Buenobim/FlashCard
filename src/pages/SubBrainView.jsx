/*
  =============================================================================
  ARQUIVO: src/pages/SubBrainView.jsx
  PARA QUE SERVE: É a casca do Sub-Cérebro de cada baralho, com DUAS visões:

    - MACRO (esta tela): a matéria no centro e, em volta, uma esfera para cada
      tipo de conteúdo — Flashcards, Anotação, Caderno, Exercícios, Link.
      É a visão de longe, para escolher por onde começar.

    - MICRO (MicroBrainView.jsx): o leque inteiro aberto, SEM a matéria no
      centro. Aparecem todos os cartões, os filhos de cada cartão e as
      anotações penduradas neles — toda conexão que existe dentro da matéria.

  O botão no alto à direita troca entre as duas.

  REGRA DE OURO: Nenhum flashcard existente é perdido. Os sub-itens ficam
  salvos no campo set.subItems dentro do mesmo objeto do baralho, e a
  hierarquia dos cartões vive no campo `parentId` de cada cartão.
  =============================================================================
*/

import { useRef, useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ClipboardList,
  Edit3,
  Network,
  Orbit,
  Plus,
  Trash2,
  X,
} from 'lucide-react';

import MicroBrainView from './MicroBrainView.jsx';
import { provasDoBaralho, contarQuestoes } from '../estudo/questoes/index.js';
import AulaEditorModal from '../components/AulaEditorModal.jsx';
import { tamanhoLegivel } from '../utils/aulasCore.js';
import { apagarAula } from '../utils/db';
import {
  ORBIT_COLORS,
  SUB_ITEM_TYPES,
  SubItemEditor,
  buildCardIndex,
  hexToRgba,
  mixColor,
} from './subBrainShared.jsx';

/* ======================================================================
   COMPONENTE PRINCIPAL: SubBrainView
   ====================================================================== */
export default function SubBrainView({
  set,
  onNavigate,
  onSelectSet,
  onSaveSet,
  onOpenNotebook,
  onOpenAula,
  activeProfile,
  categories = [],
  onEstudarTrilha,
}) {
  const canvasRef = useRef(null);
  const sceneRef = useRef({ nodes: [], stars: [], time: 0, centerR: 70 });
  const viewRef = useRef({ zoom: 1, px: 0, py: 0, mx: 0, my: 0 });

  // Estados para modais e interações
  const [activeModal, setActiveModal] = useState(null); // 'flashcards' | 'note' | 'link' | ...
  const [editorState, setEditorState] = useState(null); // { type, subItem }
  const [hoveredNode, setHoveredNode] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  // Qual visão está no ar: 'macro' (matéria no centro) ou 'micro' (leque aberto)
  const [viewMode, setViewMode] = useState('macro');

  const cards = set?.cards || [];
  const subItems = set?.subItems || [];

  /*
    AS PROVAS RESOLVIDAS desta matéria (src/estudo/questoes/*.json).

    POR QUE ELAS ENTRAM NA ESFERA "EXERCÍCIOS": exercício é exatamente isto —
    questão para você resolver. Ter uma esfera "Exercícios" vazia no mapa ao
    mesmo tempo em que a matéria tem 10 questões de prova resolvidas guardadas
    em outro canto é justamente o tipo de coisa que faz você parar de confiar
    no mapa. Então elas contam na bolinha e aparecem dentro do painel, em cima
    das listas de tarefa que você mesmo criou.
  */
  const provasResolvidas = provasDoBaralho(set);
  const totalDeQuestoes = contarQuestoes(set);
  // Mapa da família dos cartões (quem é mãe, quem é filho) — usado nos contadores
  const cardIndex = buildCardIndex(cards, subItems);

  const seeded = (i) => {
    const s = Math.sin(i * 127.1) * 43758.5453;
    return s - Math.floor(s);
  };

  /* ------------------------------------------------------------------
     LAYOUT E ANTI-COLISÃO: calcula posições sem sobreposição
     ------------------------------------------------------------------ */
  const layoutScene = useCallback((width, height) => {
    const nodes = [];
    const centerR = Math.max(65, Math.min(width, height) * 0.12);
    const orbitR = Math.max(180, Math.min(width, height) * 0.28);

    const orbits = [
      { key: 'flashcards', label: 'Flashcards', color: ORBIT_COLORS.flashcards, count: cards.length },
    ];

    const countByType = {};
    subItems.forEach((si) => {
      countByType[si.type] = (countByType[si.type] || 0) + 1;
    });

    Object.entries(SUB_ITEM_TYPES).forEach(([type, config]) => {
      orbits.push({
        key: type,
        label: config.label,
        color: ORBIT_COLORS[type] || config.color,
        // As provas resolvidas contam junto com as listas de exercício que
        // você criou à mão — as duas coisas são "questão para resolver".
        count: (countByType[type] || 0) + (type === 'exercises' ? totalDeQuestoes : 0),
      });
    });

    const N = orbits.length;

    orbits.forEach((orbit, i) => {
      const angle = (-90 + i * (360 / N)) * Math.PI / 180;
      const hx = Math.cos(angle) * orbitR;
      const hy = Math.sin(angle) * orbitR;
      const r = Math.max(34, Math.min(48, centerR * 0.62));

      nodes.push({
        key: orbit.key,
        label: orbit.label,
        color: orbit.color,
        count: orbit.count,
        hx,
        hy,
        x: hx,
        y: hy,
        r,
        ph: seeded(i * 53) * Math.PI * 2,
        sp: 0.45 + seeded(i * 7) * 0.5,
        am: 6 + seeded(i * 13) * 8,
        depth: 0.6 + seeded(i * 3) * 0.4,
        alpha: 1,
        glow: 0,
      });
    });

    // Algoritmo anti-colisão em 50 iterações (garante zero sobreposição!)
    for (let iter = 0; iter < 50; iter++) {
      let moved = false;
      for (let i = 0; i < nodes.length; i++) {
        // Empurra do centro
        const dCenter = Math.hypot(nodes[i].hx, nodes[i].hy) || 0.1;
        const minCenterSep = centerR + nodes[i].r + 35;
        if (dCenter < minCenterSep) {
          const push = minCenterSep - dCenter;
          nodes[i].hx += (nodes[i].hx / dCenter) * push;
          nodes[i].hy += (nodes[i].hy / dCenter) * push;
          moved = true;
        }

        // Empurra entre esferas orbitantes
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          const dx = n2.hx - n1.hx;
          const dy = n2.hy - n1.hy;
          const dist = Math.hypot(dx, dy) || 0.1;
          const minSep = n1.r + n2.r + 30;
          if (dist < minSep) {
            const overlap = (minSep - dist) * 0.5;
            n1.hx -= (dx / dist) * overlap;
            n1.hy -= (dy / dist) * overlap;
            n2.hx += (dx / dist) * overlap;
            n2.hy += (dy / dist) * overlap;
            moved = true;
          }
        }
      }
      if (!moved) break;
    }

    sceneRef.current.nodes = nodes;
    sceneRef.current.centerR = centerR;
  }, [cards.length, subItems, totalDeQuestoes]);

  /* ------------------------------------------------------------------
     ESTRELAS DE FUNDO
     ------------------------------------------------------------------ */
  const buildStars = (width, height) => {
    const stars = [];
    const N = Math.round((width * height) / 5500);
    for (let i = 0; i < N; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 1.15 + 0.2,
        a: Math.random() * 0.5 + 0.15,
        tw: Math.random() * Math.PI * 2,
        sp: 0.4 + Math.random() * 1.4,
        d: 0.15 + Math.random() * 0.5,
      });
    }
    sceneRef.current.stars = stars;
  };

  /* ------------------------------------------------------------------
     ENGINE DE RENDERIZAÇÃO CANVAS 3D
     ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = null;

    function handleResize() {
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      const W = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      const H = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildStars(W, H);
      layoutScene(W, H);
    }

    handleResize();
    window.addEventListener('resize', handleResize);

    let lastTime = performance.now();

    function render(now) {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      sceneRef.current.time += dt;
      const T = sceneRef.current.time;

      const W = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      const H = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
      const cx = W / 2;
      const cy = H / 2;
      const centerR = sceneRef.current.centerR || 65;

      // 1. FUNDO CIBERNÉTICO
      const bgG = ctx.createRadialGradient(cx, cy * 0.96, 0, cx, cy * 0.96, Math.max(W, H) * 0.78);
      bgG.addColorStop(0, '#131034');
      bgG.addColorStop(0.42, '#0a0a20');
      bgG.addColorStop(1, '#04040d');
      ctx.fillStyle = bgG;
      ctx.fillRect(0, 0, W, H);

      // Nebulosas
      const blobs = [
        [W * 0.2, H * 0.25, Math.max(W, H) * 0.3, 'rgba(80,40,160,.14)'],
        [W * 0.8, H * 0.7, Math.max(W, H) * 0.32, 'rgba(20,80,180,.12)'],
      ];
      blobs.forEach(([bx, by, br, bc], i) => {
        const dx = Math.sin(T * 0.00007 + i) * 30;
        const dy = Math.cos(T * 0.00009 + i) * 25;
        const rg = ctx.createRadialGradient(bx + dx, by + dy, 0, bx + dx, by + dy, br);
        rg.addColorStop(0, bc);
        rg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rg;
        ctx.fillRect(0, 0, W, H);
      });

      // Estrelas
      sceneRef.current.stars.forEach((st) => {
        const a = st.a * (0.55 + 0.45 * Math.sin(T * 0.001 * st.sp + st.tw));
        ctx.globalAlpha = a;
        ctx.fillStyle = '#cfd8ff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 7);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // 2. ESFERA CENTRAL (A MATÉRIA)
      const pulse = 0.97 + Math.sin(T * 0.0008) * 0.03;
      const cr = centerR * pulse;
      const centerCol = '#8b5cf6';

      // Halo externo
      const halo = ctx.createRadialGradient(cx, cy, cr * 0.7, cx, cy, cr * 2.2);
      halo.addColorStop(0, hexToRgba(centerCol, 0.35));
      halo.addColorStop(1, hexToRgba(centerCol, 0));
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, cr * 2.2, 0, 7);
      ctx.fill();

      // Esfera 3D com degradê
      const sf = ctx.createRadialGradient(cx - cr * 0.35, cy - cr * 0.4, cr * 0.05, cx, cy, cr);
      sf.addColorStop(0, mixColor(centerCol, '#ffffff', 0.72));
      sf.addColorStop(0.42, mixColor(centerCol, '#ffffff', 0.14));
      sf.addColorStop(1, mixColor(centerCol, '#000018', 0.46));
      ctx.fillStyle = sf;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, 7);
      ctx.fill();

      // Especular superior (brilho de vidro)
      const sp = ctx.createRadialGradient(cx - cr * 0.36, cy - cr * 0.44, 0, cx - cr * 0.36, cy - cr * 0.44, cr * 0.62);
      sp.addColorStop(0, 'rgba(255,255,255,.85)');
      sp.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sp;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, 7);
      ctx.fill();

      // Borda de vidro
      ctx.strokeStyle = hexToRgba('#ffffff', 0.25);
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(cx, cy, cr, 0, 7);
      ctx.stroke();

      // Texto interno central (com auto-fit de fonte)
      const titleStr = String(set?.title || 'Matéria');
      const words = titleStr.split(/\s+/);
      let lines = [];
      if (words.length <= 2) {
        lines = words;
      } else if (words.length <= 4) {
        const mid = Math.ceil(words.length / 2);
        lines = [words.slice(0, mid).join(' '), words.slice(mid).join(' ')];
      } else {
        const p1 = Math.ceil(words.length / 3);
        const p2 = Math.ceil((words.length - p1) / 2) + p1;
        lines = [words.slice(0, p1).join(' '), words.slice(p1, p2).join(' '), words.slice(p2).join(' ')];
      }

      let centerFs = Math.round(cr * 0.34);
      ctx.font = `700 ${centerFs}px "Inter","Segoe UI",sans-serif`;
      const maxCenterWidth = cr * 1.55;
      lines.forEach((l) => {
        const w = ctx.measureText(l).width;
        if (w > maxCenterWidth && w > 0) {
          centerFs = Math.floor(centerFs * (maxCenterWidth / w));
        }
      });
      centerFs = Math.max(9, Math.min(centerFs, Math.round(cr * 0.38)));

      ctx.font = `700 ${centerFs}px "Inter","Segoe UI",sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0,0,10,.6)';
      ctx.shadowBlur = 3;

      const lh = centerFs * 1.15;
      const y0 = cy - (lines.length - 1) * lh / 2;
      lines.forEach((l, li) => ctx.fillText(l, cx, y0 + li * lh));
      ctx.shadowBlur = 0;

      // 3. ESFERAS ORBITANTES (SUB-CONTEÚDOS)
      const nodes = sceneRef.current.nodes;
      nodes.forEach((n) => {
        // Flutuação suave
        n.x = n.hx + Math.sin(T * 0.00045 * n.sp + n.ph) * n.am
              + Math.cos(T * 0.00031 * n.sp + n.ph * 1.7) * n.am * 0.55;
        n.y = n.hy + Math.cos(T * 0.00039 * n.sp + n.ph * 1.3) * n.am
              + Math.sin(T * 0.00027 * n.sp + n.ph) * n.am * 0.5;

        const isHovered = hoveredNode === n.key;
        n.glow += ((isHovered ? 1 : 0) - n.glow) * 0.12;

        const nx = cx + n.x;
        const ny = cy + n.y;
        const nr = n.r * (1 + n.glow * 0.14);

        // Linha de conexão
        const ang = Math.atan2(n.y, n.x);
        const sx = cx + Math.cos(ang) * cr * 0.96;
        const sy = cy + Math.sin(ang) * cr * 0.96;

        ctx.strokeStyle = `${n.color}44`;
        ctx.lineWidth = 1.2 + n.glow * 0.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(nx, ny);
        ctx.stroke();

        // Pulso de luz na linha
        const pulsePos = (T * 0.0003 + seeded(nodes.indexOf(n) * 7)) % 1;
        const ppx = sx + (nx - sx) * pulsePos;
        const ppy = sy + (ny - sy) * pulsePos;
        ctx.fillStyle = n.color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(ppx, ppy, 2.8, 0, 7);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Halo externo
        const nHalo = ctx.createRadialGradient(nx, ny, nr * 0.7, nx, ny, nr * (2.1 + n.glow * 0.9));
        nHalo.addColorStop(0, hexToRgba(n.color, 0.34 + n.glow * 0.3));
        nHalo.addColorStop(1, hexToRgba(n.color, 0));
        ctx.fillStyle = nHalo;
        ctx.beginPath();
        ctx.arc(nx, ny, nr * (2.1 + n.glow * 0.9), 0, 7);
        ctx.fill();

        // Esfera 3D degradê
        const nSf = ctx.createRadialGradient(nx - nr * 0.35, ny - nr * 0.4, nr * 0.05, nx, ny, nr);
        nSf.addColorStop(0, mixColor(n.color, '#ffffff', 0.72));
        nSf.addColorStop(0.42, mixColor(n.color, '#ffffff', 0.14));
        nSf.addColorStop(1, mixColor(n.color, '#000018', 0.46));
        ctx.fillStyle = nSf;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.fill();

        // Especular superior
        const nSp = ctx.createRadialGradient(nx - nr * 0.36, ny - nr * 0.44, 0, nx - nr * 0.36, ny - nr * 0.44, nr * 0.62);
        nSp.addColorStop(0, 'rgba(255,255,255,.85)');
        nSp.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = nSp;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.fill();

        // Aro externo de vidro
        ctx.strokeStyle = hexToRgba('#ffffff', 0.18 + n.glow * 0.5);
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.stroke();

        // Texto interno (auto-fit de fonte)
        let fs = Math.round(nr * 0.34);
        ctx.font = `600 ${fs}px "Inter","Segoe UI",sans-serif`;
        const maxLabelWidth = nr * 1.5;
        const wLabel = ctx.measureText(n.label).width;
        if (wLabel > maxLabelWidth && wLabel > 0) {
          fs = Math.floor(fs * (maxLabelWidth / wLabel));
        }
        fs = Math.max(7, Math.min(fs, Math.round(nr * 0.38)));

        ctx.font = `600 ${fs}px "Inter","Segoe UI",sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = 'rgba(0,0,10,.6)';
        ctx.shadowBlur = 3;
        ctx.fillText(n.label, nx, ny - (n.count > 0 ? fs * 0.35 : 0));
        ctx.shadowBlur = 0;

        if (n.count > 0) {
          ctx.font = `700 ${Math.max(7, fs * 0.75)}px "Inter",sans-serif`;
          ctx.fillStyle = 'rgba(255,255,255,.75)';
          ctx.fillText(`${n.count}`, nx, ny + fs * 0.55);
        }
      });

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [set, hoveredNode, layoutScene, viewMode]);

  /* ------------------------------------------------------------------
     INTERAÇÃO: Click e hover no Canvas
     ------------------------------------------------------------------ */
  const getNodeAtPos = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.parentElement.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;

    const nodes = sceneRef.current.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = x - n.x;
      const dy = y - n.y;
      if (dx * dx + dy * dy < (n.r + 10) * (n.r + 10)) return n;
    }
    return null;
  };

  const handleCanvasClick = (e) => {
    const node = getNodeAtPos(e.clientX, e.clientY);
    if (node) {
      setActiveModal(node.key);
    }
  };

  const handleCanvasMove = (e) => {
    const node = getNodeAtPos(e.clientX, e.clientY);
    setHoveredNode(node ? node.key : null);
    if (canvasRef.current) {
      canvasRef.current.style.cursor = node ? 'pointer' : 'default';
    }
  };

  /* ------------------------------------------------------------------
     FUNÇÕES DE SALVAMENTO DE SUB-ITENS
     ------------------------------------------------------------------ */
  const saveSubItem = (item) => {
    const exists = subItems.some((si) => si.id === item.id);
    const updatedSubItems = exists
      ? subItems.map((si) => (si.id === item.id ? item : si))
      : [...subItems, item];
    const updatedSet = { ...set, subItems: updatedSubItems };
    onSaveSet(updatedSet);
    setEditorState(null);
    if (item.type === 'notebook' && !exists) onOpenNotebook(item);
    if (item.type === 'aula' && !exists) onOpenAula?.(item);
  };

  const deleteSubItem = (subItemId) => {
    if (confirmDeleteId === subItemId) {
      /*
        Se for uma AULA, o HTML dela mora fora do baralho (IndexedDB + nuvem).
        Apagar só a ficha deixaria o arquivo ocupando espaço para sempre, sem
        nenhuma tela capaz de alcançá-lo. Por isso limpamos os dois.
      */
      const alvo = subItems.find((si) => si.id === subItemId);
      if (alvo?.type === 'aula') apagarAula(activeProfile, subItemId);

      const updatedSubItems = subItems.filter((si) => si.id !== subItemId);
      const updatedConnections = (set.subConnections || []).filter(
        (c) => c.from !== subItemId && c.to !== subItemId
      );
      onSaveSet({ ...set, subItems: updatedSubItems, subConnections: updatedConnections });
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(subItemId);
    }
  };

  const openSubItem = (item) => {
    if (item.type === 'notebook') onOpenNotebook(item);
    else if (item.type === 'aula') onOpenAula?.(item);
    else if (item.type === 'link' && item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
    else setEditorState({ type: item.type, subItem: item });
  };

  const startStudyMode = (modeKey) => {
    onSelectSet(set);
    onNavigate(modeKey);
  };

  /* ------------------------------------------------------------------
     RENDERIZAÇÃO DO PAINEL LATERAL/MODAL
     ------------------------------------------------------------------ */
  const renderPanel = () => {
    if (!activeModal) return null;

    if (activeModal === 'flashcards') {
      return (
        <div className="sub-brain-panel glass-panel" onClick={(e) => e.stopPropagation()}>
          <div className="sub-brain-panel-header">
            <BookOpen size={20} color="#E8933F" />
            <h3>Flashcards</h3>
            <span className="sub-brain-count-badge">{cards.length} cartões</span>
            <button className="sub-brain-panel-close" onClick={() => setActiveModal(null)}><X size={18} /></button>
          </div>
          {cards.length > 0 ? (
            <div className="sub-brain-study-modes">
              {/*
                A TRILHA vem primeiro porque é o modo completo: ela percorre a
                matéria inteira (contexto + cartões) e é a única que agenda a
                próxima revisão de cada cartão. Os quatro modos clássicos abaixo
                continuam intactos, para treinar de outras formas.
              */}
              {onEstudarTrilha && (
                <button
                  className="sub-brain-mode-btn"
                  style={{ borderColor: '#E8933F55', background: 'rgba(232,147,63,.09)' }}
                  onClick={() => { setActiveModal(null); onEstudarTrilha(set); }}
                >
                  <span style={{ color: '#EFAE6B', fontWeight: 700 }}>Estudar a Trilha</span>
                  <ChevronRight size={16} color="#EFAE6B" />
                </button>
              )}
              {[
                { key: 'flashcard_mode', name: 'Flashcards 3D', color: '#E8933F' },
                { key: 'learn_mode', name: 'Aprender', color: '#E77950' },
                { key: 'match_mode', name: 'Combinar', color: '#EEA53D' },
                { key: 'test_mode', name: 'Simulado', color: '#3ECF8E' },
              ].map((m) => (
                <button key={m.key} className="sub-brain-mode-btn" style={{ borderColor: `${m.color}33` }} onClick={() => startStudyMode(m.key)}>
                  <span style={{ color: m.color, fontWeight: 600 }}>{m.name}</span>
                  <ChevronRight size={16} color={m.color} />
                </button>
              ))}
              <button className="sub-brain-mode-btn" style={{ borderColor: '#7AA2F733' }} onClick={() => { setActiveModal(null); setViewMode('micro'); }}>
                <span style={{ color: '#7AA2F7', fontWeight: 600 }}>Abrir o leque no Micro ({cardIndex.roots.length} ramos)</span>
                <Network size={16} color="#7AA2F7" />
              </button>
              <button className="sub-brain-mode-btn" style={{ borderColor: '#7A828E33' }} onClick={() => { onSelectSet(set); onNavigate('edit'); }}>
                <span style={{ color: '#F4F5F7', fontWeight: 600 }}>Editar a trilha da matéria</span>
                <Edit3 size={16} color="#7A828E" />
              </button>
            </div>
          ) : (
            <div className="sub-brain-empty-items">
              <p>Nenhum flashcard ainda.</p>
              <button className="btn-primary" onClick={() => { onSelectSet(set); onNavigate('edit'); }}><Plus size={16} /> Criar Flashcards</button>
            </div>
          )}
        </div>
      );
    }

    const type = activeModal;
    const config = SUB_ITEM_TYPES[type];
    if (!config) return null;
    const Icon = config.icon;
    const items = subItems.filter((si) => si.type === type);

    return (
      <div className="sub-brain-panel glass-panel" onClick={(e) => e.stopPropagation()}>
        <div className="sub-brain-panel-header">
          <Icon size={20} color={config.color} />
          <h3>{config.label}</h3>
          <span className="sub-brain-count-badge" style={{ background: `${config.color}1a`, color: config.color }}>
            {items.length + (type === 'exercises' ? totalDeQuestoes : 0)}
          </span>
          <button className="btn-primary btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setEditorState({ type, subItem: null })}><Plus size={14} /> Novo</button>
          <button className="sub-brain-panel-close" onClick={() => setActiveModal(null)}><X size={18} /></button>
        </div>
        {/*
          AS PROVAS RESOLVIDAS, em cima de tudo dentro de Exercícios.
          Elas não são sub-itens do baralho (não dá para editar nem apagar por
          aqui): vêm dos arquivos de src/estudo/questoes/. Por isso o cartão é
          outro — é um atalho para o treino, não uma linha de lista.
        */}
        {type === 'exercises' && provasResolvidas.length > 0 && (
          <div className="sub-brain-provas">
            {provasResolvidas.map((prova) => (
              <button
                key={prova.id}
                type="button"
                className="sub-brain-prova"
                onClick={() => {
                  setActiveModal(null);
                  if (onEstudarTrilha) onEstudarTrilha(set, 'questoes');
                }}
              >
                <span className="sub-brain-prova-icone"><ClipboardList size={18} /></span>
                <span className="sub-brain-prova-texto">
                  <strong>{prova.titulo}</strong>
                  <small>
                    {(prova.questoes || []).length} questões resolvidas, com o passo a passo
                    e a pegadinha de cada uma. Toque para treinar.
                  </small>
                </span>
                <ChevronRight size={17} />
              </button>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <div className="sub-brain-empty-items">
            <p>
              {type === 'exercises' && provasResolvidas.length > 0
                ? 'Além das provas acima, você pode criar suas próprias listas de exercício em "+ Novo".'
                : `Nenhum(a) ${config.label.toLowerCase()} ainda. Clique em "+ Novo" para criar!`}
            </p>
          </div>
        ) : (
          <div className="sub-brain-items-list">
            {items.map((item) => {
              const isConfirming = confirmDeleteId === item.id;
              const completed = (item.tasks || []).filter((t) => t.done).length;
              // A aula não tem "conteúdo" na ficha (o HTML mora fora): a linha
              // de baixo mostra a data e o peso, que é o que ajuda a achar.
              const resumoDaAula = [
                item.data ? item.data.split('-').reverse().join('/') : '',
                item.bytes ? tamanhoLegivel(item.bytes) : '',
              ].filter(Boolean).join(' · ');
              return (
                <article key={item.id} className="sub-brain-list-item" onClick={() => openSubItem(item)}>
                  <div className="sub-brain-list-item-main">
                    <h4>{item.title}</h4>
                    <p>{type === 'aula' ? (resumoDaAula || 'aula guardada') : (item.content || item.url || (type === 'exercises' ? `${completed}/${(item.tasks || []).length} concluídos` : '') || '')}</p>
                  </div>
                  <div className="sub-brain-item-actions" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setEditorState({ type: item.type, subItem: item })} title="Editar"><Edit3 size={14} /></button>
                    {isConfirming ? (
                      <>
                        <button onClick={() => deleteSubItem(item.id)} style={{ color: '#EF4444', fontSize: 11, fontWeight: 700 }}>Sim</button>
                        <button onClick={() => setConfirmDeleteId(null)} style={{ color: '#7A828E', fontSize: 11 }}>Não</button>
                      </>
                    ) : (
                      <button onClick={() => deleteSubItem(item.id)} title="Excluir"><Trash2 size={14} /></button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="sub-brain-canvas-container">
      {/* HUD SUPERIOR: Botão voltar + Grupo */}
      <div className="sub-brain-hud">
        <div className="sub-brain-hud-left">
          <button className="sub-brain-back-btn" onClick={() => onNavigate('dashboard')}>
            <ArrowLeft size={18} />
            <span>Voltar para Baralhos</span>
          </button>
          <span className="sub-brain-category-badge">{set?.category || 'Sem Grupo'}</span>
        </div>

        {/* CHAVE DE VISÃO: Macro (matéria no centro) x Micro (leque aberto) */}
        <div className="sub-brain-mode-switch">
          <button
            className={viewMode === 'macro' ? 'is-active' : ''}
            onClick={() => setViewMode('macro')}
            title="Visão de longe: a matéria e suas categorias"
          >
            <Orbit size={15} /> <span>Macro</span>
          </button>
          <button
            className={viewMode === 'micro' ? 'is-active' : ''}
            onClick={() => { setActiveModal(null); setViewMode('micro'); }}
            title="Leque aberto: todos os cartões, filhos e anotações conectados"
          >
            <Network size={15} /> <span>Micro</span>
          </button>
        </div>
      </div>

      {/* ================= VISÃO MICRO: o leque inteiro aberto ================= */}
      {viewMode === 'micro' && (
        <MicroBrainView
          set={set}
          onSaveSet={onSaveSet}
          onOpenNotebook={onOpenNotebook}
          onOpenAula={onOpenAula}
          activeProfile={activeProfile}
        />
      )}

      {/* CANVAS 3D VISUAL (MACRO) */}
      {viewMode === 'macro' && (
      <div className="sub-brain-canvas-wrap">
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onTouchStart={(e) => {
            const touch = e.touches[0];
            if (touch) handleCanvasClick({ clientX: touch.clientX, clientY: touch.clientY });
          }}
        />
      </div>
      )}

      {/* HUD INFERIOR: Barra de Ferramentas + Botão Novo Sub-Item (só no Macro) */}
      {viewMode === 'macro' && (
      <div className="sub-brain-hud-bottom">
        <div className="study-create-wrap">
          <button className="btn-primary btn-sm" onClick={() => setCreateMenuOpen((o) => !o)}>
            <Plus size={16} /> Novo Sub-Item
          </button>
          {createMenuOpen && (
            <div className="study-create-menu sub-brain-create-menu" onClick={(e) => e.stopPropagation()}>
              {Object.entries(SUB_ITEM_TYPES).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    onClick={() => {
                      setCreateMenuOpen(false);
                      setEditorState({ type, subItem: null });
                    }}
                  >
                    <span style={{ color: config.color, background: `${config.color}18` }}>
                      <Icon size={20} />
                    </span>
                    <span>
                      <strong>{config.label}</strong>
                      <small>{config.description}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* PAINEL OVERLAY (quando clica numa esfera do Macro) */}
      {viewMode === 'macro' && activeModal && (
        <div className="sub-brain-panel-overlay" onClick={() => setActiveModal(null)}>
          {renderPanel()}
        </div>
      )}

      {/*
        EDITOR DE SUB-ITEM — a AULA tem janela própria porque o conteúdo dela
        (o HTML) não cabe no baralho e é gravado à parte, de forma assíncrona.
        Os outros quatro tipos continuam no editor simples de sempre.
      */}
      {editorState && editorState.type === 'aula' && (
        <AulaEditorModal
          subItem={editorState.subItem}
          aulasExistentes={subItems.filter((si) => si.type === 'aula')}
          ownerLabel={set?.title}
          activeProfile={activeProfile}
          onClose={() => setEditorState(null)}
          onSave={saveSubItem}
        />
      )}
      {editorState && editorState.type !== 'aula' && (
        <SubItemEditor
          type={editorState.type}
          subItem={editorState.subItem}
          onClose={() => setEditorState(null)}
          onSave={saveSubItem}
        />
      )}
    </div>
  );
}

/*
  =============================================================================
  ARQUIVO: src/pages/MicroBrainView.jsx
  PARA QUE SERVE: É a visão MICRO do Sub-Cérebro — o leque inteiro aberto.

  Diferente da visão Macro (que tem a matéria no centro e 5 esferas em volta),
  aqui NÃO existe esfera central. O que aparece é a matéria inteira espalhada:
    - Cada CARTÃO MÃE é uma esfera grande, com cor própria (o "ramo").
    - Os CARTÕES FILHOS saem da mãe, mais claros e menores, quantos níveis
      você quiser (filho de filho de filho…).
    - As ANOTAÇÕES / CADERNOS / EXERCÍCIOS / LINKS grudados num cartão ficam
      pendurados nele, com a cor do seu tipo.
  Assim dá para ver, de uma olhada só, TODA conexão que existe dentro da
  matéria — o ramo da Elétrica separado do ramo da Óptica, por exemplo.

  EDIÇÃO DENTRO DO PRÓPRIO CÉREBRO: clicando numa esfera abre o painel da
  direita, onde você edita o termo, a resposta e a foto na hora (salva
  sozinho), cria um cartão filho, pendura uma anotação ou apaga o cartão —
  sem precisar ir para a tela de lista.

  REGRA DE OURO: nada é apagado sem querer. Ao excluir um cartão que tem
  filhos, os filhos SOBEM de nível (viram filhos do avô) em vez de sumirem.
  =============================================================================
*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CornerDownRight,
  Crosshair,
  ExternalLink,
  Image as ImageIcon,
  Layers,
  Maximize2,
  Minimize2,
  Plus,
  Search,
  Trash2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import { SUB_ITEM_TYPES, SubItemEditor } from './subBrainShared.jsx';
import AulaEditorModal from '../components/AulaEditorModal.jsx';
import { tamanhoLegivel } from '../utils/aulasCore.js';
import { apagarAula } from '../utils/db';
import {
  MICRO_COLORS,
  buildCardIndex,
  buildMicroLayout,
  compressImage,
  hexToRgba,
  mixColor,
  newId,
} from './subBrainCore.js';

// Usado só para o pulso de luz que corre pelas linhas de conexão
const seeded = (i) => {
  const s = Math.sin(i * 127.1) * 43758.5453;
  return s - Math.floor(s);
};

/* ======================================================================
   COMPONENTE PRINCIPAL
   ====================================================================== */
export default function MicroBrainView({ set, onSaveSet, onOpenNotebook, onOpenAula, activeProfile }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef({ nodes: [], stars: [], time: 0, maxExtent: 600 });
  const viewRef = useRef({ fit: 1, zoom: 1, px: 0, py: 0, tpx: 0, tpy: 0 });
  const dragRef = useRef(null);
  const hoverRef = useRef(null);
  const selectedRef = useRef(null);
  const searchRef = useRef('');
  // Tamanho real (em pixels de tela) do canvas — a MESMA medida usada para
  // desenhar e para descobrir em qual esfera você clicou. Se as duas medidas
  // divergirem, o clique cai ao lado da bolinha.
  const sizeRef = useRef({ W: 0, H: 0 });

  const cards = useMemo(() => set?.cards || [], [set]);
  const subItems = useMemo(() => set?.subItems || [], [set]);
  const index = useMemo(() => buildCardIndex(cards, subItems), [cards, subItems]);

  const [selected, setSelected] = useState(null);   // { kind:'card'|'sub', id }
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [editorState, setEditorState] = useState(null); // { type, subItem, ownerId }
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  /*
    O desenho do canvas roda fora do React (60 quadros por segundo). Estes
    efeitos entregam a ele a seleção e a busca mais recentes sem obrigar a tela
    inteira a se redesenhar a cada movimento do mouse.
  */
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  useEffect(() => { searchRef.current = search.trim().toLowerCase(); }, [search]);

  /* ------------------------------------------------------------------
     LAYOUT: leque radial por setores (cada ramo ganha uma fatia da roda)
     ------------------------------------------------------------------ */
  /*
    layoutScene: pede ao miolo (subBrainCore) as posições do leque e guarda o
    resultado onde o desenho consegue ler sem re-renderizar o React.
  */
  const layoutScene = useCallback(() => {
    const { nodes, byKey, maxExtent } = buildMicroLayout({
      index,
      collapsed,
      subMeta: (si) => ({ label: si.title || (SUB_ITEM_TYPES[si.type]?.label ?? 'Item') }),
    });
    sceneRef.current.nodes = nodes;
    sceneRef.current.byKey = byKey;
    sceneRef.current.maxExtent = maxExtent;
  }, [index, collapsed]);

  /* ------------------------------------------------------------------
     Conjunto de chaves em destaque (ramo do cartão selecionado)
     ------------------------------------------------------------------ */
  /*
    focusKeys: quando você clica numa esfera, o ramo dela acende e o resto do
    mapa escurece. Aqui montamos a lista do que faz parte do ramo escolhido:
    o cartão clicado, TUDO que nasce dele (filhos, netos e as anotações deles)
    e o caminho de volta até a mãe do ramo.
  */
  const focusKeys = useMemo(() => {
    if (!selected) return null;
    const keys = new Set();

    const acenderDescendentes = (cardId) => {
      keys.add(`card:${cardId}`);
      (index.subsOf.get(cardId) || []).forEach((si) => keys.add(`sub:${si.id}`));
      (index.childrenOf.get(cardId) || []).forEach((ch) => acenderDescendentes(ch.id));
    };
    const acenderAncestrais = (cardId) => {
      let cursor = cardId;
      while (cursor) {
        keys.add(`card:${cursor}`);
        cursor = index.parentOf.get(cursor) || null;
      }
    };

    if (selected.kind === 'card') {
      acenderDescendentes(selected.id);
      acenderAncestrais(index.parentOf.get(selected.id) || null);
    } else {
      keys.add(`sub:${selected.id}`);
      const dono = subItems.find((si) => si.id === selected.id)?.parentCardId;
      if (dono) acenderAncestrais(dono);
    }
    return keys;
  }, [selected, index, subItems]);

  const focusRef = useRef(null);
  useEffect(() => { focusRef.current = focusKeys; }, [focusKeys]);

  /* ------------------------------------------------------------------
     ENGINE DE RENDERIZAÇÃO
     ------------------------------------------------------------------ */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId = null;

    const buildStars = (W, H) => {
      const stars = [];
      const N = Math.round((W * H) / 6500);
      for (let i = 0; i < N; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.15 + 0.2,
          a: Math.random() * 0.5 + 0.15,
          tw: Math.random() * Math.PI * 2,
          sp: 0.4 + Math.random() * 1.4,
        });
      }
      sceneRef.current.stars = stars;
    };

    function handleResize() {
      const rect = canvas.getBoundingClientRect();
      const W = Math.round(rect.width);
      const H = Math.round(rect.height);
      if (!W || !H) return;
      const DPR = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = W * DPR;
      canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      sizeRef.current = { W, H };
      buildStars(W, H);
      layoutScene();
      // Zoom automático: o leque inteiro nasce cabendo na tela
      viewRef.current.fit = Math.min(1.1, Math.min(W, H) / (sceneRef.current.maxExtent * 2.05));
    }

    handleResize();
    window.addEventListener('resize', handleResize);
    // O canvas também muda de tamanho quando a janela do Cofre muda (abas lado
    // a lado, painel abrindo). O observador cuida desses casos.
    const observer = new ResizeObserver(handleResize);
    observer.observe(canvas);

    let lastTime = performance.now();

    function render(now) {
      const dt = Math.min(50, now - lastTime);
      lastTime = now;
      sceneRef.current.time += dt;
      const T = sceneRef.current.time;

      const { W, H } = sizeRef.current;
      if (!W || !H) { animId = requestAnimationFrame(render); return; }
      const view = viewRef.current;
      view.px += (view.tpx - view.px) * 0.14;
      view.py += (view.tpy - view.py) * 0.14;
      const s = view.fit * view.zoom;
      const cx = W / 2 + view.px;
      const cy = H / 2 + view.py;

      // ---- FUNDO ----
      const bgG = ctx.createRadialGradient(W * 0.5, H * 0.48, 0, W * 0.5, H * 0.48, Math.max(W, H) * 0.78);
      bgG.addColorStop(0, '#131034');
      bgG.addColorStop(0.42, '#0a0a20');
      bgG.addColorStop(1, '#04040d');
      ctx.fillStyle = bgG;
      ctx.fillRect(0, 0, W, H);

      const blobs = [
        [W * 0.18, H * 0.26, Math.max(W, H) * 0.32, 'rgba(80,40,160,.14)'],
        [W * 0.84, H * 0.72, Math.max(W, H) * 0.34, 'rgba(20,80,180,.12)'],
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

      sceneRef.current.stars.forEach((st) => {
        ctx.globalAlpha = st.a * (0.55 + 0.45 * Math.sin(T * 0.001 * st.sp + st.tw));
        ctx.fillStyle = '#cfd8ff';
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, 7);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      const nodes = sceneRef.current.nodes;
      const byKey = sceneRef.current.byKey;
      const focus = focusRef.current;
      const term = searchRef.current;
      const heavy = nodes.length <= 55; // muitos nós? economiza os halos pesados

      // ---- POSIÇÃO ANIMADA + TRANSPARÊNCIA DE FOCO ----
      nodes.forEach((n) => {
        n.x = n.hx + Math.sin(T * 0.00042 * n.sp + n.ph) * n.am;
        n.y = n.hy + Math.cos(T * 0.00037 * n.sp + n.ph * 1.3) * n.am;

        let target = 1;
        if (term) target = n.label.toLowerCase().includes(term) ? 1 : 0.16;
        else if (focus && focus.size) target = focus.has(n.key) ? 1 : 0.24;
        n.alpha += (target - n.alpha) * 0.12;

        const isHovered = hoverRef.current === n.key;
        const isSelected = selectedRef.current && `${selectedRef.current.kind}:${selectedRef.current.id}` === n.key;
        n.glow += ((isHovered || isSelected ? 1 : 0) - n.glow) * 0.12;
      });

      // ---- LINHAS DE CONEXÃO (desenhadas antes das esferas) ----
      nodes.forEach((n) => {
        if (!n.parentKey) return;
        const p = byKey.get(n.parentKey);
        if (!p) return;
        const x1 = cx + p.x * s;
        const y1 = cy + p.y * s;
        const x2 = cx + n.x * s;
        const y2 = cy + n.y * s;
        const lineAlpha = Math.min(n.alpha, p.alpha);

        ctx.globalAlpha = lineAlpha;
        ctx.strokeStyle = hexToRgba(n.color, 0.32 + n.glow * 0.45);
        ctx.lineWidth = Math.max(0.7, (1.4 + n.glow) * s);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Pulso de luz correndo pela conexão
        if (lineAlpha > 0.5) {
          const pos = (T * 0.00028 + seeded(n.seq * 7)) % 1;
          ctx.fillStyle = n.color;
          ctx.globalAlpha = lineAlpha * 0.75;
          ctx.beginPath();
          ctx.arc(x1 + (x2 - x1) * pos, y1 + (y2 - y1) * pos, Math.max(1.2, 2.6 * s), 0, 7);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });

      // ---- ESFERAS ----
      nodes.forEach((n) => {
        const nx = cx + n.x * s;
        const ny = cy + n.y * s;
        const nr = n.r * s * (1 + n.glow * 0.16);
        if (nx < -120 || nx > W + 120 || ny < -120 || ny > H + 120) return; // fora da tela

        ctx.globalAlpha = n.alpha;

        if (heavy || n.glow > 0.05 || nr > 26) {
          const halo = ctx.createRadialGradient(nx, ny, nr * 0.7, nx, ny, nr * (2 + n.glow * 0.9));
          halo.addColorStop(0, hexToRgba(n.color, 0.32 + n.glow * 0.3));
          halo.addColorStop(1, hexToRgba(n.color, 0));
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(nx, ny, nr * (2 + n.glow * 0.9), 0, 7);
          ctx.fill();
        }

        const sf = ctx.createRadialGradient(nx - nr * 0.35, ny - nr * 0.4, nr * 0.05, nx, ny, nr);
        sf.addColorStop(0, mixColor(n.color, '#ffffff', 0.72));
        sf.addColorStop(0.42, mixColor(n.color, '#ffffff', 0.14));
        sf.addColorStop(1, mixColor(n.color, '#000018', 0.46));
        ctx.fillStyle = sf;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.fill();

        const sp = ctx.createRadialGradient(nx - nr * 0.36, ny - nr * 0.44, 0, nx - nr * 0.36, ny - nr * 0.44, nr * 0.62);
        sp.addColorStop(0, 'rgba(255,255,255,.8)');
        sp.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sp;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.fill();

        ctx.strokeStyle = hexToRgba('#ffffff', 0.16 + n.glow * 0.55);
        ctx.lineWidth = 1.1 + n.glow * 1.2;
        ctx.beginPath();
        ctx.arc(nx, ny, nr, 0, 7);
        ctx.stroke();

        /*
          NOME EMBAIXO DA BOLINHA (igual mapa de conhecimento): dentro da bola o
          texto ficava minúsculo e ilegível. Aqui ele fica embaixo, em uma linha
          só, e aparece quando a bolinha está grande o bastante na tela — ou
          sempre que ela estiver selecionada / com o mouse em cima.
        */
        const emDestaque = n.glow > 0.25;
        if (nr > 11 || emDestaque) {
          const fs = Math.max(9, Math.min(15, nr * 0.52));
          ctx.font = `${emDestaque ? 700 : 600} ${fs}px "Inter","Segoe UI",sans-serif`;
          let texto = String(n.label).replace(/\s+/g, ' ').trim();
          const limite = 190;
          if (ctx.measureText(texto).width > limite) {
            while (texto.length > 4 && ctx.measureText(`${texto}…`).width > limite) {
              texto = texto.slice(0, -1);
            }
            texto = `${texto}…`;
          }
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = emDestaque ? '#ffffff' : 'rgba(233,236,255,.82)';
          ctx.shadowColor = 'rgba(2,3,12,.95)';
          ctx.shadowBlur = 5;
          ctx.fillText(texto, nx, ny + nr + 6);
          ctx.shadowBlur = 0;
        }

        // Selo "+N" nos ramos recolhidos
        if (n.hiddenCount > 0 && nr > 12) {
          const bx = nx + nr * 0.78;
          const by = ny + nr * 0.78;
          const br = Math.max(7, nr * 0.34);
          ctx.fillStyle = 'rgba(10,10,25,.9)';
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, 7);
          ctx.fill();
          ctx.strokeStyle = hexToRgba(n.color, 0.9);
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.fillStyle = '#ffffff';
          ctx.font = `700 ${Math.max(7, br * 1.05)}px "Inter",sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`+${n.hiddenCount}`, bx, by);
        }

        ctx.globalAlpha = 1;
      });

      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [layoutScene]);

  /* ------------------------------------------------------------------
     INTERAÇÃO: arrastar o mapa, zoom, clicar numa esfera
     ------------------------------------------------------------------ */
  const nodeAt = (clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const view = viewRef.current;
    const s = view.fit * view.zoom;
    const cx = rect.width / 2 + view.px;
    const cy = rect.height / 2 + view.py;
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    let found = null;
    let minD = 1e9;
    sceneRef.current.nodes.forEach((n) => {
      const d = Math.hypot(px - (cx + n.x * s), py - (cy + n.y * s));
      if (d < n.r * s * 1.15 + 6 && d < minD) {
        minD = d;
        found = n;
      }
    });
    return found;
  };

  const handlePointerDown = (e) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: viewRef.current.tpx, py: viewRef.current.tpy };
  };

  const handlePointerMove = (e) => {
    if (dragRef.current) {
      viewRef.current.tpx = dragRef.current.px + (e.clientX - dragRef.current.x);
      viewRef.current.tpy = dragRef.current.py + (e.clientY - dragRef.current.y);
      return;
    }
    const node = nodeAt(e.clientX, e.clientY);
    hoverRef.current = node ? node.key : null;
    if (canvasRef.current) canvasRef.current.style.cursor = node ? 'pointer' : 'grab';
  };

  const handlePointerUp = (e) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;
    const moved = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 5;
    if (moved) return;

    const node = nodeAt(e.clientX, e.clientY);
    setConfirmDelete(null);
    if (node) setSelected({ kind: node.kind, id: node.id });
    else setSelected(null);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const k = e.deltaY > 0 ? 0.92 : 1.08;
    viewRef.current.zoom = Math.max(0.3, Math.min(4, viewRef.current.zoom * k));
  };

  const centerView = () => {
    viewRef.current.tpx = 0;
    viewRef.current.tpy = 0;
    viewRef.current.zoom = 1;
  };

  /* ------------------------------------------------------------------
     GRAVAÇÃO: tudo passa por aqui (cartões e sub-itens do mesmo baralho)
     ------------------------------------------------------------------ */
  const persist = (patch) => onSaveSet({ ...set, ...patch });

  const patchCard = (cardId, patch) =>
    persist({ cards: cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)) });

  const createCard = (parentId) => {
    const card = {
      id: newId('card'),
      term: '',
      definition: '',
      image: '',
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
    };
    persist({ cards: [...cards, card] });
    setSelected({ kind: 'card', id: card.id });
    if (parentId) {
      setCollapsed((prev) => {
        if (!prev.has(parentId)) return prev;
        const next = new Set(prev);
        next.delete(parentId);
        return next;
      });
    }
  };

  /*
    Excluir cartão SEM perder os filhos: eles sobem um nível (viram filhos do
    avô) e as anotações penduradas vão junto.
  */
  const deleteCard = (cardId) => {
    const card = index.byId.get(cardId);
    const grandParent = card ? index.parentOf.get(cardId) : null;
    persist({
      cards: cards
        .filter((c) => c.id !== cardId)
        .map((c) => (c.parentId === cardId ? { ...c, parentId: grandParent } : c)),
      subItems: subItems.map((si) =>
        si.parentCardId === cardId ? { ...si, parentCardId: grandParent } : si),
    });
    setSelected(grandParent ? { kind: 'card', id: grandParent } : null);
    setConfirmDelete(null);
  };

  const saveSubItem = (item) => {
    const exists = subItems.some((si) => si.id === item.id);
    persist({
      subItems: exists
        ? subItems.map((si) => (si.id === item.id ? item : si))
        : [...subItems, item],
    });
    setEditorState(null);
    setSelected({ kind: 'sub', id: item.id });
    if (item.type === 'notebook' && !exists) onOpenNotebook?.(item);
    if (item.type === 'aula' && !exists) onOpenAula?.(item);
  };

  const deleteSubItem = (subId) => {
    const alvo = subItems.find((si) => si.id === subId);
    const owner = alvo?.parentCardId || null;
    // O HTML da aula mora fora do baralho: sai junto com a ficha.
    if (alvo?.type === 'aula') apagarAula(activeProfile, subId);
    persist({
      subItems: subItems.filter((si) => si.id !== subId),
      subConnections: (set.subConnections || []).filter((c) => c.from !== subId && c.to !== subId),
    });
    setSelected(owner ? { kind: 'card', id: owner } : null);
    setConfirmDelete(null);
  };

  const toggleCollapse = (cardId) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(cardId)) next.delete(cardId);
      else next.add(cardId);
      return next;
    });
  };

  const collapseAll = () => {
    const withKids = cards.filter((c) => (index.childrenOf.get(c.id) || []).length > 0 || (index.subsOf.get(c.id) || []).length > 0);
    setCollapsed((prev) => (prev.size > 0 ? new Set() : new Set(withKids.map((c) => c.id))));
  };

  /* ------------------------------------------------------------------
     RENDER
     ------------------------------------------------------------------ */
  const selectedCard = selected?.kind === 'card' ? index.byId.get(selected.id) : null;
  const selectedSub = selected?.kind === 'sub' ? subItems.find((si) => si.id === selected.id) : null;

  return (
    <>
      <div className="micro-brain-wrap">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => { dragRef.current = null; hoverRef.current = null; }}
          onWheel={handleWheel}
          style={{ touchAction: 'none' }}
        />
      </div>

      {/* RESUMO + BUSCA (canto superior direito do canvas) */}
      <div className="micro-brain-topbar">
        <div className="micro-brain-stats">
          <Layers size={14} />
          <span><strong>{cards.length}</strong> cartões</span>
          <i />
          <span><strong>{index.roots.length}</strong> ramos</span>
          <i />
          <span><strong>{subItems.length}</strong> itens</span>
        </div>
        <label className="micro-brain-search">
          <Search size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar cartão…"
          />
          {search && <button type="button" onClick={() => setSearch('')}><X size={13} /></button>}
        </label>
      </div>

      {/* LEGENDA DAS CORES: o mapa se lê sozinho, sem precisar clicar */}
      <div className="micro-brain-legend">
        {[
          ['Flashcard',  MICRO_COLORS.card],
          ['Anotação',   MICRO_COLORS.note],
          ['Link',       MICRO_COLORS.link],
          ['Caderno',    MICRO_COLORS.notebook],
          ['Exercícios', MICRO_COLORS.exercises],
        ].map(([nome, cor]) => (
          <span key={nome}><i style={{ background: cor }} />{nome}</span>
        ))}
      </div>

      {/* BARRA INFERIOR */}
      <div className="micro-brain-toolbar">
        {/*
          UM BOTÃO SÓ PARA CRIAR TUDO. Antes, anotação/link/caderno/exercício só
          apareciam depois de clicar numa bolinha — quem chegava aqui não achava.
          Agora tudo nasce daqui: se um cartão estiver selecionado, o novo item
          já nasce DENTRO dele; se não, nasce solto no baralho.
        */}
        <div className="study-create-wrap">
          <button className="btn-primary btn-sm" onClick={() => setCreateMenuOpen((o) => !o)}>
            <Plus size={15} /> Novo
          </button>
          {createMenuOpen && (
            <>
              <div className="micro-create-backdrop" onClick={() => setCreateMenuOpen(false)} />
              <div className="study-create-menu micro-create-menu" onClick={(e) => e.stopPropagation()}>
                <p className="micro-create-hint">
                  {selectedCard
                    ? <>Criando dentro de <strong>{selectedCard.term || 'Cartão sem título'}</strong></>
                    : <>Nada selecionado: vai nascer solto no baralho. <em>Clique numa bolinha antes para pendurar nela.</em></>}
                </p>

                <button onClick={() => { setCreateMenuOpen(false); createCard(null); }}>
                  <span style={{ color: MICRO_COLORS.card, background: `${MICRO_COLORS.card}18` }}>
                    <Layers size={20} />
                  </span>
                  <span>
                    <strong>Cartão mãe</strong>
                    <small>Um ramo novo, direto da matéria</small>
                  </span>
                </button>

                {selectedCard && (
                  <button onClick={() => { setCreateMenuOpen(false); createCard(selectedCard.id); }}>
                    <span style={{ color: MICRO_COLORS.card, background: `${MICRO_COLORS.card}18` }}>
                      <CornerDownRight size={20} />
                    </span>
                    <span>
                      <strong>Cartão filho</strong>
                      <small>Nasce dentro de "{(selectedCard.term || 'Cartão sem título').slice(0, 28)}"</small>
                    </span>
                  </button>
                )}

                {Object.entries(SUB_ITEM_TYPES).map(([type, cfg]) => {
                  const Icon = cfg.icon;
                  const cor = MICRO_COLORS[type] || cfg.color;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setCreateMenuOpen(false);
                        setEditorState({ type, subItem: null, ownerId: selectedCard ? selectedCard.id : null });
                      }}
                    >
                      <span style={{ color: cor, background: `${cor}18` }}><Icon size={20} /></span>
                      <span>
                        <strong>{cfg.label}</strong>
                        <small>{cfg.description}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
        <span className="micro-brain-divider" />
        <button className="micro-brain-tool" onClick={collapseAll} title="Recolher / expandir todos os ramos">
          {collapsed.size > 0 ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
        </button>
        <button className="micro-brain-tool" onClick={() => { viewRef.current.zoom = Math.min(4, viewRef.current.zoom * 1.18); }} title="Aproximar">
          <ZoomIn size={15} />
        </button>
        <button className="micro-brain-tool" onClick={() => { viewRef.current.zoom = Math.max(0.3, viewRef.current.zoom * 0.85); }} title="Afastar">
          <ZoomOut size={15} />
        </button>
        <button className="micro-brain-tool" onClick={centerView} title="Centralizar o mapa">
          <Crosshair size={15} />
        </button>
      </div>

      {/* PAINEL DE EDIÇÃO (a "edição dentro do sub-cérebro") */}
      {selectedCard && (
        <CardInspector
          key={selectedCard.id}
          card={selectedCard}
          index={index}
          subItems={index.subsOf.get(selectedCard.id) || []}
          childCards={index.childrenOf.get(selectedCard.id) || []}
          depth={index.depthOf.get(selectedCard.id) || 0}
          collapsed={collapsed.has(selectedCard.id)}
          confirmDelete={confirmDelete === selectedCard.id}
          onClose={() => setSelected(null)}
          onPatch={(patch) => patchCard(selectedCard.id, patch)}
          onCreateChild={() => createCard(selectedCard.id)}
          onNewSubItem={(type) => setEditorState({ type, subItem: null, ownerId: selectedCard.id })}
          onSelect={(kind, id) => { setConfirmDelete(null); setSelected({ kind, id }); }}
          onToggleCollapse={() => toggleCollapse(selectedCard.id)}
          onAskDelete={() => setConfirmDelete(selectedCard.id)}
          onCancelDelete={() => setConfirmDelete(null)}
          onDelete={() => deleteCard(selectedCard.id)}
        />
      )}

      {selectedSub && (
        <SubItemInspector
          item={selectedSub}
          ownerCard={selectedSub.parentCardId ? index.byId.get(selectedSub.parentCardId) : null}
          confirmDelete={confirmDelete === selectedSub.id}
          onClose={() => setSelected(null)}
          onEdit={() => setEditorState({ type: selectedSub.type, subItem: selectedSub, ownerId: selectedSub.parentCardId || null })}
          onOpenNotebook={() => onOpenNotebook?.(selectedSub)}
          onOpenAula={() => onOpenAula?.(selectedSub)}
          onGoToOwner={() => setSelected({ kind: 'card', id: selectedSub.parentCardId })}
          onAskDelete={() => setConfirmDelete(selectedSub.id)}
          onCancelDelete={() => setConfirmDelete(null)}
          onDelete={() => deleteSubItem(selectedSub.id)}
          onToggleTask={(taskId) => {
            const tasks = (selectedSub.tasks || []).map((t) => (t.id === taskId ? { ...t, done: !t.done } : t));
            persist({ subItems: subItems.map((si) => (si.id === selectedSub.id ? { ...si, tasks } : si)) });
          }}
        />
      )}

      {/* A AULA tem janela própria: o HTML dela é gravado à parte (ver AulaEditorModal). */}
      {editorState && editorState.type === 'aula' && (
        <AulaEditorModal
          subItem={editorState.subItem}
          aulasExistentes={subItems.filter((si) => si.type === 'aula')}
          ownerLabel={editorState.ownerId ? (index.byId.get(editorState.ownerId)?.term || 'Cartão sem título') : set?.title}
          activeProfile={activeProfile}
          onClose={() => setEditorState(null)}
          onSave={(item) => saveSubItem({ ...item, parentCardId: editorState.ownerId || null })}
        />
      )}
      {editorState && editorState.type !== 'aula' && (
        <SubItemEditor
          type={editorState.type}
          subItem={editorState.subItem}
          ownerLabel={editorState.ownerId ? (index.byId.get(editorState.ownerId)?.term || 'Cartão sem título') : null}
          onClose={() => setEditorState(null)}
          onSave={(item) => saveSubItem({ ...item, parentCardId: editorState.ownerId || null })}
        />
      )}
    </>
  );
}

/* ======================================================================
   PAINEL DO CARTÃO: editar termo, resposta e foto na hora, criar filho,
   pendurar anotação e navegar pela família — tudo sem sair do mapa.
   ====================================================================== */
function CardInspector({
  card, index, subItems, childCards, depth, collapsed, confirmDelete,
  onClose, onPatch, onCreateChild, onNewSubItem, onSelect, onToggleCollapse,
  onAskDelete, onCancelDelete, onDelete,
}) {
  const [term, setTerm] = useState(card.term || '');
  const [definition, setDefinition] = useState(card.definition || '');
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const timerRef = useRef(null);
  const firstRender = useRef(true);
  const parentCard = index.parentOf.get(card.id) ? index.byId.get(index.parentOf.get(card.id)) : null;

  /*
    TRAVA CONTRA PERDA DE TEXTO: o que você digitou fica guardado aqui na hora.
    Se você clicar em outra esfera antes do auto-save de 700ms disparar, a
    saída do painel GRAVA o que estava pendente em vez de jogar fora.
  */
  const pendingRef = useRef({ term: card.term || '', definition: card.definition || '', dirty: false, onPatch });
  useEffect(() => { pendingRef.current.onPatch = onPatch; });

  // Auto-save do texto: 700ms depois que você para de digitar
  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    pendingRef.current.term = term;
    pendingRef.current.definition = definition;
    pendingRef.current.dirty = true;
    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      pendingRef.current.dirty = false;
      onPatch({ term, definition });
      setStatus('saved');
    }, 700);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term, definition]);

  // Ao fechar o painel (ou trocar de cartão), grava o que ficou pendente
  useEffect(() => () => {
    const p = pendingRef.current;
    if (p.dirty) p.onPatch({ term: p.term, definition: p.definition });
  }, []);

  // Ctrl+V dentro do painel cola o print direto no cartão
  const handlePaste = async (e) => {
    const items = e.clipboardData?.items || [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        const reader = new FileReader();
        reader.onload = async (ev) => {
          const compressed = await compressImage(ev.target.result);
          if (compressed) onPatch({ image: compressed });
        };
        reader.readAsDataURL(file);
        break;
      }
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const compressed = await compressImage(ev.target.result);
      if (compressed) onPatch({ image: compressed });
    };
    reader.readAsDataURL(file);
  };

  const niveis = ['Cartão mãe', 'Filho', 'Neto', 'Bisneto'];

  return (
    <aside className="micro-inspector glass-panel" onPaste={handlePaste}>
      <header className="micro-inspector-head">
        <div>
          <small>{niveis[Math.min(depth, niveis.length - 1)]}{depth >= niveis.length ? ` (nível ${depth})` : ''}</small>
          <h3>{term.trim() || 'Cartão sem título'}</h3>
          {parentCard && (
            <button className="micro-inspector-parent" onClick={() => onSelect('card', parentCard.id)}>
              <CornerDownRight size={12} /> dentro de: {parentCard.term || 'Cartão sem título'}
            </button>
          )}
        </div>
        <button className="study-icon-button" onClick={onClose}><X size={18} /></button>
      </header>

      <div className="micro-inspector-body">
        <label className="study-field">
          <span>Termo (pergunta)</span>
          <textarea rows="2" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Ex.: Lei de Coulomb" autoFocus={!term} />
        </label>

        <label className="study-field">
          <span>Definição (resposta)</span>
          <textarea rows="5" value={definition} onChange={(e) => setDefinition(e.target.value)} placeholder="Escreva a resposta… (Ctrl+V cola um print aqui dentro)" />
        </label>

        <div className="micro-inspector-image">
          {card.image ? (
            <>
              <img src={card.image} alt="Anexo do cartão" />
              <button onClick={() => onPatch({ image: '' })}><X size={12} /> Remover imagem</button>
            </>
          ) : (
            <label className="micro-inspector-upload">
              <ImageIcon size={14} /> Anexar foto
              <input type="file" accept="image/*" onChange={handleUpload} hidden />
            </label>
          )}
        </div>

        <div className="micro-inspector-status">
          {status === 'saving' ? 'Salvando…' : status === 'saved' ? 'Salvo automaticamente' : 'Alterações salvam sozinhas'}
        </div>

        {/* FILHOS */}
        <section className="micro-inspector-section">
          <h4>Cartões filhos <span>{childCards.length}</span></h4>
          {childCards.map((child) => (
            <button key={child.id} className="micro-inspector-row" onClick={() => onSelect('card', child.id)}>
              <span className="micro-dot" style={{ background: MICRO_COLORS.card }} />
              <span className="micro-row-label">{child.term || 'Cartão sem título'}</span>
              <span className="micro-row-tag">{(index.childrenOf.get(child.id) || []).length || ''}</span>
            </button>
          ))}
          <button className="micro-inspector-add" onClick={onCreateChild}>
            <Plus size={14} /> Novo cartão filho
          </button>
        </section>

        {/* ANOTAÇÕES E COMPANHIA */}
        <section className="micro-inspector-section">
          <h4>Ligado a este cartão <span>{subItems.length}</span></h4>
          {subItems.map((si) => {
            const cfg = SUB_ITEM_TYPES[si.type] || SUB_ITEM_TYPES.note;
            const Icon = cfg.icon;
            return (
              <button key={si.id} className="micro-inspector-row" onClick={() => onSelect('sub', si.id)}>
                <Icon size={14} color={cfg.color} />
                <span className="micro-row-label">{si.title}</span>
                <span className="micro-row-tag" style={{ color: cfg.color }}>{cfg.label}</span>
              </button>
            );
          })}
          <div className="micro-inspector-newsub">
            {Object.entries(SUB_ITEM_TYPES).map(([type, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={type} onClick={() => onNewSubItem(type)} title={`Nova ${cfg.label.toLowerCase()} neste cartão`} style={{ color: cfg.color, borderColor: `${cfg.color}44` }}>
                  <Icon size={14} /> {cfg.label}
                </button>
              );
            })}
          </div>
        </section>
      </div>

      <footer className="micro-inspector-foot">
        {(childCards.length > 0 || subItems.length > 0) && (
          <button className="btn-glass btn-sm" onClick={onToggleCollapse}>
            {collapsed ? 'Abrir ramo' : 'Recolher ramo'}
          </button>
        )}
        {confirmDelete ? (
          <>
            <button className="btn-glass btn-sm" onClick={onCancelDelete}>Cancelar</button>
            <button className="micro-danger-btn" onClick={onDelete}>
              Confirmar exclusão
            </button>
          </>
        ) : (
          <button className="micro-danger-btn" onClick={onAskDelete}>
            <Trash2 size={14} /> Excluir cartão
          </button>
        )}
      </footer>
      {confirmDelete && childCards.length > 0 && (
        <p className="micro-inspector-warning">
          Os {childCards.length} cartões filhos NÃO serão apagados: eles sobem um nível.
        </p>
      )}
    </aside>
  );
}

/* ======================================================================
   PAINEL DO SUB-ITEM (anotação, caderno, exercícios, link)
   ====================================================================== */
function SubItemInspector({
  item, ownerCard, confirmDelete, onClose, onEdit, onOpenNotebook, onOpenAula,
  onGoToOwner, onAskDelete, onCancelDelete, onDelete, onToggleTask,
}) {
  const cfg = SUB_ITEM_TYPES[item.type] || SUB_ITEM_TYPES.note;
  const Icon = cfg.icon;

  return (
    <aside className="micro-inspector glass-panel">
      <header className="micro-inspector-head">
        <div>
          <small style={{ color: cfg.color }}>{cfg.label.toUpperCase()}</small>
          <h3>{item.title}</h3>
          {ownerCard && (
            <button className="micro-inspector-parent" onClick={onGoToOwner}>
              <CornerDownRight size={12} /> pertence a: {ownerCard.term || 'Cartão sem título'}
            </button>
          )}
        </div>
        <button className="study-icon-button" onClick={onClose}><X size={18} /></button>
      </header>

      <div className="micro-inspector-body">
        <div className="micro-inspector-subicon" style={{ color: cfg.color, background: `${cfg.color}18` }}>
          <Icon size={26} />
        </div>

        {item.type === 'exercises' ? (
          <div className="micro-task-list">
            {(item.tasks || []).map((t) => (
              <label key={t.id}>
                <input type="checkbox" checked={!!t.done} onChange={() => onToggleTask(t.id)} />
                <span style={{ textDecoration: t.done ? 'line-through' : 'none', opacity: t.done ? 0.55 : 1 }}>{t.text}</span>
              </label>
            ))}
            {(item.tasks || []).length === 0 && <p className="micro-inspector-empty">Sem questões cadastradas.</p>}
          </div>
        ) : item.type === 'aula' ? (
          <p className="micro-inspector-text">
            {[
              item.data ? item.data.split('-').reverse().join('/') : '',
              item.bytes ? tamanhoLegivel(item.bytes) : '',
              item.arquivo || '',
            ].filter(Boolean).join(' · ') || 'Aula guardada.'}
          </p>
        ) : (
          <p className="micro-inspector-text">{item.content || item.url || 'Sem conteúdo ainda.'}</p>
        )}

        <div className="micro-inspector-actions">
          {item.type === 'notebook' && (
            <button className="btn-primary btn-sm" onClick={onOpenNotebook}>Abrir caderno</button>
          )}
          {item.type === 'aula' && (
            <button className="btn-primary btn-sm" onClick={onOpenAula}>Abrir aula</button>
          )}
          {item.type === 'link' && item.url && (
            <a className="btn-primary btn-sm" href={item.url} target="_blank" rel="noreferrer">
              <ExternalLink size={14} /> Abrir link
            </a>
          )}
          <button className="btn-glass btn-sm" onClick={onEdit}>Editar</button>
        </div>
      </div>

      <footer className="micro-inspector-foot">
        {confirmDelete ? (
          <>
            <button className="btn-glass btn-sm" onClick={onCancelDelete}>Cancelar</button>
            <button className="micro-danger-btn" onClick={onDelete}>Confirmar exclusão</button>
          </>
        ) : (
          <button className="micro-danger-btn" onClick={onAskDelete}><Trash2 size={14} /> Excluir</button>
        )}
      </footer>
    </aside>
  );
}

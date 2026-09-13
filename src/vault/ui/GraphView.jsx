/*
  =============================================================================
  ARQUIVO: src/vault/ui/GraphView.jsx
  PARA QUE SERVE: O Grafo — o mapa do seu conhecimento. Cada nota é uma bolinha,
  cada [[link]] é um fio. Notas muito citadas ficam maiores. Notas que você citou
  mas ainda não escreveu aparecem vazadas, como um convite.

  COMO A FÍSICA FUNCIONA (é mais simples do que parece):
    1. REPULSÃO   — toda bolinha empurra todas as outras, para não empilharem.
    2. MOLA       — cada fio puxa as duas pontas, aproximando o que é ligado.
    3. GRAVIDADE  — um puxão fraco para o centro, para nada escapar da tela.
    4. ATRITO     — a cada quadro o movimento diminui, até tudo parar quieto.
  Repetindo isso 60 vezes por segundo, o desenho se organiza sozinho.

  POR QUE CANVAS E NÃO Pixi.js/WebGL (que o plano sugeria): para a escala real de
  um cofre pessoal (centenas de notas), o canvas comum roda a 60 quadros por
  segundo e não acrescenta 400KB de biblioteca ao aplicativo. Trocar depois, se
  um dia forem 10 mil notas, é um arquivo só.
  =============================================================================
*/

import { useRef, useEffect, useState, useCallback } from 'react';
import { Maximize2, RotateCcw } from 'lucide-react';
import { metadataCache } from '../core/metadataCache.js';
import { useVaultVersion } from './useVault.js';

// Constantes da simulação — mexer aqui muda o "temperamento" do grafo
const REPULSAO = 6200;
const FORCA_MOLA = 0.035;
const GRAVIDADE = 0.014;
const ATRITO = 0.86;
const PARADA = 0.06; // abaixo dessa energia, congela e para de gastar bateria

/*
  A ligação estrutural (Faculdade → Cálculo I) é curta e forte de propósito: é o
  que faz cada grupo formar um CACHO visível, com seus baralhos em volta. A
  ligação por [[link]] é mais longa e frouxa, então uma nota consegue ficar entre
  dois cachos quando ela conecta duas matérias — que é exatamente a informação
  mais valiosa que o mapa pode te dar.
*/
const MOLA_ESTRUTURAL = 72;
const MOLA_LINK = 130;

// Aparência de cada tipo de nó
const ESTILO = {
  grupo:    { cor: '#E8933F', raioBase: 13, sempreComNome: true },
  baralho:  { cor: '#F2C14E', raioBase: 7,  sempreComNome: true },
  nota:     { cor: '#7AA2F7', raioBase: 5,  sempreComNome: false },
  compartilhada: { cor: '#D96A8F', raioBase: 5, sempreComNome: false },
  fantasma: { cor: null,      raioBase: 4,  sempreComNome: false },
};

const estiloDo = (n) => {
  if (!n.real) return ESTILO.fantasma;
  if (n.kind === 'nota' && n.scope === 'compartilhado') return ESTILO.compartilhada;
  return ESTILO[n.kind] || ESTILO.nota;
};

// O texto que aparece na caixinha ao passar o mouse por cima de um nó
function descreverNo(n) {
  if (!n.real) return 'ainda não existe — clique para criar a nota';
  if (n.kind === 'grupo') return `grupo de estudo · ${n.degree} ligações · clique para ver os baralhos`;
  if (n.kind === 'baralho') {
    const cartoes = `${n.cardCount} ${n.cardCount === 1 ? 'cartão' : 'cartões'}`;
    return `baralho · ${cartoes} · clique para estudar`;
  }
  return `nota · ${n.degree} ${n.degree === 1 ? 'conexão' : 'conexões'}`;
}

export default function GraphView({ activePath, onAbrirNo }) {
  const version = useVaultVersion();
  const canvasRef = useRef(null);
  const estadoRef = useRef({ nos: [], arestas: [], zoom: 1, panX: 0, panY: 0 });
  const arrastandoRef = useRef(null);
  const [pairado, setPairado] = useState(null);

  /*
    O total fica em ESTADO, não só dentro do ref da simulação. Se ficasse só no
    ref, a legenda mostraria "0 notas" até algo por acaso redesenhar o componente
    — a tela estaria certa e o texto embaixo dela, mentindo.
  */
  const [resumo, setResumo] = useState('');

  /* ----------------------------------------------------------------------
     Monta (ou remonta) o grafo quando o cofre muda
  ---------------------------------------------------------------------- */
  useEffect(() => {
    const { nodes, edges } = metadataCache.buildGraph();
    const anterior = new Map(estadoRef.current.nos.map(n => [n.id, n]));

    // Reaproveita a posição das bolinhas que já existiam: assim criar uma nota
    // nova não embaralha o mapa inteiro na sua frente.
    const nos = nodes.map((n, i) => {
      const velho = anterior.get(n.id);
      const angulo = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const estilo = estiloDo(n);
      return {
        ...n,
        x: velho?.x ?? Math.cos(angulo) * (110 + Math.random() * 90),
        y: velho?.y ?? Math.sin(angulo) * (110 + Math.random() * 90),
        vx: 0, vy: 0,
        // O nó cresce com o número de conexões: o que você mais usa fica maior
        raio: estilo.raioBase + Math.min(9, Math.sqrt(n.degree) * 2.1),
        estilo,
      };
    });

    const porId = new Map(nos.map(n => [n.id, n]));
    const arestas = edges
      .map(e => ({ a: porId.get(e.from), b: porId.get(e.to), estrutural: !!e.estrutural }))
      .filter(e => e.a && e.b);

    estadoRef.current = { ...estadoRef.current, nos, arestas, energia: 100 };

    const conta = (k) => nos.filter(n => n.kind === k).length;
    const partes = [];
    if (conta('grupo')) partes.push(`${conta('grupo')} grupos`);
    if (conta('baralho')) partes.push(`${conta('baralho')} baralhos`);
    if (conta('nota')) partes.push(`${conta('nota')} notas`);
    setResumo(partes.join(' · ') || 'nada ainda');
  }, [version]);

  /* ----------------------------------------------------------------------
     UM PASSO da simulação: calcula a física e pinta uma vez.
     Fica separado do laço de animação de propósito — assim dá para pintar o
     primeiro quadro na hora, sem esperar o navegador liberar a animação.
  ---------------------------------------------------------------------- */
  const passo = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const est = estadoRef.current;
    const { nos, arestas } = est;

    const dpr = window.devicePixelRatio || 1;
    const larg = canvas.clientWidth;
    const alt = canvas.clientHeight;
    if (canvas.width !== larg * dpr || canvas.height !== alt * dpr) {
      canvas.width = larg * dpr;
      canvas.height = alt * dpr;
    }

    // ---------- FÍSICA ----------
    if (est.energia > PARADA) {
      let energia = 0;

      // 1. Repulsão entre todos os pares
      for (let i = 0; i < nos.length; i++) {
        for (let j = i + 1; j < nos.length; j++) {
          const a = nos[i], b = nos[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let dist2 = dx * dx + dy * dy;
          if (dist2 < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; dist2 = 1; }
          const dist = Math.sqrt(dist2);
          const forca = REPULSAO / dist2;
          const fx = (dx / dist) * forca, fy = (dy / dist) * forca;
          a.vx -= fx; a.vy -= fy;
          b.vx += fx; b.vy += fy;
        }
      }

      // 2. Molas: as estruturais são curtas (formam os cachos por grupo)
      for (const { a, b, estrutural } of arestas) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const repouso = estrutural ? MOLA_ESTRUTURAL : MOLA_LINK;
        const forca = (dist - repouso) * FORCA_MOLA * (estrutural ? 1.7 : 1);
        const fx = (dx / dist) * forca, fy = (dy / dist) * forca;
        a.vx += fx; a.vy += fy;
        b.vx -= fx; b.vy -= fy;
      }

      // 3. Gravidade + 4. atrito + movimento
      for (const n of nos) {
        if (n === arrastandoRef.current) { n.vx = 0; n.vy = 0; continue; }
        n.vx -= n.x * GRAVIDADE;
        n.vy -= n.y * GRAVIDADE;
        n.vx *= ATRITO; n.vy *= ATRITO;
        n.x += n.vx; n.y += n.vy;
        energia += Math.abs(n.vx) + Math.abs(n.vy);
      }
      est.energia = nos.length ? energia / nos.length : 0;
    }

    // ---------- DESENHO ----------
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, larg, alt);
    ctx.save();
    ctx.translate(larg / 2 + est.panX, alt / 2 + est.panY);
    ctx.scale(est.zoom, est.zoom);

    /*
      Fios. Os estruturais (grupo → baralho) são mais grossos e coloridos: eles
      são o esqueleto do mapa. Os fios de [[link]] são finos e claros — são as
      pontes que VOCÊ criou escrevendo.
    */
    for (const { a, b, estrutural } of arestas) {
      const realcado = pairado && (a.id === pairado.id || b.id === pairado.id);
      if (realcado) {
        ctx.strokeStyle = 'rgba(232,147,63,.9)';
        ctx.lineWidth = 1.8;
      } else if (estrutural) {
        ctx.strokeStyle = 'rgba(232,147,63,.28)';
        ctx.lineWidth = 1.4;
      } else {
        ctx.strokeStyle = 'rgba(160,190,255,.30)';
        ctx.lineWidth = 1;
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // Bolinhas
    for (const n of nos) {
      const ativo = n.id === activePath;
      const sobre = pairado?.id === n.id;
      const raio = n.raio * (sobre ? 1.3 : 1);

      // Um halo suave nos grupos, para o olho achar as âncoras do mapa na hora
      if (n.kind === 'grupo') {
        const brilho = ctx.createRadialGradient(n.x, n.y, raio * 0.4, n.x, n.y, raio * 3.4);
        brilho.addColorStop(0, 'rgba(232,147,63,.28)');
        brilho.addColorStop(1, 'rgba(232,147,63,0)');
        ctx.fillStyle = brilho;
        ctx.beginPath();
        ctx.arc(n.x, n.y, raio * 3.4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.beginPath();
      ctx.arc(n.x, n.y, raio, 0, Math.PI * 2);

      if (!n.real) {
        // Citado num [[link]] mas ainda não existe: só o contorno
        ctx.strokeStyle = 'rgba(255,255,255,.34)';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        ctx.fillStyle = ativo ? '#fff' : n.estilo.cor;
        ctx.fill();
        if (ativo) {
          ctx.strokeStyle = 'rgba(255,255,255,.30)';
          ctx.lineWidth = 7;
          ctx.stroke();
        }
      }

      /*
        Nomes. Grupos e baralhos mostram o nome SEMPRE — sem isso o mapa vira uma
        constelação bonita e inútil, que foi exatamente o problema que você viu.
        As notas só ganham nome quando você aponta, dá zoom ou elas são muito
        conectadas, senão o texto empilha e não se lê nada.
      */
      const mostrarNome = n.estilo.sempreComNome || sobre || ativo || est.zoom > 1.15 || n.degree >= 3;
      if (mostrarNome) {
        const destaque = sobre || ativo || n.kind === 'grupo';
        ctx.fillStyle = destaque ? '#ffffff' : 'rgba(255,255,255,.66)';
        ctx.font = n.kind === 'grupo'
          ? '700 13px Inter, system-ui, sans-serif'
          : `${destaque ? '600 ' : ''}11px Inter, system-ui, sans-serif`;
        ctx.textAlign = 'center';

        const texto = n.label.length > 30 ? `${n.label.slice(0, 29)}…` : n.label;
        ctx.fillText(texto, n.x, n.y + raio + 14);

        // No baralho, o número de cartões vai embaixo do nome
        if (n.kind === 'baralho' && n.cardCount > 0) {
          ctx.fillStyle = 'rgba(255,255,255,.40)';
          ctx.font = '10px Inter, system-ui, sans-serif';
          ctx.fillText(`${n.cardCount} ${n.cardCount === 1 ? 'cartão' : 'cartões'}`, n.x, n.y + raio + 27);
        }
      }
    }

    ctx.restore();
  }, [activePath, pairado]);

  /*
    O laço contínuo: um passo por quadro do navegador (60 por segundo).
    O laço mora INTEIRO dentro do efeito para que o cancelamento use exatamente o
    mesmo identificador que foi agendado. Se o identificador ficasse guardado fora,
    uma troca de nota poderia cancelar o quadro errado e deixar dois laços rodando
    ao mesmo tempo — o grafo tremeria e a bateria do celular iria embora.
  */
  useEffect(() => {
    let id;
    const laco = () => {
      passo();
      id = requestAnimationFrame(laco);
    };
    id = requestAnimationFrame(laco);
    return () => cancelAnimationFrame(id);
  }, [passo]);

  /*
    Primeira pintura imediata. Sem isso, se o navegador estiver com a animação
    pausada (aba em segundo plano, janela minimizada), o grafo apareceria como um
    retângulo vazio até o usuário voltar — parecendo que quebrou.
  */
  useEffect(() => { passo(); }, [passo, version]);

  /* ----------------------------------------------------------------------
     Interação: converte o clique da tela para as coordenadas do grafo
  ---------------------------------------------------------------------- */
  const noEmPonto = (evento) => {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const est = estadoRef.current;
    const x = (evento.clientX - r.left - r.width / 2 - est.panX) / est.zoom;
    const y = (evento.clientY - r.top - r.height / 2 - est.panY) / est.zoom;
    return est.nos.find(n => Math.hypot(n.x - x, n.y - y) <= n.raio + 7) || null;
  };

  const aoMover = (e) => {
    const est = estadoRef.current;

    if (arrastandoRef.current) {
      const canvas = canvasRef.current;
      const r = canvas.getBoundingClientRect();
      arrastandoRef.current.x = (e.clientX - r.left - r.width / 2 - est.panX) / est.zoom;
      arrastandoRef.current.y = (e.clientY - r.top - r.height / 2 - est.panY) / est.zoom;
      est.energia = 100; // mexer numa bolinha reacende a simulação
      return;
    }
    if (est.arrastandoTela) {
      est.panX += e.movementX;
      est.panY += e.movementY;
      return;
    }
    const achado = noEmPonto(e);
    if (achado?.id !== pairado?.id) setPairado(achado);
  };

  const aoPressionar = (e) => {
    const n = noEmPonto(e);
    if (n) arrastandoRef.current = n;
    else estadoRef.current.arrastandoTela = true;
  };

  const aoSoltar = (e) => {
    const arrastado = arrastandoRef.current;
    arrastandoRef.current = null;
    estadoRef.current.arrastandoTela = false;

    // Clique curto (quase sem arrastar) abre o que está embaixo do dedo
    if (arrastado && Math.abs(e.movementX) < 3 && Math.abs(e.movementY) < 3) {
      onAbrirNo?.(arrastado);
    }
  };

  const aoRolar = (e) => {
    e.preventDefault();
    const est = estadoRef.current;
    est.zoom = Math.min(4, Math.max(0.25, est.zoom * (e.deltaY > 0 ? 0.9 : 1.1)));
  };

  const reorganizar = () => {
    const est = estadoRef.current;
    for (const n of est.nos) {
      n.x = (Math.random() - 0.5) * 320;
      n.y = (Math.random() - 0.5) * 320;
      n.vx = n.vy = 0;
    }
    est.energia = 100;
  };

  const centralizar = () => {
    const est = estadoRef.current;
    est.zoom = 1; est.panX = 0; est.panY = 0; est.energia = 100;
  };

  return (
    <div className="cofre-grafo">
      <canvas
        ref={canvasRef}
        onMouseMove={aoMover}
        onMouseDown={aoPressionar}
        onMouseUp={aoSoltar}
        onMouseLeave={() => { arrastandoRef.current = null; estadoRef.current.arrastandoTela = false; setPairado(null); }}
        onWheel={aoRolar}
        style={{ cursor: pairado ? 'pointer' : 'grab' }}
      />

      <div className="cofre-grafo-controles">
        <button onClick={centralizar} title="Centralizar"><Maximize2 size={15} /></button>
        <button onClick={reorganizar} title="Reorganizar"><RotateCcw size={15} /></button>
      </div>

      <div className="cofre-grafo-legenda">
        <span><i className="ponto-grupo" /> grupos de estudo</span>
        <span><i className="ponto-baralho" /> baralhos</span>
        <span><i className="ponto-privado" /> suas notas</span>
        <span><i className="ponto-compartilhado" /> compartilhadas</span>
        <span><i className="ponto-fantasma" /> ainda não escritas</span>
        <span className="cofre-grafo-total">{resumo}</span>
      </div>

      {pairado && (
        <div className="cofre-grafo-dica">
          <strong>{pairado.label}</strong>
          <span>{descreverNo(pairado)}</span>
        </div>
      )}
    </div>
  );
}

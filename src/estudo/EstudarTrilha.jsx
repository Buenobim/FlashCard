/*
  =============================================================================
  ARQUIVO: src/estudo/EstudarTrilha.jsx
  PARA QUE SERVE: é a SESSÃO DE ESTUDO. Tela cheia, um passo por vez, do começo
  ao fim da trilha.

  POR QUE ELA É ASSIM (isto não é enfeite — é o que faz você aprender):

  1. RECORDAÇÃO ATIVA. O flashcard aparece com a resposta ESCONDIDA e não existe
     botão de "pular". Você é obrigado a tentar lembrar antes de ver. Ler a
     resposta junto com a pergunta dá a sensação gostosa de "eu sei isso" e não
     ensina quase nada; tentar lembrar e falhar ensina muito. Esse é o efeito
     mais bem documentado da psicologia do aprendizado (testing effect).

  2. VOCÊ É QUEM SE JULGA, EM QUATRO NÍVEIS. Não é "acertei/errei". É "errei",
     "difícil", "bom", "fácil" — porque o intervalo até a próxima vez depende de
     QUANTO custou lembrar, não só de ter lembrado. E o botão já mostra quando o
     cartão voltaria, para a escolha ser consciente.

  3. O QUE VOCÊ ERRA VOLTA NA MESMA SESSÃO. Errou, o cartão vai para o fim da
     fila e é cobrado de novo antes de você sair. Sessão que apenas ANOTA o erro
     e segue em frente deixa você terminar sem ter aprendido o que faltava.

  4. O CONTEXTO ANDA JUNTO. Anotação, print do slide, fórmula e pegadinha
     aparecem no meio, na ordem que você escreveu. Você não estuda uma lista de
     perguntas: você percorre a matéria.
  =============================================================================
*/

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Eye, ArrowRight, Layers, StickyNote, Image as ImageIcon, Link2, Sigma,
  Code2, AlertTriangle, HelpCircle, ExternalLink, Award, Clock, Target, Repeat,
  ClipboardList,
} from 'lucide-react';

import {
  montarRoteiro, configDoBloco, aplicarNota, previsaoEmTexto,
  NOTAS, ROTULO_DAS_NOTAS,
} from './trilhaCore.js';
import { contarQuestoes } from './questoes/index.js';
import './trilha.css';
// A telinha "como você quer estudar" usa o mesmo modal do resto do módulo.
import '../components/study-library.css';

const ICONES = {
  flashcard: Layers,
  nota: StickyNote,
  imagem: ImageIcon,
  link: Link2,
  formula: Sigma,
  codigo: Code2,
  atencao: AlertTriangle,
  duvida: HelpCircle,
};

const TITULO_DO_MODO = {
  trilha: 'Estudando a matéria inteira',
  revisao: 'Revisando o que venceu',
  sos: 'Só o que você erra',
};

/* Como cada nota se explica no botão. */
const BOTOES_DE_NOTA = [
  { nota: NOTAS.ERREI, classe: 'n0', explica: 'não lembrei' },
  { nota: NOTAS.DIFICIL, classe: 'n1', explica: 'lembrei suando' },
  { nota: NOTAS.BOM, classe: 'n2', explica: 'lembrei' },
  { nota: NOTAS.FACIL, classe: 'n3', explica: 'foi de graça' },
];

/*
  emCimaDeTudo: joga a tela para fora da árvore do Cofre, direto no <body>.

  POR QUE ISSO É NECESSÁRIO: a casca da plataforma (a barra flutuante com
  Cérebro / Flashcards / Documentos) cria um "contexto de empilhamento" próprio.
  Dentro dele, qualquer z-index — mesmo 900 — fica preso ABAIXO da barra, e a
  sessão de estudo abria com o topo escondido atrás dela. Com o portal, a tela
  cheia é filha do <body> e cobre tudo, como tela cheia deve fazer.
*/
const emCimaDeTudo = (conteudo) => (
  typeof document === 'undefined' ? conteudo : createPortal(conteudo, document.body)
);

const emMinutosSegundos = (ms) => {
  const total = Math.max(0, Math.round(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function EstudarTrilha({
  deck,
  modo = 'trilha',
  onSair,
  onNota,          // (cardId, cartaoAtualizado) -> quem chamou grava no baralho
  onFimDaSessao,   // (resumo) -> quem chamou soma nas estatísticas
}) {
  /*
    O roteiro é montado UMA VEZ, no começo. Se ele fosse recalculado a cada nota,
    o cartão que você acabou de acertar sairia da fila no meio da sessão e a
    barra de progresso andaria para trás.
  */
  const [fila, setFila] = useState(() => montarRoteiro(deck, { modo, agora: new Date() }));
  const [indice, setIndice] = useState(0);
  const [revelado, setRevelado] = useState(false);
  const [terminou, setTerminou] = useState(false);

  // Cópia viva dos cartões: o agendamento muda durante a sessão (e a previsão
  // que aparece nos botões precisa acompanhar).
  const [cartoes, setCartoes] = useState(() => {
    const mapa = new Map();
    (deck?.cards || []).forEach((c) => mapa.set(c.id, c));
    return mapa;
  });

  const [placar, setPlacar] = useState({ respondidos: 0, acertos: 0, erros: 0, lidos: 0 });
  const [errados, setErrados] = useState([]);   // [{ id, pergunta }]
  const [inicio] = useState(() => Date.now());
  const [agoraMs, setAgoraMs] = useState(() => Date.now());
  // Quanto a sessão durou, congelado no momento em que ela fecha. Guardar o
  // número (em vez de calcular na hora de desenhar) faz o tempo na tela final
  // parar de verdade, em vez de depender de quando o React redesenhar.
  const [duracaoMs, setDuracaoMs] = useState(0);
  const jaFechouRef = useRef(false);

  /* Cronômetro simples do canto (só para você ver o tempo passando). */
  useEffect(() => {
    if (terminou) return undefined;
    const t = setInterval(() => setAgoraMs(Date.now()), 1000);
    return () => clearInterval(t);
  }, [terminou]);

  /*
    ONDE A TELA FICA POSICIONADA.
    Cartão com print de slide é alto: a resposta nasce ABAIXO da dobra e você
    revelaria sem ver nada. Então:
      • ao virar para um passo novo, a tela volta para o topo;
      • ao revelar a resposta, ela é trazida para a vista.
    Sem isso, metade dos cartões com imagem exigiria rolar a mão toda vez.
  */
  const palcoRef = useRef(null);
  const respostaRef = useRef(null);

  useEffect(() => {
    if (palcoRef.current) palcoRef.current.scrollTop = 0;
  }, [indice]);

  useEffect(() => {
    if (!revelado || !respostaRef.current) return;
    respostaRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [revelado]);

  const passo = fila[indice] || null;
  const bloco = passo?.bloco || null;
  const ehFlashcard = bloco?.tipo === 'flashcard';
  const cartaoAtual = ehFlashcard ? (cartoes.get(bloco.cardId) || bloco.card) : null;

  /* ---------- Fim da sessão ---------- */
  const encerrar = useCallback((placarFinal) => {
    if (jaFechouRef.current) return;
    jaFechouRef.current = true;
    const gastou = Date.now() - inicio;
    setDuracaoMs(gastou);
    setTerminou(true);
    if (onFimDaSessao) {
      onFimDaSessao({
        deckId: deck?.id,
        deckTitulo: deck?.title,
        modo,
        respondidos: placarFinal.respondidos,
        acertos: placarFinal.acertos,
        erros: placarFinal.erros,
        lidos: placarFinal.lidos,
        segundos: Math.round(gastou / 1000),
      });
    }
  }, [deck, modo, onFimDaSessao, inicio]);

  /*
    avancar: a decisão de "acabou ou não" é tomada AQUI, e não dentro da receita
    do setIndice. Receita de estado tem que ser pura; encerrar a sessão de dentro
    dela faria a tela final disparar duas vezes no modo estrito do React.
  */
  const avancar = useCallback((placarNovo) => {
    setRevelado(false);
    const proximo = indice + 1;
    if (proximo >= fila.length) encerrar(placarNovo || placar);
    else setIndice(proximo);
  }, [indice, fila.length, encerrar, placar]);

  /* ---------- Passo de contexto: você leu, segue ---------- */
  const continuar = useCallback(() => {
    if (terminou || !bloco) return;
    const novo = { ...placar, lidos: placar.lidos + 1 };
    setPlacar(novo);
    avancar(novo);
  }, [avancar, bloco, placar, terminou]);

  /* ---------- Passo de flashcard: você se julga ---------- */
  const responder = useCallback((nota) => {
    if (terminou || !ehFlashcard || !cartaoAtual) return;

    const atualizado = aplicarNota(cartaoAtual, nota, new Date());

    // 1. Guarda a nova cópia viva
    setCartoes((mapa) => {
      const copia = new Map(mapa);
      copia.set(atualizado.id, atualizado);
      return copia;
    });

    // 2. Manda gravar no baralho de verdade
    if (onNota) onNota(atualizado.id, atualizado);

    const acertou = nota >= NOTAS.BOM;
    const novoPlacar = {
      ...placar,
      respondidos: placar.respondidos + 1,
      acertos: placar.acertos + (acertou ? 1 : 0),
      erros: placar.erros + (acertou ? 0 : 1),
    };
    setPlacar(novoPlacar);

    // 3. Errou? O cartão volta para o fim da fila — nesta mesma sessão.
    if (nota === NOTAS.ERREI) {
      setErrados((lista) => (
        lista.some((e) => e.id === atualizado.id)
          ? lista
          : [...lista, { id: atualizado.id, pergunta: (atualizado.term || '').trim() || 'Cartão sem título' }]
      ));
      setFila((atual) => [...atual, { ...passo, repetindo: true }]);
      setRevelado(false);
      setIndice((i) => i + 1);
      return;
    }

    avancar(novoPlacar);
  }, [avancar, cartaoAtual, ehFlashcard, onNota, passo, placar, terminou]);

  /* ---------- Teclado ---------- */
  useEffect(() => {
    const aoTeclar = (e) => {
      if (terminou) return;
      const digitando = ['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName);
      if (digitando) return;

      if (e.key === 'Escape') { e.preventDefault(); onSair?.(); return; }

      if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (!ehFlashcard) { continuar(); return; }
        if (!revelado) { setRevelado(true); return; }
        responder(NOTAS.BOM);
        return;
      }

      if (ehFlashcard && revelado && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        responder(Number(e.key) - 1);
      }
    };

    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [continuar, ehFlashcard, onSair, responder, revelado, terminou]);

  /* ---------- Nada para estudar ---------- */
  if (!fila.length) {
    return emCimaDeTudo(
      <div className="estudo">
        <div className="estudo-topo">
          <button type="button" className="sair" onClick={onSair}><X size={15} /> Sair</button>
          <div className="estudo-titulo"><strong>{deck?.title || 'Baralho'}</strong></div>
        </div>
        <div className="estudo-palco">
          <div className="estudo-fim">
            <div className="medalha"><Award size={34} /></div>
            <h1>Nada para estudar agora</h1>
            <p>
              {modo === 'revisao'
                ? 'Nenhum cartão desta matéria venceu — você está em dia. Volte quando a revisão vencer, ou estude a trilha inteira para reforçar.'
                : 'Esta trilha ainda está vazia. Volte ao editor e monte a matéria: uma seção, uma anotação e os primeiros flashcards.'}
            </p>
            <div className="botoes">
              <button type="button" className="btn-primary" onClick={onSair}>Voltar</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Tela final ---------- */
  if (terminou) {
    const totalRespostas = placar.acertos + placar.erros;
    const aproveitamento = totalRespostas ? Math.round((placar.acertos / totalRespostas) * 100) : 0;
    const minutos = emMinutosSegundos(duracaoMs);

    return emCimaDeTudo(
      <div className="estudo">
        <div className="estudo-topo">
          <button type="button" className="sair" onClick={onSair}><X size={15} /> Fechar</button>
          <div className="estudo-titulo">
            <strong>{deck?.title || 'Baralho'}</strong>
            <small>sessão concluída</small>
          </div>
        </div>

        <div className="estudo-palco">
          <div className="estudo-fim">
            <div className="medalha"><Award size={34} /></div>
            <h1>Sessão fechada.</h1>
            <p>
              {placar.erros === 0 && totalRespostas > 0
                ? 'Você não errou nenhum. Os intervalos esticaram — estes cartões vão sumir da sua frente por um bom tempo.'
                : `Você tropeçou em ${placar.erros} ${placar.erros === 1 ? 'cartão' : 'cartões'} e refez ${placar.erros === 1 ? 'ele' : 'eles'} antes de sair. É exatamente assim que a memória se forma.`}
            </p>

            <div className="estudo-placar">
              <div><strong>{placar.respondidos}</strong><span>respostas</span></div>
              <div><strong>{aproveitamento}%</strong><span>de acerto</span></div>
              <div><strong>{placar.lidos}</strong><span>blocos lidos</span></div>
              <div><strong>{minutos}</strong><span>de estudo</span></div>
            </div>

            {errados.length > 0 && (
              <div className="revisar-lista">
                <h4>Volte nestes antes da prova</h4>
                <ul>
                  {errados.map((e) => <li key={e.id}>{e.pergunta}</li>)}
                </ul>
              </div>
            )}

            <div className="botoes">
              <button type="button" className="btn-primary" onClick={onSair}>Voltar ao baralho</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ---------- Passo atual ---------- */
  const config = configDoBloco(bloco.tipo);
  const Icone = ICONES[bloco.tipo] || StickyNote;
  const progresso = Math.round(((indice) / fila.length) * 100);

  return emCimaDeTudo(
    <div className="estudo">
      <div className="estudo-topo">
        <button type="button" className="sair" onClick={onSair}><X size={15} /> Sair</button>
        <div className="estudo-titulo">
          <strong>{deck?.title || 'Baralho'}</strong>
          <small>{TITULO_DO_MODO[modo] || 'Estudando'}</small>
        </div>
        <span className="estudo-contador">
          <Clock size={12} style={{ verticalAlign: '-1px', marginRight: 4 }} />
          {emMinutosSegundos(agoraMs - inicio)}
        </span>
        <span className="estudo-contador">{indice + 1} / {fila.length}</span>
      </div>

      <div className="estudo-progresso"><i style={{ width: `${progresso}%` }} /></div>

      <div className="estudo-palco" ref={palcoRef}>
        <div className="estudo-folha">
          {passo.secao && <div className="estudo-secao">{passo.secao}</div>}

          {ehFlashcard ? (
            <div className="estudo-cartao">
              <div className="pergunta">
                <small>{passo.repetindo ? 'de novo — você errou este' : 'tente lembrar'}</small>
                <h2>{(cartaoAtual.term || '').trim() || '(cartão sem pergunta)'}</h2>
                {cartaoAtual.image && <img src={cartaoAtual.image} alt="Apoio visual do cartão" />}
              </div>

              {revelado ? (
                <div className="resposta" ref={respostaRef}>
                  <small>resposta</small>
                  <p>{(cartaoAtual.definition || '').trim() || '(cartão sem resposta)'}</p>
                </div>
              ) : (
                <div className="oculto">A resposta está escondida de propósito. Tente lembrar primeiro.</div>
              )}
            </div>
          ) : (
            <article className="estudo-contexto" style={{ '--cor-bloco': config.cor }}>
              <span className="selo"><Icone size={13} /> {config.rotulo}</span>
              {bloco.titulo && <h2>{bloco.titulo}</h2>}

              {bloco.tipo === 'imagem' && bloco.imagem && <img src={bloco.imagem} alt={bloco.titulo || 'Imagem da matéria'} />}
              {bloco.tipo === 'codigo' && <pre>{bloco.conteudo}</pre>}
              {bloco.tipo === 'formula' && <div className="formulao">{bloco.conteudo}</div>}
              {bloco.tipo === 'link' && bloco.url && (
                <a className="link-grande" href={bloco.url} target="_blank" rel="noreferrer">
                  <ExternalLink size={17} /> {bloco.url}
                </a>
              )}
              {bloco.conteudo && bloco.tipo !== 'codigo' && bloco.tipo !== 'formula' && <p>{bloco.conteudo}</p>}
            </article>
          )}
        </div>
      </div>

      <div className="estudo-pe">
        <div className="estudo-pe-interno">
          {ehFlashcard && revelado ? (
            <>
              <div className="estudo-notas">
                {BOTOES_DE_NOTA.map((b, i) => (
                  <button
                    key={b.nota}
                    type="button"
                    className={b.classe}
                    onClick={() => responder(b.nota)}
                  >
                    <strong>{ROTULO_DAS_NOTAS[b.nota]}</strong>
                    <span>{b.explica}</span>
                    <b>volta {previsaoEmTexto(cartaoAtual, b.nota)}</b>
                    <b style={{ opacity: 0.55 }}>tecla {i + 1}</b>
                  </button>
                ))}
              </div>
              <div className="estudo-atalho">Seja honesto na nota — é ela que decide quando o cartão volta.</div>
            </>
          ) : ehFlashcard ? (
            <>
              <button type="button" className="estudo-continuar" onClick={() => setRevelado(true)}>
                <Eye size={18} /> Ver a resposta
              </button>
              <div className="estudo-atalho">ESPAÇO para revelar · ESC para sair</div>
            </>
          ) : (
            <>
              <button type="button" className="estudo-continuar" onClick={continuar}>
                Entendi, continuar <ArrowRight size={18} />
              </button>
              <div className="estudo-atalho">ESPAÇO para continuar · ESC para sair</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/*
  ======================================================================
  ESCOLHA DO MODO — a telinha que aparece antes da sessão
  ======================================================================
  Cada porta serve a um momento:
    • a trilha inteira, para quando você está aprendendo o assunto;
    • a revisão, para o dia a dia (é ela que segura a matéria na cabeça);
    • o SOS, para a véspera da prova, quando só interessa o que você erra;
    • as questões da prova, que só aparecem quando a matéria tem prova
      cadastrada — é o treino no formato em que você vai ser cobrado.
*/
export function EscolherModo({ deck, raioX, onEscolher, onFechar }) {
  const opcoes = [
    {
      modo: 'trilha',
      icone: Layers,
      cor: '#E8933F',
      titulo: 'Estudar a matéria',
      texto: 'Percorre a trilha inteira, do primeiro ao último bloco: contexto, imagens e flashcards na ordem em que você montou.',
      selo: `${raioX?.totalBlocos || 0} blocos`,
    },
    {
      modo: 'revisao',
      icone: Repeat,
      cor: '#3ECF8E',
      titulo: 'Revisar o que venceu',
      texto: 'Só os cartões que a repetição espaçada marcou para hoje, mais os que você nunca viu. É o estudo de manutenção — 10 minutos por dia valem mais que 5 horas na véspera.',
      selo: raioX?.aRevisar ? `${raioX.aRevisar} para hoje` : 'em dia',
      apagado: !raioX?.aRevisar,
    },
    {
      modo: 'sos',
      icone: Target,
      cor: '#E5484D',
      titulo: 'Só o que eu erro',
      texto: 'Os cartões em que você já tropeçou, os mais problemáticos primeiro. Use na véspera da prova, quando não sobra tempo para o que já está firme.',
      selo: 'modo véspera',
    },
  ];

  /*
    A QUARTA PORTA só aparece quando a matéria TEM prova cadastrada. Botão que
    abre uma tela vazia é pior que botão nenhum: ensina você a não confiar no
    app.
  */
  const quantasQuestoes = contarQuestoes(deck);
  if (quantasQuestoes > 0) {
    opcoes.push({
      modo: 'questoes',
      icone: ClipboardList,
      cor: '#7AA2F7',
      titulo: 'Questões da prova',
      texto: 'As questões que a faculdade cobrou de verdade, uma por vez. Você marca a alternativa e só então abre a resolução: o passo a passo, a pegadinha e o raciocínio para quando esse tipo cair de novo.',
      selo: `${quantasQuestoes} resolvidas`,
    });
  }

  return emCimaDeTudo(
    <div className="study-modal-overlay trilha-por-cima" onMouseDown={(e) => e.target === e.currentTarget && onFechar?.()}>
      <div className="study-modal" style={{ maxWidth: 560 }}>
        <header className="study-modal-header">
          <span className="study-modal-icon" style={{ color: '#E8933F', background: '#E8933F18' }}><Layers size={22} /></span>
          <div>
            <small>COMO VOCÊ QUER ESTUDAR</small>
            <h2>{deck?.title || 'Baralho'}</h2>
          </div>
          <button type="button" className="study-icon-button" onClick={onFechar}><X size={19} /></button>
        </header>

        <div style={{ display: 'grid', gap: 10 }}>
          {opcoes.map((o) => {
            const Icone = o.icone;
            return (
              <button
                key={o.modo}
                type="button"
                onClick={() => onEscolher(o.modo)}
                style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start', textAlign: 'left',
                  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--border-radius-md)', padding: '15px 16px', cursor: 'pointer',
                  color: 'var(--text-white)', fontFamily: 'var(--font-main)',
                  opacity: o.apagado ? 0.62 : 1,
                }}
              >
                <span style={{
                  width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: o.cor, background: `${o.cor}1F`,
                }}>
                  <Icone size={20} />
                </span>
                <span style={{ flex: 1 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <strong style={{ fontSize: 15.5 }}>{o.titulo}</strong>
                    <em style={{
                      fontStyle: 'normal', fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5,
                      textTransform: 'uppercase', color: o.cor, background: `${o.cor}18`,
                      borderRadius: 999, padding: '2px 8px',
                    }}>{o.selo}</em>
                  </span>
                  <span style={{ display: 'block', fontSize: 13, lineHeight: 1.55, color: 'var(--text-muted)' }}>{o.texto}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

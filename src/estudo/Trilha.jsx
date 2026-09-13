/*
  =============================================================================
  ARQUIVO: src/estudo/Trilha.jsx
  PARA QUE SERVE: é O COMPOSITOR — a tela onde você MONTA a matéria.

  COMO SE USA (e por que é assim): você escreve a matéria de cima para baixo, na
  ordem em que ela acontece na sua cabeça. Agora uma seção, agora uma anotação,
  agora um print do slide, agora um flashcard, agora o link da videoaula, agora
  a pegadinha que o professor cobrou na prova passada. Cada um desses é um
  BLOCO, e a fila de blocos é a trilha.

  Isso muda o estudo de verdade: o flashcard deixa de ser uma pergunta solta no
  vácuo e passa a viver ao lado do contexto que o explica. Quando você errar
  aquele cartão daqui a três semanas, o material que responde a dúvida está a um
  bloco de distância — não em outro caderno, em outro aplicativo, em outra aba.

  O QUE ESTA TELA NÃO FAZ: ela não grava nada sozinha. Ela avisa quem a chamou
  (o editor do baralho) a cada mudança, e QUEM CHAMOU grava. Um dono só para o
  salvamento é o que impede duas telas gravarem por cima uma da outra.
  =============================================================================
*/

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Layers, StickyNote, Image as ImageIcon, Link2, Sigma, Code2, AlertTriangle,
  HelpCircle, Heading2, ChevronUp, ChevronDown, Trash2, Copy, Plus, X,
  ExternalLink, ImagePlus, RefreshCw, Check, AlertCircle, CornerDownRight,
} from 'lucide-react';

import {
  TIPOS_DE_BLOCO, ORDEM_DOS_BOTOES, configDoBloco, blocoNovo, blocoEstaVazio,
  classificarColagem, tituloAutomatico, comprimirImagem, lerArquivoComoBase64,
  pesoDoBaralho, pesoEmTexto, LIMITE_SEGURO_DO_BARALHO,
} from './trilhaCore.js';
import './trilha.css';

/* Ícone de cada tipo. Fica aqui (e não no core) porque o core não conhece tela. */
const ICONES = {
  flashcard: Layers,
  nota: StickyNote,
  imagem: ImageIcon,
  link: Link2,
  formula: Sigma,
  codigo: Code2,
  atencao: AlertTriangle,
  duvida: HelpCircle,
  secao: Heading2,
};

const LINGUAGENS = ['texto', 'javascript', 'python', 'java', 'c', 'sql', 'html', 'css', 'bash', 'json'];

/* ======================================================================
   CAMPO DE TEXTO QUE CRESCE SOZINHO
   Um textarea de altura fixa obriga você a rolar dentro de uma caixinha de
   quatro linhas para reler o próprio resumo. Aqui ele cresce com o texto.
   ====================================================================== */
function CampoTexto({ valor, aoMudar, className = '', ...resto }) {
  const ref = useRef(null);

  const ajustar = useCallback((el) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => { ajustar(ref.current); }, [valor, ajustar]);

  return (
    <textarea
      ref={ref}
      className={`bloco-campo ${className}`}
      value={valor}
      onChange={(e) => { aoMudar(e.target.value); ajustar(e.target); }}
      rows={1}
      {...resto}
    />
  );
}

/* ======================================================================
   UM BLOCO DA TRILHA
   Memoizado: num baralho com 200 blocos, digitar uma letra não pode redesenhar
   os outros 199.
   ====================================================================== */
const BlocoLinha = React.memo(function BlocoLinha({
  bloco, posicao, total, numeroDoCartao, maes,
  aoMudarCampo, aoMudarCartao, aoMover, aoApagar, aoDuplicar, aoFocar,
  aoPedirImagem, aoAmpliar,
}) {
  const config = configDoBloco(bloco.tipo);
  const Icone = ICONES[bloco.tipo] || StickyNote;
  const ehFlashcard = bloco.tipo === 'flashcard';
  const card = bloco.card || {};

  const mudar = (campo) => (valor) => aoMudarCampo(bloco.id, campo, valor);
  const mudarCartao = (campo) => (valor) => aoMudarCartao(bloco.id, campo, valor);

  return (
    <article
      className={`bloco tipo-${bloco.tipo}`}
      style={{ '--cor-bloco': config.cor }}
      data-bloco={bloco.id}
      onFocus={() => aoFocar(bloco.id)}
    >
      <div className="bloco-topo">
        <span className="bloco-selo"><Icone size={12} /> {config.rotulo}</span>
        {ehFlashcard && <span className="bloco-numero">#{numeroDoCartao}</span>}

        {ehFlashcard ? (
          <span style={{ flex: 1 }} />
        ) : (
          <input
            className="bloco-titulo"
            value={bloco.titulo || ''}
            onChange={(e) => mudar('titulo')(e.target.value)}
            placeholder={bloco.tipo === 'secao'
              ? 'Nome desta parte da matéria — ex.: Leis de Newton'
              : `${config.rotulo} — dê um nome (opcional)`}
          />
        )}

        <div className="bloco-acoes">
          <button type="button" title="Subir" disabled={posicao === 0} onClick={() => aoMover(bloco.id, -1)}><ChevronUp size={15} /></button>
          <button type="button" title="Descer" disabled={posicao === total - 1} onClick={() => aoMover(bloco.id, 1)}><ChevronDown size={15} /></button>
          <button type="button" title="Duplicar" onClick={() => aoDuplicar(bloco.id)}><Copy size={14} /></button>
          <button type="button" title="Apagar bloco" className="perigo" onClick={() => aoApagar(bloco.id)}><Trash2 size={14} /></button>
        </div>
      </div>

      {bloco.tipo !== 'secao' && (
        <div className="bloco-corpo">
          {ehFlashcard && (
            <>
              <div className="bloco-flashcard">
                <div className="bloco-lado pergunta">
                  <label>Pergunta</label>
                  <CampoTexto
                    valor={card.term || ''}
                    aoMudar={mudarCartao('term')}
                    placeholder="O que você quer conseguir lembrar?"
                  />
                </div>
                <div className="bloco-lado resposta">
                  <label>Resposta</label>
                  <CampoTexto
                    valor={card.definition || ''}
                    aoMudar={mudarCartao('definition')}
                    placeholder="A resposta certa, do jeito que você entende."
                  />
                </div>
              </div>

              {card.image ? (
                <div className="bloco-imagem">
                  <img src={card.image} alt="Imagem do cartão" onClick={() => aoAmpliar(card.image)} />
                  <button type="button" title="Tirar a imagem" onClick={() => mudarCartao('image')('')}><X size={14} /></button>
                </div>
              ) : null}

              <div className="bloco-rodape">
                <button type="button" className="add" onClick={() => aoPedirImagem(bloco.id, 'card')} style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: '#8A919C', borderRadius: 7, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ImagePlus size={13} /> {card.image ? 'Trocar imagem' : 'Imagem no cartão'}
                </button>
                {maes.length > 0 && (
                  <select
                    value={card.parentId || ''}
                    onChange={(e) => mudarCartao('parentId')(e.target.value || null)}
                    title="Deixe este cartão DENTRO de outro (aparece como ramo no Micro-Cérebro)"
                  >
                    <option value="">sem cartão mãe</option>
                    {maes.map((m) => <option key={m.id} value={m.id}>dentro de: {m.rotulo}</option>)}
                  </select>
                )}
                {card.parentId && <span style={{ color: '#7AA2F7', fontSize: 11.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 4 }}><CornerDownRight size={12} /> é um sub-cartão</span>}
              </div>
            </>
          )}

          {bloco.tipo === 'imagem' && (
            bloco.imagem ? (
              <>
                <div className="bloco-imagem">
                  <img src={bloco.imagem} alt={bloco.titulo || 'Imagem da trilha'} onClick={() => aoAmpliar(bloco.imagem)} />
                  <button type="button" title="Apagar a imagem" onClick={() => mudar('imagem')('')}><X size={14} /></button>
                </div>
                <CampoTexto
                  valor={bloco.conteudo || ''}
                  aoMudar={mudar('conteudo')}
                  placeholder="O que esta imagem mostra? (opcional, mas ajuda muito na revisão)"
                  style={{ marginTop: 10 }}
                />
              </>
            ) : (
              <div className="bloco-vazio-imagem" onClick={() => aoPedirImagem(bloco.id, 'bloco')}>
                <ImagePlus size={22} style={{ opacity: 0.6, marginBottom: 6 }} />
                <div>Clique para escolher uma imagem — ou cole um print com <b>Ctrl+V</b>.</div>
              </div>
            )
          )}

          {(bloco.tipo === 'nota' || bloco.tipo === 'atencao' || bloco.tipo === 'duvida') && (
            <CampoTexto
              valor={bloco.conteudo || ''}
              aoMudar={mudar('conteudo')}
              placeholder={config.dica}
            />
          )}

          {bloco.tipo === 'formula' && (
            <CampoTexto
              valor={bloco.conteudo || ''}
              aoMudar={mudar('conteudo')}
              className="formula"
              placeholder="Ex.:  F = m · a"
            />
          )}

          {bloco.tipo === 'codigo' && (
            <>
              <CampoTexto
                valor={bloco.conteudo || ''}
                aoMudar={mudar('conteudo')}
                className="mono"
                spellCheck={false}
                placeholder={config.dica}
              />
              <div className="bloco-rodape">
                <select value={bloco.linguagem || 'texto'} onChange={(e) => mudar('linguagem')(e.target.value)}>
                  {LINGUAGENS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {bloco.tipo === 'link' && (
            <>
              <div className="bloco-rodape" style={{ marginTop: 0, marginBottom: 9 }}>
                <Link2 size={15} style={{ color: '#F59E0B', flexShrink: 0 }} />
                <input
                  type="url"
                  value={bloco.url || ''}
                  onChange={(e) => mudar('url')(e.target.value)}
                  placeholder="https://… (videoaula, artigo, PDF)"
                />
                {bloco.url && (
                  <a href={bloco.url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> abrir</a>
                )}
              </div>
              <CampoTexto
                valor={bloco.conteudo || ''}
                aoMudar={mudar('conteudo')}
                placeholder="Por que este link importa? Do minuto tal ao minuto tal…"
              />
            </>
          )}
        </div>
      )}
    </article>
  );
});

/* ======================================================================
   O COMPOSITOR
   ====================================================================== */
export default function Trilha({
  blocos = [],
  onMudar,
  estado = 'ocioso',       // 'ocioso' | 'salvando' | 'salvo' | 'falha'
  mensagemDeFalha = '',
  deckParaPesar = null,    // usado só para avisar quando o baralho fica pesado demais
  raioX = null,
  onEstudar,
}) {
  const [zonaArmada, setZonaArmada] = useState(false);
  const [lupa, setLupa] = useState(null);
  const focoRef = useRef(null);            // id do último bloco em que você mexeu
  const arquivoRef = useRef(null);
  const alvoDaImagemRef = useRef(null);    // { blocoId, destino: 'card' | 'bloco' }
  const raizRef = useRef(null);
  const recemCriadoRef = useRef(null);

  /* ---------- Escritas na lista (sempre por id, nunca por índice) ---------- */
  const escrever = useCallback((receita) => {
    onMudar((atuais) => receita(atuais));
  }, [onMudar]);

  const aoMudarCampo = useCallback((id, campo, valor) => {
    escrever((atuais) => atuais.map((b) => (b.id === id ? { ...b, [campo]: valor } : b)));
  }, [escrever]);

  const aoMudarCartao = useCallback((id, campo, valor) => {
    escrever((atuais) => atuais.map((b) => (
      b.id === id ? { ...b, card: { ...b.card, [campo]: valor } } : b
    )));
  }, [escrever]);

  const aoMover = useCallback((id, direcao) => {
    escrever((atuais) => {
      const i = atuais.findIndex((b) => b.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= atuais.length) return atuais;
      const copia = [...atuais];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }, [escrever]);

  /*
    aoApagar: a pergunta de confirmação acontece AQUI FORA, e não dentro da
    receita passada ao React. Receita de estado tem que ser pura — o React pode
    rodá-la duas vezes durante o desenvolvimento, e aí você levaria dois avisos
    "Apagar?" pelo mesmo clique.
  */
  const aoApagar = useCallback((id) => {
    const alvo = blocos.find((b) => b.id === id);
    if (!alvo) return;

    if (!blocoEstaVazio(alvo)) {
      const nome = alvo.tipo === 'flashcard'
        ? ((alvo.card?.term || '').trim() || 'este flashcard')
        : ((alvo.titulo || '').trim() || `esta ${configDoBloco(alvo.tipo).rotulo.toLowerCase()}`);
      if (!window.confirm(`Apagar "${nome}"?\n\nEste bloco sai da trilha para sempre.`)) return;
    }

    // O filho de um cartão apagado NÃO some junto: ele sobe para o avô.
    const cardApagado = alvo.tipo === 'flashcard' ? alvo.cardId : null;
    const avo = alvo.card?.parentId || null;

    escrever((atuais) => atuais
      .filter((b) => b.id !== id)
      .map((b) => (
        cardApagado && b.tipo === 'flashcard' && b.card?.parentId === cardApagado
          ? { ...b, card: { ...b.card, parentId: avo } }
          : b
      )));
  }, [blocos, escrever]);

  const aoDuplicar = useCallback((id) => {
    escrever((atuais) => {
      const i = atuais.findIndex((b) => b.id === id);
      if (i < 0) return atuais;
      const original = atuais[i];
      const copia = original.tipo === 'flashcard'
        ? blocoNovo('flashcard', {
            term: original.card?.term || '',
            definition: original.card?.definition || '',
            image: original.card?.image || '',
          })
        : blocoNovo(original.tipo, {
            titulo: original.titulo, conteudo: original.conteudo,
            url: original.url, imagem: original.imagem, linguagem: original.linguagem,
          });
      const nova = [...atuais];
      nova.splice(i + 1, 0, copia);
      return nova;
    });
  }, [escrever]);

  const aoFocar = useCallback((id) => { focoRef.current = id; }, []);

  /*
    inserir: coloca o bloco novo LOGO ABAIXO do bloco em que você estava mexendo
    (e no fim da fila se você não estava em nenhum). É o detalhe que faz a
    composição fluir: você não precisa criar no fim e subir o bloco oito vezes.
  */
  const inserir = useCallback((novo, { focar = true } = {}) => {
    escrever((atuais) => {
      const i = atuais.findIndex((b) => b.id === focoRef.current);
      if (i < 0) return [...atuais, novo];
      const copia = [...atuais];
      copia.splice(i + 1, 0, novo);
      return copia;
    });
    focoRef.current = novo.id;
    if (focar) recemCriadoRef.current = novo.id;
    return novo;
  }, [escrever]);

  /* Leva o cursor para o bloco recém-criado, depois que o React o desenhou. */
  useEffect(() => {
    const id = recemCriadoRef.current;
    if (!id) return;
    recemCriadoRef.current = null;
    const el = raizRef.current?.querySelector(`[data-bloco="${id}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    /*
      Para onde vai o cursor: sempre para o campo que É o bloco.
      A ordem importa e não pode ser um seletor único — `querySelector` com
      lista devolve o primeiro na ORDEM DO HTML, e o título mora no cabeçalho,
      acima do corpo. Sem esta escada, criar uma anotação e sair digitando
      escreveria o texto no campo de título (que é opcional) em vez do corpo.
    */
    const campo = el.querySelector('input[type="url"]')
      || el.querySelector('textarea')
      || el.querySelector('input.bloco-titulo');
    if (campo) campo.focus();
  }, [blocos]);

  /* ---------- Imagens (botão e Ctrl+V usam o mesmo caminho) ---------- */
  const guardarImagem = useCallback(async (arquivo, alvo) => {
    try {
      const bruta = await lerArquivoComoBase64(arquivo);
      const leve = await comprimirImagem(bruta);
      if (!leve) return;

      if (alvo?.destino === 'card') {
        aoMudarCartao(alvo.blocoId, 'image', leve);
      } else if (alvo?.destino === 'bloco') {
        aoMudarCampo(alvo.blocoId, 'imagem', leve);
      } else {
        inserir(blocoNovo('imagem', { imagem: leve }), { focar: false });
      }
    } catch (erro) {
      window.alert(`Não consegui usar essa imagem: ${erro.message}`);
    }
  }, [aoMudarCampo, aoMudarCartao, inserir]);

  const aoPedirImagem = useCallback((blocoId, destino) => {
    alvoDaImagemRef.current = { blocoId, destino };
    arquivoRef.current?.click();
  }, []);

  /*
    O Ctrl+V — o coração do compositor.
      • Print na área de transferência → vira bloco de imagem (ou entra no
        cartão/bloco em que você estava, se fizer sentido).
      • Texto colado FORA de um campo → vira bloco novo, já do tipo certo.
      • Texto colado DENTRO de um campo → comportamento normal de colar texto.
  */
  useEffect(() => {
    const raiz = raizRef.current;
    if (!raiz) return undefined;

    const aoColar = async (e) => {
      const itens = Array.from(e.clipboardData?.items || []);
      const imagem = itens.find((it) => it.type && it.type.startsWith('image/'));

      if (imagem) {
        e.preventDefault();
        const arquivo = imagem.getAsFile();
        if (!arquivo) return;

        // Onde a imagem deve cair? Se o cursor está num flashcard ou num bloco
        // de imagem, ela entra ali. Senão, nasce um bloco de imagem novo.
        const dentroDe = e.target?.closest?.('[data-bloco]');
        const id = dentroDe?.getAttribute('data-bloco');
        const bloco = blocos.find((b) => b.id === id);
        if (bloco?.tipo === 'flashcard') await guardarImagem(arquivo, { blocoId: id, destino: 'card' });
        else if (bloco?.tipo === 'imagem') await guardarImagem(arquivo, { blocoId: id, destino: 'bloco' });
        else await guardarImagem(arquivo, null);
        setZonaArmada(false);
        return;
      }

      const editando = ['TEXTAREA', 'INPUT', 'SELECT'].includes(e.target?.tagName) || e.target?.isContentEditable;
      if (editando) return;

      const texto = e.clipboardData?.getData('text/plain');
      if (!texto || !texto.trim()) return;
      e.preventDefault();

      const tipo = classificarColagem(texto);
      if (tipo === 'link') {
        inserir(blocoNovo('link', { url: texto.trim(), titulo: 'Material colado' }));
      } else if (tipo === 'codigo') {
        inserir(blocoNovo('codigo', { conteudo: texto.replace(/\s+$/, ''), titulo: tituloAutomatico(texto, 40) }));
      } else if (tipo === 'formula') {
        inserir(blocoNovo('formula', { conteudo: texto.trim() }));
      } else {
        inserir(blocoNovo('nota', { conteudo: texto.trim(), titulo: tituloAutomatico(texto) }));
      }
      setZonaArmada(false);
    };

    raiz.addEventListener('paste', aoColar);
    return () => raiz.removeEventListener('paste', aoColar);
  }, [blocos, guardarImagem, inserir]);

  /* ---------- Lista de possíveis "cartões mãe" ---------- */
  const flashcards = useMemo(
    () => blocos.filter((b) => b.tipo === 'flashcard'),
    [blocos],
  );

  const maesPossiveis = useMemo(() => flashcards.map((b) => ({
    id: b.cardId,
    rotulo: (b.card?.term || '').trim() || 'Cartão sem título',
  })), [flashcards]);

  /* ---------- Peso do baralho (aviso antes do estouro) ---------- */
  const peso = useMemo(() => (deckParaPesar ? pesoDoBaralho(deckParaPesar) : 0), [deckParaPesar]);
  const pesado = peso > LIMITE_SEGURO_DO_BARALHO;

  /* ---------- Numeração dos flashcards ---------- */
  const numeroDoCartao = useMemo(() => {
    const mapa = new Map();
    let n = 0;
    blocos.forEach((b) => { if (b.tipo === 'flashcard') { n += 1; mapa.set(b.id, n); } });
    return mapa;
  }, [blocos]);

  const selosDeEstado = {
    salvando: { classe: 'salvando', icone: <RefreshCw size={13} className="spin-icon" />, texto: 'salvando…' },
    salvo: { classe: 'salvo', icone: <Check size={13} />, texto: 'tudo salvo' },
    falha: { classe: 'falha', icone: <AlertCircle size={13} />, texto: mensagemDeFalha || 'NÃO SALVOU' },
    ocioso: { classe: '', icone: null, texto: 'sem alterações' },
  };
  const selo = selosDeEstado[estado] || selosDeEstado.ocioso;

  return (
    <div className="trilha" ref={raizRef}>
      {/* Cabeçalho e números do baralho */}
      <div className="trilha-cabecalho">
        <div>
          <h3>A trilha da matéria</h3>
          <p>
            Monte a matéria na ordem em que você estuda: uma seção, uma anotação, o print do
            slide, o flashcard, o link da aula. Depois é só apertar <strong>Estudar</strong> e a
            plataforma te leva por tudo — lendo o contexto e cobrando os cartões.
          </p>
        </div>
        {onEstudar && (
          <button type="button" className="btn-primary" onClick={() => onEstudar('trilha')} style={{ flexShrink: 0 }}>
            Estudar esta trilha
          </button>
        )}
      </div>

      {raioX && (
        <div className="trilha-raiox">
          <span><strong>{raioX.totalBlocos}</strong> blocos</span>
          <span><strong>{raioX.totalCartoes}</strong> flashcards</span>
          <span><strong>{raioX.contexto}</strong> de contexto</span>
          {raioX.aRevisar > 0 && <span className="quente"><strong>{raioX.aRevisar}</strong> para revisar hoje</span>}
          {raioX.totalCartoes > 0 && <span><strong>{raioX.dominio}%</strong> na memória de longo prazo</span>}
        </div>
      )}

      {pesado && (
        <div className="trilha-aviso atencao">
          <strong>Este baralho está ficando pesado ({pesoEmTexto(peso)}).</strong> Imagens ocupam
          muito espaço e a nuvem recusa baralhos acima de 1 MB. Considere quebrar a matéria em dois
          baralhos, ou apagar prints que você já não usa — assim nada deixa de sincronizar.
        </div>
      )}

      {estado === 'falha' && (
        <div className="trilha-aviso">
          <strong>Atenção: a última alteração NÃO foi gravada.</strong> {mensagemDeFalha}
        </div>
      )}

      {/* A zona de colar */}
      <div
        className={`trilha-zona ${zonaArmada ? 'armada' : ''}`}
        onClick={() => setZonaArmada(true)}
        tabIndex={0}
      >
        {zonaArmada
          ? <>Pronto — agora aperte <kbd>Ctrl</kbd>+<kbd>V</kbd>. Print vira imagem, texto vira anotação, código vira bloco de código.</>
          : <>Clique aqui e cole com <kbd>Ctrl</kbd>+<kbd>V</kbd>: um <strong>print</strong>, um <strong>texto</strong> ou um <strong>link</strong> viram bloco sozinhos.</>}
      </div>

      {/* A trilha */}
      {blocos.length === 0 ? (
        <div className="trilha-vazia">
          <strong>Esta matéria ainda está em branco.</strong>
          Comece por uma <em>Seção</em> (o nome do assunto), escreva uma <em>Anotação</em> com o que
          você entendeu, e só então crie os <em>Flashcards</em>. Estudar assim funciona melhor do
          que decorar perguntas soltas — você entende primeiro e cobra depois.
        </div>
      ) : (
        <div className="trilha-lista">
          {blocos.map((bloco, i) => (
            <BlocoLinha
              key={bloco.id}
              bloco={bloco}
              posicao={i}
              total={blocos.length}
              numeroDoCartao={numeroDoCartao.get(bloco.id) || 0}
              maes={bloco.tipo === 'flashcard' ? maesPossiveis.filter((m) => m.id !== bloco.cardId) : []}
              aoMudarCampo={aoMudarCampo}
              aoMudarCartao={aoMudarCartao}
              aoMover={aoMover}
              aoApagar={aoApagar}
              aoDuplicar={aoDuplicar}
              aoFocar={aoFocar}
              aoPedirImagem={aoPedirImagem}
              aoAmpliar={setLupa}
            />
          ))}
        </div>
      )}

      {/* Barra de criar blocos (fica grudada no rodapé enquanto você rola) */}
      <div className="trilha-barra">
        <div className="trilha-barra-botoes">
        {ORDEM_DOS_BOTOES.map((tipo) => {
          const config = TIPOS_DE_BLOCO[tipo];
          const Icone = ICONES[tipo];
          return (
            <button
              key={tipo}
              type="button"
              className="add"
              style={{ '--cor-bloco': config.cor }}
              title={config.dica}
              onClick={() => inserir(blocoNovo(tipo))}
            >
              <Plus size={12} /><Icone size={13} style={{ color: config.cor }} /> {config.rotulo}
            </button>
          );
        })}
        </div>
        <span className={`trilha-estado ${selo.classe}`}>{selo.icone} {selo.texto}</span>
      </div>

      {/* Seletor de arquivo escondido (usado pelos botões de imagem) */}
      <input
        ref={arquivoRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={async (e) => {
          const arquivo = e.target.files?.[0];
          e.target.value = '';
          if (arquivo) await guardarImagem(arquivo, alvoDaImagemRef.current);
          alvoDaImagemRef.current = null;
        }}
      />

      {/* Lupa */}
      {lupa && (
        <div className="trilha-lupa" onClick={() => setLupa(null)}>
          <img src={lupa} alt="Imagem ampliada" />
        </div>
      )}
    </div>
  );
}

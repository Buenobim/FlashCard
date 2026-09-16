/*
  =============================================================================
  ARQUIVO: src/estudo/Questoes.jsx
  PARA QUE SERVE: mostra as QUESTÕES DE PROVA resolvidas — as de verdade, as que
  a faculdade cobrou — de um jeito que ensina em vez de só entregar o gabarito.

  A REGRA QUE VALE AQUI (a mesma da sessão de estudo): a resolução fica
  ESCONDIDA até você marcar uma alternativa. Ler a resolução com a resposta à
  vista dá a sensação boa de "ah, eu sabia" e não ensina quase nada. Chutar,
  errar e só então ver por que errou é o que gruda.

  A ORDEM EM QUE A RESOLUÇÃO APARECE também é de propósito:

    1. COMO PENSAR   — o reflexo. "Vi isso na prova → faço assim." É a única
                       parte que você usa numa questão que nunca viu.
    2. A FÓRMULA     — o que efetivamente resolve.
    3. OS PASSOS     — a conta destrinchada, um passo por linha.
    4. A PEGADINHA   — por que as outras alternativas estão ali. Cada
                       distrator é um erro que a banca esperava que você
                       cometesse; saber qual é vale mais que a resposta.
    5. LEVE CONSIGO  — a mini-regra para a véspera.

  DUAS PORTAS PARA O MESMO CONTEÚDO:
    • PainelDeQuestoes  — a aba "Questões" do editor: a lista inteira, para
                          folhear e consultar.
    • TreinoDeQuestoes  — a tela cheia, uma questão por vez, com placar no fim.
  =============================================================================
*/

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Check, Lightbulb, AlertTriangle, Sigma, ListChecks, Target,
  ClipboardList, ChevronDown, Award, ArrowRight, BookOpen,
} from 'lucide-react';

import { provasDoBaralho, questoesDoBaralho } from './questoes/index.js';
import './questoes.css';

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];

const emCimaDeTudo = (conteudo) => (
  typeof document === 'undefined' ? conteudo : createPortal(conteudo, document.body)
);

/* Quebra o texto do enunciado em parágrafos, respeitando os \n do arquivo. */
function Paragrafos({ texto }) {
  return String(texto || '')
    .split('\n')
    .map((linha, i) => (linha.trim()
      ? <p key={i}>{linha}</p>
      : <span key={i} className="q-espaco" />));
}

/*
  ===========================================================================
  UMA QUESTÃO
  ===========================================================================
  `escolha` é o índice marcado (null = ainda não respondeu). Quem guarda essa
  informação é o componente de cima — assim tanto a lista quanto o treino de
  tela cheia sabem o que você já respondeu, sem duplicar estado.
*/
export function Questao({ questao, escolha, onEscolher, mostrarNumero = true }) {
  const respondeu = escolha !== null && escolha !== undefined;
  const acertou = respondeu && escolha === questao.correta;

  return (
    <div className="q-questao">
      <header className="q-cabeca">
        {mostrarNumero && <span className="q-numero">Questão {questao.numero}</span>}
        {questao.assunto && <span className="q-assunto">{questao.assunto}</span>}
      </header>

      <div className="q-enunciado"><Paragrafos texto={questao.enunciado} /></div>

      {questao.imagem && <img className="q-imagem" src={questao.imagem} alt={`Figura da questão ${questao.numero}`} />}

      {questao.dados?.length > 0 && (
        <ul className="q-dados">
          {questao.dados.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}

      <div className="q-alternativas">
        {questao.alternativas.map((alt, i) => {
          let classe = 'q-alt';
          if (respondeu) {
            if (i === questao.correta) classe += ' certa';
            else if (i === escolha) classe += ' errada';
            else classe += ' apagada';
          }
          return (
            <button
              key={i}
              type="button"
              className={classe}
              onClick={() => !respondeu && onEscolher(i)}
              disabled={respondeu}
            >
              <span className="q-letra">{LETRAS[i]}</span>
              <span className="q-texto-alt">{alt}</span>
              {respondeu && i === questao.correta && <Check size={17} className="q-visto" />}
              {respondeu && i === escolha && i !== questao.correta && <X size={17} className="q-xis" />}
            </button>
          );
        })}
      </div>

      {!respondeu && (
        <p className="q-aviso">
          Marque uma alternativa para abrir a resolução. Chutar e errar aqui vale mais
          que ler o gabarito de cara.
        </p>
      )}

      {respondeu && (
        <div className="q-resolucao">
          <div className={acertou ? 'q-veredito acertou' : 'q-veredito errou'}>
            {acertou ? <Check size={18} /> : <X size={18} />}
            <strong>{acertou ? 'Você acertou.' : 'Não é essa.'}</strong>
            <span>Gabarito: <b>{LETRAS[questao.correta]}) {questao.resposta || questao.alternativas[questao.correta]}</b></span>
          </div>

          {questao.gatilho && (
            <section className="q-caixa gatilho">
              <h4><Lightbulb size={15} /> Como pensar quando esse tipo cai</h4>
              <p>{questao.gatilho}</p>
            </section>
          )}

          {questao.formula && (
            <section className="q-caixa formula">
              <h4><Sigma size={15} /> A fórmula</h4>
              <div className="q-formulao">{questao.formula}</div>
            </section>
          )}

          {questao.passos?.length > 0 && (
            <section className="q-caixa passos">
              <h4><ListChecks size={15} /> Resolvendo</h4>
              <ol>
                {questao.passos.map((p, i) => (
                  <li key={i}>
                    <strong>{p.titulo}</strong>
                    <span>{p.texto}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {questao.pegadinha && (
            <section className="q-caixa pegadinha">
              <h4><AlertTriangle size={15} /> A pegadinha</h4>
              <p>{questao.pegadinha}</p>
            </section>
          )}

          {questao.leveConsigo && (
            <section className="q-caixa leve">
              <h4><Target size={15} /> Leve para a prova</h4>
              <p>{questao.leveConsigo}</p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/*
  ===========================================================================
  A ABA "QUESTÕES" DO EDITOR — a lista inteira, para folhear
  ===========================================================================
*/
export default function PainelDeQuestoes({ deck, onTreinar }) {
  const provas = useMemo(() => provasDoBaralho(deck), [deck]);
  const [respostas, setRespostas] = useState({});
  const [aberta, setAberta] = useState(null);

  const todas = provas.flatMap((p) => p.questoes || []);
  const respondidas = todas.filter((q) => respostas[q.id] !== undefined);
  const acertos = respondidas.filter((q) => respostas[q.id] === q.correta).length;

  if (provas.length === 0) {
    return (
      <div className="q-vazio">
        <BookOpen size={34} />
        <h3>Nenhuma prova cadastrada para esta matéria</h3>
        <p>
          As provas resolvidas moram em <code>src/estudo/questoes/</code>, um arquivo
          <code>.json</code> por matéria. Mande os prints das questões e elas aparecem
          aqui — resolvidas, com a pegadinha e o raciocínio de cada tipo.
        </p>
      </div>
    );
  }

  return (
    <div className="q-painel">
      <header className="q-painel-topo">
        <div>
          <h3>Questões de prova, resolvidas</h3>
          <p>
            Marque a alternativa que você acha certa: a resolução só abre depois.
            É de propósito — tentar antes de ver é o que faz a matéria grudar.
          </p>
        </div>
        {onTreinar && (
          <button type="button" className="q-botao-treinar" onClick={onTreinar}>
            <Target size={16} /> Treinar em tela cheia
          </button>
        )}
      </header>

      <div className="q-placar-linha">
        <span><strong>{todas.length}</strong> questões</span>
        <span><strong>{respondidas.length}</strong> respondidas</span>
        <span className={acertos === respondidas.length ? 'bom' : 'quente'}>
          <strong>{acertos}</strong> certas
        </span>
        {respondidas.length > 0 && (
          <button type="button" className="q-limpar" onClick={() => setRespostas({})}>
            limpar respostas
          </button>
        )}
      </div>

      {provas.map((prova) => (
        <section key={prova.id} className="q-prova">
          <h4 className="q-prova-titulo"><ClipboardList size={16} /> {prova.titulo}</h4>
          {prova.fonte && <p className="q-fonte">{prova.fonte}</p>}

          {(prova.questoes || []).map((q) => {
            const abertaAgora = aberta === q.id;
            const marcada = respostas[q.id];
            const estado = marcada === undefined ? '' : (marcada === q.correta ? 'certa' : 'errada');
            return (
              <article key={q.id} className={`q-dobra ${estado}`}>
                <button
                  type="button"
                  className="q-dobra-topo"
                  onClick={() => setAberta(abertaAgora ? null : q.id)}
                >
                  <span className="q-dobra-num">{q.numero}</span>
                  <span className="q-dobra-assunto">{q.assunto}</span>
                  {marcada !== undefined && (
                    <span className={`q-selo ${estado}`}>{estado === 'certa' ? 'acertou' : 'errou'}</span>
                  )}
                  <ChevronDown size={17} className={abertaAgora ? 'girado' : ''} />
                </button>

                {abertaAgora && (
                  <div className="q-dobra-corpo">
                    <Questao
                      questao={q}
                      escolha={marcada ?? null}
                      onEscolher={(i) => setRespostas((r) => ({ ...r, [q.id]: i }))}
                      mostrarNumero={false}
                    />
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ))}
    </div>
  );
}

/*
  ===========================================================================
  O TREINO EM TELA CHEIA — uma questão por vez
  ===========================================================================
  Reaproveita a casca da sessão de estudo (.estudo, .estudo-topo, .estudo-pe)
  para o treino parecer o que é: outra forma de estudar a mesma matéria, e não
  uma tela estrangeira colada no app.
*/
export function TreinoDeQuestoes({ deck, onSair }) {
  const fila = useMemo(() => questoesDoBaralho(deck), [deck]);
  const [indice, setIndice] = useState(0);
  const [respostas, setRespostas] = useState({});
  const [acabou, setAcabou] = useState(false);

  const questao = fila[indice];
  const respondeu = questao && respostas[questao.id] !== undefined;
  const acertos = fila.filter((q) => respostas[q.id] === q.correta).length;
  const erradas = fila.filter((q) => respostas[q.id] !== undefined && respostas[q.id] !== q.correta);

  if (fila.length === 0) {
    return emCimaDeTudo(
      <div className="estudo">
        <div className="estudo-topo">
          <button type="button" className="sair" onClick={onSair}><X size={15} /> Sair</button>
          <div className="estudo-titulo"><strong>{deck?.title}</strong><small>Questões de prova</small></div>
        </div>
        <div className="estudo-palco">
          <div className="estudo-folha q-vazio">
            <BookOpen size={34} />
            <h3>Esta matéria ainda não tem prova cadastrada.</h3>
          </div>
        </div>
      </div>,
    );
  }

  if (acabou) {
    return emCimaDeTudo(
      <div className="estudo">
        <div className="estudo-palco">
          <div className="estudo-fim">
            <div className="medalha"><Award size={40} /></div>
            <h1>{acertos} de {fila.length}</h1>
            <p>
              {acertos === fila.length
                ? 'Prova limpa. Volte nela na véspera só para manter o reflexo.'
                : 'O que interessa agora são as que você errou — releia a pegadinha de cada uma, é lá que mora o ponto.'}
            </p>
            {erradas.length > 0 && (
              <div className="revisar-lista">
                <h4>Volte nestas</h4>
                <ul>
                  {erradas.map((q) => <li key={q.id}>Questão {q.numero} — {q.assunto}</li>)}
                </ul>
              </div>
            )}
            <div className="botoes">
              <button
                type="button"
                className="estudo-continuar"
                onClick={() => { setRespostas({}); setIndice(0); setAcabou(false); }}
              >
                Fazer de novo
              </button>
              <button type="button" className="estudo-continuar" style={{ background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }} onClick={onSair}>
                Sair
              </button>
            </div>
          </div>
        </div>
      </div>,
    );
  }

  const avancar = () => {
    if (indice + 1 >= fila.length) setAcabou(true);
    else setIndice(indice + 1);
  };

  return emCimaDeTudo(
    <div className="estudo">
      <div className="estudo-topo">
        <button type="button" className="sair" onClick={onSair}><X size={15} /> Sair</button>
        <div className="estudo-titulo">
          <strong>{deck?.title || 'Baralho'}</strong>
          <small>Questões de prova — {questao.prova}</small>
        </div>
        <span className="estudo-contador">{acertos} certas</span>
        <span className="estudo-contador">{indice + 1} / {fila.length}</span>
      </div>

      <div className="estudo-progresso"><i style={{ width: `${Math.round((indice / fila.length) * 100)}%` }} /></div>

      <div className="estudo-palco">
        <div className="estudo-folha">
          <Questao
            questao={questao}
            escolha={respostas[questao.id] ?? null}
            onEscolher={(i) => setRespostas((r) => ({ ...r, [questao.id]: i }))}
          />
        </div>
      </div>

      <div className="estudo-pe">
        <div className="estudo-pe-interno">
          {respondeu ? (
            <>
              <button type="button" className="estudo-continuar" onClick={avancar}>
                {indice + 1 >= fila.length ? 'Ver o placar' : 'Próxima questão'} <ArrowRight size={18} />
              </button>
              <div className="estudo-atalho">Leu a pegadinha? É ela que evita o erro na prova.</div>
            </>
          ) : (
            <div className="estudo-atalho">Marque uma alternativa acima para ver a resolução.</div>
          )}
        </div>
      </div>
    </div>,
  );
}

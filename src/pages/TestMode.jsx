/*
  =============================================================================
  ARQUIVO: src/pages/TestMode.jsx
  PARA QUE SERVE: Esta é a tela do "Simulado / Avaliação". Ela cria uma prova real 
  sobre o seu baralho de estudos! Ela mistura 3 tipos de perguntas: Múltipla Escolha, 
  Verdadeiro ou Falso (onde você julga se uma associação está certa), e Dissertativa 
  (onde você precisa digitar a resposta exata). Ao enviar o simulado, ele dá uma nota 
  de 0 a 100%, atribui um conceito (como A+, B ou F) e exibe uma correção minuciosa 
  mostrando o que você acertou e o que errou.
  =============================================================================
*/

import React, { useState, useEffect } from 'react';
// Importamos ícones da Lucide para dar o visual de prova acadêmica de alto nível
import { ArrowLeft, CheckCircle2, XCircle, Award, FileText, Send, RotateCcw, HelpCircle } from 'lucide-react';
// O CORRETOR e a MONTAGEM DAS QUESTÕES moram em arquivos sem tela, conferidos
// por `npm run testar`. É de lá que vem o entendimento de "12500 N = 12,5 kN" e
// a garantia de que nenhuma alternativa errada é igual à certa.
import { corrigirResposta } from '../estudo/correcaoCore.js';
import { montarMultiplaEscolha, montarVerdadeiroFalso } from '../estudo/questoesCore.js';

/*
  COMPONENTE: TestMode
  PARAMETROS (PROPS) QUE RECEBE:
    - set: O baralho de estudos selecionado.
    - onNavigate: Função para transitar de tela.
    - onCompleteSession: Função para somar +1 nas sessões de estudo globais.
*/
export default function TestMode({ set, onNavigate, onCompleteSession }) {
  // 1. ESTADOS DO SIMULADO
  const [questions, setQuestions] = useState([]);       // Lista de questões geradas para esta prova
  const [isSubmitted, setIsSubmitted] = useState(false);  // Se o aluno já entregou a prova para correção
  const [scorePercent, setScorePercent] = useState(0);    // Nota percentual calculada (0 a 100)
  const [letterGrade, setLetterGrade] = useState('F');    // Conceito final de nota (A+, B, F etc.)
  const [lightboxImage, setLightboxImage] = useState(null); // Estado para a imagem em zoom (lightbox)

  /*
    A CORREÇÃO E A SUA PALAVRA FINAL

    correcoes: o que o corretor automático decidiu em cada questão
               ('certo', 'errado' ou 'revisar') e o motivo, em português.
    ajustes:   o que VOCÊ decidiu nas questões que o corretor não tem como
               julgar sozinho (resposta escrita com outras palavras). A máquina
               não chuta: ela pergunta.
  */
  const [correcoes, setCorrecoes] = useState({});
  const [ajustes, setAjustes] = useState({});

  // 2. GERAÇÃO AUTOMÁTICA DA PROVA:
  // Dispara quando carrega o baralho. Monta a mistura inteligente de questões.
  useEffect(() => {
    generateExam();
  }, [set]);

  /*
    FUNÇÃO INTERNA: generateExam
    PARA QUE SERVE: Cria as questões da prova (limite máximo de 10 perguntas).
    Mistura de forma inteligente os 3 tipos de questões:
      - Verdadeiro/Falso
      - Múltipla Escolha
      - Dissertativa (Escrita)
  */
  const generateExam = () => {
    if (!set || !set.cards || set.cards.length === 0) return;

    // Embaralha os cartões originais e limita em até 10 questões no total
    const pool = [...set.cards].sort(() => Math.random() - 0.5);
    const selectedCards = pool.slice(0, Math.min(10, pool.length));

    const generatedQuestions = selectedCards.map((card, index) => {
      // 1. Decidimos o tipo de questão de forma cíclica (0: Verdadeiro/Falso, 1: Múltipla Escolha, 2: Escrita)
      // para garantir que a prova tenha uma boa variedade de desafios!
      const typeIndex = index % 3;
      let type;
      let options = [];
      let promptText;
      let isAssociationCorrect = true; // Usado apenas no tipo Verdadeiro/Falso

      if (typeIndex === 0) {
        // --- QUESTÃO TIPO VERDADEIRO OU FALSO ---
        type = 'true-false';

        // A afirmação FALSA agora usa obrigatoriamente uma definição que diz
        // outra coisa. Antes, o app pegava a definição de qualquer outro cartão
        // e cravava "isto é falso" — se o outro cartão dissesse a mesma coisa
        // com outras palavras, você levava erro por ter acertado.
        const afirmacao = montarVerdadeiroFalso(card, set.cards);
        isAssociationCorrect = afirmacao.verdadeira;

        promptText = `O termo "${card.term}" significa "${afirmacao.definicaoDaAfirmacao}"?`;

      } else if (typeIndex === 1 && set.cards.length >= 2) {
        // --- QUESTÃO TIPO MÚLTIPLA ESCOLHA ---
        // As alternativas vêm prontas e sem repetição (ver questoesCore).
        const questao = montarMultiplaEscolha(card, set.cards);
        if (questao) {
          type = 'multiple-choice';
          promptText = `Qual é a definição correta para "${card.term}"?`;
          options = questao.opcoes;
        } else {
          // Não sobrou nenhuma alternativa errada honesta para oferecer:
          // vira questão escrita em vez de uma múltipla escolha de uma opção só.
          type = 'written';
          promptText = `Digite a definição correspondente ao termo: "${card.term}"`;
        }

      } else {
        // --- QUESTÃO TIPO ESCRITA (DISSERTATIVA) ---
        type = 'written';
        promptText = `Digite a definição correspondente ao termo: "${card.term}"`;
      }

      return {
        id: `q-${index}`,
        type: type,
        cardId: card.id,
        term: card.term,
        correctDefinition: card.definition,
        // Formas alternativas de responder que VOCÊ aprovou no cartão
        // (campo respostasAceitas, ou "12,5 kN | 12500 N" no verso).
        aceitas: Array.isArray(card.respostasAceitas) ? card.respostasAceitas : [],
        image: card.image || '', // Salva a imagem da resposta correta para usar no gabarito
        prompt: promptText,
        options: options,
        isAssociationCorrect: isAssociationCorrect, // Se a afirmação V/F era verdadeira
        userAnswer: '', // Resposta vazia que o usuário irá preencher
      };
    });

    setQuestions(generatedQuestions);
    setIsSubmitted(false);
    setCorrecoes({});
    setAjustes({});
  };

  /*
    FUNÇÃO INTERNA: handleAnswerChange
    PARA QUE SERVE: Salva a resposta do usuário para uma questão específica no estado.
  */
  const handleAnswerChange = (questionId, value) => {
    if (isSubmitted) return; // Não deixa alterar respostas depois de entregar a prova!

    setQuestions(prev => prev.map(q => {
      if (q.id === questionId) {
        return { ...q, userAnswer: value };
      }
      return q;
    }));
  };

  /*
    FUNÇÃO INTERNA: corrigirQuestao
    PARA QUE SERVE: corrige UMA questão e devolve { situacao, motivo }.
      'certo'   -> ponto garantido;
      'errado'  -> sem ponto, com o motivo explicado;
      'revisar' -> o corretor NÃO tem como decidir sozinho (você escreveu a
                   definição com outras palavras, ou acertou o número e esqueceu
                   a unidade). Fica valendo zero até VOCÊ dizer, no gabarito, que
                   acertou. A máquina não chuta a seu favor nem contra você.
  */
  const corrigirQuestao = (q) => {
    if (q.type === 'true-false') {
      const esperado = q.isAssociationCorrect ? 'true' : 'false';
      if (q.userAnswer === esperado) return { situacao: 'certo', motivo: '' };
      return {
        situacao: 'errado',
        motivo: `A afirmação era ${q.isAssociationCorrect ? 'verdadeira' : 'falsa'}.`,
      };
    }
    if (q.type === 'multiple-choice') {
      if (q.userAnswer === q.cardId) return { situacao: 'certo', motivo: '' };
      return { situacao: 'errado', motivo: q.userAnswer ? 'Alternativa incorreta.' : 'Não respondida.' };
    }
    // Escrita: entra o corretor de verdade (valor, unidade e tolerância).
    return corrigirResposta(q.userAnswer, q.correctDefinition, { aceitas: q.aceitas });
  };

  // A palavra final sobre uma questão: o que VOCÊ decidiu vale mais do que o
  // palpite do corretor automático.
  const situacaoFinal = (q, mapa = correcoes, aj = ajustes) =>
    aj[q.id] || mapa[q.id]?.situacao || 'errado';

  const conceitoDaNota = (percent) => {
    if (percent === 100) return 'A+';
    if (percent >= 90) return 'A';
    if (percent >= 80) return 'B';
    if (percent >= 70) return 'C';
    if (percent >= 60) return 'D';
    return 'F';
  };

  // Recalcula a nota levando em conta as suas revisões manuais.
  const recalcularNota = (mapa, aj) => {
    const acertos = questions.filter(q => situacaoFinal(q, mapa, aj) === 'certo').length;
    const percent = questions.length ? Math.round((acertos / questions.length) * 100) : 0;
    setScorePercent(percent);
    setLetterGrade(conceitoDaNota(percent));
  };

  /*
    FUNÇÃO INTERNA: revisarQuestao
    PARA QUE SERVE: os botões "acertei / errei" do gabarito. É a revisão humana
    das questões que o corretor marcou como 'revisar' (e a chance de consertar
    uma correção que você achou injusta).
  */
  const revisarQuestao = (questionId, decisao) => {
    const novos = { ...ajustes, [questionId]: decisao };
    setAjustes(novos);
    recalcularNota(correcoes, novos);
  };

  /*
    FUNÇÃO INTERNA: handleSubmit
    PARA QUE SERVE: dispara ao clicar em "Entregar Prova". Passa cada questão
    pelo corretor, guarda o motivo de cada resultado e calcula a nota.
  */
  const handleSubmit = () => {
    const mapa = {};
    questions.forEach(q => { mapa[q.id] = corrigirQuestao(q); });

    setCorrecoes(mapa);
    setAjustes({});
    recalcularNota(mapa, {});
    setIsSubmitted(true);

    // Registra mais uma sessão de estudos finalizada nas estatísticas globais
    onCompleteSession();
  };

  // Determina a cor do conceito para destacar no relatório final
  const getGradeColor = () => {
    if (scorePercent >= 80) return 'var(--color-success)';
    if (scorePercent >= 60) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  // Validação de segurança
  if (!set || !set.cards || set.cards.length === 0) {
    return (
      <div className="app-container" style={{ textAlign: 'center', paddingTop: '40px' }}>
        <h2>Erro: Baralho inválido ou sem cartões cadastrados.</h2>
        <button onClick={() => onNavigate('dashboard')} className="btn-primary" style={{ marginTop: '20px' }}>
          Voltar ao Painel
        </button>
      </div>
    );
  }

  return (
    <div className="app-container">
      
      {/* CABEÇALHO DO SIMULADO */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h2 style={styles.setTitle}>📝 Simulado: {set.title}</h2>
      </header>

      {!isSubmitted ? (
        // -----------------------------------------------------------------------------
        // TELA DE PROVA ATIVA (FORMULÁRIO DE SELEÇÃO E DIGITAÇÃO)
        // -----------------------------------------------------------------------------
        <div style={styles.testFormArea}>
          
          <div style={styles.testMetaCard} className="glass-panel">
            <FileText size={20} color="var(--primary-color)" />
            <span>Este simulado contém <strong>{questions.length} questões</strong> variadas. Responda com atenção!</span>
          </div>

          <div style={styles.questionsList}>
            {questions.map((q, idx) => (
              <div key={q.id} style={styles.questionCard} className="glass-panel">
                
                {/* Cabeçalho da Questão */}
                <div style={styles.questionCardHeader}>
                  <span style={styles.questionNumber}>Questão {idx + 1} de {questions.length}</span>
                  <span style={styles.questionTypeTag}>
                    {q.type === 'true-false' ? '❓ Verdadeiro ou Falso' : 
                     q.type === 'multiple-choice' ? '✏️ Múltipla Escolha' : '📝 Resposta Escrita'}
                  </span>
                </div>

                {/* Enunciado */}
                <p style={styles.questionPrompt}>{q.prompt}</p>

                {/* ÁREA DE RESPOSTA CONFORME O TIPO */}
                <div style={styles.answerArea}>
                  
                  {/* Tipo 1: Verdadeiro ou Falso */}
                  {q.type === 'true-false' && (
                    <div style={styles.tfButtons}>
                      <button
                        onClick={() => handleAnswerChange(q.id, 'true')}
                        style={{ 
                          ...styles.tfBtn, 
                          ...(q.userAnswer === 'true' ? styles.tfBtnSelectedTrue : {}) 
                        }}
                      >
                        Verdadeiro
                      </button>
                      <button
                        onClick={() => handleAnswerChange(q.id, 'false')}
                        style={{ 
                          ...styles.tfBtn, 
                          ...(q.userAnswer === 'false' ? styles.tfBtnSelectedFalse : {}) 
                        }}
                      >
                        Falso
                      </button>
                    </div>
                  )}

                  {/* Tipo 2: Múltipla Escolha */}
                  {q.type === 'multiple-choice' && (
                    <div style={styles.mcOptionsGrid}>
                      {q.options.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => handleAnswerChange(q.id, opt.id)}
                          style={{
                            ...styles.mcOptionBtn,
                            ...(q.userAnswer === opt.id ? styles.mcOptionBtnSelected : {})
                          }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <span>{opt.definition}</span>
                             {opt.image && (
                              <img 
                                src={opt.image} 
                                alt="Miniatura" 
                                style={{
                                  maxHeight: '36px',
                                  width: 'auto',
                                  maxWidth: '120px',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                  objectFit: 'contain',
                                  background: '#0B0C0E',
                                  cursor: 'zoom-in',
                                }} 
                                onClick={(e) => {
                                  e.stopPropagation(); // Impede de marcar a alternativa ao clicar na imagem!
                                  setLightboxImage(opt.image);
                                }}
                                title="Clique para ampliar a imagem"
                              />
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Tipo 3: Resposta Escrita */}
                  {q.type === 'written' && (
                    <input
                      type="text"
                      placeholder="Digite sua resposta aqui..."
                      value={q.userAnswer}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      className="form-input"
                      style={styles.writtenInput}
                    />
                  )}

                </div>

              </div>
            ))}
          </div>

          {/* BOTÃO DE ENVIAR PROVA */}
          <button 
            onClick={handleSubmit} 
            className="btn-primary" 
            style={styles.submitTestBtn}
          >
            <Send size={18} />
            Finalizar e Entregar Simulado
          </button>

        </div>
      ) : (
        // -----------------------------------------------------------------------------
        // TELA DE RESULTADOS (CORREÇÃO E GABARITO COMPLETO)
        // -----------------------------------------------------------------------------
        <div style={styles.resultsArea}>
          
          {/* CARTÃO DE NOTA DA PROVA */}
          <div style={styles.scoreReportCard} className="glass-panel animate-success">
            <Award size={64} style={{ color: getGradeColor(), filter: `drop-shadow(0 0 10px ${getGradeColor()})` }} />
            
            <h2 style={styles.scoreTitle}>Resultado do Simulado</h2>
            <p style={styles.scoreSubtitle}>Sua folha de correção detalhada.</p>

            <div style={styles.scoreContainer}>
              <div style={styles.scoreCirc}>
                <span style={{ ...styles.finalScoreValue, color: getGradeColor() }}>{scorePercent}%</span>
                <span style={styles.finalScoreLabel}>Nota Geral</span>
              </div>
              <div style={styles.gradeLetterCirc}>
                <span style={{ ...styles.finalLetterValue, color: getGradeColor() }}>{letterGrade}</span>
                <span style={styles.finalLetterLabel}>Conceito</span>
              </div>
            </div>

            <div style={styles.resultsCongrats}>
              {scorePercent >= 80 ? '🎉 Excelente! Você dominou a maior parte deste assunto!' :
               scorePercent >= 60 ? '👍 Bom desempenho. Mais algumas revisões e você alcança o topo!' :
               '📚 Estude mais um pouco. Use o modo Flashcards para revisar os termos antes de refazer.'}
            </div>

            <div style={styles.reportActionRow}>
              <button onClick={generateExam} className="btn-primary" style={{ padding: '12px 24px' }}>
                <RotateCcw size={16} />
                Refazer Novo Simulado
              </button>
              <button onClick={() => onNavigate('dashboard')} className="btn-secondary" style={{ padding: '12px 24px' }}>
                Voltar ao Painel
              </button>
            </div>
          </div>

          {/* LISTAGEM DE GABARITO DETALHADO */}
          <h3 style={styles.gabaritoHeader}>Gabarito e Correção de Questões</h3>
          <div style={styles.questionsList}>
            {questions.map((q, idx) => {
              // O que o corretor decidiu (e o que VOCÊ decidiu depois).
              const situacao = situacaoFinal(q);
              const motivo = correcoes[q.id]?.motivo || '';
              const precisaDeVoce = situacao === 'revisar';
              const isCorrect = situacao === 'certo';

              // Cor e rótulo do selo desta questão
              const cor = isCorrect ? 'var(--color-success)'
                : precisaDeVoce ? 'var(--color-warning)'
                  : 'var(--color-danger)';
              const rotulo = isCorrect ? 'Acertou' : precisaDeVoce ? 'Confira você mesmo' : 'Errou';

              let userFriendlyAnswer;
              let userFriendlyExpected = q.correctDefinition;

              if (q.type === 'true-false') {
                userFriendlyAnswer = q.userAnswer === 'true' ? 'Verdadeiro' : q.userAnswer === 'false' ? 'Falso' : '(Não respondido)';
                userFriendlyExpected = q.isAssociationCorrect ? 'Verdadeiro' : 'Falso';
              } else if (q.type === 'multiple-choice') {
                const chosenOpt = q.options.find(opt => opt.id === q.userAnswer);
                userFriendlyAnswer = chosenOpt ? chosenOpt.definition : '(Não respondido)';
              } else {
                userFriendlyAnswer = (q.userAnswer || '').trim() || '(Não respondido)';
              }

              return (
                <div 
                  key={q.id} 
                  style={{ 
                    ...styles.questionCard, 
                    borderLeft: `5px solid ${cor}`
                  }} 
                  className="glass-panel"
                >
                  <div style={styles.gabaritoItemHeader}>
                    <span style={styles.questionNumber}>Questão {idx + 1}</span>
                    <span style={{ 
                      ...styles.gabaritoStatusTag, 
                      color: cor,
                      background: isCorrect ? 'rgba(62, 207, 142, 0.1)' : precisaDeVoce ? 'rgba(232, 147, 63, 0.12)' : 'rgba(229, 72, 77, 0.1)'
                    }}>
                      {isCorrect ? <CheckCircle2 size={14} /> : precisaDeVoce ? <HelpCircle size={14} /> : <XCircle size={14} />}
                      {rotulo}
                    </span>
                  </div>

                  <p style={styles.questionPrompt}>{q.prompt}</p>

                  <div style={styles.gabaritoComparisonBox}>
                    <div style={styles.gabaritoUserAns}>
                      <span style={styles.gabaritoLabel}>Sua Resposta:</span>
                      <strong style={{ color: cor }}>
                        {userFriendlyAnswer}
                      </strong>
                    </div>
                    
                    {!isCorrect && (
                      <div style={styles.gabaritoExpectedAns}>
                        <span style={styles.gabaritoLabel}>Resposta Correta:</span>
                        <strong style={{ color: 'var(--color-success)' }}>
                          {userFriendlyExpected}
                        </strong>
                      </div>
                    )}

                    {/* O PORQUÊ DA CORREÇÃO: unidade trocada, valor fora da
                        tolerância, resposta em branco... em vez de um "errou"
                        seco que não ensina nada. */}
                    {motivo && (
                      <div style={styles.motivoDaCorrecao}>
                        <span style={styles.gabaritoLabel}>Por quê:</span>
                        <span style={{ color: '#C6CBD4' }}>{motivo}</span>
                      </div>
                    )}

                    {/* A SUA PALAVRA FINAL: em resposta escrita, quem decide se
                        a explicação com outras palavras valeu é você. */}
                    {q.type === 'written' && (
                      <div style={styles.linhaDeRevisao}>
                        <span style={styles.gabaritoLabel}>
                          {precisaDeVoce ? 'Escreveu com outras palavras? Você decide:' : 'Discorda da correção?'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => revisarQuestao(q.id, 'certo')}
                            className="btn-secondary"
                            style={{
                              ...styles.botaoDeRevisao,
                              borderColor: ajustes[q.id] === 'certo' ? 'var(--color-success)' : undefined,
                              color: ajustes[q.id] === 'certo' ? 'var(--color-success)' : undefined,
                            }}
                            title="Contar esta questão como acerto"
                          >
                            <CheckCircle2 size={14} /> Eu acertei
                          </button>
                          <button
                            type="button"
                            onClick={() => revisarQuestao(q.id, 'errado')}
                            className="btn-secondary"
                            style={{
                              ...styles.botaoDeRevisao,
                              borderColor: ajustes[q.id] === 'errado' ? 'var(--color-danger)' : undefined,
                              color: ajustes[q.id] === 'errado' ? 'var(--color-danger)' : undefined,
                            }}
                            title="Contar esta questão como erro"
                          >
                            <XCircle size={14} /> Eu errei
                          </button>
                        </div>
                      </div>
                    )}

                    {q.image && (
                      <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <span style={styles.gabaritoLabel}>Imagem de Referência:</span>
                        <img 
                          src={q.image} 
                          alt="Imagem de Referência" 
                          style={{
                            maxHeight: '80px',
                            width: 'auto',
                            maxWidth: '180px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            objectFit: 'contain',
                            background: '#0B0C0E',
                            alignSelf: 'flex-start',
                            cursor: 'zoom-in',
                          }} 
                          onClick={() => setLightboxImage(q.image)}
                          title="Clique para ampliar a imagem"
                        />
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* Visualizador de Imagem Ampliada (Lightbox) */}
      {lightboxImage && (
        <div 
          className="image-lightbox-overlay" 
          onClick={() => setLightboxImage(null)}
          title="Clique fora para fechar"
        >
          <img 
            src={lightboxImage} 
            alt="Imagem Ampliada" 
            className="image-lightbox-img" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS DO MODO AVALIAÇÃO / SIMULADO
// -----------------------------------------------------------------------------
const styles = {
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  motivoDaCorrecao: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    marginTop: '10px',
    fontSize: '13px',
    lineHeight: '1.5',
  },
  linhaDeRevisao: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    marginTop: '12px',
    paddingTop: '10px',
    borderTop: '1px solid rgba(255,255,255,0.08)',
  },
  botaoDeRevisao: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    fontSize: '12px',
  },
  setTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
  },
  testFormArea: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '750px',
    margin: '0 auto',
  },
  testMetaCard: {
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#99A1AC',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  questionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  questionCard: {
    padding: '24px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  questionCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '8px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  questionNumber: {
    fontSize: '13px',
    fontWeight: '700',
    color: '#99A1AC',
    textTransform: 'uppercase',
  },
  questionTypeTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#E8933F',
    background: 'rgba(232, 147, 63, 0.08)',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  questionPrompt: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#F4F5F7',
    marginBottom: '20px',
    lineHeight: '1.4',
  },
  answerArea: {
    width: '100%',
  },
  tfButtons: {
    display: 'flex',
    gap: '12px',
  },
  tfBtn: {
    flex: '1',
    padding: '14px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#f3f4f6',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  tfBtnSelectedTrue: {
    background: 'rgba(62, 207, 142, 0.15)',
    borderColor: 'var(--color-success)',
    color: 'var(--color-success)',
    boxShadow: '0 0 10px rgba(62, 207, 142, 0.15)',
  },
  tfBtnSelectedFalse: {
    background: 'rgba(229, 72, 77, 0.15)',
    borderColor: 'var(--color-danger)',
    color: 'var(--color-danger)',
    boxShadow: '0 0 10px rgba(229, 72, 77, 0.15)',
  },
  mcOptionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '10px',
  },
  mcOptionBtn: {
    padding: '14px 18px',
    borderRadius: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    color: '#f3f4f6',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.2s ease',
  },
  mcOptionBtnSelected: {
    background: 'rgba(232, 147, 63, 0.15)',
    borderColor: 'var(--primary-color)',
    color: '#ffffff',
    boxShadow: 'var(--box-shadow-glow)',
  },
  writtenInput: {
    width: '100%',
  },
  submitTestBtn: {
    alignSelf: 'center',
    padding: '16px 36px',
    fontSize: '16px',
    borderRadius: '12px',
    marginTop: '20px',
    marginBottom: '60px',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #E8933F 0%, #E77950 100%)',
  },
  resultsArea: {
    maxWidth: '750px',
    margin: '0 auto',
    paddingBottom: '60px',
  },
  scoreReportCard: {
    padding: '40px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '40px',
  },
  scoreTitle: {
    fontSize: '28px',
    fontWeight: '800',
    marginTop: '16px',
    marginBottom: '4px',
  },
  scoreSubtitle: {
    color: '#99A1AC',
    fontSize: '15px',
    marginBottom: '32px',
  },
  scoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '40px',
    marginBottom: '32px',
  },
  scoreCirc: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.02)',
    padding: '16px 24px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.04)',
    minWidth: '130px',
  },
  finalScoreValue: {
    fontSize: '36px',
    fontWeight: '800',
  },
  finalScoreLabel: {
    fontSize: '11px',
    color: '#99A1AC',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  gradeLetterCirc: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.02)',
    padding: '16px 24px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.04)',
    minWidth: '130px',
  },
  finalLetterValue: {
    fontSize: '36px',
    fontWeight: '800',
  },
  finalLetterLabel: {
    fontSize: '11px',
    color: '#99A1AC',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  resultsCongrats: {
    fontSize: '15px',
    color: '#F4F5F7',
    maxWidth: '500px',
    lineHeight: '1.6',
    marginBottom: '36px',
  },
  reportActionRow: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  gabaritoHeader: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '20px',
  },
  gabaritoItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '14px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '8px',
    width: '100%',
  },
  gabaritoStatusTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 12px',
    borderRadius: '100px',
    textTransform: 'uppercase',
  },
  gabaritoComparisonBox: {
    background: 'rgba(0,0,0,0.15)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  gabaritoUserAns: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    flexWrap: 'wrap',
  },
  gabaritoExpectedAns: {
    display: 'flex',
    gap: '8px',
    fontSize: '14px',
    flexWrap: 'wrap',
    borderTop: '1px solid rgba(255,255,255,0.03)',
    paddingTop: '8px',
  },
  gabaritoLabel: {
    color: '#99A1AC',
    fontWeight: '500',
  }
};

/* Folha de estilos extra para os hovers de múltipla escolha e simulado */
const extraTestStyles = `
.tfBtn:hover:not(:disabled) {
  background: rgba(255,255,255,0.06) !important;
}
.mcOptionBtn:hover:not(:disabled) {
  background: rgba(255,255,255,0.06) !important;
  transform: translateX(4px);
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraTestStyles;
  document.head.appendChild(styleSheet);
}

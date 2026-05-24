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
import { ArrowLeft, CheckCircle2, XCircle, Award, FileText, Send, RotateCcw } from 'lucide-react';

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
      let type = 'written';
      let options = [];
      let promptText = '';
      let isAssociationCorrect = true; // Usado apenas no tipo Verdadeiro/Falso
      let statementDefinition = '';    // Usado apenas no tipo Verdadeiro/Falso

      if (typeIndex === 0) {
        // --- QUESTÃO TIPO VERDADEIRO OU FALSO ---
        type = 'true-false';
        
        // Decidimos aleatoriamente se faremos uma afirmação verdadeira ou falsa
        isAssociationCorrect = Math.random() > 0.5;
        
        if (isAssociationCorrect) {
          // Associação Correta: Termo bate com sua própria definição
          statementDefinition = card.definition;
        } else {
          // Associação Falsa: Termo associado à definição de outro cartão
          const otherCards = set.cards.filter(c => c.id !== card.id);
          if (otherCards.length > 0) {
            const randomCard = otherCards[Math.floor(Math.random() * otherCards.length)];
            statementDefinition = randomCard.definition;
          } else {
            // Queda de segurança se tiver apenas 1 cartão no baralho (afirmação verdadeira por falta de outra)
            statementDefinition = card.definition;
            isAssociationCorrect = true;
          }
        }
        
        promptText = `O termo "${card.term}" significa "${statementDefinition}"?`;

      } else if (typeIndex === 1 && set.cards.length >= 2) {
        // --- QUESTÃO TIPO MÚLTIPLA ESCOLHA ---
        type = 'multiple-choice';
        promptText = `Qual é a definição correta para "${card.term}"?`;
        
        // Sorteia até 3 definições falsas
        const otherCards = set.cards.filter(c => c.id !== card.id);
        const wrongCards = [...otherCards]
          .sort(() => Math.random() - 0.5)
          .slice(0, Math.min(3, otherCards.length));
        
        // Junta a correta com as erradas e embaralha a ordem final das alternativas
        options = [card, ...wrongCards].sort(() => Math.random() - 0.5);

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
        image: card.image || '', // Salva a imagem da resposta correta para usar no gabarito
        prompt: promptText,
        options: options,
        isAssociationCorrect: isAssociationCorrect, // Se a afirmação V/F era verdadeira
        userAnswer: '', // Resposta vazia que o usuário irá preencher
      };
    });

    setQuestions(generatedQuestions);
    setIsSubmitted(false);
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
    FUNÇÃO INTERNA: handleSubmit
    PARA QUE SERVE: Dispara ao clicar em "Entregar Prova". Roda o corretor automático:
      - Para V/F: Checa se a escolha bate com a veracidade da afirmação.
      - Para Múltipla Escolha: Checa se o ID da alternativa bate.
      - Para Dissertativa: Compara os textos sem importar letras maiúsculas/minúsculas 
        ou espaços extras!
    Ao final, calcula a porcentagem e o conceito de nota.
  */
  const handleSubmit = () => {
    let correctCount = 0;

    questions.forEach(q => {
      if (q.type === 'true-false') {
        // Para V/F, a resposta do usuário é 'true' ou 'false'
        const expected = q.isAssociationCorrect ? 'true' : 'false';
        if (q.userAnswer === expected) {
          correctCount++;
        }
      } else if (q.type === 'multiple-choice') {
        // Para múltipla escolha, a resposta do usuário é o ID do cartão selecionado
        if (q.userAnswer === q.cardId) {
          correctCount++;
        }
      } else if (q.type === 'written') {
        // Para escrita, comparamos o texto normalizado (caixa baixa e sem espaços nas pontas)
        const userText = q.userAnswer.trim().toLowerCase();
        const correctText = q.correctDefinition.trim().toLowerCase();
        if (userText === correctText) {
          correctCount++;
        }
      }
    });

    const percent = Math.round((correctCount / questions.length) * 100);
    setScorePercent(percent);

    // Atribuição clássica de conceito de nota acadêmica
    let grade = 'F';
    if (percent === 100) grade = 'A+';
    else if (percent >= 90) grade = 'A';
    else if (percent >= 80) grade = 'B';
    else if (percent >= 70) grade = 'C';
    else if (percent >= 60) grade = 'D';

    setLetterGrade(grade);
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
                                  background: '#090d16',
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
              // Lógica de correção para mostrar se o usuário acertou esta questão individual
              let isCorrect = false;
              let userFriendlyAnswer = '';
              let userFriendlyExpected = '';

              if (q.type === 'true-false') {
                const expected = q.isAssociationCorrect ? 'true' : 'false';
                isCorrect = q.userAnswer === expected;
                userFriendlyAnswer = q.userAnswer === 'true' ? 'Verdadeiro' : q.userAnswer === 'false' ? 'Falso' : '(Não respondido)';
                userFriendlyExpected = q.isAssociationCorrect ? 'Verdadeiro' : 'Falso';
              } else if (q.type === 'multiple-choice') {
                isCorrect = q.userAnswer === q.cardId;
                const chosenOpt = q.options.find(opt => opt.id === q.userAnswer);
                userFriendlyAnswer = chosenOpt ? chosenOpt.definition : '(Não respondido)';
                userFriendlyExpected = q.correctDefinition;
              } else if (q.type === 'written') {
                isCorrect = q.userAnswer.trim().toLowerCase() === q.correctDefinition.trim().toLowerCase();
                userFriendlyAnswer = q.userAnswer.trim() || '(Não respondido)';
                userFriendlyExpected = q.correctDefinition;
              }

              return (
                <div 
                  key={q.id} 
                  style={{ 
                    ...styles.questionCard, 
                    borderLeft: `5px solid ${isCorrect ? 'var(--color-success)' : 'var(--color-danger)'}`
                  }} 
                  className="glass-panel"
                >
                  <div style={styles.gabaritoItemHeader}>
                    <span style={styles.questionNumber}>Questão {idx + 1}</span>
                    <span style={{ 
                      ...styles.gabaritoStatusTag, 
                      color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                      background: isCorrect ? 'rgba(16, 185, 129, 0.1)' : 'rgba(244, 63, 94, 0.1)'
                    }}>
                      {isCorrect ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      {isCorrect ? 'Acertou' : 'Errou'}
                    </span>
                  </div>

                  <p style={styles.questionPrompt}>{q.prompt}</p>

                  <div style={styles.gabaritoComparisonBox}>
                    <div style={styles.gabaritoUserAns}>
                      <span style={styles.gabaritoLabel}>Sua Resposta:</span>
                      <strong style={{ color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>
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
                            background: '#090d16',
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
    color: '#94a3b8',
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
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  questionTypeTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#6366f1',
    background: 'rgba(99, 102, 241, 0.08)',
    padding: '4px 10px',
    borderRadius: '100px',
  },
  questionPrompt: {
    fontSize: '17px',
    fontWeight: '700',
    color: '#f8fafc',
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
    background: 'rgba(16, 185, 129, 0.15)',
    borderColor: 'var(--color-success)',
    color: 'var(--color-success)',
    boxShadow: '0 0 10px rgba(16, 185, 129, 0.15)',
  },
  tfBtnSelectedFalse: {
    background: 'rgba(244, 63, 94, 0.15)',
    borderColor: 'var(--color-danger)',
    color: 'var(--color-danger)',
    boxShadow: '0 0 10px rgba(244, 63, 94, 0.15)',
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
    background: 'rgba(99, 102, 241, 0.15)',
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
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
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
    color: '#94a3b8',
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
    color: '#94a3b8',
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
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: '2px',
  },
  resultsCongrats: {
    fontSize: '15px',
    color: '#f8fafc',
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
    color: '#94a3b8',
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

/*
  =============================================================================
  ARQUIVO: src/pages/LearnMode.jsx
  PARA QUE SERVE: Esta é a tela do "Modo Aprender". Ele transforma seu baralho de 
  estudos em um teste de múltipla escolha inteligente gerado automaticamente! 
  Para cada cartão, ele exibe o Termo e gera 4 alternativas (sendo 1 correta e 3 erradas, 
  sorteadas de outros cartões). O app pisca em verde se você acertar, ou em vermelho se 
  errar (mostrando qual era a resposta certa). Ao final, você ganha uma nota e pode 
  reestudar apenas as perguntas que errou!
  =============================================================================
*/

import React, { useState, useEffect } from 'react';
// A montagem das alternativas mora num arquivo sem tela (questoesCore), que é
// conferido por `npm run testar`. É ele que impede a prova de mostrar duas
// alternativas iguais — uma valendo ponto e a outra não.
import { montarMultiplaEscolha } from '../estudo/questoesCore.js';
// Importamos ícones elegantes para enriquecer a experiência de quiz
import { ArrowLeft, RotateCcw, Check, X, Award, AlertTriangle, ArrowRight } from 'lucide-react';

/*
  COMPONENTE: LearnMode
  PARAMETROS (PROPS) QUE RECEBE:
    - set: O baralho de estudos selecionado.
    - onNavigate: Função para voltar ao Painel.
    - onCompleteSession: Função para registrar a conclusão do estudo no LocalStorage.
*/
export default function LearnMode({ set, onNavigate, onCompleteSession }) {
  // 1. ESTADOS DO MODO APRENDER
  const [cardsToStudy, setCardsToStudy] = useState([]); // Fila de cartões desta rodada
  const [currentIndex, setCurrentIndex] = useState(0);  // Índice da pergunta atual
  const [selectedOptionId, setSelectedOptionId] = useState(null); // ID do cartão escolhido pelo usuário
  const [isAnswered, setIsAnswered] = useState(false);  // Se o usuário já respondeu a pergunta atual
  
  // Opções de múltipla escolha para a pergunta atual
  const [currentOptions, setCurrentOptions] = useState([]);

  // Resultados locais da sessão
  const [correctIds, setCorrectIds] = useState([]);     // Cartões que acertou de primeira
  const [incorrectIds, setIncorrectIds] = useState([]); // Cartões que errou

  const [isFinished, setIsFinished] = useState(false);  // Indica se terminou todas as perguntas
  const [lightboxImage, setLightboxImage] = useState(null); // Estado para controlar a imagem em zoom (lightbox)

  // 2. INICIALIZAÇÃO E EMBARALHAMENTO DO BARALHO:
  // Carrega os cartões originais e monta a primeira pergunta.
  useEffect(() => {
    if (set && set.cards && set.cards.length > 0) {
      // Embaralha os cartões para a ordem de perguntas ser sempre diferente e desafiadora!
      const shuffled = [...set.cards].sort(() => Math.random() - 0.5);
      setCardsToStudy(shuffled);
      setCurrentIndex(0);
      setSelectedOptionId(null);
      setIsAnswered(false);
      setCorrectIds([]);
      setIncorrectIds([]);
      setIsFinished(false);
    }
  }, [set]);

  // 3. GERAÇÃO DINÂMICA DAS ALTERNATIVAS:
  // Toda vez que mudamos de pergunta (currentIndex), geramos 4 opções de resposta.
  useEffect(() => {
    if (cardsToStudy.length === 0 || currentIndex >= cardsToStudy.length) return;

    const currentCard = cardsToStudy[currentIndex];

    // Monta as 4 alternativas JÁ embaralhadas e sem repetição: as definições
    // iguais à resposta certa (o mesmo conceito escrito de outro jeito em outro
    // cartão) são descartadas, para você nunca ver duas opções idênticas com
    // uma valendo ponto e a outra valendo erro.
    const questao = montarMultiplaEscolha(currentCard, set.cards);

    // Baralho em que todas as definições são a mesma coisa: não há alternativa
    // errada honesta para oferecer, então mostramos só a certa.
    setCurrentOptions(questao ? questao.opcoes : [currentCard]);
    setSelectedOptionId(null);
    setIsAnswered(false);
  }, [currentIndex, cardsToStudy, set.cards]);

  /*
    FUNÇÃO INTERNA: handleOptionSelect
    PARA QUE SERVE: É acionada quando o usuário clica em uma das alternativas.
    Verifica se a opção escolhida bate com o cartão correto e ativa o estado visual de resposta.
  */
  const handleOptionSelect = (optionId) => {
    if (isAnswered) return; // Impede clicar duas vezes na mesma pergunta

    setSelectedOptionId(optionId);
    setIsAnswered(true);

    const currentCard = cardsToStudy[currentIndex];
    
    if (optionId === currentCard.id) {
      // ACERTOU! Adiciona o ID do cartão na lista de corretos
      setCorrectIds(prev => [...prev, currentCard.id]);
    } else {
      // ERROU! Adiciona o ID na lista de incorretos
      setIncorrectIds(prev => [...prev, currentCard.id]);
    }
  };

  /*
    FUNÇÃO INTERNA: handleNext
    PARA QUE SERVE: Avança para o próximo cartão de estudos. Se não houver mais, finaliza.
  */
  const handleNext = () => {
    if (currentIndex + 1 < cardsToStudy.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
      onCompleteSession(); // Adiciona +1 nas sessões de estudo gerais do usuário
    }
  };

  /*
    FUNÇÃO INTERNA: restartLearn
    PARA QUE SERVE: Reinicia o modo de escolha inteligente embaralhando tudo de novo.
  */
  const restartLearn = () => {
    const shuffled = [...set.cards].sort(() => Math.random() - 0.5);
    setCardsToStudy(shuffled);
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setCorrectIds([]);
    setIncorrectIds([]);
    setIsFinished(false);
  };

  /*
    FUNÇÃO INTERNA: studyOnlyIncorrect
    PARA QUE SERVE: Filtra apenas as perguntas que você errou na rodada anterior
    e cria um mini-quiz rápido de reforço!
  */
  const studyOnlyIncorrect = () => {
    const wrongCards = set.cards.filter(c => incorrectIds.includes(c.id));
    if (wrongCards.length === 0) return;

    setCardsToStudy(wrongCards.sort(() => Math.random() - 0.5));
    setCurrentIndex(0);
    setSelectedOptionId(null);
    setIsAnswered(false);
    setCorrectIds([]);
    setIncorrectIds([]);
    setIsFinished(false);
  };

  // Tratamento de segurança caso o baralho seja inválido
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

  const currentCard = cardsToStudy[currentIndex];
  const progressPercent = cardsToStudy.length > 0 ? ((currentIndex / cardsToStudy.length) * 100) : 0;

  return (
    <div className="app-container">
      
      {/* CABEÇALHO DO MODO APRENDER */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        <h2 style={styles.setTitle}>🧠 Modo Aprender: {set.title}</h2>
      </header>

      {!isFinished ? (
        // -----------------------------------------------------------------------------
        // TELA DE PERGUNTAS ATIVA
        // -----------------------------------------------------------------------------
        <div style={styles.quizArea}>
          
          {/* BARRA DE PROGRESSO */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }} />
            </div>
            <div style={styles.progressLabelRow}>
              <span style={styles.progressText}>Pergunta {currentIndex + 1} de {cardsToStudy.length}</span>
              <span style={styles.accuracyText}>Acertos: {correctIds.length} | Erros: {incorrectIds.length}</span>
            </div>
          </div>

          {/* PERGUNTA (TERMO) */}
          <div style={styles.questionPanel} className="glass-panel">
            <span style={styles.panelCategory}>Qual é a definição correta para o termo abaixo?</span>
            <h3 style={styles.questionText}>{currentCard?.term}</h3>
          </div>

          {/* LISTAGEM DE ALTERNATIVAS */}
          <div style={styles.optionsList}>
            {currentOptions.map((option, index) => {
              // Lógicas para pintar as cores corretas/erradas ao responder
              const isCorrectOption = option.id === currentCard.id;
              const isClickedOption = option.id === selectedOptionId;
              
              let buttonStyle = { ...styles.optionButton };
              let iconElement = null;
              let classEffect = '';

              if (isAnswered) {
                if (isCorrectOption) {
                  // Pinta a correta de VERDE, seja se ela foi clicada ou não!
                  buttonStyle = { ...buttonStyle, ...styles.correctBtnStyle };
                  iconElement = <Check size={18} />;
                  if (isClickedOption) classEffect = 'animate-success';
                } else if (isClickedOption) {
                  // Pinta a errada clicada de VERMELHO
                  buttonStyle = { ...buttonStyle, ...styles.wrongBtnStyle };
                  iconElement = <X size={18} />;
                  classEffect = 'animate-shake';
                } else {
                  // Deixa as outras opções erradas e não clicadas meio apagadinhas
                  buttonStyle = { ...buttonStyle, opacity: 0.35 };
                }
              }

              return (
                <button
                  key={option.id}
                  onClick={() => handleOptionSelect(option.id)}
                  style={buttonStyle}
                  className={`option-btn-hover ${classEffect}`}
                  disabled={isAnswered}
                >
                  <div style={styles.optionContent}>
                    {/* Número da Alternativa (A, B, C, D) */}
                    <span style={styles.optionIndex}>
                      {String.fromCharCode(65 + index)}
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <span style={styles.optionVal}>{option.definition}</span>
                      {option.image && (
                        <img 
                          src={option.image} 
                          alt="Miniatura" 
                          style={{
                            height: '36px',
                            width: 'auto',
                            maxWidth: '120px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            objectFit: 'contain',
                            background: '#0B0C0E',
                            alignSelf: 'flex-start',
                            cursor: 'zoom-in',
                          }} 
                          onClick={(e) => {
                            e.stopPropagation(); // Impede de marcar a alternativa ao clicar na imagem!
                            setLightboxImage(option.image);
                          }}
                          title="Clique para ampliar a imagem"
                        />
                      )}
                    </div>
                  </div>
                  {iconElement}
                </button>
              );
            })}
          </div>

          {/* BOTÃO DE AVANÇAR (Aparece apenas após responder) */}
          {isAnswered && (
            <button 
              onClick={handleNext} 
              className="btn-primary animate-success" 
              style={styles.nextBtn}
            >
              Avançar
              <ArrowRight size={18} />
            </button>
          )}

        </div>
      ) : (
        // -----------------------------------------------------------------------------
        // TELA DE RELATÓRIO DE FIM DE SESSÃO
        // -----------------------------------------------------------------------------
        <div style={styles.finishedCard} className="glass-panel animate-success">
          <Award size={64} style={styles.awardIcon} />
          
          <h2 style={styles.finishedTitle}>Quiz Concluído! 🏆</h2>
          <p style={styles.finishedSubtitle}>Você respondeu todas as perguntas do modo aprender.</p>

          {/* Estatísticas detalhadas */}
          <div style={styles.scoreBoard}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreVal}>{correctIds.length}</span>
              <span style={styles.scoreLabel}>Acertos</span>
            </div>
            <div style={styles.scoreDivider} />
            <div style={styles.scoreItem}>
              <span style={{ ...styles.scoreVal, color: 'var(--color-danger)' }}>{incorrectIds.length}</span>
              <span style={styles.scoreLabel}>Erros</span>
            </div>
          </div>

          {/* Barra de acerto percentual */}
          <div style={styles.masteryProgressBlock}>
            <div style={styles.masteryMeta}>
              <span>Aproveitamento:</span>
              <strong>{Math.round((correctIds.length / cardsToStudy.length) * 100)}%</strong>
            </div>
            <div style={styles.masteryBarBg}>
              <div 
                style={{ 
                  ...styles.masteryBarFill, 
                  width: `${(correctIds.length / cardsToStudy.length) * 100}%` 
                }} 
              />
            </div>
          </div>

          {/* Ações finais */}
          <div style={styles.finishedActions}>
            {/* Reestudar Incorretos (se existirem) */}
            <button 
              onClick={studyOnlyIncorrect} 
              className="btn-primary" 
              style={{ 
                ...styles.studyHardBtn, 
                display: incorrectIds.length > 0 ? 'inline-flex' : 'none' 
              }}
            >
              <RotateCcw size={18} />
              Reestudar Incorretas ({incorrectIds.length})
            </button>

            {/* Recomeçar tudo */}
            <button onClick={restartLearn} className="btn-secondary" style={styles.restartAllBtn}>
              <RotateCcw size={18} />
              Recomeçar Quiz Completo
            </button>

            {/* Voltar */}
            <button onClick={() => onNavigate('dashboard')} className="btn-secondary" style={styles.finishBackBtn}>
              Voltar ao Painel
            </button>
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
// ESTILOS LOCAIS DO MODO APRENDER
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
  quizArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
    width: '100%',
    maxWidth: '700px',
    margin: '0 auto',
  },
  progressContainer: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  progressBarBg: {
    width: '100%',
    height: '6px',
    background: '#22252B',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #E8933F 0%, #E77950 100%)',
    borderRadius: '10px',
    transition: 'width 0.3s ease',
  },
  progressLabelRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#99A1AC',
    fontWeight: '600',
  },
  progressText: {
    color: '#99A1AC',
  },
  accuracyText: {
    color: '#99A1AC',
  },
  questionPanel: {
    width: '100%',
    padding: '40px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  panelCategory: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#E77950',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  questionText: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#ffffff',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  },
  optionsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
  },
  optionButton: {
    background: 'rgba(21, 23, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '12px',
    padding: '16px 20px',
    color: '#f3f4f6',
    cursor: 'pointer',
    textAlign: 'left',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    transition: 'all 0.25s ease',
    minHeight: '62px',
  },
  optionContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    flex: '1',
  },
  optionIndex: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '13px',
    fontWeight: '700',
    color: '#99A1AC',
  },
  optionVal: {
    fontSize: '15px',
    fontWeight: '600',
    lineHeight: '1.4',
    textAlign: 'left',
  },
  correctBtnStyle: {
    background: 'rgba(62, 207, 142, 0.15)',
    borderColor: '#3ECF8E',
    color: '#3ECF8E',
    boxShadow: '0 0 10px rgba(62, 207, 142, 0.15)',
  },
  wrongBtnStyle: {
    background: 'rgba(229, 72, 77, 0.15)',
    borderColor: '#E5484D',
    color: '#E5484D',
    boxShadow: '0 0 10px rgba(229, 72, 77, 0.15)',
  },
  nextBtn: {
    alignSelf: 'flex-end',
    padding: '12px 24px',
    fontSize: '15px',
    marginTop: '10px',
    borderRadius: '10px',
    animation: 'fadeIn 0.2s ease',
  },
  finishedCard: {
    maxWidth: '600px',
    margin: '40px auto 0 auto',
    padding: '40px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  awardIcon: {
    color: '#EEA53D',
    marginBottom: '20px',
    filter: 'drop-shadow(0 0 10px rgba(238, 165, 61, 0.3))',
  },
  finishedTitle: {
    fontSize: '28px',
    fontWeight: '800',
    marginBottom: '6px',
  },
  finishedSubtitle: {
    color: '#99A1AC',
    fontSize: '15px',
    marginBottom: '32px',
  },
  scoreBoard: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '40px',
    marginBottom: '32px',
    width: '100%',
  },
  scoreItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  scoreVal: {
    fontSize: '36px',
    fontWeight: '800',
    color: 'var(--color-success)',
  },
  scoreLabel: {
    fontSize: '12px',
    color: '#99A1AC',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginTop: '4px',
  },
  scoreDivider: {
    width: '1px',
    height: '50px',
    background: 'rgba(255, 255, 255, 0.08)',
  },
  masteryProgressBlock: {
    width: '100%',
    maxWidth: '400px',
    marginBottom: '40px',
  },
  masteryMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#99A1AC',
    marginBottom: '8px',
  },
  masteryBarBg: {
    width: '100%',
    height: '8px',
    background: '#22252B',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  masteryBarFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #3ECF8E 0%, #2FAF78 100%)',
    borderRadius: '10px',
  },
  finishedActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '400px',
  },
  studyHardBtn: {
    justifyContent: 'center',
    width: '100%',
    padding: '14px 20px',
  },
  restartAllBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '14px 20px',
  },
  finishBackBtn: {
    width: '100%',
    justifyContent: 'center',
    padding: '14px 20px',
    background: 'transparent',
    borderColor: 'transparent',
    color: '#99A1AC',
  }
};

/* Folha de estilos extra para animações de hover de botões de opções do quiz */
const extraQuizStyles = `
.option-btn-hover:hover:not(:disabled) {
  background: var(--bg-tertiary) !important;
  border-color: var(--primary-color) !important;
  transform: translateX(4px);
}
.option-btn-hover:hover:not(:disabled) .optionIndex {
  background: var(--primary-color) !important;
  color: white !important;
}
@media (max-width: 768px) {
  .questionText {
    font-size: 20px !important;
  }
  .optionVal {
    font-size: 14px !important;
  }
  .optionButton {
    padding: 12px 14px !important;
    min-height: 52px !important;
  }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraQuizStyles;
  document.head.appendChild(styleSheet);
}

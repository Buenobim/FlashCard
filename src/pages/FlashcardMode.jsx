/*
  =============================================================================
  ARQUIVO: src/pages/FlashcardMode.jsx
  PARA QUE SERVE: Esta é a tela do "Estudo Clássico por Flashcards". Nela, os cartões 
  são exibidos individualmente. Você clica ou aperta a Barra de Espaço para virar o cartão 
  em 3D de forma muito realista, exibindo a definição por trás. 
  Depois de virar, você diz se já sabe o termo ("Sei Tudo" - seta direita) ou se ainda 
  está com dificuldades ("Ainda Aprendendo" - seta esquerda). Ao final, mostra um relatório 
  com opção premium de reestudar apenas os cartões que você errou!
  =============================================================================
*/

import React, { useState, useEffect, useCallback, useRef } from 'react';
// Importamos ícones elegantes do Lucide para enriquecer o painel de estudo
import { 
  ArrowLeft, 
  RotateCcw, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Award, 
  Flame, 
  Lightbulb, 
  AlertCircle
} from 'lucide-react';

/*
  COMPONENTE: FlashcardMode
  PARAMETROS (PROPS) QUE RECEBE:
    - set: O baralho de estudos selecionado.
    - onNavigate: Função para voltar ao Painel.
    - onCompleteSession: Função para somar +1 nas sessões concluídas gerais.
*/
export default function FlashcardMode({ set, onNavigate, onCompleteSession }) {
  // 1. ESTADOS DO MODO DE ESTUDO
  const [cardsToStudy, setCardsToStudy] = useState([]); // Cartões que fazem parte da rodada atual
  const [currentIndex, setCurrentIndex] = useState(0);  // Índice do cartão atual que está na tela
  const [flipped, setFlipped] = useState(false);        // Guarda se o cartão está de frente (false) ou de costas (true)
  
  // Categorias de aprendizado nesta sessão
  const [learnedIds, setLearnedIds] = useState([]);     // IDs dos cartões que o usuário sabe (Sei Tudo)
  const [learningIds, setLearningIds] = useState([]);   // IDs dos cartões que o usuário errou (Ainda Aprendendo)
  
  const [isFinished, setIsFinished] = useState(false);  // Se a rodada atual acabou
  const [onlyHardMode, setOnlyHardMode] = useState(false); // Se o usuário está reestudando apenas os difíceis
  const [lightboxImage, setLightboxImage] = useState(null); // Estado para a imagem em zoom (lightbox)

  /*
    A TRAVA DA VIRADA (o conserto do "cartão que sumiu sem você ver")

    Trocar de cartão leva 200 milissegundos (o tempo da animação). Antes, tudo o
    que acontecesse nesses 200 ms entrava na fila: dois cliques rápidos, a seta
    do teclado segurada, o clique duplo sem querer — cada um agendava um avanço.
    Resultado: o cartão B era marcado e pulado sem nunca aparecer, e a resposta
    ia para o cartão errado.

    Estas duas travas resolvem: enquanto a virada está acontecendo, nenhum novo
    avanço é aceito; e o relógio é cancelado ao sair da tela, para não trocar de
    cartão de uma tela que nem existe mais.
  */
  const viradaEmAndamento = useRef(false);
  const relogioDaVirada = useRef(null);

  // Ao sair da tela, cancela qualquer troca de cartão que estivesse agendada.
  useEffect(() => {
    return () => {
      if (relogioDaVirada.current) clearTimeout(relogioDaVirada.current);
    };
  }, []);

  // 2. INICIALIZAÇÃO DO BARALHO:
  // Quando a página carrega, preenchemos nossa fila de estudos com todos os cartões do baralho selecionado.
  useEffect(() => {
    if (set && set.cards) {
      setCardsToStudy(set.cards);
      setCurrentIndex(0);
      setFlipped(false);
      setLearnedIds([]);
      setLearningIds([]);
      setIsFinished(false);
      setOnlyHardMode(false);
    }
  }, [set]);

  /*
    FUNÇÃO INTERNA: handleFlip
    PARA QUE SERVE: Vira o cartão (se estava de frente, vai para trás; se estava atrás, volta para a frente).
  */
  const handleFlip = useCallback(() => {
    setFlipped(prev => !prev);
  }, []);

  /*
    FUNÇÃO INTERNA: handleNextCard
    PARA QUE SERVE: Avança para o próximo cartão. Se chegarmos ao fim do baralho, ativa a tela de resultados.
  */
  const handleNextCard = useCallback((status) => {
    // Uma resposta = um avanço. O que chegar durante a virada é ignorado.
    if (viradaEmAndamento.current) return;
    const currentCard = cardsToStudy[currentIndex];
    if (!currentCard) return;
    viradaEmAndamento.current = true;

    // Atualiza as gavetas temporárias de acerto/erro
    if (status === 'learned') {
      // Se marcou que já sabe, remove dos "difíceis" e adiciona nos "dominados"
      setLearnedIds(prev => [...prev.filter(id => id !== currentCard.id), currentCard.id]);
      setLearningIds(prev => prev.filter(id => id !== currentCard.id));
    } else if (status === 'learning') {
      // Se marcou que ainda está aprendendo, remove dos dominados e adiciona nos difíceis
      setLearningIds(prev => [...prev.filter(id => id !== currentCard.id), currentCard.id]);
      setLearnedIds(prev => prev.filter(id => id !== currentCard.id));
    }

    // Espera virar de frente antes de pular para o próximo cartão, dando um efeito visual suave
    setFlipped(false);
    
    relogioDaVirada.current = setTimeout(() => {
      if (currentIndex + 1 < cardsToStudy.length) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // Chegamos ao fim da rodada!
        setIsFinished(true);
        // Registra nas estatísticas gerais que o usuário concluiu um baralho
        onCompleteSession();
      }
      viradaEmAndamento.current = false; // libera o próximo avanço
    }, 200); // 200 milissegundos é o tempo do cartão desvirar antes de trocar de texto
  }, [currentIndex, cardsToStudy, onCompleteSession]);

  /*
    FUNÇÃO INTERNA: handlePreviousCard
    PARA QUE SERVE: Permite voltar ao cartão anterior caso o usuário queira revisar.
  */
  const handlePreviousCard = () => {
    if (viradaEmAndamento.current) return; // mesma trava do avanço
    if (currentIndex > 0) {
      viradaEmAndamento.current = true;
      setFlipped(false);
      relogioDaVirada.current = setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        viradaEmAndamento.current = false;
      }, 200);
    }
  };

  /*
    ATALHOS DE TECLADO (Física Interativa do Computador):
    Escuta as teclas pressionadas pelo usuário:
      - Barra de Espaço ou Seta Cima/Baixo -> Vira o Cartão
      - Seta Esquerda -> Marca como "Ainda Aprendendo" (Errou)
      - Seta Direita -> Marca como "Sei Tudo" (Acertou)
  */
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (isFinished) return;
      // Tecla SEGURADA dispara dezenas de eventos por segundo: aqui ela vale
      // como um toque só (event.repeat é o aviso de "ainda é a mesma tecla").
      if (event.repeat) return;

      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'ArrowDown') {
        event.preventDefault(); // Impede a página de rolar para baixo com o espaço
        handleFlip();
      } else if (event.code === 'ArrowLeft') {
        event.preventDefault();
        handleNextCard('learning');
      } else if (event.code === 'ArrowRight') {
        event.preventDefault();
        handleNextCard('learned');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      // Remove o escutador ao sair da tela para não bugar outras páginas
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFinished, handleFlip, handleNextCard]);

  /*
    FUNÇÃO INTERNA: restartStudy
    PARA QUE SERVE: Reinicia o estudo de todos os cartões originais do baralho do zero.
  */
  const restartStudy = () => {
    viradaEmAndamento.current = false;
    setCardsToStudy(set.cards);
    setCurrentIndex(0);
    setFlipped(false);
    setLearnedIds([]);
    setLearningIds([]);
    setIsFinished(false);
    setOnlyHardMode(false);
  };

  /*
    FUNÇÃO INTERNA: studyOnlyHard
    PARA QUE SERVE: (Recurso Premium) Pega apenas os cartões que o usuário errou 
    ("Ainda Aprendendo") na rodada anterior e gera uma nova rodada focada neles!
  */
  const studyOnlyHard = () => {
    const hardCards = set.cards.filter(card => learningIds.includes(card.id));
    if (hardCards.length === 0) return;

    viradaEmAndamento.current = false;
    setCardsToStudy(hardCards);
    setCurrentIndex(0);
    setFlipped(false);
    setLearnedIds([]);
    setLearningIds([]);
    setIsFinished(false);
    setOnlyHardMode(true);
  };

  // Se o baralho de alguma forma for inválido, exibe erro de segurança
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

  // Cartão que está ativo na tela no momento
  const currentCard = cardsToStudy[currentIndex];

  // Cálculo da porcentagem de progresso geral
  const progressPercent = cardsToStudy.length > 0 ? ((currentIndex / cardsToStudy.length) * 100) : 0;

  return (
    <div className="app-container">
      
      {/* CABEÇALHO DO MODO FLASHCARD */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Voltar
        </button>
        
        <div style={styles.headerMeta}>
          <h2 style={styles.setTitle}>{set.title}</h2>
          {onlyHardMode && (
            <span style={styles.hardBadge}>
              <AlertCircle size={12} /> Estudando apenas os Difíceis
            </span>
          )}
        </div>
      </header>

      {!isFinished ? (
        // -----------------------------------------------------------------------------
        // TELA DE ESTUDO ATIVO (VIRAR E MARCAR)
        // -----------------------------------------------------------------------------
        <div style={styles.studyArea}>
          
          {/* BARRA DE PROGRESSO FLUIDA */}
          <div style={styles.progressContainer}>
            <div style={styles.progressBarBg}>
              <div style={{ ...styles.progressBarFill, width: `${progressPercent}%` }} />
            </div>
            <span style={styles.progressText}>
              Cartão {currentIndex + 1} de {cardsToStudy.length}
            </span>
          </div>

          {/* CONTADORES VISUAIS DE SESSÃO */}
          <div style={styles.sessionStats}>
            <span style={{ ...styles.sessionStatBadge, borderBottom: '3px solid var(--color-danger)' }}>
              <X size={14} color="var(--color-danger)" />
              Ainda Aprendendo: <strong>{learningIds.length}</strong>
            </span>
            <span style={{ ...styles.sessionStatBadge, borderBottom: '3px solid var(--color-success)' }}>
              <Check size={14} color="var(--color-success)" />
              Sei Tudo: <strong>{learnedIds.length}</strong>
            </span>
          </div>

          {/* O CARTÃO 3D (ONDE A MÁGICA VISUAL ACONTECE) */}
          <div className="flip-card-container" onClick={handleFlip}>
            <div className={`flip-card-inner ${flipped ? 'flipped' : ''}`}>
              
              {/* Lado da Frente (Termo / Pergunta) */}
              <div className="flip-card-front">
                <p style={styles.cardContentText}>{currentCard?.term}</p>
              </div>

              {/* Lado de Trás (Definição / Resposta) */}
              <div className="flip-card-back">
                <div style={styles.cardInnerLayout}>
                  <p style={styles.cardContentText}>{currentCard?.definition}</p>
                  {currentCard?.image && (
                    <img 
                      src={currentCard.image} 
                      alt="Anexo da Resposta" 
                      style={{ ...styles.cardAttachedImg, cursor: 'zoom-in' }} 
                      onClick={(e) => {
                        e.stopPropagation(); // Impede o cartão de virar (flip) ao clicar na foto!
                        setLightboxImage(currentCard.image);
                      }}
                      title="Clique para ampliar a imagem"
                    />
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* BOTÕES DE CONTROLE INFERIOR */}
          <div style={styles.controlsArea}>
            {/* Voltar Cartão (Seta Esquerda) */}
            <button 
              onClick={handlePreviousCard} 
              style={styles.controlNavBtn}
              disabled={currentIndex === 0}
              title="Voltar para o cartão anterior"
            >
              <ChevronLeft size={22} />
            </button>

            {/* Marcar como "Ainda Aprendendo" (Vermelho) */}
            <button 
              onClick={() => handleNextCard('learning')} 
              style={styles.learningBtn}
              className="btn-swipe-learning"
              title="Ainda estou com dificuldades com este termo (Atalho: Seta Esquerda)"
            >
              <X size={20} />
              Ainda Aprendendo
            </button>

            {/* Marcar como "Sei Tudo" (Verde) */}
            <button 
              onClick={() => handleNextCard('learned')} 
              style={styles.learnedBtn}
              className="btn-swipe-learned"
              title="Já decorei e domino este termo! (Atalho: Seta Direita)"
            >
              <Check size={20} />
              Sei Tudo!
            </button>

            {/* Avançar Sem Marcar (Apenas Navegar) */}
            <button 
              onClick={() => handleNextCard('skip')} 
              style={styles.controlNavBtn}
              title="Avançar sem marcar classificação"
            >
              <ChevronRight size={22} />
            </button>
          </div>

          {/* INSTRUÇÃO DE ATALHO DO TECLADO */}
          <div style={styles.keyboardTip}>
            <Lightbulb size={14} color="var(--color-warning)" />
            <span>Dica do Teclado: <strong>Espaço</strong> para virar | <strong>Seta Esquerda</strong> para aprender | <strong>Seta Direita</strong> para dominar!</span>
          </div>

        </div>
      ) : (
        // -----------------------------------------------------------------------------
        // TELA DE CONCLUÍDO (RELATÓRIO DE DESEMPENHO)
        // -----------------------------------------------------------------------------
        <div style={styles.finishedCard} className="glass-panel animate-success">
          <Award size={64} style={styles.awardIcon} />
          
          <h2 style={styles.finishedTitle}>Excelente Trabalho! 🎉</h2>
          <p style={styles.finishedSubtitle}>Você concluiu esta rodada de estudos do baralho.</p>

          {/* Placar de Resultados */}
          <div style={styles.scoreBoard}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreVal}>{learnedIds.length}</span>
              <span style={styles.scoreLabel}>Termos Dominados</span>
            </div>
            <div style={styles.scoreDivider} />
            <div style={styles.scoreItem}>
              <span style={{ ...styles.scoreVal, color: 'var(--color-danger)' }}>{learningIds.length}</span>
              <span style={styles.scoreLabel}>Precisa Estudar</span>
            </div>
          </div>

          {/* Barra de Aproveitamento Percentual */}
          <div style={styles.masteryProgressBlock}>
            <div style={styles.masteryMeta}>
              <span>Aproveitamento Geral:</span>
              <strong>{Math.round((learnedIds.length / cardsToStudy.length) * 100)}%</strong>
            </div>
            <div style={styles.masteryBarBg}>
              <div 
                style={{ 
                  ...styles.masteryBarFill, 
                  width: `${(learnedIds.length / cardsToStudy.length) * 100}%` 
                }} 
              />
            </div>
          </div>

          {/* Botões de Ações de Fim de Sessão */}
          <div style={styles.finishedActions}>
            {/* Reestudar Apenas os Difíceis (Se existirem) */}
            <button 
              onClick={studyOnlyHard} 
              className="btn-primary" 
              style={{ 
                ...styles.studyHardBtn, 
                display: learningIds.length > 0 ? 'inline-flex' : 'none' 
              }}
            >
              <RotateCcw size={18} />
              Reestudar os Difíceis ({learningIds.length})
            </button>

            {/* Recomeçar Tudo */}
            <button onClick={restartStudy} className="btn-secondary" style={styles.restartAllBtn}>
              <RotateCcw size={18} />
              Recomeçar Baralho Completo
            </button>

            {/* Concluir e Voltar */}
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
// ESTILOS LOCAIS DO MODO FLASHCARD
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
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  setTitle: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
  },
  hardBadge: {
    background: 'rgba(238, 165, 61, 0.15)',
    color: '#EEA53D',
    fontSize: '11px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '100px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
  },
  studyArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '24px',
  },
  progressContainer: {
    width: '100%',
    maxWidth: '650px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
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
  progressText: {
    fontSize: '13px',
    color: '#99A1AC',
    fontWeight: '600',
  },
  sessionStats: {
    display: 'flex',
    gap: '16px',
    width: '100%',
    justifyContent: 'center',
  },
  sessionStatBadge: {
    background: '#15171A',
    padding: '6px 14px',
    borderRadius: '8px',
    fontSize: '12px',
    color: '#F4F5F7',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    fontWeight: '500',
  },
  cardContentText: {
    fontSize: 'clamp(18px, 4vw, 24px)',
    fontWeight: '700',
    color: '#ffffff',
    wordBreak: 'break-word',
    lineHeight: '1.4',
    margin: 'auto',
    padding: '10px 0',
  },
  cardInnerLayout: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    height: 'max-content',
    minHeight: '100%',
    width: '100%',
    padding: '20px 0',
    margin: 'auto',
  },
  cardAttachedImg: {
    maxHeight: '150px',
    maxWidth: '100%',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.3)',
    objectFit: 'contain',
    background: '#0B0C0E',
  },
  controlsArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '100%',
    maxWidth: '650px',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  controlNavBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '50%',
    width: '50px',
    height: '50px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    color: '#99A1AC',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  learningBtn: {
    background: 'rgba(229, 72, 77, 0.1)',
    color: '#E5484D',
    border: '1px solid rgba(229, 72, 77, 0.2)',
    borderRadius: '12px',
    padding: '14px 24px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '1 1 180px',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  learnedBtn: {
    background: 'rgba(62, 207, 142, 0.1)',
    color: '#3ECF8E',
    border: '1px solid rgba(62, 207, 142, 0.2)',
    borderRadius: '12px',
    padding: '14px 24px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: '1 1 180px',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  keyboardTip: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    color: '#7A828E',
    marginTop: '10px',
    textAlign: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
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

/* Folha de estilos extra para animações de hover e responsividade móvel de flashcards */
const extraFlashcardStyles = `
.btn-swipe-learning:hover {
  background: var(--color-danger) !important;
  color: white !important;
  transform: translateY(-2px);
}
.btn-swipe-learned:hover {
  background: var(--color-success) !important;
  color: white !important;
  transform: translateY(-2px);
}
.controlNavBtn:hover:not(:disabled) {
  background: rgba(255,255,255,0.08) !important;
  color: white !important;
}
@media (max-width: 768px) {
  .controlNavBtn {
    width: 44px !important;
    height: 44px !important;
  }
  .learningBtn, .learnedBtn {
    padding: 12px 16px !important;
    font-size: 13px !important;
  }
  .cardContentText {
    font-size: 22px !important;
  }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraFlashcardStyles;
  document.head.appendChild(styleSheet);
}

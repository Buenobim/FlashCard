/*
  =============================================================================
  ARQUIVO: src/pages/DailyWorkoutMode.jsx
  PARA QUE SERVE: Esta é a página do "Treino Cerebral Diário de 5 Minutos". 
  Ela seleciona automaticamente os cartões mais urgentes de todas as suas matérias 
  (Faculdade, BIM, IA, Inglês) e apresenta uma sessão rápida e divertida de revisão 
  para fixar o conhecimento na sua memória de longo prazo (rocha firme!).
  =============================================================================
*/

import React, { useState, useEffect } from 'react';
import { Zap, CheckCircle2, XCircle, RotateCcw, ArrowLeft, Award, Sparkles, Image as ImageIcon } from 'lucide-react';
import { getDailyReviewCards, recordCardReviewResult, getHabits, saveHabits } from '../utils/db';

export default function DailyWorkoutMode({ activeProfile, onBackToMindMap }) {
  // 1. ESTADOS DA TELA (Guardam as informações do treino em tempo real)
  const [cards, setCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });
  const [xpEarned, setXpEarned] = useState(0);

  /*
    EFEITO INICIAL:
    Busca no banco de dados a lista de cartões prioritários para o treino de hoje.
  */
  useEffect(() => {
    if (activeProfile) {
      const reviewData = getDailyReviewCards(activeProfile);
      setCards(reviewData.dueCards || []);
    }
  }, [activeProfile]);

  /*
    FUNÇÃO: handleAnswer
    PARA QUE SERVE: Registra se você acertou ou errou o cartão atual.
    Atualiza o intervalo de repetição espaçada no banco de dados e passa para a próxima carta.
  */
  const handleAnswer = (isCorrect) => {
    const currentCard = cards[currentIndex];
    if (!currentCard) return;

    // 1. Registra no banco de dados a resposta para calcular a próxima data de revisão
    recordCardReviewResult(activeProfile, currentCard.setId, currentCard.id, isCorrect);

    // 2. Atualiza os pontos de acertos/erros da sessão
    if (isCorrect) {
      setScore(prev => ({ ...prev, correct: prev.correct + 1 }));
    } else {
      setScore(prev => ({ ...prev, wrong: prev.wrong + 1 }));
    }

    // 3. Vira a carta de volta e passa para o próximo cartão
    setIsFlipped(false);

    if (currentIndex + 1 < cards.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      // Treino concluído! Recompensa o usuário com XP nos hábitos
      const earned = (score.correct + (isCorrect ? 1 : 0)) * 10 + 20;
      setXpEarned(earned);
      awardXpToHabits(earned);
      setIsFinished(true);
    }
  };

  /*
    FUNÇÃO: awardXpToHabits
    PARA QUE SERVE: Conecta o treino diário ao módulo de hábitos, concedendo XP extra.
  */
  const awardXpToHabits = (xpAmount) => {
    try {
      const habits = getHabits(activeProfile);
      if (habits && habits.length > 0) {
        // Encontra o hábito de estudos ou aplica no primeiro hábito da lista
        const updated = habits.map((habit, idx) => {
          if (idx === 0 || habit.title.toLowerCase().includes('estud')) {
            return {
              ...habit,
              xp: (habit.xp || 0) + xpAmount,
              completedToday: true
            };
          }
          return habit;
        });
        saveHabits(updated, activeProfile);
      }
    } catch (e) {
      console.warn('Não foi possível conceder XP nos hábitos:', e);
    }
  };

  /*
    REPETIR O TREINO: Reinicia a sessão com uma nova rodada de cartões
  */
  const handleRestart = () => {
    const reviewData = getDailyReviewCards(activeProfile);
    setCards(reviewData.dueCards || []);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setScore({ correct: 0, wrong: 0 });
  };

  // Se não houver cartões para estudar
  if (!cards || cards.length === 0) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyCard}>
          <Sparkles size={48} color="#10B981" />
          <h2 style={{ color: '#F3F4F6', margin: '16px 0 8px 0' }}>Tudo em Dia no Seu Cérebro!</h2>
          <p style={{ color: '#9CA3AF', textAlign: 'center', maxWidth: 400 }}>
            Você não possui cartões pendentes de revisão para hoje. Suas conexões neurais estão fortes e afiadas na rocha!
          </p>
          <button style={styles.primaryButton} onClick={onBackToMindMap}>
            <ArrowLeft size={18} /> Voltar ao Cérebro 3D
          </button>
        </div>
      </div>
    );
  }

  // TELA DE RESULTADO DO TREINO
  if (isFinished) {
    const total = cards.length;
    const pct = Math.round((score.correct / total) * 100) || 0;

    return (
      <div style={styles.container}>
        <div style={styles.resultCard}>
          <div style={styles.trophyBadge}>
            <Award size={56} color="#F59E0B" />
          </div>
          <h1 style={{ color: '#FFFFFF', fontSize: '28px', marginBottom: '8px' }}>Treino Diário Concluído!</h1>
          <p style={{ color: '#9CA3AF', marginBottom: '24px' }}>
            Excelente dedicação, {activeProfile}! Seu cérebro está mais afiado hoje.
          </p>

          <div style={styles.statsGrid}>
            <div style={styles.statBox}>
              <span style={styles.statNumber}>{score.correct} / {total}</span>
              <span style={styles.statLabel}>Acertos</span>
            </div>
            <div style={styles.statBox}>
              <span style={{ ...styles.statNumber, color: '#3B82F6' }}>{pct}%</span>
              <span style={styles.statLabel}>Retenção</span>
            </div>
            <div style={styles.statBox}>
              <span style={{ ...styles.statNumber, color: '#F59E0B' }}>+{xpEarned} XP</span>
              <span style={styles.statLabel}>Energia Neural</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '24px' }}>
            <button style={styles.secondaryButton} onClick={handleRestart}>
              <RotateCcw size={18} /> Repetir Treino
            </button>
            <button style={styles.primaryButton} onClick={onBackToMindMap}>
              <ArrowLeft size={18} /> Voltar ao Cérebro
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentCard = cards[currentIndex];
  const progressPct = Math.round(((currentIndex + 1) / cards.length) * 100);

  return (
    <div style={styles.container}>
      {/* BARRA SUPERIOR DE PROGRESSO */}
      <div style={styles.headerBar}>
        <button style={styles.backLink} onClick={onBackToMindMap}>
          <ArrowLeft size={18} /> Sair do Treino
        </button>

        <div style={styles.titleGroup}>
          <Zap size={20} color="#F59E0B" />
          <span style={styles.headerTitle}>Treino Cerebral de 5 Minutos</span>
        </div>

        <span style={styles.cardCounter}>
          Cartão {currentIndex + 1} de {cards.length}
        </span>
      </div>

      {/* LINHA DE PROGRESSO NUTRIDA */}
      <div style={styles.progressBarBg}>
        <div style={{ ...styles.progressBarFill, width: `${progressPct}%` }} />
      </div>

      {/* CARTÃO 3D INTERATIVO */}
      <div style={styles.cardArea}>
        <div 
          style={styles.flashcardContainer} 
          onClick={() => setIsFlipped(!isFlipped)}
        >
          <div style={styles.categoryBadge}>
            {currentCard.category || 'Geral'} • {currentCard.setTitle}
          </div>

          {!isFlipped ? (
            /* FRENTE DO CARTÃO (PERGUNTA) */
            <div style={styles.cardSide}>
              <span style={styles.sideLabel}>PERGUNTA</span>
              <h2 style={styles.cardText}>{currentCard.term}</h2>
              {currentCard.image && (
                <img src={currentCard.image} alt="Ilustração" style={styles.cardImage} />
              )}
              <span style={styles.flipHint}>Clique para revelar a resposta</span>
            </div>
          ) : (
            /* VERSO DO CARTÃO (RESPOSTA) */
            <div style={styles.cardSideBack}>
              <span style={styles.sideLabelBack}>RESPOSTA</span>
              <h2 style={styles.cardTextBack}>{currentCard.definition}</h2>
              {currentCard.image && (
                <img src={currentCard.image} alt="Ilustração" style={styles.cardImage} />
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTÕES DE FEEDBACK DE REPETIÇÃO ESPAÇADA */}
      {isFlipped ? (
        <div style={styles.actionsBar}>
          <button 
            style={styles.wrongButton} 
            onClick={() => handleAnswer(false)}
          >
            <XCircle size={22} /> Errei / Difícil (Revisar Amanhã)
          </button>

          <button 
            style={styles.correctButton} 
            onClick={() => handleAnswer(true)}
          >
            <CheckCircle2 size={22} /> Acertei / Fácil (+3 Dias)
          </button>
        </div>
      ) : (
        <div style={styles.actionsBarHint}>
          <button style={styles.revealButton} onClick={() => setIsFlipped(true)}>
            Ver Resposta
          </button>
        </div>
      )}
    </div>
  );
}

// ESTILOS VISUAIS E AESTHETIC PREMIUM DARK
const styles = {
  container: {
    width: '100%',
    minHeight: '100vh',
    backgroundColor: '#0F172A',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '20px',
    boxSizing: 'border-box'
  },
  headerBar: {
    width: '100%',
    maxWidth: '700px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    fontSize: '14px'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  headerTitle: {
    color: '#F9FAFB',
    fontWeight: '600',
    fontSize: '16px'
  },
  cardCounter: {
    color: '#6B7280',
    fontSize: '14px',
    fontWeight: '500'
  },
  progressBarBg: {
    width: '100%',
    maxWidth: '700px',
    height: '6px',
    backgroundColor: '#1E293B',
    borderRadius: '3px',
    overflow: 'hidden',
    marginBottom: '32px'
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
    transition: 'width 0.3s ease'
  },
  cardArea: {
    width: '100%',
    maxWidth: '650px',
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  flashcardContainer: {
    width: '100%',
    minHeight: '340px',
    backgroundColor: '#1E293B',
    borderRadius: '24px',
    border: '1px solid #334155',
    padding: '32px',
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s ease, border-color 0.2s ease',
    position: 'relative'
  },
  categoryBadge: {
    backgroundColor: '#0F172A',
    color: '#38BDF8',
    padding: '6px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '600',
    border: '1px solid #0284C7'
  },
  cardSide: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    margin: 'auto 0'
  },
  cardSideBack: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    gap: '16px',
    margin: 'auto 0'
  },
  sideLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: '1.5px'
  },
  sideLabelBack: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#10B981',
    letterSpacing: '1.5px'
  },
  cardText: {
    color: '#F8FAFC',
    fontSize: '22px',
    fontWeight: '600',
    lineHeight: '1.4'
  },
  cardTextBack: {
    color: '#34D399',
    fontSize: '22px',
    fontWeight: '600',
    lineHeight: '1.4'
  },
  cardImage: {
    maxWidth: '100%',
    maxHeight: '160px',
    borderRadius: '12px',
    objectFit: 'contain'
  },
  flipHint: {
    color: '#64748B',
    fontSize: '13px',
    marginTop: '12px'
  },
  actionsBar: {
    width: '100%',
    maxWidth: '650px',
    display: 'flex',
    gap: '16px',
    marginTop: '32px'
  },
  actionsBarHint: {
    width: '100%',
    maxWidth: '650px',
    display: 'flex',
    justifyContent: 'center',
    marginTop: '32px'
  },
  wrongButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: '#7F1D1D',
    color: '#FCA5A5',
    border: '1px solid #991B1B',
    fontWeight: '600',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  correctButton: {
    flex: 1,
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: '#065F46',
    color: '#6EE7B7',
    border: '1px solid #047857',
    fontWeight: '600',
    fontSize: '15px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  revealButton: {
    width: '100%',
    padding: '16px',
    borderRadius: '16px',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: '600',
    fontSize: '16px',
    cursor: 'pointer'
  },
  emptyCard: {
    backgroundColor: '#1E293B',
    borderRadius: '24px',
    padding: '40px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '80px',
    border: '1px solid #334155'
  },
  resultCard: {
    backgroundColor: '#1E293B',
    borderRadius: '24px',
    padding: '40px',
    maxWidth: '500px',
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginTop: '40px',
    border: '1px solid #334155'
  },
  trophyBadge: {
    width: '88px',
    height: '88px',
    borderRadius: '50%',
    backgroundColor: '#78350F',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    width: '100%'
  },
  statBox: {
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statNumber: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#10B981'
  },
  statLabel: {
    fontSize: '12px',
    color: '#9CA3AF',
    marginTop: '4px'
  },
  primaryButton: {
    flex: 1,
    padding: '14px',
    borderRadius: '14px',
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    border: 'none',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  secondaryButton: {
    flex: 1,
    padding: '14px',
    borderRadius: '14px',
    backgroundColor: '#334155',
    color: '#F9FAFB',
    border: 'none',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    cursor: 'pointer'
  }
};

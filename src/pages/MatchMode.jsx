/*
  =============================================================================
  ARQUIVO: src/pages/MatchMode.jsx
  PARA QUE SERVE: Esta é a tela do jogo "Combinar" (Associação de Cartões). Ele pega 
  até 4 termos e suas 4 definições (totalizando 8 cartões), embaralha tudo numa grade 
  e liga um cronômetro de alta precisão. O seu objetivo é clicar em um cartão e depois 
  no par correto dele o mais rápido possível! Se acertar, os cartões somem da tela. 
  Se errar, eles tremem em vermelho. Ao vencer, o jogo compara seu tempo com o seu 
  recorde e salva se você bater a sua melhor marca!
  =============================================================================
*/

import React, { useState, useEffect, useRef } from 'react';
// Importamos ícones da Lucide para dar o clima olímpico de quebra de recordes!
import { ArrowLeft, Timer, Trophy, RotateCcw, Zap, Sparkles } from 'lucide-react';

/*
  COMPONENTE: MatchMode
  PARAMETROS (PROPS) QUE RECEBE:
    - set: O baralho de estudos selecionado.
    - stats: As estatísticas gerais (onde buscamos o recorde de melhor tempo).
    - onNavigate: Função para navegar entre as telas.
    - onSaveRecord: Função para registrar o novo recorde no LocalStorage geral.
*/
export default function MatchMode({ set, stats, onNavigate, onSaveRecord }) {
  // 1. ESTADOS DO JOGO
  const [gridItems, setGridItems] = useState([]);       // Os 8 cartões espalhados na grade (termos e definições misturados)
  const [selectedId, setSelectedId] = useState(null);   // ID do item que está atualmente clicado e aguardando par
  const [mismatchedIds, setMismatchedIds] = useState([]); // IDs temporários dos dois itens que o usuário errou a ligação
  
  // Cronômetro
  const [elapsedTime, setElapsedTime] = useState(0);    // Tempo em segundos
  const [isRunning, setIsRunning] = useState(false);    // Se o cronômetro está rodando
  const [isFinished, setIsFinished] = useState(false);  // Se o jogo acabou (todos os pares combinados)
  const [isNewRecord, setIsNewRecord] = useState(false); // Se o usuário bateu o recorde de menor tempo
  const [lightboxImage, setLightboxImage] = useState(null); // Estado para a imagem em zoom (lightbox)

  // Referência do temporizador (interval) para que possamos pará-lo a qualquer momento
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);

  // 2. INICIALIZAÇÃO DO JOGO
  // Monta o tabuleiro do zero ao carregar a página
  useEffect(() => {
    setupGame();
    
    // Desliga qualquer cronômetro pendente ao sair da tela
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [set]);

  /*
    FUNÇÃO INTERNA: setupGame
    PARA QUE SERVE: Resgata até 4 cartões aleatórios do baralho, gera as 8 metades (4 termos 
    e 4 definições), embaralha tudo de forma totalmente aleatória e dispara o cronômetro.
  */
  const setupGame = () => {
    if (!set || !set.cards || set.cards.length === 0) return;

    // 1. Sorteia até 4 cartões do baralho para não ficar uma grade gigante e chata no celular
    const selectedCards = [...set.cards]
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.min(4, set.cards.length));

    // 2. Para cada cartão, criamos 2 itens de jogo: o Termo e a Definição
    const items = [];
    selectedCards.forEach(card => {
      // Metade do Termo
      items.push({
        id: `term-${card.id}`,
        cardId: card.id,
        text: card.term,
        type: 'term',
        matched: false
      });
      // Metade da Definição
      items.push({
        id: `def-${card.id}`,
        cardId: card.id,
        text: card.definition,
        type: 'definition',
        image: card.image || '', // Repassa a imagem anexada para o tabuleiro
        matched: false
      });
    });

    // 3. Embaralha todos os 8 itens de forma muito bagunçada
    const shuffledItems = items.sort(() => Math.random() - 0.5);

    // Salva no estado do jogo
    setGridItems(shuffledItems);
    setSelectedId(null);
    setMismatchedIds([]);
    setIsFinished(false);
    setIsNewRecord(false);
    setElapsedTime(0);

    // 4. Inicia o cronômetro ultra-preciso de milissegundos
    if (timerRef.current) clearInterval(timerRef.current);
    
    startTimeRef.current = Date.now();
    setIsRunning(true);

    timerRef.current = setInterval(() => {
      const diff = (Date.now() - startTimeRef.current) / 1000;
      setElapsedTime(diff);
    }, 50); // Atualiza a tela a cada 50ms para o contador parecer vivo e frenético!
  };

  /*
    FUNÇÃO INTERNA: handleCardClick
    PARA QUE SERVE: Roda a inteligência de combinação. Quando você clica num cartão:
      - Se for o primeiro, ele fica selecionado (borda roxa).
      - Se for o segundo, compara com o primeiro.
        - Se tiverem o mesmo 'cardId' mas tipos diferentes (um é termo e o outro é definição): MATCH!
          Ambos somem e o jogo verifica se você ganhou.
        - Se forem diferentes: MISMATCH!
          Flasheiam em vermelho, sacodem (tremedeira) e resetam após 450ms.
  */
  const handleCardClick = (item) => {
    if (item.matched || mismatchedIds.length > 0) return; // Trava cliques durante animações de erro

    // Se clicou no item que já estava selecionado, apenas desseleciona
    if (item.id === selectedId) {
      setSelectedId(null);
      return;
    }

    // Caso 1: É o primeiro cartão clicado do par
    if (selectedId === null) {
      setSelectedId(item.id);
      return;
    }

    // Caso 2: Já havia um cartão selecionado, agora clicamos no segundo
    const firstItem = gridItems.find(i => i.id === selectedId);
    const secondItem = item;

    // Verifica se os cartões combinam (pertencem ao mesmo cartão original, mas são metades opostas)
    const isMatch = firstItem.cardId === secondItem.cardId && firstItem.type !== secondItem.type;

    if (isMatch) {
      // --- SUCESSO DE COMBINAÇÃO (MATCH) ---
      setGridItems(prev => prev.map(i => {
        if (i.id === firstItem.id || i.id === secondItem.id) {
          return { ...i, matched: true }; // Marca como combinado para sumir da tela
        }
        return i;
      }));
      setSelectedId(null);

      // Verifica se todos os cartões já foram combinados (se o jogo acabou)
      // Usamos setTimeout rápido para garantir que a tela atualize antes de mostrar a vitória
      setTimeout(() => {
        setGridItems(currentItems => {
          const allMatched = currentItems.every(i => i.matched);
          if (allMatched) {
            handleVictory();
          }
          return currentItems;
        });
      }, 100);

    } else {
      // --- ERRO DE COMBINAÇÃO (MISMATCH) ---
      // Coloca os dois cartões na geladeira de erro (piscam vermelho e tremem)
      setMismatchedIds([firstItem.id, secondItem.id]);
      setSelectedId(null);

      // Espera 450ms para que o usuário veja o erro, depois limpa a cor vermelha e desseleciona
      setTimeout(() => {
        setMismatchedIds([]);
      }, 450);
    }
  };

  /*
    FUNÇÃO INTERNA: handleVictory
    PARA QUE SERVE: Dispara quando todos os pares são encontrados. Para o cronômetro, 
    verifica se o tempo conquistado foi menor do que o recorde antigo e avisa o usuário.
  */
  const handleVictory = () => {
    setIsRunning(false);
    if (timerRef.current) clearInterval(timerRef.current);

    const finalTime = (Date.now() - startTimeRef.current) / 1000;
    setElapsedTime(finalTime);
    setIsFinished(true);

    // Verifica se é um novo recorde
    const currentRecord = stats.bestMatchTime;
    
    if (currentRecord === null || finalTime < currentRecord) {
      setIsNewRecord(true);
      // Salva o novo recorde no LocalStorage geral
      onSaveRecord(finalTime);
    }
  };

  // Se o baralho for inválido, exibe tela de erro
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
      
      {/* CABEÇALHO DO JOGO */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('dashboard')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Sair do Jogo
        </button>
        <h2 style={styles.setTitle}>⚡ Jogo Combinar: {set.title}</h2>
      </header>

      {!isFinished ? (
        // -----------------------------------------------------------------------------
        // TELA DE JOGO ATIVO (CRONÔMETRO E GRADE DE CARTÕES)
        // -----------------------------------------------------------------------------
        <div style={styles.gameArea}>
          
          {/* BARRA DE INFORMAÇÕES DE TEMPO */}
          <div style={styles.infoBar} className="glass-panel">
            <div style={styles.timerDisplay}>
              <Timer size={20} color="var(--primary-color)" />
              <span>Tempo: <strong style={styles.timerVal}>{elapsedTime.toFixed(1)}s</strong></span>
            </div>
            
            <div style={styles.recordDisplay}>
              <Trophy size={18} color="var(--color-warning)" />
              <span>Melhor Tempo: <strong>{stats.bestMatchTime ? `${stats.bestMatchTime.toFixed(2)}s` : '---'}</strong></span>
            </div>
          </div>

          {/* INSTRUÇÃO RÁPIDA */}
          <p style={styles.gameInstruction}>Associe cada termo à sua definição clicando neles!</p>

          {/* A GRADE DE CARTÕES DO JOGO (Estruturada para nunca sobrepor) */}
          <div style={styles.gameGrid} className="gameGrid match-game-grid">
            {gridItems.map((item) => {
              // Lógica de cores e estados do cartão na grade
              const isSelected = item.id === selectedId;
              const isMismatched = mismatchedIds.includes(item.id);
              
              // Se já combinou o par, o cartão fica invisível e some da grade suavemente!
              if (item.matched) {
                return <div key={item.id} style={styles.matchedPlaceholder} className="gameCard match-card" />;
              }

              let cardStyle = { ...styles.gameCard };
              let classEffect = '';

              if (isSelected) {
                // Cartão Selecionado: Borda e Brilho Roxos
                cardStyle = { ...cardStyle, ...styles.selectedCardStyle };
              } else if (isMismatched) {
                // Cartão com erro: Tremedeira e Vermelho
                cardStyle = { ...cardStyle, ...styles.mismatchedCardStyle };
                classEffect = 'animate-shake';
              }

              return (
                <div
                  key={item.id}
                  onClick={() => handleCardClick(item)}
                  style={cardStyle}
                  className={`gameCard match-card match-card-hover ${classEffect}`}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%' }}>
                    <span style={styles.cardText} className="cardText match-card-text">{item.text}</span>
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt="Miniatura" 
                        style={{
                          maxHeight: '36px',
                          maxWidth: '90%',
                          borderRadius: '4px',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          objectFit: 'contain',
                          background: '#0B0C0E',
                          cursor: 'zoom-in',
                        }} 
                        onClick={(e) => {
                          e.stopPropagation(); // Impede de selecionar a carta no jogo ao clicar na imagem!
                          setLightboxImage(item.image);
                        }}
                        title="Clique para ampliar a imagem"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      ) : (
        // -----------------------------------------------------------------------------
        // TELA DE CONCLUÍDO (VITÓRIA E RECORDE)
        // -----------------------------------------------------------------------------
        <div style={styles.finishedCard} className="glass-panel animate-success">
          
          {isNewRecord ? (
            // Efeito visual comemorativo para Novo Recorde
            <div style={styles.recordHeader}>
              <div style={styles.starsGlow} />
              <Trophy size={64} style={styles.recordAwardIcon} />
              <h2 style={styles.recordTitle}>👑 NOVO RECORDE! 👑</h2>
            </div>
          ) : (
            <div style={styles.recordHeader}>
              <Zap size={64} style={{ color: 'var(--primary-color)', marginBottom: '20px' }} />
              <h2 style={styles.finishedTitle}>Incrível!</h2>
            </div>
          )}

          <p style={styles.finishedSubtitle}>Você limpou o tabuleiro e combinou todos os pares.</p>

          {/* Resultados de Tempo */}
          <div style={styles.scoreBoard}>
            <div style={styles.scoreItem}>
              <span style={styles.scoreVal}>{elapsedTime.toFixed(2)}s</span>
              <span style={styles.scoreLabel}>Seu Tempo</span>
            </div>
            
            {stats.bestMatchTime && !isNewRecord && (
              <>
                <div style={styles.scoreDivider} />
                <div style={styles.scoreItem}>
                  <span style={{ ...styles.scoreVal, color: '#99A1AC' }}>
                    {stats.bestMatchTime.toFixed(2)}s
                  </span>
                  <span style={styles.scoreLabel}>Seu Recorde</span>
                </div>
              </>
            )}
          </div>

          {isNewRecord && (
            <div style={styles.recordCongratsBox}>
              <Sparkles size={16} color="#EEA53D" />
              <span>Você superou a sua marca anterior! Parabéns pela velocidade mental!</span>
            </div>
          )}

          {/* Ações Finais */}
          <div style={styles.finishedActions}>
            <button onClick={setupGame} className="btn-primary" style={styles.restartAllBtn}>
              <RotateCcw size={18} />
              Jogar Novamente
            </button>

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
// ESTILOS LOCAIS DO MODO COMBINAR (MATCH GAME)
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
  gameArea: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    width: '100%',
    maxWidth: '850px',
    margin: '0 auto',
  },
  infoBar: {
    width: '100%',
    padding: '16px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
  },
  timerDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '15px',
    color: '#F4F5F7',
  },
  timerVal: {
    fontSize: '18px',
    color: 'var(--primary-color)',
    fontFamily: 'monospace', // Mantém números alinhados sem tremer a tela ao mudar
  },
  recordDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#99A1AC',
  },
  gameInstruction: {
    color: '#99A1AC',
    fontSize: '14px',
    textAlign: 'center',
    fontWeight: '500',
  },
  gameGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    width: '100%',
    minHeight: '260px',
    marginTop: '10px',
  },
  gameCard: {
    background: 'rgba(21, 23, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '16px',
    padding: '24px 16px',
    minHeight: '110px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    boxShadow: 'var(--box-shadow-soft)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none',
  },
  cardText: {
    fontSize: '15px',
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: '1.4',
    wordBreak: 'break-word',
  },
  matchedPlaceholder: {
    // Quando combina, vira um bloco vazio invisível que some com animação
    visibility: 'hidden',
    opacity: 0,
    minHeight: '110px',
    transition: 'all 0.3s ease',
  },
  selectedCardStyle: {
    borderColor: 'var(--primary-color)',
    background: 'rgba(232, 147, 63, 0.12)',
    boxShadow: 'var(--box-shadow-glow)',
    transform: 'scale(1.03)',
  },
  mismatchedCardStyle: {
    borderColor: 'var(--color-danger)',
    background: 'rgba(229, 72, 77, 0.12)',
    boxShadow: '0 0 15px rgba(229, 72, 77, 0.25)',
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
  recordHeader: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  recordAwardIcon: {
    color: '#EEA53D',
    marginBottom: '16px',
    filter: 'drop-shadow(0 0 15px rgba(238, 165, 61, 0.5))',
    animation: 'successPulse 1.5s infinite ease-in-out',
  },
  recordTitle: {
    fontSize: '26px',
    fontWeight: '800',
    color: '#EEA53D',
    letterSpacing: '1px',
    textShadow: '0 0 10px rgba(238, 165, 61, 0.3)',
    marginBottom: '6px',
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
    color: 'var(--color-warning)',
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
  recordCongratsBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(238, 165, 61, 0.08)',
    border: '1px solid rgba(238, 165, 61, 0.15)',
    borderRadius: '10px',
    padding: '12px 16px',
    fontSize: '13px',
    color: '#EEA53D',
    fontWeight: '600',
    maxWidth: '400px',
    marginBottom: '32px',
  },
  finishedActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    width: '100%',
    maxWidth: '400px',
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

/* Folha de estilos extra para animações de hover e responsividade dos cartões de combinar */
const extraMatchStyles = `
.match-card-hover:hover {
  background: var(--bg-tertiary) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  transform: translateY(-4px);
  box-shadow: 0 10px 20px rgba(0,0,0,0.3) !important;
}
.gameGrid {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)) !important;
  gap: 16px !important;
  width: 100% !important;
  box-sizing: border-box !important;
}
.gameCard {
  box-sizing: border-box !important;
}
@media (max-width: 520px) {
  .gameGrid {
    grid-template-columns: repeat(2, 1fr) !important; /* Sempre 2 colunas organizadas no celular */
    gap: 10px !important;
  }
  .gameCard {
    min-height: 85px !important;
    padding: 10px 6px !important;
  }
  .cardText {
    font-size: 13px !important;
  }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraMatchStyles;
  document.head.appendChild(styleSheet);
}

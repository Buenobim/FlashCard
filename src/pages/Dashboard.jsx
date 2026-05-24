/*
  =============================================================================
  ARQUIVO: src/pages/Dashboard.jsx
  PARA QUE SERVE: Esta é a "Página Inicial" ou Painel do Estudante. Quando você abre 
  o aplicativo, se depara com ela. Ela calcula e exibe suas estatísticas de estudo 
  (quantas vezes estudou, recorde do jogo, etc.) e lista todos os seus baralhos de 
  cartões. Nela, você pode escolher o que quer estudar e qual o modo de estudo prefere.
  =============================================================================
*/

import React, { useState } from 'react';
// Importamos os ícones necessários da biblioteca Lucide para dar um toque super moderno
import { 
  Plus, 
  Play, 
  Edit3, 
  Trash2, 
  Trophy, 
  Layers, 
  Activity, 
  BookOpen, 
  Sparkles, 
  Eye, 
  ChevronRight,
  RotateCcw
} from 'lucide-react';

/*
  COMPONENTE: Dashboard
  PARAMETROS (PROPS) QUE RECEBE:
    - sets: Lista de todos os conjuntos de flashcards criados.
    - stats: Objeto contendo as estatísticas acumuladas do usuário.
    - onNavigate: Função para trocar de tela.
    - onSelectSet: Função disparada quando escolhemos um conjunto para estudar.
    - onDeleteSet: Função para apagar um conjunto da memória.
    - onResetStats: Função opcional para limpar estatísticas.
*/
export default function Dashboard({ sets, stats, onNavigate, onSelectSet, onDeleteSet, onResetStats }) {
  // Estado local para controlar a dupla confirmação de exclusão (evita apagar sem querer!)
  // Armazena o ID do conjunto que o usuário quer excluir temporariamente.
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Estado local para guardar qual conjunto está com o menu de modos de estudo "aberto" (expandido)
  const [expandedSetId, setExpandedSetId] = useState(null);

  /*
    FUNÇÃO INTERNA: handleDeleteClick
    PARA QUE SERVE: Dispara quando clica no lixo. Se clicar uma vez, pede confirmação. 
    Se clicar novamente na confirmação, apaga o conjunto em definitivo.
  */
  const handleDeleteClick = (setId, event) => {
    event.stopPropagation(); // Impede que o clique selecione o baralho por acidente
    
    if (confirmDeleteId === setId) {
      // Segunda confirmação: apaga de fato!
      onDeleteSet(setId);
      setConfirmDeleteId(null);
    } else {
      // Primeira confirmação: muda o estado para alertar o usuário
      setConfirmDeleteId(setId);
    }
  };

  /*
    FUNÇÃO INTERNA: handleCancelDelete
    PARA QUE SERVE: Cancela o modo de confirmação se o usuário tirar o mouse ou clicar fora.
  */
  const handleCancelDelete = (event) => {
    event.stopPropagation();
    setConfirmDeleteId(null);
  };

  /*
    FUNÇÃO INTERNA: handleSetClick
    PARA QUE SERVE: Abre/Fecha a lista de modos de estudo daquele conjunto ao clicar nele.
  */
  const handleSetClick = (setId) => {
    if (expandedSetId === setId) {
      setExpandedSetId(null);
    } else {
      setExpandedSetId(setId);
    }
  };

  /*
    FUNÇÃO INTERNA: startStudyMode
    PARA QUE SERVE: Seleciona o baralho e redireciona o usuário para o modo de estudo desejado.
  */
  const startStudyMode = (set, mode, event) => {
    event.stopPropagation(); // Impede fechar a sanfona de baralhos
    onSelectSet(set);
    onNavigate(mode);
  };

  // Cálculo rápido: soma total de cartões em todos os baralhos criados
  const totalCards = sets.reduce((acc, currentSet) => acc + currentSet.cards.length, 0);

  return (
    <div className="app-container">
      
      {/* 1. SEÇÃO DE BOAS-VINDAS E INTRODUÇÃO */}
      <section style={styles.welcomeSection}>
        <div>
          <h1 style={styles.title}>Olá, Estudante! 👋</h1>
          <p style={styles.subtitle}>Pronto para impulsionar o seu aprendizado hoje? Escolha um baralho ou crie um novo para começar.</p>
        </div>
        <button 
          onClick={() => onNavigate('create')} 
          className="btn-primary"
          style={styles.ctaHeaderBtn}
        >
          <Plus size={20} />
          Criar Novo Baralho
        </button>
      </section>

      {/* 2. PAINEL DE ESTATÍSTICAS (Sua casa construída sobre a rocha das métricas) */}
      <section style={styles.statsGrid}>
        
        {/* Cartão de Baralhos Criados */}
        <div style={styles.statsCard} className="glass-panel">
          <div style={{ ...styles.iconCircle, background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1' }}>
            <Layers size={22} />
          </div>
          <div>
            <h3 style={styles.statsVal}>{sets.length}</h3>
            <p style={styles.statsLabel}>Baralhos Criados</p>
          </div>
        </div>

        {/* Cartão de Cartões Totais */}
        <div style={styles.statsCard} className="glass-panel">
          <div style={{ ...styles.iconCircle, background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            <BookOpen size={22} />
          </div>
          <div>
            <h3 style={styles.statsVal}>{totalCards}</h3>
            <p style={styles.statsLabel}>Cartões de Estudo</p>
          </div>
        </div>

        {/* Cartão de Sessões Estudadas */}
        <div style={styles.statsCard} className="glass-panel">
          <div style={{ ...styles.iconCircle, background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            <Activity size={22} />
          </div>
          <div>
            <h3 style={styles.statsVal}>{stats.setsStudied}</h3>
            <p style={styles.statsLabel}>Sessões Concluídas</p>
          </div>
        </div>

        {/* Cartão de Recorde do Jogo Combinar */}
        <div style={styles.statsCard} className="glass-panel">
          <div style={{ ...styles.iconCircle, background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            <Trophy size={22} />
          </div>
          <div>
            <h3 style={styles.statsVal}>
              {stats.bestMatchTime ? `${stats.bestMatchTime.toFixed(2)}s` : '---'}
            </h3>
            <p style={styles.statsLabel}>Melhor Tempo no Jogo</p>
          </div>
        </div>

      </section>

      {/* 3. TÍTULO DE SEÇÃO */}
      <h2 style={styles.sectionTitle}>
        <Sparkles size={20} color="#a855f7" /> 
        Meus Baralhos de Estudo
      </h2>

      {/* 4. LISTAGEM DE BARALHOS (SE COMPORTA EM GRADE) */}
      {sets.length === 0 ? (
        // Estado Vazio: Quando o usuário apagou tudo ou não tem nada
        <div style={styles.emptyContainer} className="glass-panel">
          <BookOpen size={60} style={styles.emptyIcon} />
          <h3 style={styles.emptyTitle}>Nenhum Baralho Cadastrado</h3>
          <p style={styles.emptyDesc}>Você não possui baralhos de estudo no momento. Vamos começar criando o seu primeiro conjunto de cartões de termos e definições!</p>
          <button 
            onClick={() => onNavigate('create')} 
            className="btn-primary"
            style={{ marginTop: '16px' }}
          >
            <Plus size={20} />
            Criar Primeiro Baralho
          </button>
        </div>
      ) : (
        // Grade com os Baralhos Existentes
        <div style={styles.setsGrid}>
          {sets.map((set) => {
            const isExpanded = expandedSetId === set.id;
            const isConfirming = confirmDeleteId === set.id;
            
            return (
              <div 
                key={set.id} 
                style={styles.setCard} 
                className="glass-panel"
                onClick={() => handleSetClick(set.id)}
              >
                {/* Cabeçalho do Baralho (Título e Info) */}
                <div style={styles.setCardHeader}>
                  <div style={styles.setMainInfo}>
                    <h3 style={styles.setCardTitle}>{set.title}</h3>
                    <p style={styles.setCardDesc}>
                      {set.description || 'Sem descrição cadastrada.'}
                    </p>
                    <span style={styles.cardCounter}>
                      {set.cards.length} {set.cards.length === 1 ? 'cartão' : 'cartões'}
                    </span>
                  </div>

                  {/* Ações Rápidas (Editar e Lixeira) */}
                  <div style={styles.setActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSet(set);
                        onNavigate('edit');
                      }}
                      style={styles.actionIconButton}
                      title="Editar cartões do baralho"
                    >
                      <Edit3 size={16} />
                    </button>
                    
                    {isConfirming ? (
                      <div style={styles.confirmBox}>
                        <button
                          onClick={(e) => handleDeleteClick(set.id, e)}
                          style={styles.confirmDeleteBtn}
                          title="Confirmar exclusão permanente"
                        >
                          Apagar
                        </button>
                        <button
                          onClick={handleCancelDelete}
                          style={styles.cancelDeleteBtn}
                        >
                          Não
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteClick(set.id, e)}
                        style={styles.deleteIconButton}
                        title="Apagar este baralho do seu dispositivo"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>

                {/* BOTÃO EXPANSOR INDICATIVO */}
                <div style={styles.expandTrigger}>
                  <span style={styles.expandText}>
                    {isExpanded ? 'Esconder Modos de Estudo 🔼' : 'Clique para escolher como estudar 🔽'}
                  </span>
                </div>

                {/* ÁREA EXPANSÍVEL: OS 4 MODOS DE ESTUDO DO QUIZLET */}
                {isExpanded && (
                  <div style={styles.studyModesArea} onClick={(e) => e.stopPropagation()}>
                    <h4 style={styles.studyAreaTitle}>Selecione um Modo de Estudo:</h4>
                    <div style={styles.modesContainer}>
                      
                      {/* Modo 1: Flashcards Clássico */}
                      <div 
                        style={{ ...styles.modeOption, borderLeft: '4px solid #6366f1' }}
                        onClick={(e) => startStudyMode(set, 'flashcard_mode', e)}
                      >
                        <div style={styles.modeOptionMeta}>
                          <span style={styles.modeOptionName}>🎴 Flashcards</span>
                          <span style={styles.modeOptionDesc}>Estudo clássico virando cartões em 3D</span>
                        </div>
                        <ChevronRight size={18} color="#6366f1" />
                      </div>

                      {/* Modo 2: Aprender */}
                      <div 
                        style={{ ...styles.modeOption, borderLeft: '4px solid #a855f7' }}
                        onClick={(e) => startStudyMode(set, 'learn_mode', e)}
                      >
                        <div style={styles.modeOptionMeta}>
                          <span style={styles.modeOptionName}>🧠 Aprender</span>
                          <span style={styles.modeOptionDesc}>Múltipla escolha inteligente automático</span>
                        </div>
                        <ChevronRight size={18} color="#a855f7" />
                      </div>

                      {/* Modo 3: Combinar */}
                      <div 
                        style={{ ...styles.modeOption, borderLeft: '4px solid #f59e0b' }}
                        onClick={(e) => startStudyMode(set, 'match_mode', e)}
                      >
                        <div style={styles.modeOptionMeta}>
                          <span style={styles.modeOptionName}>⚡ Combinar</span>
                          <span style={styles.modeOptionDesc}>Jogo de velocidade associando termos</span>
                        </div>
                        <ChevronRight size={18} color="#f59e0b" />
                      </div>

                      {/* Modo 4: Teste */}
                      <div 
                        style={{ ...styles.modeOption, borderLeft: '4px solid #10b981' }}
                        onClick={(e) => startStudyMode(set, 'test_mode', e)}
                      >
                        <div style={styles.modeOptionMeta}>
                          <span style={styles.modeOptionName}>📝 Simulado</span>
                          <span style={styles.modeOptionDesc}>Prova avaliativa rápida com notas e revisão</span>
                        </div>
                        <ChevronRight size={18} color="#10b981" />
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS DO DASHBOARD
// -----------------------------------------------------------------------------
const styles = {
  welcomeSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px',
    flexWrap: 'wrap',
    gap: '20px',
  },
  title: {
    fontSize: '32px',
    fontWeight: '800',
    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '8px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '16px',
    maxWidth: '650px',
  },
  ctaHeaderBtn: {
    alignSelf: 'center',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '40px',
  },
  statsCard: {
    padding: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  iconCircle: {
    width: '46px',
    height: '46px',
    borderRadius: '12px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsVal: {
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
  },
  statsLabel: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: '2px',
  },
  sectionTitle: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  emptyContainer: {
    padding: '60px 24px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIcon: {
    color: '#334155',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '20px',
    fontWeight: '700',
    marginBottom: '8px',
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: '15px',
    maxWidth: '500px',
    lineHeight: '1.6',
  },
  setsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  setCard: {
    padding: '24px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  setCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: '16px',
  },
  setMainInfo: {
    flex: '1 1 300px',
  },
  setCardTitle: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: '6px',
  },
  setCardDesc: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '12px',
    lineHeight: '1.5',
  },
  cardCounter: {
    background: 'rgba(99, 102, 241, 0.12)',
    color: '#6366f1',
    fontSize: '12px',
    fontWeight: '700',
    padding: '4px 10px',
    borderRadius: '100px',
    display: 'inline-block',
  },
  setActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  actionIconButton: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    color: '#94a3b8',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteIconButton: {
    background: 'rgba(244, 63, 94, 0.05)',
    border: '1px solid rgba(244, 63, 94, 0.1)',
    borderRadius: '8px',
    color: '#f43f5e',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBox: {
    display: 'flex',
    gap: '4px',
    background: '#1e293b',
    padding: '4px',
    borderRadius: '8px',
    border: '1px solid rgba(244, 63, 94, 0.2)',
  },
  confirmDeleteBtn: {
    background: '#f43f5e',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '700',
    padding: '6px 12px',
    cursor: 'pointer',
  },
  cancelDeleteBtn: {
    background: 'transparent',
    color: '#94a3b8',
    border: 'none',
    fontSize: '12px',
    fontWeight: '700',
    padding: '6px 10px',
    cursor: 'pointer',
  },
  expandTrigger: {
    textAlign: 'center',
    marginTop: '16px',
    borderTop: '1px solid rgba(255, 255, 255, 0.03)',
    paddingTop: '12px',
  },
  expandText: {
    fontSize: '12px',
    color: '#94a3b8',
    fontWeight: '600',
    transition: 'color 0.2s ease',
  },
  studyModesArea: {
    marginTop: '20px',
    borderTop: '1px dashed rgba(255, 255, 255, 0.08)',
    paddingTop: '20px',
    animation: 'fadeIn 0.3s ease',
  },
  studyAreaTitle: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '12px',
  },
  modeOption: {
    background: 'rgba(255, 255, 255, 0.02)',
    padding: '14px 18px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    border: '1px solid rgba(255, 255, 255, 0.03)',
  },
  modeOptionMeta: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  modeOptionName: {
    fontSize: '15px',
    fontWeight: '700',
    color: '#ffffff',
  },
  modeOptionDesc: {
    fontSize: '11px',
    color: '#94a3b8',
  }
};

/* Adiciona efeitos hover adicionais nos elementos dinâmicos através de uma folha de estilos */
const extraStyles = `
.modeOption:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  transform: translateX(4px);
}
.setCard:hover {
  border-color: rgba(99, 102, 241, 0.15) !important;
  box-shadow: 0 10px 25px rgba(0,0,0,0.3) !important;
}
.actionIconButton:hover {
  background: var(--primary-color) !important;
  color: white !important;
}
.deleteIconButton:hover {
  background: var(--color-danger) !important;
  color: white !important;
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraStyles;
  document.head.appendChild(styleSheet);
}

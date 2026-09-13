/*
  =============================================================================
  ARQUIVO: src/pages/HabitsMode.jsx
  PARA QUE SERVE: Este é o módulo de "Hábitos" da plataforma. Aqui você cadastra
  tarefas e metas que quer cumprir todo dia (ex: "Beber 2L de água", "Estudar 1h",
  "Ir à academia") para não esquecer. Para deixar gostoso de cumprir, o módulo é
  GAMIFICADO: cada dia que você marca um hábito como feito você ganha XP e sobe de
  nível, mantém uma "ofensiva" 🔥 (dias seguidos), e vê seu progresso do dia numa
  barra. É o mesmo prazer de manter a sequência do Duolingo aplicado à sua rotina!
  =============================================================================
*/

import React, { useState } from 'react';
import {
  ArrowLeft, Plus, Flame, Trophy, Check, Trash2, X, Sparkles, Target, Zap
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   FUNÇÕES AUXILIARES DE DATA E CÁLCULO (o "cérebro" da gamificação)
----------------------------------------------------------------------------- */

// Converte uma data para o formato "AAAA-MM-DD" usando o horário LOCAL (não UTC),
// para o "hoje" bater com o dia real do usuário no Brasil.
function fmt(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// A chave de hoje
function todayKey() {
  return fmt(new Date());
}

// Calcula a "ofensiva" (streak): quantos dias SEGUIDOS o hábito foi cumprido.
// Regra amigável: se hoje ainda não foi marcado, a ofensiva não quebra —
// contamos a partir de ontem. Assim você não perde a sequência só porque
// ainda não fez a tarefa de hoje.
function computeStreak(habit) {
  const history = habit.history || {};
  let streak = 0;
  const d = new Date();
  if (!history[fmt(d)]) {
    d.setDate(d.getDate() - 1);
  }
  while (history[fmt(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// Retorna as últimas 7 datas (da mais antiga para hoje) para os pontinhos do histórico.
function last7Days() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(fmt(d));
  }
  return days;
}

// Conta o total de vezes que qualquer hábito foi concluído (para calcular o XP).
function totalCompletions(habits) {
  return habits.reduce((acc, h) => acc + Object.values(h.history || {}).filter(Boolean).length, 0);
}

// Paleta de cores e emojis sugeridos para novos hábitos
const HABIT_COLORS = ['#45C4A0', '#E8933F', '#E77950', '#D96A8F', '#EEA53D', '#3ECF8E', '#6FA8D6', '#E5484D'];
const HABIT_EMOJIS = ['💧', '🏋️', '📚', '🏃', '🧘', '🥗', '💊', '😴', '🙏', '✍️', '🎯', '☀️'];

/*
  COMPONENTE: HabitsMode
  PROPS QUE RECEBE:
    - habits: lista de hábitos do perfil ativo.
    - onSaveHabits: função para gravar a lista atualizada (local + nuvem).
    - onNavigate: função para voltar ao Menu.
    - activeProfile: nome do estudante logado.
*/
export default function HabitsMode({ habits = [], onSaveHabits, onNavigate, activeProfile }) {
  // Controle do formulário de novo hábito
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmoji, setNewEmoji] = useState(HABIT_EMOJIS[0]);
  const [newColor, setNewColor] = useState(HABIT_COLORS[0]);

  // Guarda o hábito que acabou de ser concluído (para animação de comemoração)
  const [justDone, setJustDone] = useState(null);
  // Confirmação de exclusão
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const today = todayKey();
  const week = last7Days();

  // ----- Cálculos de gamificação -----
  const completions = totalCompletions(habits);
  const xp = completions * 10;                       // 10 XP por conclusão
  const level = Math.floor(xp / 100) + 1;            // sobe de nível a cada 100 XP
  const xpIntoLevel = xp % 100;                      // progresso dentro do nível atual
  const doneToday = habits.filter(h => h.history?.[today]).length;
  const totalToday = habits.length;
  const percentToday = totalToday > 0 ? Math.round((doneToday / totalToday) * 100) : 0;
  const bestStreak = habits.reduce((max, h) => Math.max(max, computeStreak(h)), 0);

  /*
    FUNÇÃO: handleToggleToday
    PARA QUE SERVE: Marca/desmarca o hábito como cumprido HOJE. Ao concluir, dispara
    a animação de comemoração e ganho de XP.
  */
  const handleToggleToday = (habitId) => {
    let becameDone = false;
    const updated = habits.map(h => {
      if (h.id !== habitId) return h;
      const history = { ...(h.history || {}) };
      if (history[today]) {
        delete history[today]; // desmarca
      } else {
        history[today] = true; // marca como feito
        becameDone = true;
      }
      return { ...h, history };
    });
    onSaveHabits(updated);

    if (becameDone) {
      setJustDone(habitId);
      setTimeout(() => setJustDone(null), 1200);
    }
  };

  /*
    FUNÇÃO: handleAddHabit
    PARA QUE SERVE: Cria um novo hábito com nome, emoji e cor escolhidos.
  */
  const handleAddHabit = (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;

    const newHabit = {
      id: `habit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      emoji: newEmoji,
      color: newColor,
      history: {},
      createdAt: new Date().toISOString()
    };
    onSaveHabits([...habits, newHabit]);

    // Limpa o formulário
    setNewName('');
    setNewEmoji(HABIT_EMOJIS[0]);
    setNewColor(HABIT_COLORS[0]);
    setIsAdding(false);
  };

  /*
    FUNÇÃO: handleDelete
    PARA QUE SERVE: Exclui um hábito (com dupla confirmação para não apagar sem querer).
  */
  const handleDelete = (habitId) => {
    if (confirmDeleteId === habitId) {
      onSaveHabits(habits.filter(h => h.id !== habitId));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(habitId);
    }
  };

  // Mensagem motivacional conforme o progresso do dia
  const getMotivation = () => {
    if (totalToday === 0) return 'Comece criando seu primeiro hábito! 🌱';
    if (percentToday === 100) return 'Dia perfeito! Você cumpriu tudo hoje! 🎉';
    if (percentToday >= 50) return 'Você está mandando muito bem hoje! 💪';
    if (percentToday > 0) return 'Bom começo! Continue firme. 🚀';
    return 'Vamos lá! Marque seu primeiro hábito de hoje. ⚡';
  };

  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* CABEÇALHO COM VOLTAR AO MENU */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('menu')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} />
          Voltar ao Menu
        </button>
        <div style={styles.titleArea}>
          <Target size={22} color="#45C4A0" />
          <h2 style={styles.title}>Hábitos {activeProfile ? `— ${activeProfile.split(' ')[0]}` : ''}</h2>
        </div>
      </header>

      {/* PAINEL DE GAMIFICAÇÃO (Nível, XP, Ofensiva, Progresso do dia) */}
      <section style={styles.heroCard} className="glass-panel">
        <div style={styles.heroTop}>
          {/* Nível e XP */}
          <div style={styles.levelBlock}>
            <div style={styles.levelBadge}>
              <Zap size={18} color="#EEA53D" />
              <span>Nível {level}</span>
            </div>
            <div style={styles.xpBarBg}>
              <div style={{ ...styles.xpBarFill, width: `${xpIntoLevel}%` }} />
            </div>
            <span style={styles.xpText}>{xp} XP • faltam {100 - xpIntoLevel} XP para o nível {level + 1}</span>
          </div>

          {/* Ofensiva e conquistas rápidas */}
          <div style={styles.heroStats}>
            <div style={styles.heroStat}>
              <Flame size={20} color="#EF8354" />
              <div>
                <strong style={styles.heroStatVal}>{bestStreak}</strong>
                <span style={styles.heroStatLabel}>Ofensiva (dias)</span>
              </div>
            </div>
            <div style={styles.heroStat}>
              <Trophy size={20} color="#EEA53D" />
              <div>
                <strong style={styles.heroStatVal}>{completions}</strong>
                <span style={styles.heroStatLabel}>Conclusões</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progresso de HOJE */}
        <div style={styles.todayBlock}>
          <div style={styles.todayMeta}>
            <span style={styles.todayLabel}>Progresso de hoje</span>
            <strong style={styles.todayCount}>{doneToday}/{totalToday} • {percentToday}%</strong>
          </div>
          <div style={styles.todayBarBg}>
            <div style={{ ...styles.todayBarFill, width: `${percentToday}%` }} />
          </div>
          <p style={styles.motivation}>{getMotivation()}</p>
        </div>
      </section>

      {/* BOTÃO / FORMULÁRIO DE NOVO HÁBITO */}
      {!isAdding ? (
        <button onClick={() => setIsAdding(true)} className="btn-primary" style={styles.addBtn}>
          <Plus size={18} />
          Novo Hábito
        </button>
      ) : (
        <form onSubmit={handleAddHabit} style={styles.addForm} className="glass-panel">
          <div style={styles.formRowTop}>
            <span style={styles.formPreviewEmoji}>{newEmoji}</span>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Ex: Beber 2L de água"
              className="form-input"
              style={{ flex: 1 }}
              maxLength={40}
              autoFocus
            />
          </div>

          {/* Escolha de emoji */}
          <div style={styles.pickerRow}>
            {HABIT_EMOJIS.map(em => (
              <button
                type="button"
                key={em}
                onClick={() => setNewEmoji(em)}
                style={{ ...styles.emojiPick, ...(newEmoji === em ? styles.emojiPickActive : {}) }}
              >
                {em}
              </button>
            ))}
          </div>

          {/* Escolha de cor */}
          <div style={styles.pickerRow}>
            {HABIT_COLORS.map(col => (
              <button
                type="button"
                key={col}
                onClick={() => setNewColor(col)}
                style={{
                  ...styles.colorPick,
                  background: col,
                  outline: newColor === col ? `2px solid #fff` : '2px solid transparent',
                }}
                title="Escolher cor"
              />
            ))}
          </div>

          <div style={styles.formActions}>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Check size={16} /> Criar Hábito
            </button>
            <button
              type="button"
              onClick={() => { setIsAdding(false); setNewName(''); }}
              className="btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTA DE HÁBITOS */}
      {habits.length === 0 ? (
        <div style={styles.emptyBox} className="glass-panel">
          <Sparkles size={52} style={{ color: '#3B434F', marginBottom: '14px' }} />
          <h3 style={styles.emptyTitle}>Nenhum hábito ainda</h3>
          <p style={styles.emptyDesc}>
            Crie seu primeiro hábito e comece a construir sua rotina dos sonhos, um dia de cada vez! 🌱
          </p>
        </div>
      ) : (
        <div style={styles.habitList}>
          {habits.map(habit => {
            const isDone = !!habit.history?.[today];
            const streak = computeStreak(habit);
            const isCelebrating = justDone === habit.id;
            const isConfirming = confirmDeleteId === habit.id;

            return (
              <div key={habit.id} style={{ ...styles.habitCard, borderLeft: `4px solid ${habit.color}` }} className="glass-panel">
                <div style={styles.habitMain}>
                  {/* Emoji + nome + ofensiva */}
                  <div style={styles.habitInfo}>
                    <span style={styles.habitEmoji}>{habit.emoji}</span>
                    <div>
                      <h4 style={styles.habitName}>{habit.name}</h4>
                      <span style={styles.habitStreak}>
                        <Flame size={13} color={streak > 0 ? '#EF8354' : '#57606C'} />
                        {streak > 0 ? `${streak} ${streak === 1 ? 'dia seguido' : 'dias seguidos'}` : 'Sem ofensiva ainda'}
                      </span>
                    </div>
                  </div>

                  {/* Botão grande de concluir hoje */}
                  <button
                    onClick={() => handleToggleToday(habit.id)}
                    style={{
                      ...styles.doneBtn,
                      ...(isDone
                        ? { background: habit.color, borderColor: habit.color, color: '#fff' }
                        : { color: habit.color, borderColor: `${habit.color}66` }),
                    }}
                    className={isCelebrating ? 'habit-celebrate' : ''}
                    title={isDone ? 'Cumprido hoje! (clique para desmarcar)' : 'Marcar como cumprido hoje'}
                  >
                    <Check size={22} strokeWidth={3} />
                  </button>
                </div>

                {/* Histórico dos últimos 7 dias */}
                <div style={styles.weekRow}>
                  {week.map(dayKey => {
                    const done = !!habit.history?.[dayKey];
                    const isToday = dayKey === today;
                    return (
                      <div
                        key={dayKey}
                        style={{
                          ...styles.dayDot,
                          background: done ? habit.color : 'rgba(255,255,255,0.05)',
                          border: isToday ? `1.5px solid ${habit.color}` : '1.5px solid transparent',
                        }}
                        title={dayKey + (done ? ' • cumprido' : '')}
                      />
                    );
                  })}
                  {/* Botão de excluir */}
                  {isConfirming ? (
                    <div style={styles.confirmRow}>
                      <button onClick={() => handleDelete(habit.id)} style={styles.confirmDelBtn}>Apagar</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={styles.confirmCancelBtn}>Não</button>
                    </div>
                  ) : (
                    <button onClick={() => handleDelete(habit.id)} style={styles.delBtn} title="Excluir hábito">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                {/* Balãozinho comemorativo de XP */}
                {isCelebrating && <span style={styles.xpPop}>+10 XP ✨</span>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS DO MÓDULO DE HÁBITOS
// -----------------------------------------------------------------------------
const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', fontSize: '13px' },
  titleArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '22px', fontWeight: '800', color: '#ffffff' },

  heroCard: { padding: '24px', marginBottom: '22px', display: 'flex', flexDirection: 'column', gap: '22px' },
  heroTop: { display: 'flex', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' },
  levelBlock: { flex: '1 1 280px', display: 'flex', flexDirection: 'column', gap: '8px' },
  levelBadge: {
    display: 'inline-flex', alignItems: 'center', gap: '6px', alignSelf: 'flex-start',
    background: 'rgba(238, 165, 61, 0.12)', color: '#EEA53D', fontWeight: '800',
    fontSize: '15px', padding: '5px 14px', borderRadius: '100px',
  },
  xpBarBg: { width: '100%', height: '10px', background: '#22252B', borderRadius: '10px', overflow: 'hidden' },
  xpBarFill: { height: '100%', background: 'linear-gradient(90deg, #EEA53D 0%, #EF8354 100%)', borderRadius: '10px', transition: 'width 0.4s ease' },
  xpText: { fontSize: '12px', color: '#99A1AC', fontWeight: '600' },

  heroStats: { display: 'flex', gap: '16px' },
  heroStat: { display: 'flex', alignItems: 'center', gap: '10px' },
  heroStatVal: { fontSize: '24px', fontWeight: '800', color: '#ffffff', display: 'block', lineHeight: 1 },
  heroStatLabel: { fontSize: '11px', color: '#99A1AC', fontWeight: '600', textTransform: 'uppercase' },

  todayBlock: { borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '18px' },
  todayMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' },
  todayLabel: { fontSize: '13px', fontWeight: '700', color: '#C8CED6', textTransform: 'uppercase', letterSpacing: '0.5px' },
  todayCount: { fontSize: '15px', color: '#45C4A0', fontWeight: '800' },
  todayBarBg: { width: '100%', height: '12px', background: '#22252B', borderRadius: '10px', overflow: 'hidden' },
  todayBarFill: { height: '100%', background: 'linear-gradient(90deg, #45C4A0 0%, #3ECF8E 100%)', borderRadius: '10px', transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)' },
  motivation: { fontSize: '14px', color: '#99A1AC', marginTop: '12px', fontWeight: '500' },

  addBtn: { marginBottom: '22px' },
  addForm: { padding: '20px', marginBottom: '22px', display: 'flex', flexDirection: 'column', gap: '16px' },
  formRowTop: { display: 'flex', alignItems: 'center', gap: '12px' },
  formPreviewEmoji: {
    fontSize: '24px', width: '48px', height: '48px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', flexShrink: 0,
  },
  pickerRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  emojiPick: {
    fontSize: '18px', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', transition: 'all 0.15s ease',
  },
  emojiPickActive: { background: 'rgba(232,147,63,0.2)', border: '1px solid #E8933F', transform: 'scale(1.1)' },
  colorPick: { width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', border: 'none', outlineOffset: '2px' },
  formActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },

  emptyBox: { padding: '48px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  emptyTitle: { fontSize: '19px', fontWeight: '800', color: '#fff', marginBottom: '8px' },
  emptyDesc: { fontSize: '14px', color: '#99A1AC', maxWidth: '420px', lineHeight: '1.6' },

  habitList: { display: 'flex', flexDirection: 'column', gap: '14px', paddingBottom: '40px' },
  habitCard: { position: 'relative', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  habitMain: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' },
  habitInfo: { display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 },
  habitEmoji: {
    fontSize: '24px', width: '48px', height: '48px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', flexShrink: 0,
  },
  habitName: { fontSize: '16px', fontWeight: '700', color: '#ffffff', marginBottom: '3px', wordBreak: 'break-word' },
  habitStreak: { display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#99A1AC', fontWeight: '600' },
  doneBtn: {
    width: '52px', height: '52px', borderRadius: '14px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', cursor: 'pointer', background: 'transparent', border: '2px solid',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)', flexShrink: 0,
  },
  weekRow: { display: 'flex', alignItems: 'center', gap: '7px' },
  dayDot: { width: '20px', height: '20px', borderRadius: '6px', transition: 'all 0.2s ease' },
  delBtn: {
    marginLeft: 'auto', background: 'transparent', border: 'none', color: '#57606C',
    cursor: 'pointer', padding: '6px', borderRadius: '8px', display: 'flex', transition: 'color 0.2s ease',
  },
  confirmRow: { marginLeft: 'auto', display: 'flex', gap: '6px', alignItems: 'center' },
  confirmDelBtn: {
    background: '#E5484D', color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: '700', padding: '5px 10px', cursor: 'pointer',
  },
  confirmCancelBtn: {
    background: 'transparent', color: '#99A1AC', border: 'none',
    fontSize: '12px', fontWeight: '700', padding: '5px 8px', cursor: 'pointer',
  },
  xpPop: {
    position: 'absolute', top: '14px', right: '18px', color: '#EEA53D', fontWeight: '800',
    fontSize: '15px', pointerEvents: 'none', animation: 'xpFloat 1.2s ease forwards',
  },
};

/* Folha de estilos extra: animações de comemoração e hovers */
const extraHabitStyles = `
@keyframes habitPop {
  0% { transform: scale(1); }
  40% { transform: scale(1.25); box-shadow: 0 0 22px rgba(69, 196, 160, 0.5); }
  100% { transform: scale(1); }
}
.habit-celebrate {
  animation: habitPop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes xpFloat {
  0% { opacity: 0; transform: translateY(6px); }
  30% { opacity: 1; transform: translateY(-2px); }
  100% { opacity: 0; transform: translateY(-16px); }
}
.habitCard span[style*="pointerEvents"] { }
.delBtn:hover { color: #E5484D !important; }
.emojiPick:hover { background: rgba(255,255,255,0.08) !important; }
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = extraHabitStyles;
  document.head.appendChild(styleSheet);
}

/*
  =============================================================================
  ARQUIVO: src/pages/DreamsMode.jsx
  PARA QUE SERVE: O Quadro dos Sonhos do casal. Aqui ficam os objetivos que Bruno
  e Bruna querem realizar juntos (viagem, casa, carro...). Cada sonho tem emoji,
  título, descrição, data-alvo e uma barra de progresso que vocês atualizam
  conforme avançam. Ao chegar em 100%, o sonho é marcado como REALIZADO. 🎉
  O acervo é COMPARTILHADO: os dois veem e editam o mesmo quadro.
  =============================================================================
*/

import React, { useState } from 'react';
import {
  ArrowLeft, Plus, Sparkles, Trash2, Check, Pencil, CalendarDays, PartyPopper
} from 'lucide-react';

const DREAM_EMOJIS = ['✈️', '🏡', '🚗', '💍', '👶', '🎓', '💰', '🏖️', '⛪', '🐶', '🚀', '🌟'];
const DREAM_COLORS = ['#E77950', '#E8933F', '#3ECF8E', '#6FA8D6', '#D96A8F', '#45C4A0'];

const EMPTY_FORM = { title: '', description: '', emoji: DREAM_EMOJIS[0], color: DREAM_COLORS[0], targetDate: '', progress: 0 };

export default function DreamsMode({ dreams = [], onSaveDreams, onNavigate }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null); // id do sonho em edição (null = criando)
  const [form, setForm] = useState(EMPTY_FORM);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [celebrating, setCelebrating] = useState(null);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setIsFormOpen(true);
  };

  const openEdit = (dream) => {
    setForm({
      title: dream.title,
      description: dream.description || '',
      emoji: dream.emoji || DREAM_EMOJIS[0],
      color: dream.color || DREAM_COLORS[0],
      targetDate: dream.targetDate || '',
      progress: dream.progress || 0,
    });
    setEditingId(dream.id);
    setIsFormOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;

    if (editingId) {
      onSaveDreams(dreams.map(d => d.id === editingId
        ? { ...d, ...form, title, achieved: form.progress >= 100 }
        : d));
    } else {
      const newDream = {
        id: `dream-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        ...form,
        title,
        achieved: false,
        createdAt: new Date().toISOString(),
      };
      onSaveDreams([...dreams, newDream]);
    }
    setIsFormOpen(false);
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  // Atualiza o progresso pelo slider do cartão; 100% = sonho realizado
  const handleProgress = (dreamId, value) => {
    const progress = Number(value);
    let realized = false;
    const updated = dreams.map(d => {
      if (d.id !== dreamId) return d;
      if (progress >= 100 && !d.achieved) realized = true;
      return { ...d, progress, achieved: progress >= 100 };
    });
    onSaveDreams(updated);
    if (realized) {
      setCelebrating(dreamId);
      setTimeout(() => setCelebrating(null), 2000);
    }
  };

  const handleDelete = (dreamId) => {
    if (confirmDeleteId === dreamId) {
      onSaveDreams(dreams.filter(d => d.id !== dreamId));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(dreamId);
    }
  };

  // Ativos primeiro, realizados no fim
  const sorted = [...dreams].sort((a, b) => (a.achieved === b.achieved ? 0 : a.achieved ? 1 : -1));
  const achievedCount = dreams.filter(d => d.achieved).length;

  const formatDate = (iso) => {
    if (!iso) return null;
    const [y, m, d] = iso.split('-');
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease', maxWidth: '1080px' }}>

      {/* CABEÇALHO */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('menu')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} /> Cérebro
        </button>
        <div style={styles.titleArea}>
          <Sparkles size={20} color="#E77950" />
          <h2 style={styles.title}>Metas</h2>
        </div>
      </header>

      <p style={styles.pageIntro}>
        Os objetivos de vocês dois, num só lugar. {dreams.length > 0 && (
          <strong style={{ color: '#E77950' }}>{achievedCount} de {dreams.length} realizados.</strong>
        )}
      </p>

      {/* BOTÃO / FORMULÁRIO */}
      {!isFormOpen ? (
        <button onClick={openCreate} className="btn-primary" style={{ marginBottom: '24px' }}>
          <Plus size={18} /> Novo Sonho
        </button>
      ) : (
        <form onSubmit={handleSubmit} style={styles.form} className="glass-panel">
          <h3 style={styles.formTitle}>{editingId ? 'Editar sonho' : 'Qual é o sonho?'}</h3>

          <div style={styles.formRow}>
            <span style={styles.formEmoji}>{form.emoji}</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ex: Conhecer a Itália"
              className="form-input"
              style={{ flex: 1 }}
              maxLength={60}
              autoFocus
            />
          </div>

          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Descrição (opcional) — ex: 15 dias entre Roma e Toscana"
            className="form-input"
            maxLength={140}
          />

          {/* Emoji e cor */}
          <div style={styles.pickerRow}>
            {DREAM_EMOJIS.map(em => (
              <button
                type="button"
                key={em}
                onClick={() => setForm({ ...form, emoji: em })}
                style={{ ...styles.emojiPick, ...(form.emoji === em ? styles.emojiPickActive : {}) }}
              >
                {em}
              </button>
            ))}
          </div>
          <div style={styles.pickerRow}>
            {DREAM_COLORS.map(col => (
              <button
                type="button"
                key={col}
                onClick={() => setForm({ ...form, color: col })}
                style={{
                  ...styles.colorPick, background: col,
                  outline: form.color === col ? '2px solid #fff' : '2px solid transparent',
                }}
              />
            ))}
          </div>

          {/* Data-alvo */}
          <div style={styles.dateRow}>
            <label style={styles.dateLabel}>
              <CalendarDays size={15} color="#99A1AC" />
              Data-alvo (opcional):
            </label>
            <input
              type="date"
              value={form.targetDate}
              onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
              className="form-input"
              style={{ width: 'auto', padding: '9px 12px', colorScheme: 'dark' }}
            />
          </div>

          <div style={styles.formActions}>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Check size={16} /> {editingId ? 'Salvar alterações' : 'Adicionar ao quadro'}
            </button>
            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setEditingId(null); }}
              className="btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* QUADRO */}
      {dreams.length === 0 && !isFormOpen ? (
        <div className="glass-panel empty-state">
          <Sparkles size={52} style={{ color: '#3B434F', marginBottom: '16px' }} />
          <h3 style={styles.emptyTitle}>O quadro está esperando</h3>
          <p style={styles.emptyDesc}>
            Adicionem o primeiro sonho de vocês — uma viagem, a casa própria, o que for.
            Aqui vocês acompanham o progresso juntos.
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {sorted.map(dream => {
            const color = dream.color || '#E77950';
            const isConfirming = confirmDeleteId === dream.id;
            const isCelebrating = celebrating === dream.id;
            const dateStr = formatDate(dream.targetDate);

            return (
              <div
                key={dream.id}
                style={{
                  ...styles.dreamCard,
                  ...(dream.achieved ? { borderColor: `${color}66`, background: `linear-gradient(180deg, ${color}14 0%, var(--bg-secondary) 60%)` } : {}),
                }}
                className={`glass-panel dream-card ${isCelebrating ? 'animate-success' : ''}`}
              >
                {dream.achieved && (
                  <span style={{ ...styles.achievedBadge, background: `${color}22`, color }}>
                    <PartyPopper size={12} /> Realizado
                  </span>
                )}

                <div style={styles.dreamTop}>
                  <span style={{ ...styles.dreamEmoji, background: `${color}1A` }}>{dream.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={styles.dreamTitle}>{dream.title}</h3>
                    {dream.description && <p style={styles.dreamDesc}>{dream.description}</p>}
                    {dateStr && (
                      <span style={styles.dateChip}>
                        <CalendarDays size={11} /> {dateStr}
                      </span>
                    )}
                  </div>
                </div>

                {/* PROGRESSO */}
                <div style={styles.progressBlock}>
                  <div style={styles.progressMeta}>
                    <span style={styles.progressLabel}>Progresso</span>
                    <strong style={{ color, fontSize: '14px' }}>{dream.progress || 0}%</strong>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={dream.progress || 0}
                    onChange={(e) => handleProgress(dream.id, e.target.value)}
                    style={{ ...styles.slider, accentColor: color }}
                    title="Arraste para atualizar o progresso"
                  />
                </div>

                {/* AÇÕES */}
                <div style={styles.dreamActions}>
                  <button onClick={() => openEdit(dream)} style={styles.smallActionBtn} title="Editar">
                    <Pencil size={14} />
                  </button>
                  {isConfirming ? (
                    <span style={styles.confirmRow}>
                      <button onClick={() => handleDelete(dream.id)} style={styles.confirmDelBtn}>Apagar</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={styles.confirmCancelBtn}>Não</button>
                    </span>
                  ) : (
                    <button onClick={() => handleDelete(dream.id)} style={styles.smallActionBtn} title="Excluir">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '10px', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', fontSize: '13px', width: 'auto' },
  titleArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '24px', color: '#F4F5F7' },
  pageIntro: { color: '#99A1AC', fontSize: '15px', marginBottom: '22px' },

  form: { padding: '22px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  formTitle: { fontSize: '19px', color: '#F4F5F7' },
  formRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  formEmoji: {
    fontSize: '24px', width: '48px', height: '48px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', background: 'var(--bg-tertiary)', borderRadius: '12px', flexShrink: 0,
  },
  pickerRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  emojiPick: {
    fontSize: '18px', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer',
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', transition: 'all 0.15s ease',
  },
  emojiPickActive: { background: 'rgba(231, 121, 80, 0.2)', border: '1px solid #E77950', transform: 'scale(1.1)' },
  colorPick: { width: '30px', height: '30px', borderRadius: '50%', cursor: 'pointer', border: 'none', outlineOffset: '2px' },
  dateRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  dateLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#99A1AC', fontWeight: 700 },
  formActions: { display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' },

  emptyTitle: { fontSize: '20px', color: '#F4F5F7', marginBottom: '8px' },
  emptyDesc: { color: '#99A1AC', fontSize: '14px', maxWidth: '440px', lineHeight: 1.6 },

  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
    gap: '14px', paddingBottom: '40px', alignItems: 'start',
  },
  dreamCard: {
    position: 'relative', padding: '20px', display: 'flex', flexDirection: 'column',
    gap: '16px', transition: 'all 0.25s ease',
  },
  achievedBadge: {
    position: 'absolute', top: '14px', right: '14px', display: 'inline-flex',
    alignItems: 'center', gap: '4px', fontSize: '11px', fontWeight: 800,
    padding: '3px 10px', borderRadius: '100px',
  },
  dreamTop: { display: 'flex', gap: '14px', alignItems: 'flex-start' },
  dreamEmoji: {
    fontSize: '26px', width: '52px', height: '52px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: '14px', flexShrink: 0,
  },
  dreamTitle: { fontSize: '18px', color: '#F4F5F7', marginBottom: '4px', wordBreak: 'break-word' },
  dreamDesc: { fontSize: '13px', color: '#99A1AC', lineHeight: 1.5, marginBottom: '6px' },
  dateChip: {
    display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px',
    fontWeight: 800, color: '#99A1AC', background: 'var(--bg-tertiary)',
    padding: '3px 10px', borderRadius: '100px',
  },
  progressBlock: { display: 'flex', flexDirection: 'column', gap: '6px' },
  progressMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: {
    fontSize: '11px', fontWeight: 800, color: '#7A828E',
    textTransform: 'uppercase', letterSpacing: '0.6px',
  },
  slider: { width: '100%', cursor: 'pointer', height: '6px' },
  dreamActions: { display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' },
  smallActionBtn: {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', color: '#99A1AC', padding: '7px', cursor: 'pointer',
    display: 'flex', transition: 'all 0.2s ease',
  },
  confirmRow: { display: 'flex', gap: '6px', alignItems: 'center' },
  confirmDelBtn: {
    background: '#E5484D', color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: 800, padding: '6px 12px', cursor: 'pointer',
  },
  confirmCancelBtn: {
    background: 'transparent', color: '#99A1AC', border: 'none',
    fontSize: '12px', fontWeight: 800, padding: '6px 8px', cursor: 'pointer',
  },
};

const extraDreamStyles = `
.dream-card:hover { border-color: rgba(255, 255, 255, 0.14) !important; }
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = extraDreamStyles;
  document.head.appendChild(styleSheet);
}

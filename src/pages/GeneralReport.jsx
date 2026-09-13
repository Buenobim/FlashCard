/*
  =============================================================================
  ARQUIVO: src/pages/GeneralReport.jsx
  PARA QUE SERVE: O Relatório Geral da casa — a visão de Bruno e Bruna JUNTOS.
  Lê os dados reais dos dois perfis direto do banco local (que é espelho da
  nuvem): sessões de estudo, hábitos de hoje e sequências, e o resumo financeiro
  do mês de cada um + o total do casal.
  =============================================================================
*/

import React from 'react';
import {
  ArrowLeft, BarChart3, Wallet, GraduationCap, Target, Flame,
  TrendingUp, TrendingDown, Sparkles
} from 'lucide-react';
import { getStats, getHabits, getFinance, getSets, getDreams } from '../utils/db';

const PROFILES = ['Bruno Bueno', 'Bruna Bueno'];
const PROFILE_COLORS = { 'Bruno Bueno': '#6C8FD9', 'Bruna Bueno': '#D96A8F' };

// ---------- Cálculos auxiliares ----------

function fmtDay(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function computeStreak(habit) {
  const history = habit.history || {};
  let streak = 0;
  const d = new Date();
  if (!history[fmtDay(d)]) d.setDate(d.getDate() - 1);
  while (history[fmtDay(d)]) { streak++; d.setDate(d.getDate() - 1); }
  return streak;
}

// Resumo do mês corrente das finanças de um perfil
function financeMonthSummary(finance) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  let income = 0, expense = 0;
  (finance.transactions || []).forEach(tx => {
    const d = (tx.date || tx.createdAt || '').slice(0, 7);
    if (d !== prefix) return;
    const value = Number(tx.amount ?? tx.value ?? 0) || 0;
    const type = tx.type || (value >= 0 ? 'income' : 'expense');
    if (type === 'income' || type === 'entrada' || type === 'receita') income += Math.abs(value);
    else expense += Math.abs(value);
  });
  return { income, expense, balance: income - expense };
}

const brl = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export default function GeneralReport({ onNavigate }) {
  const today = fmtDay(new Date());

  // Coleta os dados reais de cada perfil
  const data = PROFILES.map(profile => {
    const stats = getStats(profile);
    const habits = getHabits(profile);
    const doneToday = habits.filter(h => h.history?.[today]).length;
    const bestStreak = habits.reduce((max, h) => Math.max(max, computeStreak(h)), 0);
    return {
      profile,
      color: PROFILE_COLORS[profile],
      firstName: profile.split(' ')[0],
      stats,
      habitsTotal: habits.length,
      habitsDoneToday: doneToday,
      bestStreak,
    };
  });

  // Dados compartilhados
  const sets = getSets(PROFILES[0]);
  const totalCards = sets.reduce((acc, s) => acc + (s.cards?.length || 0), 0);
  const dreams = getDreams();
  const dreamsAchieved = dreams.filter(d => d.achieved).length;

  // Finanças agora são COMPARTILHADAS (do casal): lê uma vez só, sem somar por perfil.
  const combined = financeMonthSummary(getFinance());

  const monthName = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease', maxWidth: '1080px' }}>

      {/* CABEÇALHO */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('menu')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} /> Menu
        </button>
        <div style={styles.titleArea}>
          <BarChart3 size={20} color="#E8933F" />
          <h2 style={styles.title}>Relatório Geral</h2>
        </div>
      </header>

      <p style={styles.pageIntro}>Bruno &amp; Bruna juntos — {monthName}.</p>

      {/* RESUMO DO CASAL */}
      <section style={styles.combinedStrip} className="glass-panel">
        <div style={styles.combinedItem}>
          <span style={styles.combinedLabel}><TrendingUp size={14} color="#3ECF8E" /> Entradas do casal</span>
          <strong style={{ ...styles.combinedVal, color: '#3ECF8E' }}>{brl(combined.income)}</strong>
        </div>
        <div style={styles.combinedItem}>
          <span style={styles.combinedLabel}><TrendingDown size={14} color="#E5484D" /> Saídas do casal</span>
          <strong style={{ ...styles.combinedVal, color: '#E5484D' }}>{brl(combined.expense)}</strong>
        </div>
        <div style={styles.combinedItem}>
          <span style={styles.combinedLabel}><Wallet size={14} color="#E8933F" /> Saldo do mês</span>
          <strong style={{ ...styles.combinedVal, color: combined.balance >= 0 ? '#3ECF8E' : '#E5484D' }}>
            {brl(combined.balance)}
          </strong>
        </div>
        <div style={styles.combinedItem}>
          <span style={styles.combinedLabel}><Sparkles size={14} color="#E77950" /> Sonhos realizados</span>
          <strong style={styles.combinedVal}>{dreamsAchieved} de {dreams.length}</strong>
        </div>
      </section>

      {/* CARTÕES POR PESSOA */}
      <div style={styles.personGrid}>
        {data.map(p => (
          <div key={p.profile} style={styles.personCard} className="glass-panel">
            <div style={styles.personHeader}>
              <span style={{ ...styles.personAvatar, background: `${p.color}22`, color: p.color }}>
                {p.firstName[0]}
              </span>
              <h3 style={styles.personName}>{p.firstName}</h3>
            </div>

            <div style={styles.personRows}>
              {/* Estudos */}
              <div style={styles.personRow}>
                <span style={styles.rowLabel}><GraduationCap size={15} color="#E8933F" /> Sessões de estudo</span>
                <strong style={styles.rowVal}>{p.stats.setsStudied}</strong>
              </div>
              <div style={styles.personRow}>
                <span style={styles.rowLabel}><Target size={15} color="#45C4A0" /> Hábitos de hoje</span>
                <strong style={styles.rowVal}>
                  {p.habitsTotal > 0 ? `${p.habitsDoneToday}/${p.habitsTotal}` : '—'}
                </strong>
              </div>
              <div style={styles.personRow}>
                <span style={styles.rowLabel}><Flame size={15} color="#EF8354" /> Melhor sequência</span>
                <strong style={styles.rowVal}>{p.bestStreak} {p.bestStreak === 1 ? 'dia' : 'dias'}</strong>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ACERVO COMPARTILHADO */}
      <section style={styles.sharedStrip} className="glass-panel">
        <span style={styles.sharedText}>
          Acervo compartilhado: <strong style={{ color: '#F4F5F7' }}>{sets.length} baralhos</strong> com{' '}
          <strong style={{ color: '#F4F5F7' }}>{totalCards} cartões</strong> e{' '}
          <strong style={{ color: '#F4F5F7' }}>{dreams.length} sonhos</strong> no quadro.
        </span>
      </section>
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '10px', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', fontSize: '13px', width: 'auto' },
  titleArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '24px', color: '#F4F5F7' },
  pageIntro: { color: '#99A1AC', fontSize: '15px', marginBottom: '22px', textTransform: 'capitalize' },

  combinedStrip: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '18px', padding: '20px 22px', marginBottom: '18px',
  },
  combinedItem: { display: 'flex', flexDirection: 'column', gap: '5px' },
  combinedLabel: {
    display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px',
    fontWeight: 800, color: '#7A828E', textTransform: 'uppercase', letterSpacing: '0.4px',
  },
  combinedVal: { fontSize: '20px', fontWeight: 800, color: '#F4F5F7' },

  personGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '14px', marginBottom: '18px',
  },
  personCard: { padding: '22px' },
  personHeader: { display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' },
  personAvatar: {
    width: '44px', height: '44px', borderRadius: '12px', display: 'flex',
    justifyContent: 'center', alignItems: 'center', fontSize: '20px',
    fontWeight: 800, fontFamily: 'var(--font-display)',
  },
  personName: { fontSize: '21px', color: '#F4F5F7' },
  personRows: { display: 'flex', flexDirection: 'column', gap: '12px' },
  personRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  rowLabel: { display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#99A1AC', fontWeight: 600 },
  rowVal: { fontSize: '15px', fontWeight: 800, color: '#F4F5F7' },
  divider: { border: 'none', height: '1px', background: 'var(--border-subtle)', margin: '4px 0' },

  sharedStrip: { padding: '16px 22px', marginBottom: '40px', textAlign: 'center' },
  sharedText: { fontSize: '14px', color: '#99A1AC', fontWeight: 600 },
};

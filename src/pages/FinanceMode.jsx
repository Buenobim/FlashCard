/*
  =============================================================================
  ARQUIVO: src/pages/FinanceMode.jsx
  PARA QUE SERVE: Este é o módulo "Finanças" completo da plataforma. Ele funciona
  como um controle financeiro pessoal do estudante ativo (Bruno ou Bruna):
    • Lançar RECEITAS (salário, freelance, lucro da empresa 3D...) e DESPESAS.
    • Cadastrar CONTAS FIXAS mensais (aluguel, assinaturas, salário fixo) que
      entram automaticamente em todos os meses.
    • Anexar o RECIBO (foto) de cada lançamento.
    • Navegar mês a mês e ver Receitas, Despesas, Saldo e Fixas.
    • Definir uma META de gastos e acompanhar o quanto já gastou.
    • Ver a quebra de gastos POR CATEGORIA.
    • Relatórios SEMANAL e MENSAL (com comparação ao mês anterior).
  Tudo salvo de forma híbrida (LocalStorage + Firebase), isolado por perfil.
  =============================================================================
*/

import React, { useState } from 'react';
import {
  ArrowLeft, Plus, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Wallet,
  Pencil, Trash2, X, Repeat, Target, Calendar, PieChart, Image as ImageIcon, Check, User
} from 'lucide-react';

/* -----------------------------------------------------------------------------
   AUTOR DO LANÇAMENTO (selo de quem criou): cor por pessoa
----------------------------------------------------------------------------- */
function authorMeta(name) {
  if (!name) return null;
  const first = String(name).split(' ')[0];
  const palette = { bruno: '#6C8FD9', bruna: '#D96A8F' };
  return { label: first, color: palette[first.toLowerCase()] || '#7A828E' };
}

/* -----------------------------------------------------------------------------
   CATEGORIAS (com emoji e cor para dar identidade visual)
----------------------------------------------------------------------------- */
const INCOME_CATEGORIES = [
  { key: 'salario', label: 'Salário', emoji: '💰', color: '#3ECF8E' },
  { key: 'freelance', label: 'Freelance', emoji: '💻', color: '#06b6d4' },
  { key: 'empresa3d', label: 'Empresa 3D', emoji: '🖨️', color: '#D96A8F' },
  { key: 'investimentos', label: 'Investimentos', emoji: '📈', color: '#22c55e' },
  { key: 'presente', label: 'Presente', emoji: '🎁', color: '#E77950' },
  { key: 'outros_rec', label: 'Outros', emoji: '➕', color: '#7A828E' },
];
const EXPENSE_CATEGORIES = [
  { key: 'moradia', label: 'Moradia', emoji: '🏠', color: '#EEA53D' },
  { key: 'alimentacao', label: 'Alimentação', emoji: '🍽️', color: '#E5484D' },
  { key: 'transporte', label: 'Transporte', emoji: '🚗', color: '#6C8FD9' },
  { key: 'saude', label: 'Saúde', emoji: '🏥', color: '#45C4A0' },
  { key: 'educacao', label: 'Educação', emoji: '📚', color: '#E8933F' },
  { key: 'lazer', label: 'Lazer', emoji: '🎮', color: '#E77950' },
  { key: 'contas', label: 'Contas', emoji: '🧾', color: '#EF8354' },
  { key: 'assinaturas', label: 'Assinaturas', emoji: '📺', color: '#d946ef' },
  { key: 'compras', label: 'Compras', emoji: '🛍️', color: '#eab308' },
  { key: 'outros_desp', label: 'Outros', emoji: '📦', color: '#7A828E' },
];

function catsFor(type) { return type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES; }
function getCat(key, type) {
  return catsFor(type).find(c => c.key === key) || { key, label: 'Outros', emoji: '📦', color: '#7A828E' };
}

/* -----------------------------------------------------------------------------
   AJUDANTES DE DATA E DINHEIRO
----------------------------------------------------------------------------- */
// Formata em Reais: 1234.5 -> "R$ 1.234,50"
function formatBRL(n) {
  return (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
// Data local no formato "AAAA-MM-DD"
function fmtDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
// Chave do mês "AAAA-MM"
function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}
// Rótulo bonito do mês (ex: "julho de 2026")
function monthLabel(d) {
  return d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}
// Segunda-feira da semana de uma data
function startOfWeek(d) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
// Comprime uma foto de recibo para não pesar no armazenamento
function compressReceipt(base64) {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const MAX_W = 800, MAX_H = 1100;
      let w = img.width, h = img.height;
      if (w > h) { if (w > MAX_W) { h = Math.round(h * MAX_W / w); w = MAX_W; } }
      else { if (h > MAX_H) { w = Math.round(w * MAX_H / h); h = MAX_H; } }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
  });
}

/*
  COMPONENTE: FinanceMode
  PROPS:
    - finance: { transactions, recurring, budget } do perfil ativo.
    - onSaveFinance: grava o objeto financeiro atualizado (local + nuvem).
    - onNavigate: volta ao Menu.
    - activeProfile: nome do estudante logado.
*/
export default function FinanceMode({ finance, onSaveFinance, onNavigate, activeProfile }) {
  const transactions = finance?.transactions || [];
  const recurring = finance?.recurring || [];
  const budget = finance?.budget ?? null;
  const initialBalance = finance?.initialBalance ?? 0; // dinheiro já guardado antes do app

  const [viewMonth, setViewMonth] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [activeTab, setActiveTab] = useState('resumo'); // resumo | lancamentos | fixas | relatorios
  const [lightbox, setLightbox] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget || '');
  const [editingBalance, setEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(initialBalance || '');

  // Estado do modal de lançamento (mode: 'tx' = lançamento avulso | 'recurring' = conta fixa)
  const [modal, setModal] = useState(null); // { mode, editingId }
  const [form, setForm] = useState(null);

  const mk = monthKey(viewMonth);

  /* ---------- Cálculos do mês visualizado ---------- */
  const oneOff = transactions.filter(t => (t.date || '').startsWith(mk));
  const recActive = recurring.filter(r => r.active !== false);
  const recVirtual = recActive.map(r => ({
    ...r,
    _recurringId: r.id,
    id: `rec-${r.id}-${mk}`,
    date: `${mk}-${String(Math.min(Math.max(r.day || 1, 1), 28)).padStart(2, '0')}`,
    _fixed: true,
  }));
  const monthEntries = [...recVirtual, ...oneOff].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  const sumBy = (list, type) => list.filter(e => e.type === type).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const receitas = sumBy(monthEntries, 'income');
  const despesas = sumBy(monthEntries, 'expense');
  const saldo = receitas - despesas;
  const despesasFixas = sumBy(recVirtual, 'expense');

  /* ---------- Saldo em conta (o dinheiro real que você tem HOJE) ----------
     = saldo inicial guardado
       + soma de TODAS as receitas/despesas avulsas (todos os meses)
       + efeito das contas fixas acumulado, do mês em que cada uma foi criada
         até o mês atual de verdade. Assim seu "dinheiro guardado" NÃO vira
         uma receita do mês — ele só compõe o saldo total. */
  const allOneOffNet = transactions.reduce(
    (s, t) => s + (t.type === 'income' ? 1 : -1) * (Number(t.amount) || 0), 0
  );
  const realNow = new Date();
  const recurringAccumNet = recActive.reduce((s, r) => {
    const start = r.createdAt ? new Date(r.createdAt) : realNow;
    let months = (realNow.getFullYear() - start.getFullYear()) * 12 + (realNow.getMonth() - start.getMonth()) + 1;
    if (!(months > 0)) months = 1;
    return s + (r.type === 'income' ? 1 : -1) * (Number(r.amount) || 0) * months;
  }, 0);
  const saldoEmConta = initialBalance + allOneOffNet + recurringAccumNet;

  // Quebra de despesas por categoria
  const byCategory = (() => {
    const map = {};
    monthEntries.filter(e => e.type === 'expense').forEach(e => {
      map[e.category] = (map[e.category] || 0) + (Number(e.amount) || 0);
    });
    return Object.entries(map)
      .map(([key, total]) => ({ ...getCat(key, 'expense'), total, percent: despesas > 0 ? (total / despesas) * 100 : 0 }))
      .sort((a, b) => b.total - a.total);
  })();

  /* ---------- Relatório do mês anterior (para comparação) ---------- */
  const prevMonthDate = new Date(viewMonth); prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMk = monthKey(prevMonthDate);
  const prevEntries = [
    ...transactions.filter(t => (t.date || '').startsWith(prevMk)),
    ...recActive.map(r => ({ ...r, date: `${prevMk}-01` })),
  ];
  const prevDespesas = sumBy(prevEntries, 'expense');
  const deltaDespesas = prevDespesas > 0 ? ((despesas - prevDespesas) / prevDespesas) * 100 : null;

  /* ---------- Relatório da SEMANA atual ---------- */
  const weekStart = startOfWeek(new Date());
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = new Date(weekStart); d.setDate(d.getDate() + i); return d; });
  const weekKeys = weekDates.map(fmtDate);
  const weekDaysNum = weekDates.map(d => d.getDate());
  const weekOneOff = transactions.filter(t => weekKeys.includes(t.date));
  const weekRecurring = recActive.filter(r => weekDaysNum.includes(Math.min(Math.max(r.day || 1, 1), 28)));
  const weekEntries = [...weekOneOff, ...weekRecurring];
  const weekReceitas = sumBy(weekEntries, 'income');
  const weekDespesas = sumBy(weekEntries, 'expense');

  /* ---------- Navegação de mês ---------- */
  const changeMonth = (delta) => {
    const d = new Date(viewMonth); d.setMonth(d.getMonth() + delta); d.setDate(1); setViewMonth(d);
  };

  /* ---------- Abrir modal de novo/editar ---------- */
  const openNewTx = () => {
    setModal({ mode: 'tx', editingId: null });
    setForm({ type: 'expense', amount: '', category: 'alimentacao', description: '', date: fmtDate(new Date()), receipt: '' });
  };
  const openNewRecurring = () => {
    setModal({ mode: 'recurring', editingId: null });
    setForm({ type: 'expense', amount: '', category: 'moradia', description: '', day: '5', receipt: '' });
  };
  const openEditEntry = (entry) => {
    if (entry._fixed) {
      const r = recurring.find(x => x.id === entry._recurringId);
      if (!r) return;
      setModal({ mode: 'recurring', editingId: r.id });
      setForm({ type: r.type, amount: String(r.amount), category: r.category, description: r.description || '', day: String(r.day || 1), receipt: '' });
    } else {
      setModal({ mode: 'tx', editingId: entry.id });
      setForm({ type: entry.type, amount: String(entry.amount), category: entry.category, description: entry.description || '', date: entry.date, receipt: entry.receipt || '' });
    }
  };
  const closeModal = () => { setModal(null); setForm(null); };

  /* ---------- Trocar o tipo (receita/despesa) no formulário ajusta a categoria padrão ---------- */
  const setFormType = (type) => {
    setForm(f => ({ ...f, type, category: catsFor(type)[0].key }));
  };

  /* ---------- Anexar recibo (upload ou colar) ---------- */
  const handleReceiptFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const compressed = await compressReceipt(e.target.result);
      setForm(f => ({ ...f, receipt: compressed }));
    };
    reader.readAsDataURL(file);
  };
  const handleModalPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        e.preventDefault();
        handleReceiptFile(items[i].getAsFile());
        break;
      }
    }
  };

  /* ---------- Salvar o formulário ---------- */
  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(String(form.amount).replace(',', '.'));
    if (!amount || amount <= 0) return;

    if (modal.mode === 'tx') {
      const tx = {
        id: modal.editingId || `tx-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: form.type,
        amount,
        category: form.category,
        description: form.description.trim(),
        date: form.date,
        receipt: form.receipt || '',
        createdAt: modal.editingId ? undefined : new Date().toISOString(),
      };
      // Carimba QUEM criou (só ao criar; na edição preserva o autor original)
      if (!modal.editingId) tx.author = activeProfile;
      let newTx;
      if (modal.editingId) {
        newTx = transactions.map(t => t.id === modal.editingId ? { ...t, ...tx } : t);
      } else {
        newTx = [...transactions, tx];
      }
      onSaveFinance({ ...finance, transactions: newTx });
    } else {
      const rec = {
        id: modal.editingId || `rec-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        type: form.type,
        amount,
        category: form.category,
        description: form.description.trim(),
        day: Math.min(Math.max(parseInt(form.day, 10) || 1, 1), 31),
        active: true,
        createdAt: modal.editingId ? undefined : new Date().toISOString(),
      };
      // Carimba QUEM criou (só ao criar; na edição preserva o autor original)
      if (!modal.editingId) rec.author = activeProfile;
      let newRec;
      if (modal.editingId) {
        newRec = recurring.map(r => r.id === modal.editingId ? { ...r, ...rec } : r);
      } else {
        newRec = [...recurring, rec];
      }
      onSaveFinance({ ...finance, recurring: newRec });
    }
    closeModal();
  };

  /* ---------- Excluir ---------- */
  const deleteEntry = (entry) => {
    if (entry._fixed) {
      onSaveFinance({ ...finance, recurring: recurring.filter(r => r.id !== entry._recurringId) });
    } else {
      onSaveFinance({ ...finance, transactions: transactions.filter(t => t.id !== entry.id) });
    }
    setConfirmDeleteId(null);
  };
  const toggleRecurringActive = (rec) => {
    onSaveFinance({ ...finance, recurring: recurring.map(r => r.id === rec.id ? { ...r, active: r.active === false } : r) });
  };

  /* ---------- Meta de gastos ---------- */
  const saveBudget = () => {
    const val = parseFloat(String(budgetInput).replace(',', '.'));
    onSaveFinance({ ...finance, budget: (val && val > 0) ? val : null });
    setEditingBudget(false);
  };

  /* ---------- Saldo inicial (dinheiro já guardado) ---------- */
  const saveInitialBalance = () => {
    const val = parseFloat(String(balanceInput).replace(',', '.'));
    onSaveFinance({ ...finance, initialBalance: (val && val > 0) ? val : 0 });
    setEditingBalance(false);
  };

  const firstName = activeProfile ? activeProfile.split(' ')[0] : '';

  /* =========================================================================
     RENDERIZAÇÃO
  ========================================================================= */
  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease', paddingBottom: '80px' }}>

      {/* CABEÇALHO */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('menu')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} /> Voltar ao Menu
        </button>
        <div style={styles.titleArea}>
          <Wallet size={22} color="#3ECF8E" />
          <h2 style={styles.title}>Finanças {firstName ? `— ${firstName}` : ''}</h2>
        </div>
      </header>

      {/* SALDO EM CONTA (o dinheiro real de hoje, incluindo o que já estava guardado) */}
      <section style={styles.balanceHero} className="glass-panel">
        <div style={styles.balanceHeroMain}>
          <span style={styles.balanceHeroLabel}><Wallet size={15} /> Saldo em conta (hoje)</span>
          <strong style={{ ...styles.balanceHeroValue, color: saldoEmConta >= 0 ? '#3ECF8E' : '#E5484D' }}>
            {formatBRL(saldoEmConta)}
          </strong>
          <span style={styles.balanceHeroHint}>
            Guardado {formatBRL(initialBalance)} + suas receitas − despesas lançadas
          </span>
        </div>

        {editingBalance ? (
          <div style={styles.balanceEditRow}>
            <input
              type="number" step="0.01" min="0" value={balanceInput}
              onChange={e => setBalanceInput(e.target.value)}
              placeholder="Quanto tenho guardado hoje" className="form-input"
              style={{ maxWidth: '210px' }} autoFocus
            />
            <button onClick={saveInitialBalance} className="btn-primary" style={{ padding: '10px 16px' }}><Check size={16} /> Salvar</button>
            <button onClick={() => setEditingBalance(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>Cancelar</button>
          </div>
        ) : (
          <button
            onClick={() => { setEditingBalance(true); setBalanceInput(initialBalance || ''); }}
            className="btn-secondary" style={styles.balanceEditBtn}
          >
            <Pencil size={14} /> {initialBalance ? 'Ajustar valor guardado' : 'Informar o que tenho hoje'}
          </button>
        )}
      </section>

      {editingBalance && (
        <p style={styles.balanceExplain}>
          💡 Informe o dinheiro que você <strong>já tinha guardado</strong> antes de começar a usar o app.
          Ele entra no seu saldo em conta, mas <strong>não</strong> aparece como receita do mês. Os lançamentos
          que você fizer daqui pra frente somam ou subtraem desse valor.
        </p>
      )}

      {/* NAVEGADOR DE MÊS */}
      <div style={styles.monthNav} className="glass-panel">
        <button onClick={() => changeMonth(-1)} style={styles.monthArrow} title="Mês anterior"><ChevronLeft size={20} /></button>
        <span style={styles.monthLabel}>{monthLabel(viewMonth)}</span>
        <button onClick={() => changeMonth(1)} style={styles.monthArrow} title="Próximo mês"><ChevronRight size={20} /></button>
      </div>

      {/* CARTÕES DE RESUMO */}
      <section style={styles.summaryGrid}>
        <div style={styles.summaryCard} className="glass-panel">
          <div style={{ ...styles.sumIcon, background: 'rgba(62,207,142,0.15)', color: '#3ECF8E' }}><TrendingUp size={20} /></div>
          <div><span style={styles.sumLabel}>Receitas</span><strong style={{ ...styles.sumVal, color: '#3ECF8E' }}>{formatBRL(receitas)}</strong></div>
        </div>
        <div style={styles.summaryCard} className="glass-panel">
          <div style={{ ...styles.sumIcon, background: 'rgba(229,72,77,0.15)', color: '#E5484D' }}><TrendingDown size={20} /></div>
          <div><span style={styles.sumLabel}>Despesas</span><strong style={{ ...styles.sumVal, color: '#E5484D' }}>{formatBRL(despesas)}</strong></div>
        </div>
        <div style={styles.summaryCard} className="glass-panel">
          <div style={{ ...styles.sumIcon, background: 'rgba(232,147,63,0.15)', color: '#E8933F' }}><Wallet size={20} /></div>
          <div><span style={styles.sumLabel}>Saldo</span><strong style={{ ...styles.sumVal, color: saldo >= 0 ? '#3ECF8E' : '#E5484D' }}>{formatBRL(saldo)}</strong></div>
        </div>
        <div style={styles.summaryCard} className="glass-panel">
          <div style={{ ...styles.sumIcon, background: 'rgba(238,165,61,0.15)', color: '#EEA53D' }}><Repeat size={20} /></div>
          <div><span style={styles.sumLabel}>Despesas Fixas</span><strong style={{ ...styles.sumVal, color: '#EEA53D' }}>{formatBRL(despesasFixas)}</strong></div>
        </div>
      </section>

      {/* ABAS */}
      <div style={styles.tabBar}>
        {[
          { key: 'resumo', label: 'Resumo', icon: PieChart },
          { key: 'lancamentos', label: 'Lançamentos', icon: Calendar },
          { key: 'fixas', label: 'Fixas', icon: Repeat },
          { key: 'relatorios', label: 'Relatórios', icon: TrendingUp },
        ].map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={activeTab === tab.key ? { ...styles.tab, ...styles.tabActive } : styles.tab}
            >
              <TabIcon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {/* ============ ABA: RESUMO ============ */}
      {activeTab === 'resumo' && (
        <div style={styles.tabContent}>
          {/* META DE GASTOS */}
          <div style={styles.blockCard} className="glass-panel">
            <div style={styles.blockHeader}>
              <span style={styles.blockTitle}><Target size={16} color="#E77950" /> Meta de gastos do mês</span>
              {!editingBudget && (
                <button onClick={() => { setEditingBudget(true); setBudgetInput(budget || ''); }} style={styles.linkBtn}>
                  {budget ? 'Editar' : 'Definir meta'}
                </button>
              )}
            </div>
            {editingBudget ? (
              <div style={styles.budgetEditRow}>
                <input type="number" step="0.01" min="0" value={budgetInput} onChange={e => setBudgetInput(e.target.value)}
                  placeholder="Ex: 3000" className="form-input" style={{ maxWidth: '160px' }} autoFocus />
                <button onClick={saveBudget} className="btn-primary" style={{ padding: '10px 16px' }}><Check size={16} /> Salvar</button>
                <button onClick={() => setEditingBudget(false)} className="btn-secondary" style={{ padding: '10px 16px' }}>Cancelar</button>
              </div>
            ) : budget ? (
              <>
                <div style={styles.budgetMeta}>
                  <span>Gasto: <strong style={{ color: despesas > budget ? '#E5484D' : '#F4F5F7' }}>{formatBRL(despesas)}</strong> de {formatBRL(budget)}</span>
                  <strong style={{ color: despesas > budget ? '#E5484D' : '#3ECF8E' }}>{Math.round((despesas / budget) * 100)}%</strong>
                </div>
                <div style={styles.budgetBarBg}>
                  <div style={{ ...styles.budgetBarFill, width: `${Math.min((despesas / budget) * 100, 100)}%`, background: despesas > budget ? 'linear-gradient(90deg,#E5484D,#E5484D)' : 'linear-gradient(90deg,#3ECF8E,#2FAF78)' }} />
                </div>
                {despesas > budget && <p style={styles.overBudget}>⚠️ Você ultrapassou a meta em {formatBRL(despesas - budget)}.</p>}
              </>
            ) : (
              <p style={styles.mutedText}>Defina uma meta de gastos para acompanhar seu controle no mês.</p>
            )}
          </div>

          {/* GASTOS POR CATEGORIA */}
          <div style={styles.blockCard} className="glass-panel">
            <span style={styles.blockTitle}><PieChart size={16} color="#E8933F" /> Gastos por categoria</span>
            {byCategory.length === 0 ? (
              <p style={styles.mutedText}>Nenhuma despesa lançada neste mês ainda.</p>
            ) : (
              <div style={styles.catList}>
                {byCategory.map(cat => (
                  <div key={cat.key} style={styles.catRow}>
                    <div style={styles.catInfo}>
                      <span style={styles.catEmoji}>{cat.emoji}</span>
                      <span style={styles.catLabel}>{cat.label}</span>
                    </div>
                    <div style={styles.catBarWrap}>
                      <div style={styles.catBarBg}>
                        <div style={{ ...styles.catBarFill, width: `${cat.percent}%`, background: cat.color }} />
                      </div>
                    </div>
                    <div style={styles.catValues}>
                      <strong style={styles.catTotal}>{formatBRL(cat.total)}</strong>
                      <span style={styles.catPercent}>{Math.round(cat.percent)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============ ABA: LANÇAMENTOS ============ */}
      {activeTab === 'lancamentos' && (
        <div style={styles.tabContent}>
          {monthEntries.length === 0 ? (
            <div style={styles.emptyBox} className="glass-panel">
              <Wallet size={48} style={{ color: '#3B434F', marginBottom: '12px' }} />
              <h3 style={styles.emptyTitle}>Nenhum lançamento neste mês</h3>
              <p style={styles.mutedText}>Toque em "Novo Lançamento" para registrar sua primeira receita ou despesa.</p>
            </div>
          ) : (
            <div style={styles.entryList}>
              {monthEntries.map(entry => {
                const cat = getCat(entry.category, entry.type);
                const isConfirming = confirmDeleteId === entry.id;
                return (
                  <div key={entry.id} style={styles.entryCard} className="glass-panel">
                    <div style={{ ...styles.entryIcon, background: `${cat.color}22`, color: cat.color }}>{cat.emoji}</div>
                    <div style={styles.entryMain}>
                      <div style={styles.entryTopRow}>
                        <span style={styles.entryDesc}>{entry.description || cat.label}</span>
                        <strong style={{ ...styles.entryAmount, color: entry.type === 'income' ? '#3ECF8E' : '#E5484D' }}>
                          {entry.type === 'income' ? '+' : '−'} {formatBRL(entry.amount)}
                        </strong>
                      </div>
                      <div style={styles.entryBottomRow}>
                        <span style={styles.entryMeta}>
                          {cat.label} • {new Date(entry.date + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {entry._fixed && <span style={styles.fixedBadge}><Repeat size={10} /> Fixa</span>}
                          {authorMeta(entry.author) && (
                            <span style={{ ...styles.authorBadge, background: `${authorMeta(entry.author).color}22`, color: authorMeta(entry.author).color }}>
                              <User size={10} /> {authorMeta(entry.author).label}
                            </span>
                          )}
                        </span>
                        <div style={styles.entryActions}>
                          {entry.receipt && (
                            <button onClick={() => setLightbox(entry.receipt)} style={styles.iconBtn} title="Ver recibo"><ImageIcon size={14} /></button>
                          )}
                          <button onClick={() => openEditEntry(entry)} style={styles.iconBtn} title="Editar"><Pencil size={14} /></button>
                          {isConfirming ? (
                            <>
                              <button onClick={() => deleteEntry(entry)} style={styles.confirmDel}>Apagar</button>
                              <button onClick={() => setConfirmDeleteId(null)} style={styles.confirmNo}>Não</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(entry.id)} style={styles.iconBtnDanger} title="Excluir"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ ABA: FIXAS ============ */}
      {activeTab === 'fixas' && (
        <div style={styles.tabContent}>
          <button onClick={openNewRecurring} className="btn-primary" style={{ marginBottom: '18px' }}>
            <Plus size={18} /> Nova Conta Fixa
          </button>
          {recurring.length === 0 ? (
            <div style={styles.emptyBox} className="glass-panel">
              <Repeat size={48} style={{ color: '#3B434F', marginBottom: '12px' }} />
              <h3 style={styles.emptyTitle}>Nenhuma conta fixa</h3>
              <p style={styles.mutedText}>Cadastre salário, aluguel, assinaturas e outras contas que se repetem todo mês. Elas entram automaticamente em cada mês.</p>
            </div>
          ) : (
            <div style={styles.entryList}>
              {recurring.map(r => {
                const cat = getCat(r.category, r.type);
                const off = r.active === false;
                const isConfirming = confirmDeleteId === r.id;
                return (
                  <div key={r.id} style={{ ...styles.entryCard, opacity: off ? 0.55 : 1 }} className="glass-panel">
                    <div style={{ ...styles.entryIcon, background: `${cat.color}22`, color: cat.color }}>{cat.emoji}</div>
                    <div style={styles.entryMain}>
                      <div style={styles.entryTopRow}>
                        <span style={styles.entryDesc}>{r.description || cat.label}</span>
                        <strong style={{ ...styles.entryAmount, color: r.type === 'income' ? '#3ECF8E' : '#E5484D' }}>
                          {r.type === 'income' ? '+' : '−'} {formatBRL(r.amount)}
                        </strong>
                      </div>
                      <div style={styles.entryBottomRow}>
                        <span style={styles.entryMeta}>
                          {cat.label} • todo dia {r.day} {off && '• pausada'}
                          {authorMeta(r.author) && (
                            <span style={{ ...styles.authorBadge, background: `${authorMeta(r.author).color}22`, color: authorMeta(r.author).color }}>
                              <User size={10} /> {authorMeta(r.author).label}
                            </span>
                          )}
                        </span>
                        <div style={styles.entryActions}>
                          <button onClick={() => toggleRecurringActive(r)} style={styles.iconBtn} title={off ? 'Reativar' : 'Pausar'}>
                            {off ? <Check size={14} /> : <X size={14} />}
                          </button>
                          <button onClick={() => openEditEntry({ _fixed: true, _recurringId: r.id })} style={styles.iconBtn} title="Editar"><Pencil size={14} /></button>
                          {isConfirming ? (
                            <>
                              <button onClick={() => deleteEntry({ _fixed: true, _recurringId: r.id })} style={styles.confirmDel}>Apagar</button>
                              <button onClick={() => setConfirmDeleteId(null)} style={styles.confirmNo}>Não</button>
                            </>
                          ) : (
                            <button onClick={() => setConfirmDeleteId(r.id)} style={styles.iconBtnDanger} title="Excluir"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ ABA: RELATÓRIOS ============ */}
      {activeTab === 'relatorios' && (
        <div style={styles.tabContent}>
          {/* Relatório da semana */}
          <div style={styles.blockCard} className="glass-panel">
            <span style={styles.blockTitle}><Calendar size={16} color="#6FA8D6" /> Relatório da semana ({weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a {weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})</span>
            <div style={styles.reportRow}>
              <div style={styles.reportItem}><span style={styles.reportLabel}>Receitas</span><strong style={{ color: '#3ECF8E' }}>{formatBRL(weekReceitas)}</strong></div>
              <div style={styles.reportItem}><span style={styles.reportLabel}>Despesas</span><strong style={{ color: '#E5484D' }}>{formatBRL(weekDespesas)}</strong></div>
              <div style={styles.reportItem}><span style={styles.reportLabel}>Saldo</span><strong style={{ color: (weekReceitas - weekDespesas) >= 0 ? '#3ECF8E' : '#E5484D' }}>{formatBRL(weekReceitas - weekDespesas)}</strong></div>
            </div>
          </div>

          {/* Relatório do mês */}
          <div style={styles.blockCard} className="glass-panel">
            <span style={styles.blockTitle}><TrendingUp size={16} color="#E77950" /> Relatório de {monthLabel(viewMonth)}</span>
            <div style={styles.reportRow}>
              <div style={styles.reportItem}><span style={styles.reportLabel}>Receitas</span><strong style={{ color: '#3ECF8E' }}>{formatBRL(receitas)}</strong></div>
              <div style={styles.reportItem}><span style={styles.reportLabel}>Despesas</span><strong style={{ color: '#E5484D' }}>{formatBRL(despesas)}</strong></div>
              <div style={styles.reportItem}><span style={styles.reportLabel}>Saldo</span><strong style={{ color: saldo >= 0 ? '#3ECF8E' : '#E5484D' }}>{formatBRL(saldo)}</strong></div>
            </div>
            <div style={styles.insightsBox}>
              {/* Comparação com o mês anterior */}
              {deltaDespesas !== null && (
                <p style={styles.insightLine}>
                  {deltaDespesas > 0 ? '📈' : '📉'} Suas despesas {deltaDespesas > 0 ? 'aumentaram' : 'diminuíram'}{' '}
                  <strong style={{ color: deltaDespesas > 0 ? '#E5484D' : '#3ECF8E' }}>{Math.abs(Math.round(deltaDespesas))}%</strong> em relação a {monthLabel(prevMonthDate)}.
                </p>
              )}
              {byCategory[0] && (
                <p style={styles.insightLine}>🏆 Maior gasto: <strong>{byCategory[0].emoji} {byCategory[0].label}</strong> ({formatBRL(byCategory[0].total)}).</p>
              )}
              {receitas > 0 && (
                <p style={styles.insightLine}>
                  💰 Taxa de poupança: <strong style={{ color: saldo >= 0 ? '#3ECF8E' : '#E5484D' }}>{Math.round((saldo / receitas) * 100)}%</strong> da sua receita.
                </p>
              )}
              {receitas === 0 && despesas === 0 && <p style={styles.mutedText}>Sem movimentações neste mês para gerar insights.</p>}
            </div>
          </div>
        </div>
      )}

      {/* BOTÃO FLUTUANTE DE NOVO LANÇAMENTO */}
      <button onClick={openNewTx} style={styles.fab} className="finance-fab" title="Novo lançamento">
        <Plus size={26} />
      </button>

      {/* MODAL DE LANÇAMENTO / CONTA FIXA */}
      {modal && form && (
        <div style={styles.overlay} onClick={closeModal}>
          <div style={styles.modal} className="glass-panel" onClick={e => e.stopPropagation()} onPaste={handleModalPaste}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                {modal.editingId ? 'Editar ' : 'Novo '}{modal.mode === 'recurring' ? 'Conta Fixa' : 'Lançamento'}
              </h3>
              <button onClick={closeModal} style={styles.iconBtn}><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} style={styles.modalForm}>
              {/* Tipo: receita/despesa */}
              <div style={styles.segment}>
                <button type="button" onClick={() => setFormType('income')} style={form.type === 'income' ? { ...styles.segBtn, ...styles.segIncome } : styles.segBtn}>
                  <TrendingUp size={16} /> Receita
                </button>
                <button type="button" onClick={() => setFormType('expense')} style={form.type === 'expense' ? { ...styles.segBtn, ...styles.segExpense } : styles.segBtn}>
                  <TrendingDown size={16} /> Despesa
                </button>
              </div>

              {/* Valor */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Valor (R$)</label>
                <input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0,00" className="form-input" autoFocus required />
              </div>

              {/* Categoria */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Categoria</label>
                <div style={styles.catPicker}>
                  {catsFor(form.type).map(c => (
                    <button type="button" key={c.key} onClick={() => setForm(f => ({ ...f, category: c.key }))}
                      style={form.category === c.key ? { ...styles.catChip, borderColor: c.color, background: `${c.color}22`, color: '#fff' } : styles.catChip}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Descrição */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Descrição (opcional)</label>
                <input type="text" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Ex: Mercado do mês" className="form-input" maxLength={60} />
              </div>

              {/* Data (avulso) ou Dia do mês (fixa) */}
              {modal.mode === 'tx' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Data</label>
                  <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="form-input" required />
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Repete todo dia (1 a 31)</label>
                  <input type="number" min="1" max="31" value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))} className="form-input" required />
                </div>
              )}

              {/* Recibo (apenas para lançamento avulso) */}
              {modal.mode === 'tx' && (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Recibo (opcional)</label>
                  {form.receipt ? (
                    <div style={styles.receiptPreview}>
                      <img src={form.receipt} alt="Recibo" style={styles.receiptThumb} onClick={() => setLightbox(form.receipt)} />
                      <button type="button" onClick={() => setForm(f => ({ ...f, receipt: '' }))} style={styles.confirmNo}>Remover recibo</button>
                    </div>
                  ) : (
                    <label style={styles.uploadReceipt}>
                      <ImageIcon size={15} /> Anexar foto do recibo (ou cole com Ctrl+V)
                      <input type="file" accept="image/*" onChange={e => handleReceiptFile(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
              )}

              <div style={styles.modalActions}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  <Check size={18} /> {modal.editingId ? 'Salvar' : 'Adicionar'}
                </button>
                <button type="button" onClick={closeModal} className="btn-secondary" style={{ justifyContent: 'center' }}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LIGHTBOX DO RECIBO */}
      {lightbox && (
        <div className="image-lightbox-overlay" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Recibo ampliado" className="image-lightbox-img" onClick={e => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS
// -----------------------------------------------------------------------------
const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', fontSize: '13px' },
  titleArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '22px', fontWeight: '800', color: '#ffffff' },

  balanceHero: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px',
    flexWrap: 'wrap', padding: '18px 22px', marginBottom: '14px',
    background: 'linear-gradient(135deg, rgba(62,207,142,0.10), rgba(232,147,63,0.06))',
    border: '1px solid rgba(62,207,142,0.20)',
  },
  balanceHeroMain: { display: 'flex', flexDirection: 'column', gap: '4px', minWidth: 0 },
  balanceHeroLabel: { fontSize: '12px', color: '#99A1AC', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  balanceHeroValue: { fontSize: '30px', fontWeight: '800', lineHeight: 1.1 },
  balanceHeroHint: { fontSize: '12px', color: '#7A828E' },
  balanceEditRow: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  balanceEditBtn: { padding: '10px 16px', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  balanceExplain: { fontSize: '13px', color: '#C8CED6', lineHeight: '1.55', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '12px 16px', marginBottom: '18px' },

  monthNav: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', padding: '12px', marginBottom: '18px' },
  monthArrow: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', color: '#C8CED6', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  monthLabel: { fontSize: '17px', fontWeight: '800', color: '#fff', textTransform: 'capitalize', minWidth: '180px', textAlign: 'center' },

  summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' },
  summaryCard: { padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' },
  sumIcon: { width: '42px', height: '42px', borderRadius: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  sumLabel: { fontSize: '11px', color: '#99A1AC', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block' },
  sumVal: { fontSize: '18px', fontWeight: '800', display: 'block', marginTop: '2px' },

  tabBar: { display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' },
  tab: { display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', color: '#99A1AC', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s ease' },
  tabActive: { background: 'var(--primary-gradient)', color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(232,147,63,0.25)' },
  tabContent: { display: 'flex', flexDirection: 'column', gap: '16px' },

  blockCard: { padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' },
  blockHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: '14px', fontWeight: '800', color: '#F4F5F7', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'inline-flex', alignItems: 'center', gap: '8px' },
  linkBtn: { background: 'transparent', border: 'none', color: '#E77950', fontSize: '13px', fontWeight: '700', cursor: 'pointer' },
  mutedText: { fontSize: '14px', color: '#99A1AC', lineHeight: '1.5' },

  budgetEditRow: { display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' },
  budgetMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '14px', color: '#C8CED6' },
  budgetBarBg: { width: '100%', height: '12px', background: '#22252B', borderRadius: '10px', overflow: 'hidden' },
  budgetBarFill: { height: '100%', borderRadius: '10px', transition: 'width 0.5s ease' },
  overBudget: { fontSize: '13px', color: '#E5484D', fontWeight: '600' },

  catList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  catRow: { display: 'flex', alignItems: 'center', gap: '12px' },
  catInfo: { display: 'flex', alignItems: 'center', gap: '8px', width: '140px', flexShrink: 0 },
  catEmoji: { fontSize: '18px' },
  catLabel: { fontSize: '13px', color: '#C8CED6', fontWeight: '600' },
  catBarWrap: { flex: 1 },
  catBarBg: { width: '100%', height: '10px', background: '#22252B', borderRadius: '8px', overflow: 'hidden' },
  catBarFill: { height: '100%', borderRadius: '8px', transition: 'width 0.5s ease' },
  catValues: { textAlign: 'right', width: '110px', flexShrink: 0 },
  catTotal: { fontSize: '13px', color: '#F4F5F7', fontWeight: '700', display: 'block' },
  catPercent: { fontSize: '11px', color: '#7A828E' },

  emptyBox: { padding: '44px 24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  emptyTitle: { fontSize: '18px', fontWeight: '800', color: '#fff', marginBottom: '8px' },

  entryList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  entryCard: { padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px' },
  entryIcon: { width: '44px', height: '44px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 },
  entryMain: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '5px' },
  entryTopRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' },
  entryDesc: { fontSize: '15px', fontWeight: '700', color: '#fff', wordBreak: 'break-word' },
  entryAmount: { fontSize: '15px', fontWeight: '800', whiteSpace: 'nowrap' },
  entryBottomRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' },
  entryMeta: { fontSize: '12px', color: '#99A1AC', display: 'inline-flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  fixedBadge: { display: 'inline-flex', alignItems: 'center', gap: '3px', background: 'rgba(238,165,61,0.12)', color: '#EEA53D', fontSize: '10px', fontWeight: '700', padding: '2px 7px', borderRadius: '100px' },
  authorBadge: { display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '10px', fontWeight: '800', padding: '2px 7px', borderRadius: '100px' },
  entryActions: { display: 'flex', alignItems: 'center', gap: '6px' },
  iconBtn: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', color: '#99A1AC', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  iconBtnDanger: { background: 'rgba(229,72,77,0.08)', border: '1px solid rgba(229,72,77,0.15)', borderRadius: '8px', color: '#E5484D', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' },
  confirmDel: { background: '#E5484D', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: '700', padding: '6px 10px', cursor: 'pointer' },
  confirmNo: { background: 'transparent', color: '#99A1AC', border: 'none', fontSize: '12px', fontWeight: '700', padding: '6px 8px', cursor: 'pointer' },

  reportRow: { display: 'flex', gap: '12px', flexWrap: 'wrap' },
  reportItem: { flex: '1 1 120px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', padding: '14px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '4px' },
  reportLabel: { fontSize: '11px', color: '#99A1AC', fontWeight: '600', textTransform: 'uppercase' },
  insightsBox: { display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' },
  insightLine: { fontSize: '14px', color: '#C8CED6' },

  fab: { position: 'fixed', bottom: '24px', right: '24px', width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg,#3ECF8E,#2FAF78)', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 24px rgba(62,207,142,0.4)', zIndex: 90 },

  overlay: { position: 'fixed', inset: 0, background: 'rgba(3,7,18,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px', animation: 'fadeIn 0.2s ease' },
  modal: { width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', backgroundColor: 'rgba(19,26,48,0.97)', border: '1px solid rgba(255,255,255,0.08)' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' },
  modalTitle: { fontSize: '19px', fontWeight: '800', color: '#fff' },
  modalForm: { display: 'flex', flexDirection: 'column', gap: '16px' },
  segment: { display: 'flex', gap: '8px', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: '12px' },
  segBtn: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '9px', background: 'transparent', border: 'none', color: '#99A1AC', fontWeight: '700', fontSize: '14px', cursor: 'pointer', transition: 'all 0.2s ease' },
  segIncome: { background: 'rgba(62,207,142,0.15)', color: '#3ECF8E' },
  segExpense: { background: 'rgba(229,72,77,0.15)', color: '#E5484D' },
  catPicker: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  catChip: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '100px', padding: '7px 13px', fontSize: '13px', fontWeight: '600', color: '#C8CED6', cursor: 'pointer', transition: 'all 0.15s ease' },
  receiptPreview: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' },
  receiptThumb: { height: '70px', maxWidth: '120px', borderRadius: '8px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)', cursor: 'zoom-in' },
  uploadReceipt: { display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.15)', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#C8CED6', cursor: 'pointer' },
  modalActions: { display: 'flex', gap: '10px', marginTop: '6px' },
};

/* Estilos extra (hover do FAB e das abas) */
const extraFinanceStyles = `
.finance-fab:hover { transform: translateY(-3px) scale(1.05); box-shadow: 0 12px 30px rgba(62,207,142,0.5) !important; }
`;
if (typeof document !== 'undefined') {
  const s = document.createElement('style');
  s.innerText = extraFinanceStyles;
  document.head.appendChild(s);
}

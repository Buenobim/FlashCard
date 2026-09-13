/*
  =============================================================================
  ARQUIVO: src/pages/MainMenu.jsx
  PARA QUE SERVE: Página inicial da Plataforma Bueno. Depois de escolher o perfil,
  a pessoa cai aqui e escolhe o módulo: Flashcards, Finanças, Hábitos, Quadro dos
  Sonhos, Documentos ou o Relatório Geral. Saudação muda conforme a hora do dia.
  =============================================================================
*/

import React, { useState } from 'react';
import {
  GraduationCap, Wallet, Printer, Sparkles, FolderOpen, Target,
  BarChart3, ChevronRight, Clock
} from 'lucide-react';

export default function MainMenu({ activeProfile, onNavigate, onLogoutProfile }) {
  const [comingSoon, setComingSoon] = useState(null);

  // Módulos da plataforma — Sonhos e Documentos agora estão ATIVOS
  const modules = [
    { key: 'flashcard', title: 'Flashcards', desc: 'Cartões 3D, quizzes e jogos de memória para estudar de verdade.', icon: GraduationCap, color: '#E8933F', active: true, target: 'dashboard' },
    { key: 'habitos', title: 'Hábitos', desc: 'Rotina gamificada: sequências, XP e progresso diário.', icon: Target, color: '#45C4A0', active: true, target: 'habits' },
    { key: 'financas', title: 'Finanças', desc: 'Recibos, contas, salário, despesas e relatórios do mês.', icon: Wallet, color: '#3ECF8E', active: true, target: 'finance' },
    { key: 'sonhos', title: 'Quadro dos Sonhos', desc: 'Os objetivos de vocês dois, com progresso e data-alvo.', icon: Sparkles, color: '#E77950', active: true, target: 'dreams' },
    { key: 'documentos', title: 'Documentos', desc: 'Repositório da família: arquivos e links importantes.', icon: FolderOpen, color: '#6FA8D6', active: true, target: 'docs' },
    { key: 'empresa', title: 'Empresa da Bruna', desc: 'Impressão 3D: filamentos, custos e lucro do mês.', icon: Printer, color: '#D96A8F', active: false },
  ];

  const handleModuleClick = (mod) => {
    if (mod.active && mod.target) {
      onNavigate(mod.target);
    } else {
      setComingSoon(mod.title);
      setTimeout(() => setComingSoon(null), 2600);
    }
  };

  // Saudação conforme a hora do dia + primeiro nome
  const firstName = (activeProfile || 'você').split(' ')[0];
  const hour = new Date().getHours();
  const saudacao = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  // Data por extenso em português (ex: "segunda-feira, 7 de julho")
  const hoje = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  const initials = (activeProfile || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  const avatarColor = activeProfile === 'Bruna Bueno' ? '#D96A8F' : activeProfile === 'Bruno Bueno' ? '#6C8FD9' : '#45C4A0';

  return (
    <div className="app-container" style={styles.wrapper}>

      {/* BARRA SUPERIOR: marca + perfil */}
      <header style={styles.topBar}>
        <span style={styles.wordmark}>Bueno<span style={{ color: '#E8933F' }}>.</span></span>
        <button
          style={styles.profileChip}
          className="menu-profile-chip"
          onClick={onLogoutProfile}
          title="Trocar de perfil"
        >
          <span style={{ ...styles.profileAvatar, background: avatarColor }}>{initials}</span>
          <span style={styles.profileName}>{activeProfile}</span>
        </button>
      </header>

      {/* SAUDAÇÃO */}
      <section style={styles.hero}>
        <p style={styles.dateLine}>{hoje}</p>
        <h1 style={styles.greeting}>{saudacao}, {firstName}.</h1>
        <p style={styles.subtitle}>O que vamos fazer hoje?</p>
      </section>

      {/* RELATÓRIO GERAL */}
      <button
        onClick={() => onNavigate('general_report')}
        style={styles.reportBanner}
        className="menu-report-banner"
      >
        <div style={styles.reportLeft}>
          <div style={styles.reportIconBg}>
            <BarChart3 size={20} color="#E8933F" />
          </div>
          <div style={styles.reportText}>
            <span style={styles.reportTitle}>Relatório Geral</span>
            <span style={styles.reportDesc}>Bruno &amp; Bruna juntos: estudos, hábitos e finanças.</span>
          </div>
        </div>
        <ChevronRight size={20} color="#7A828E" />
      </button>

      {/* GRADE DE MÓDULOS */}
      <div style={styles.grid}>
        {modules.map((mod) => {
          const Icon = mod.icon;
          return (
            <div
              key={mod.key}
              style={{ ...styles.card, ...(mod.active ? {} : styles.cardDisabled) }}
              className="menu-module-card glass-panel"
              onClick={() => handleModuleClick(mod)}
              title={mod.active ? `Abrir ${mod.title}` : `${mod.title} — em breve`}
            >
              {!mod.active && (
                <span style={styles.soonBadge}><Clock size={11} /> Em breve</span>
              )}
              <div style={{ ...styles.cardIconBg, background: `${mod.color}1A`, color: mod.color }}>
                <Icon size={24} />
              </div>
              <div style={styles.cardBody}>
                <h3 style={styles.cardTitle}>{mod.title}</h3>
                <p style={styles.cardDesc}>{mod.desc}</p>
              </div>
              {mod.active && (
                <div style={styles.cardOpenRow}>
                  <span style={{ color: mod.color, fontWeight: 800, fontSize: '13px' }}>Abrir</span>
                  <ChevronRight size={15} color={mod.color} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {comingSoon && (
        <div style={styles.toast} className="menu-toast">
          <strong>{comingSoon}</strong> está a caminho — em construção.
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { animation: 'fadeIn 0.4s ease', maxWidth: '1080px' },
  topBar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    flexWrap: 'wrap', gap: '12px', marginBottom: '44px',
  },
  wordmark: {
    fontFamily: 'var(--font-display)', fontSize: '26px', fontWeight: 700,
    color: '#F4F5F7', letterSpacing: '-0.02em',
  },
  profileChip: {
    display: 'flex', alignItems: 'center', gap: '9px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    borderRadius: '100px', padding: '5px 15px 5px 6px', cursor: 'pointer',
    transition: 'all 0.2s ease', userSelect: 'none',
  },
  profileAvatar: {
    width: '28px', height: '28px', borderRadius: '50%', display: 'flex',
    justifyContent: 'center', alignItems: 'center', color: '#0C0D0F',
    fontSize: '11px', fontWeight: 800,
  },
  profileName: { fontSize: '13px', fontWeight: 700, color: '#C8CED6' },
  hero: { marginBottom: '32px' },
  dateLine: {
    color: '#7A828E', fontSize: '13px', fontWeight: 700,
    textTransform: 'capitalize', letterSpacing: '0.3px', marginBottom: '6px',
  },
  greeting: {
    fontSize: 'clamp(32px, 6vw, 44px)', color: '#F4F5F7', marginBottom: '6px', lineHeight: 1.1,
  },
  subtitle: { color: '#99A1AC', fontSize: '16px' },
  reportBanner: {
    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '16px', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    borderRadius: '14px', padding: '16px 20px', cursor: 'pointer',
    marginBottom: '28px', transition: 'all 0.25s ease', textAlign: 'left',
  },
  reportLeft: { display: 'flex', alignItems: 'center', gap: '14px' },
  reportIconBg: {
    background: 'rgba(232, 147, 63, 0.12)', borderRadius: '10px',
    padding: '11px', display: 'flex',
  },
  reportText: { display: 'flex', flexDirection: 'column', gap: '2px' },
  reportTitle: { fontSize: '16px', fontWeight: 800, color: '#F4F5F7' },
  reportDesc: { fontSize: '13px', color: '#99A1AC' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '14px', paddingBottom: '40px',
  },
  card: {
    position: 'relative', padding: '22px', cursor: 'pointer',
    display: 'flex', flexDirection: 'column', gap: '14px',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)', minHeight: '172px',
  },
  cardDisabled: { opacity: 0.55, cursor: 'default' },
  soonBadge: {
    position: 'absolute', top: '14px', right: '14px', display: 'inline-flex',
    alignItems: 'center', gap: '4px', background: 'rgba(238, 165, 61, 0.12)',
    color: '#EEA53D', fontSize: '11px', fontWeight: 800, padding: '3px 9px', borderRadius: '100px',
  },
  cardIconBg: {
    width: '48px', height: '48px', borderRadius: '12px',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: '18px', color: '#F4F5F7', marginBottom: '5px' },
  cardDesc: { fontSize: '13px', color: '#99A1AC', lineHeight: 1.5 },
  cardOpenRow: { display: 'flex', alignItems: 'center', gap: '4px' },
  toast: {
    position: 'fixed', bottom: '24px', left: '50%', transform: 'translateX(-50%)',
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    color: '#F4F5F7', borderRadius: '12px', padding: '14px 22px', fontSize: '14px',
    boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4)', zIndex: 1000, maxWidth: '90%', textAlign: 'center',
  },
};

const extraMenuStyles = `
.menu-module-card:hover {
  transform: translateY(-3px);
  border-color: rgba(255, 255, 255, 0.14) !important;
}
.menu-report-banner:hover {
  border-color: rgba(232, 147, 63, 0.4) !important;
}
.menu-profile-chip:hover {
  border-color: rgba(255, 255, 255, 0.18) !important;
}
.menu-toast { animation: fadeIn 0.25s ease; }
@media (max-width: 600px) {
  .menu-module-card { min-height: 140px !important; }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = extraMenuStyles;
  document.head.appendChild(styleSheet);
}

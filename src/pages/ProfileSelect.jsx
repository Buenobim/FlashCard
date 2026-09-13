/*
  =============================================================================
  ARQUIVO: src/pages/ProfileSelect.jsx
  PARA QUE SERVE: Tela de entrada ("Quem está aí?") no estilo seleção de perfis.
  Cada pessoa escolhe o seu perfil para carregar recordes, hábitos e finanças
  pessoais (os baralhos e o Quadro dos Sonhos são compartilhados).
  =============================================================================
*/

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

export default function ProfileSelect({ profiles, onSelectProfile, onCreateProfile, onDeleteProfile }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (profiles.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      alert('Este perfil já está cadastrado!');
      return;
    }
    onCreateProfile(trimmed);
    setNewName('');
    setIsAdding(false);
  };

  // Cor do avatar por pessoa (Bruno azul, Bruna rosa, demais alternando)
  const getAvatarColor = (name, index) => {
    if (name === 'Bruno Bueno') return '#6C8FD9';
    if (name === 'Bruna Bueno') return '#D96A8F';
    const alt = ['#45C4A0', '#EF8354', '#E77950', '#6FA8D6'];
    return alt[index % alt.length];
  };

  const getInitials = (name) => name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div style={styles.container}>
      <div style={styles.inner}>

        {/* MARCA */}
        <span style={styles.wordmark}>Bueno<span style={{ color: '#E8933F' }}>.</span></span>

        {/* TÍTULO */}
        <h1 style={styles.title}>Quem está aí?</h1>
        <p style={styles.subtitle}>Escolha seu perfil para entrar na plataforma.</p>

        {/* GRADE DE PERFIS */}
        <div style={styles.profilesGrid}>
          {profiles.map((profile, idx) => {
            const isDefault = profile === 'Bruno Bueno' || profile === 'Bruna Bueno';
            const color = getAvatarColor(profile, idx);
            return (
              <div
                key={profile}
                style={styles.profileCard}
                className="profile-card-hover"
                onClick={() => onSelectProfile(profile)}
              >
                <div style={{ ...styles.avatar, background: `${color}22`, border: `2px solid ${color}55`, color }}>
                  {getInitials(profile)}
                </div>
                <span style={styles.profileName} className="profile-name-label">{profile}</span>
                {!isDefault && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Apagar o perfil de ${profile}? Isso apaga os dados locais dele.`)) {
                        onDeleteProfile(profile);
                      }
                    }}
                    style={styles.deleteBtn}
                    className="profile-delete-btn"
                    title="Excluir este perfil"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}

          {/* NOVO PERFIL */}
          {!isAdding ? (
            <div style={styles.addCard} className="profile-add-card" onClick={() => setIsAdding(true)}>
              <div style={styles.addIconBg} className="profile-add-icon">
                <Plus size={26} color="#7A828E" />
              </div>
              <span style={styles.addText}>Novo perfil</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={styles.formCard} className="glass-panel">
              <input
                type="text"
                placeholder="Nome"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={15}
                style={styles.input}
                autoFocus
                required
              />
              <div style={styles.formActions}>
                <button type="submit" style={styles.saveBtn}>Criar</button>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setNewName(''); }}
                  style={styles.cancelBtn}
                >
                  Voltar
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh', display: 'flex', justifyContent: 'center',
    alignItems: 'center', padding: '20px', animation: 'fadeIn 0.5s ease',
  },
  inner: {
    width: '100%', maxWidth: '720px', textAlign: 'center',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'var(--font-display)', fontSize: '30px', fontWeight: 700,
    color: '#F4F5F7', marginBottom: '40px',
  },
  title: {
    fontSize: 'clamp(30px, 6vw, 40px)', color: '#F4F5F7',
    marginBottom: '8px', lineHeight: 1.1,
  },
  subtitle: { fontSize: '15px', color: '#99A1AC', marginBottom: '48px' },
  profilesGrid: {
    display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
    gap: '28px', flexWrap: 'wrap',
  },
  profileCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    cursor: 'pointer', position: 'relative', width: '112px',
  },
  avatar: {
    width: '92px', height: '92px', borderRadius: '22px', display: 'flex',
    justifyContent: 'center', alignItems: 'center', marginBottom: '12px',
    fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)',
    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  profileName: {
    color: '#99A1AC', fontSize: '14px', fontWeight: 700, textAlign: 'center',
    wordBreak: 'break-word', transition: 'color 0.2s ease',
  },
  deleteBtn: {
    position: 'absolute', top: '-8px', right: '-4px', background: '#E5484D',
    color: '#fff', border: 'none', borderRadius: '50%', width: '24px', height: '24px',
    display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer',
    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)', opacity: 0, transform: 'scale(0.8)',
    transition: 'all 0.2s ease',
  },
  addCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    cursor: 'pointer', width: '112px',
  },
  addIconBg: {
    width: '92px', height: '92px', borderRadius: '22px',
    border: '2px dashed rgba(255, 255, 255, 0.14)', background: 'transparent',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    transition: 'all 0.25s ease', marginBottom: '12px',
  },
  addText: { color: '#7A828E', fontSize: '14px', fontWeight: 700 },
  formCard: {
    width: '150px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
  },
  input: {
    background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', padding: '8px', color: '#fff', fontSize: '13px',
    outline: 'none', width: '100%', textAlign: 'center',
  },
  formActions: { display: 'flex', gap: '4px', width: '100%' },
  saveBtn: {
    background: 'var(--primary-color)', border: 'none', borderRadius: '8px',
    color: '#17120B', padding: '7px 8px', fontSize: '12px', fontWeight: 800,
    cursor: 'pointer', flex: 1,
  },
  cancelBtn: {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', color: '#99A1AC', padding: '7px 8px', fontSize: '12px',
    fontWeight: 700, cursor: 'pointer', flex: 1,
  },
};

const extraProfileStyles = `
.profile-card-hover:hover div:first-child {
  transform: scale(1.06) translateY(-4px);
}
.profile-card-hover:hover .profile-name-label { color: #F4F5F7 !important; }
.profile-card-hover:hover .profile-delete-btn { opacity: 1 !important; transform: scale(1) !important; }
.profile-add-card:hover .profile-add-icon {
  border-color: #E8933F !important;
  background: rgba(232, 147, 63, 0.06) !important;
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = extraProfileStyles;
  document.head.appendChild(styleSheet);
}

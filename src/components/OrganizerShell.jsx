import { useMemo, useState } from 'react';
import { Brain, FolderOpen, GraduationCap, LogOut, Target } from 'lucide-react';
import './organizer-shell.css';

const SECTIONS = [
  { key: 'mapa', label: 'Cérebro', longLabel: 'Cérebro Digital', icon: Brain },
  { key: 'flashcards', label: 'Flashcards', longLabel: 'Flashcards', icon: GraduationCap },
  { key: 'documentos', label: 'Documentos', longLabel: 'Documentos', icon: FolderOpen },
  { key: 'metas', label: 'Metas', longLabel: 'Metas', icon: Target },
];

export default function OrganizerShell({ activeProfile, renderSection, onTrocarPerfil }) {
  const [activeSection, setActiveSection] = useState('mapa');

  const api = useMemo(() => ({
    abrirModulo: (key) => {
      const normalized = key === 'sonhos' ? 'metas' : key;
      if (SECTIONS.some((section) => section.key === normalized)) setActiveSection(normalized);
    },
    abrirNota: () => setActiveSection('documentos'),
    baralhoId: null,
    grupo: null,
  }), []);

  const initials = (activeProfile || 'BB').split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className={`organizer-shell organizer-section-${activeSection}`}>
      <header className="organizer-header">
        <button className="organizer-brand" onClick={() => setActiveSection('mapa')} aria-label="Abrir Cérebro Digital">
          <span className="organizer-brand-orb" />
          <span><strong>Bueno</strong><small>Seu centro de organização</small></span>
        </button>

        <nav className="organizer-nav" aria-label="Áreas principais">
          {SECTIONS.map(({ key, label, longLabel, icon: Icon }) => (
            <button key={key} className={activeSection === key ? 'active' : ''} onClick={() => setActiveSection(key)} aria-current={activeSection === key ? 'page' : undefined} title={longLabel}>
              <Icon size={17} strokeWidth={2} />
              <span className="organizer-label-full">{longLabel}</span>
              <span className="organizer-label-short">{label}</span>
            </button>
          ))}
        </nav>

        <button className="organizer-profile" onClick={onTrocarPerfil} title="Trocar perfil">
          <span>{initials}</span><span className="organizer-profile-name">{activeProfile}</span><LogOut size={15} />
        </button>
      </header>

      <main className="organizer-workspace">{renderSection(activeSection, api)}</main>
    </div>
  );
}

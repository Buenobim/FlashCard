import { lazy, Suspense } from 'react';
import { ArrowLeft, NotebookTabs } from 'lucide-react';

const NotebookCanvas = lazy(() => import('./NotebookCanvas'));

export default function StudyNotebook({ material, activeProfile, onBack }) {
  return (
    <div className="study-notebook-page">
      <header>
        <button className="btn-glass" onClick={onBack}><ArrowLeft size={17} /> Biblioteca</button>
        <div><span><NotebookTabs size={18} /></span><div><small>CADERNO</small><h2>{material.title}</h2></div></div>
      </header>
      <div className="study-notebook-canvas"><Suspense fallback={<div className="cofre-carregando">Abrindo caderno…</div>}><NotebookCanvas deckId={`material-${material.id}`} profile={activeProfile} /></Suspense></div>
    </div>
  );
}

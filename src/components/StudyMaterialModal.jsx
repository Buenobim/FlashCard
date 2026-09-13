import { useEffect, useState } from 'react';
import { ExternalLink, Link2, ListChecks, NotebookTabs, Save, StickyNote, X } from 'lucide-react';

export const STUDY_MATERIAL_TYPES = {
  note: { label: 'Anotação', icon: StickyNote, color: '#60A5FA', description: 'Resumo, fórmula ou ideia rápida' },
  notebook: { label: 'Caderno', icon: NotebookTabs, color: '#A78BFA', description: 'Canvas livre para escrever e desenhar' },
  exercises: { label: 'Exercícios', icon: ListChecks, color: '#34D399', description: 'Lista de questões para concluir' },
  link: { label: 'Link / Material', icon: Link2, color: '#F59E0B', description: 'Aula, artigo, vídeo ou referência' },
};

const EMPTY = { title: '', category: 'Faculdade', content: '', url: '', tasksText: '' };

export default function StudyMaterialModal({ material, type, categories, onClose, onSave }) {
  const [form, setForm] = useState(EMPTY);
  const config = STUDY_MATERIAL_TYPES[type] || STUDY_MATERIAL_TYPES.note;
  const Icon = config.icon;

  useEffect(() => {
    if (!material) {
      setForm({ ...EMPTY, category: categories[0] || 'Faculdade' });
      return;
    }
    setForm({
      title: material.title || '', category: material.category || categories[0] || 'Faculdade',
      content: material.content || '', url: material.url || '',
      tasksText: (material.tasks || []).map((task) => task.text).join('\n'),
    });
  }, [material, categories, type]);

  const submit = (event) => {
    event.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const previousTasks = material?.tasks || [];
    const tasks = type === 'exercises' ? form.tasksText.split('\n').map((text) => text.trim()).filter(Boolean).map((text, index) => {
      const old = previousTasks.find((task) => task.text === text);
      return { id: old?.id || `task-${Date.now()}-${index}`, text, done: old?.done || false };
    }) : [];
    onSave({
      ...(material || {}), id: material?.id || `material-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type, title, category: form.category, content: form.content.trim(), url: form.url.trim(), tasks,
      createdAt: material?.createdAt || new Date().toISOString(), updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="study-modal-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="study-modal" onSubmit={submit}>
        <header className="study-modal-header">
          <span className="study-modal-icon" style={{ color: config.color, background: `${config.color}18` }}><Icon size={22} /></span>
          <div><small>{material ? 'EDITAR' : 'NOVO MATERIAL'}</small><h2>{config.label}</h2></div>
          <button type="button" className="study-icon-button" onClick={onClose} aria-label="Fechar"><X size={19} /></button>
        </header>

        <label className="study-field"><span>Título</span><input autoFocus value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={type === 'note' ? 'Ex.: Resumo da aula de hoje' : type === 'notebook' ? 'Ex.: Caderno de Física II' : type === 'exercises' ? 'Ex.: Lista 03 — Integrais' : 'Ex.: Videoaula sobre termodinâmica'} /></label>
        <label className="study-field"><span>Grupo</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{categories.map((cat) => <option key={cat}>{cat}</option>)}</select></label>

        {type === 'note' && <label className="study-field"><span>Anotação</span><textarea rows="10" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Escreva seu resumo, fórmulas, dúvidas e pontos importantes…" /></label>}
        {type === 'notebook' && <div className="study-notebook-info"><NotebookTabs size={22} /><div><strong>Caderno visual infinito</strong><p>Depois de salvar, você poderá escrever, desenhar, usar marca-texto, inserir imagens e organizar esquemas.</p></div></div>}
        {type === 'exercises' && <label className="study-field"><span>Questões — uma por linha</span><textarea rows="9" value={form.tasksText} onChange={(e) => setForm({ ...form, tasksText: e.target.value })} placeholder={'Resolver exercício 1 da lista\nRefazer questão da prova\nRevisar o erro da questão 8'} /></label>}
        {type === 'link' && <><label className="study-field"><span>Endereço do material</span><div className="study-url-field"><Link2 size={16} /><input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" /></div></label><label className="study-field"><span>Observação</span><textarea rows="5" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Por que este material é útil? Onde você parou?" /></label>{form.url && <a className="study-preview-link" href={form.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Testar link</a>}</>}

        <footer className="study-modal-footer"><button type="button" className="btn-glass" onClick={onClose}>Cancelar</button><button type="submit" className="btn-primary"><Save size={17} /> Salvar</button></footer>
      </form>
    </div>
  );
}

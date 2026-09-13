/*
  =============================================================================
  ARQUIVO: src/pages/subBrainShared.jsx
  PARA QUE SERVE: É a parte VISUAL compartilhada entre as duas visões do
  Sub-Cérebro (Macro e Micro): a tabela de tipos de sub-item (com ícone e cor)
  e o modal de criar/editar um sub-item.

  As contas e as regras (hierarquia dos cartões, cores, desenho do leque) ficam
  em subBrainCore.js. Este arquivo apenas repassa elas, para quem já importava
  daqui continuar funcionando:

      import { buildCardIndex, SUB_ITEM_TYPES } from './subBrainShared.jsx';
  =============================================================================
*/

import { useState } from 'react';
import {
  ExternalLink,
  Link2,
  ListChecks,
  NotebookTabs,
  Presentation,
  Save,
  StickyNote,
  X,
} from 'lucide-react';

// Repassa o miolo (contas e regras) para quem importa deste arquivo
export {
  hexToRgba,
  mixColor,
  ORBIT_COLORS,
  MICRO_COLORS,
  newId,
  compressImage,
  buildCardIndex,
  descendantIds,
  flattenTree,
  buildMicroLayout,
} from './subBrainCore.js';

import { newId } from './subBrainCore.js';

/* ======================================================================
   TIPOS DE SUB-ITEM (as categorias que orbitam no Macro e grudam nos
   cartões no Micro)
   ====================================================================== */
export const SUB_ITEM_TYPES = {
  // A AULA é a página HTML que o professor passou, guardada inteira dentro da
  // matéria. O HTML NÃO mora aqui na ficha: vai para o IndexedDB e para a nuvem
  // em pedaços (ver "MÓDULO AULAS" em src/utils/db.js). Aqui fica só a capa.
  aula:      { label: 'Aula',        icon: Presentation, color: '#F472B6', description: 'A aula da faculdade em HTML, inteira' },
  note:      { label: 'Anotação',    icon: StickyNote,   color: '#60A5FA', description: 'Resumo, fórmula ou ideia rápida' },
  notebook:  { label: 'Caderno',     icon: NotebookTabs, color: '#A78BFA', description: 'Canvas livre para escrever e desenhar' },
  exercises: { label: 'Exercícios',  icon: ListChecks,   color: '#34D399', description: 'Lista de questões para concluir' },
  link:      { label: 'Link',        icon: Link2,        color: '#F59E0B', description: 'Artigo, vídeo ou site de referência' },
};

/* ======================================================================
   COMPONENTE: SubItemEditor
   Modal de criar/editar um sub-item. Usado pelo Macro e pelo Micro.
   Quando vem do Micro, o sub-item já chega com `parentCardId` — e o spread
   de `subItem` no submit garante que esse vínculo nunca se perca.
   ====================================================================== */
export function SubItemEditor({ type, subItem, ownerLabel, onClose, onSave }) {
  const config = SUB_ITEM_TYPES[type] || SUB_ITEM_TYPES.note;
  const Icon = config.icon;

  const [form, setForm] = useState(() => ({
    title: subItem?.title || '',
    content: subItem?.content || '',
    url: subItem?.url || '',
    tasksText: subItem?.tasks ? subItem.tasks.map((t) => t.text).join('\n') : '',
  }));

  const submit = (e) => {
    e.preventDefault();
    const title = form.title.trim();
    if (!title) return;
    const previousTasks = subItem?.tasks || [];
    const tasks = type === 'exercises'
      ? form.tasksText.split('\n').map((t) => t.trim()).filter(Boolean).map((text, index) => {
          const old = previousTasks.find((task) => task.text === text);
          return { id: old?.id || `task-${Date.now()}-${index}`, text, done: old?.done || false };
        })
      : [];
    onSave({
      ...(subItem || {}),
      id: subItem?.id || newId('sub'),
      type,
      title,
      content: form.content.trim(),
      url: form.url.trim(),
      tasks,
      createdAt: subItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="study-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="study-modal" onSubmit={submit}>
        <header className="study-modal-header">
          <span className="study-modal-icon" style={{ color: config.color, background: `${config.color}18` }}><Icon size={22} /></span>
          <div>
            <small>{subItem ? 'EDITAR' : 'NOVO SUB-ITEM'}</small>
            <h2>{config.label}</h2>
            {ownerLabel && <small style={{ color: '#8e96a3', letterSpacing: 0, fontWeight: 600, textTransform: 'none' }}>pertence a: {ownerLabel}</small>}
          </div>
          <button type="button" className="study-icon-button" onClick={onClose}><X size={19} /></button>
        </header>

        <label className="study-field">
          <span>Título</span>
          <input
            autoFocus
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={type === 'note' ? 'Ex.: Resumo da aula' : type === 'notebook' ? 'Ex.: Caderno de Física' : type === 'exercises' ? 'Ex.: Lista 03' : 'Ex.: Videoaula'}
          />
        </label>

        {type === 'note' && (
          <label className="study-field">
            <span>Anotação</span>
            <textarea rows="10" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Resumo, fórmulas, dúvidas…" />
          </label>
        )}

        {type === 'notebook' && (
          <div className="study-notebook-info">
            <NotebookTabs size={22} />
            <div><strong>Caderno visual infinito</strong><p>Após salvar, abra para escrever e desenhar.</p></div>
          </div>
        )}

        {type === 'exercises' && (
          <label className="study-field">
            <span>Questões — uma por linha</span>
            <textarea rows="9" value={form.tasksText} onChange={(e) => setForm({ ...form, tasksText: e.target.value })} placeholder={'Resolver exercício 1\nRefazer questão da prova'} />
          </label>
        )}

        {type === 'link' && (
          <>
            <label className="study-field">
              <span>URL</span>
              <div className="study-url-field">
                <Link2 size={16} />
                <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://…" />
              </div>
            </label>
            <label className="study-field">
              <span>Observação</span>
              <textarea rows="5" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Por que é útil?" />
            </label>
            {form.url && <a className="study-preview-link" href={form.url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Testar link</a>}
          </>
        )}

        <footer className="study-modal-footer">
          <button type="button" className="btn-glass" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary"><Save size={17} /> Salvar</button>
        </footer>
      </form>
    </div>
  );
}

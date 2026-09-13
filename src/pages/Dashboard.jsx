/*
  =============================================================================
  ARQUIVO: src/pages/Dashboard.jsx
  PARA QUE SERVE: Painel do módulo Flashcards. Mostra estatísticas de estudo,
  os grupos (categorias) e a grade de baralhos. De cada baralho saem os 4 modos
  de estudo: Flashcards 3D, Aprender, Combinar e Simulado.
  =============================================================================
*/

import { useMemo, useState } from 'react';
import {
  Plus, Edit3, Trash2, Trophy, Activity, BookOpen,
  Search, ExternalLink, Play, Flame
} from 'lucide-react';
import StudyMaterialModal, { STUDY_MATERIAL_TYPES } from '../components/StudyMaterialModal';
import { raioX as calcularRaioX } from '../estudo/trilhaCore.js';
import { resumoDoEstudo } from '../utils/db';

export default function Dashboard({ sets, onNavigate, onSelectSet, onDeleteSet, categories = [], onAddCategory, activeProfile, isSyncing, initialCategoryFilter, initialExpandedSetId, studyMaterials = [], onSaveStudyMaterials, onOpenNotebook, onEstudarTrilha }) {
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [activeCategory, setActiveCategory] = useState(initialCategoryFilter || 'Todos');
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [materialEditor, setMaterialEditor] = useState(null);

  const handleAddCategorySubmit = (e) => {
    e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.some(cat => cat.toLowerCase() === trimmed.toLowerCase())) {
      alert('Este grupo de estudos já existe!');
      return;
    }
    onAddCategory(trimmed);
    setActiveCategory(trimmed);
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  // Exclusão em 2 cliques (evita apagar sem querer)
  const handleDeleteClick = (setId, event) => {
    event.stopPropagation();
    if (confirmDeleteId === setId) {
      onDeleteSet(setId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(setId);
    }
  };


  const totalCards = sets.reduce((acc, s) => acc + s.cards.length, 0);
  const firstName = (activeProfile || 'Estudante').split(' ')[0];

  // Filtro por grupo + busca por texto
  const filteredSets = sets.filter(s => {
    const inCategory = activeCategory === 'Todos' || s.category === activeCategory;
    const q = searchTerm.trim().toLowerCase();
    const inSearch = !q || s.title.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
    return inCategory && inSearch;
  });

  const filteredMaterials = studyMaterials.filter((material) => {
    const inCategory = activeCategory === 'Todos' || material.category === activeCategory;
    const q = searchTerm.trim().toLowerCase();
    const inSearch = !q || material.title.toLowerCase().includes(q) || (material.content || '').toLowerCase().includes(q);
    return inCategory && inSearch;
  });

  const saveMaterial = (material) => {
    const exists = studyMaterials.some((item) => item.id === material.id);
    const updated = exists ? studyMaterials.map((item) => item.id === material.id ? material : item) : [...studyMaterials, material];
    onSaveStudyMaterials(updated);
    setMaterialEditor(null);
    if (material.type === 'notebook') onOpenNotebook(material);
  };

  const deleteMaterial = (materialId) => {
    if (!confirm('Excluir este material de estudo?')) return;
    onSaveStudyMaterials(studyMaterials.filter((item) => item.id !== materialId));
  };

  const toggleTask = (materialId, taskId) => {
    onSaveStudyMaterials(studyMaterials.map((material) => material.id !== materialId ? material : {
      ...material,
      tasks: (material.tasks || []).map((task) => task.id === taskId ? { ...task, done: !task.done } : task),
      updatedAt: new Date().toISOString(),
    }));
  };

  /*
    O RAIO-X DE CADA MATÉRIA: quantos blocos ela tem e quantos cartões venceram
    hoje. É o que transforma o painel de uma lista de pastas numa lista de
    PENDÊNCIAS — você bate o olho e já sabe onde tem trabalho esperando.
  */
  const raioXPorBaralho = useMemo(() => {
    const agora = new Date();
    const mapa = new Map();
    sets.forEach((s) => mapa.set(s.id, calcularRaioX(s, agora)));
    return mapa;
  }, [sets]);

  const totalParaHoje = useMemo(
    () => sets.reduce((acc, s) => acc + (raioXPorBaralho.get(s.id)?.aRevisar || 0), 0),
    [sets, raioXPorBaralho],
  );

  // A sequência de dias seguidos estudando — o número que mais segura a rotina.
  // O diário mora no LocalStorage, fora do React — por isso ele é relido quando
  // `sets` muda: responder um cartão regrava o baralho, e é esse o sinal de que
  // uma sessão acabou de acontecer.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const diario = useMemo(() => resumoDoEstudo(activeProfile), [activeProfile, sets]);

  const summary = [
    { icon: Flame, value: diario.sequencia, label: diario.sequencia === 1 ? 'dia seguido' : 'dias seguidos', color: '#E77950' },
    { icon: Activity, value: totalParaHoje, label: 'Para revisar hoje', color: totalParaHoje > 0 ? '#EEA53D' : '#3ECF8E' },
    { icon: BookOpen, value: totalCards, label: 'Cartões', color: '#E8933F' },
    { icon: Trophy, value: diario.hoje.respostas, label: 'Respostas hoje', color: '#3ECF8E' },
  ];

  // A matéria mais atrasada — é ela que o botão grande do topo abre.
  const maisAtrasada = useMemo(() => {
    let melhor = null;
    sets.forEach((s) => {
      const n = raioXPorBaralho.get(s.id)?.aRevisar || 0;
      if (n > 0 && (!melhor || n > (raioXPorBaralho.get(melhor.id)?.aRevisar || 0))) melhor = s;
    });
    return melhor;
  }, [sets, raioXPorBaralho]);


  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease' }}>

      {/* CABEÇALHO */}
      <section style={styles.welcomeSection}>
        <div>
          <h1 style={styles.title}>Seus estudos, {firstName}.</h1>
          <p style={styles.subtitle}>Baralhos, anotações, cadernos e tudo que ajuda você a aprender.</p>
        </div>
        <div className="study-create-wrap">
          <button onClick={() => setCreateMenuOpen((open) => !open)} className="btn-primary" disabled={isSyncing}><Plus size={18} /> Novo material</button>
          {createMenuOpen && (
            <div className="study-create-menu">
              <button onClick={() => { setCreateMenuOpen(false); onNavigate('create'); }}><span style={{ color: '#E8933F', background: '#E8933F18' }}><BookOpen size={20} /></span><span><strong>Baralho</strong><small>Cartões com pergunta e resposta</small></span></button>
              {Object.entries(STUDY_MATERIAL_TYPES).map(([type, config]) => { const Icon = config.icon; return <button key={type} onClick={() => { setCreateMenuOpen(false); setMaterialEditor({ type, material: null }); }}><span style={{ color: config.color, background: `${config.color}18` }}><Icon size={20} /></span><span><strong>{config.label}</strong><small>{config.description}</small></span></button>; })}
            </div>
          )}
        </div>
      </section>

      {isSyncing && (
        <div style={styles.syncingBanner} className="animate-pulse">
          Sincronizando seus baralhos com a nuvem…
        </div>
      )}

      {/*
        O CONVITE DO DIA.
        Sem ele, abrir o app é encarar uma grade de pastas e ter que decidir por
        onde começar — e decidir cansa. Com ele, existe UM botão que já sabe qual
        matéria está mais atrasada. Dez minutos por dia aqui valem mais do que
        cinco horas na véspera da prova.
      */}
      {onEstudarTrilha && maisAtrasada && (
        <section style={styles.convite}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <strong style={styles.conviteTitulo}>
              {totalParaHoje} {totalParaHoje === 1 ? 'cartão venceu' : 'cartões venceram'} hoje.
            </strong>
            <p style={styles.conviteTexto}>
              O mais atrasado está em <b>{maisAtrasada.title}</b>. Revisar hoje custa alguns minutos;
              deixar para depois custa a semana inteira.
            </p>
          </div>
          <button
            className="btn-primary"
            style={{ flexShrink: 0 }}
            onClick={() => onEstudarTrilha(maisAtrasada, 'revisao')}
          >
            <Play size={17} /> Revisar agora
          </button>
        </section>
      )}

      {/* ESTATÍSTICAS */}
      <section style={styles.statsGrid}>
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} style={styles.statsCard} className="glass-panel">
              <div style={{ ...styles.iconCircle, background: `${item.color}1A`, color: item.color }}>
                <Icon size={20} />
              </div>
              <div>
                <h3 style={styles.statsVal}>{item.value}</h3>
                <p style={styles.statsLabel}>{item.label}</p>
              </div>
            </div>
          );
        })}
      </section>

      {/* GRUPOS + BUSCA */}
      <section style={styles.filterSection}>
        <div style={styles.categoriesList}>
          <button
            onClick={() => setActiveCategory('Todos')}
            className={activeCategory === 'Todos' ? 'chip chip-active' : 'chip'}
          >
            Todos
          </button>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={activeCategory === cat ? 'chip chip-active' : 'chip'}
            >
              {cat}
            </button>
          ))}
          {!isAddingCategory ? (
            <button onClick={() => setIsAddingCategory(true)} className="chip" title="Criar novo grupo">
              <Plus size={13} /> Grupo
            </button>
          ) : (
            <form onSubmit={handleAddCategorySubmit} style={styles.addCategoryForm}>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Nome do grupo"
                style={styles.categoryInput}
                maxLength={20}
                autoFocus
              />
              <button type="submit" style={styles.categorySubmitBtn}>Ok</button>
              <button
                type="button"
                onClick={() => { setIsAddingCategory(false); setNewCategoryName(''); }}
                style={styles.categoryCancelBtn}
              >
                ✕
              </button>
            </form>
          )}
        </div>

        <div style={styles.searchBox}>
          <Search size={15} color="#7A828E" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar nos estudos…"
            style={styles.searchInput}
          />
        </div>
      </section>

      {/* BIBLIOTECA DE ESTUDOS */}
      {filteredSets.length === 0 && filteredMaterials.length === 0 ? (
        <div className="glass-panel empty-state">
          <BookOpen size={52} style={{ color: '#3B434F', marginBottom: '16px' }} />
          <h3 style={styles.emptyTitle}>
            {sets.length === 0 && studyMaterials.length === 0 ? 'Sua biblioteca está vazia' : 'Nada encontrado aqui'}
          </h3>
          <p style={styles.emptyDesc}>
            {sets.length === 0 && studyMaterials.length === 0
              ? 'Adicione um baralho, uma anotação, um caderno, exercícios ou um material externo.'
              : 'Nenhum material corresponde a esse grupo ou busca.'}
          </p>
          <button onClick={() => setCreateMenuOpen(true)} className="btn-primary" style={{ marginTop: '18px' }}><Plus size={18} /> Adicionar material</button>
        </div>
      ) : (
        <div style={styles.setsGrid}>
          {filteredMaterials.map((material) => {
            const config = STUDY_MATERIAL_TYPES[material.type] || STUDY_MATERIAL_TYPES.note;
            const Icon = config.icon;
            const completed = (material.tasks || []).filter((task) => task.done).length;
            const openMaterial = () => material.type === 'notebook'
              ? onOpenNotebook(material)
              : material.type === 'link' && material.url
                ? window.open(material.url, '_blank', 'noopener,noreferrer')
                : setMaterialEditor({ type: material.type, material });
            return (
              <article key={material.id} className="glass-panel study-material-card" onClick={openMaterial}>
                <div className="study-material-top">
                  <span className="study-material-type" style={{ color: config.color }}><Icon size={16} /> {config.label}</span>
                  <div className="study-material-actions" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setMaterialEditor({ type: material.type, material })} title="Editar"><Edit3 size={14} /></button>
                    <button onClick={() => deleteMaterial(material.id)} title="Excluir"><Trash2 size={14} /></button>
                  </div>
                </div>
                <h3 className="study-material-title">{material.title}</h3>
                {material.type === 'exercises' ? (
                  <div className="study-task-preview" onClick={(e) => e.stopPropagation()}>
                    {(material.tasks || []).slice(0, 3).map((task) => <label key={task.id}><input type="checkbox" checked={task.done} onChange={() => toggleTask(material.id, task.id)} /><span style={{ textDecoration: task.done ? 'line-through' : 'none', opacity: task.done ? .55 : 1 }}>{task.text}</span></label>)}
                  </div>
                ) : <p className="study-material-preview">{material.content || (material.type === 'notebook' ? 'Caderno visual pronto para escrever e desenhar.' : material.url)}</p>}
                <footer className="study-material-footer"><span>{material.category || 'Sem grupo'}</span><span>{material.type === 'exercises' ? `${completed}/${(material.tasks || []).length} concluídos` : material.type === 'link' ? <><ExternalLink size={12} /> Abrir material</> : 'Abrir'}</span></footer>
              </article>
            );
          })}
          {filteredSets.map((set) => {
            const isConfirming = confirmDeleteId === set.id;
            const subItemCount = (set.subItems || []).length;
            const numeros = raioXPorBaralho.get(set.id) || { totalBlocos: 0, totalCartoes: 0, contexto: 0, aRevisar: 0 };

            return (
              <div
                key={set.id}
                style={styles.setCard}
                className="glass-panel deck-card"
                onClick={() => { onSelectSet(set); onNavigate('sub_brain'); }}
              >
                <div style={styles.setCardHeader}>
                  <div style={styles.setMainInfo}>
                    <div style={styles.badgeRow}>
                      <span style={styles.cardCounter}>{numeros.totalCartoes} {numeros.totalCartoes === 1 ? 'cartão' : 'cartões'}</span>
                      {numeros.contexto > 0 && <span style={styles.cardCounter}>{numeros.contexto} de contexto</span>}
                      <span style={styles.categoryBadge}>{set.category || 'Sem Grupo'}</span>
                      {numeros.aRevisar > 0 && (
                        <span style={styles.badgeVencido} title="Cartões que a repetição espaçada marcou para hoje">
                          {numeros.aRevisar} para hoje
                        </span>
                      )}
                    </div>
                    <h3 style={styles.setCardTitle}>{set.title}</h3>
                    {set.description && <p style={styles.setCardDesc}>{set.description}</p>}
                  </div>

                  <div style={styles.setActions} onClick={(e) => e.stopPropagation()}>
                    {onEstudarTrilha && numeros.totalBlocos > 0 && (
                      <button
                        onClick={() => onEstudarTrilha(set)}
                        style={styles.botaoEstudar}
                        title="Estudar esta matéria"
                      >
                        <Play size={13} /> Estudar
                      </button>
                    )}
                    <button
                      onClick={() => { onSelectSet(set); onNavigate('edit'); }}
                      style={styles.actionIconButton}
                      className="deck-edit-btn"
                      title="Editar a trilha desta matéria"
                    >
                      <Edit3 size={15} />
                    </button>
                    {isConfirming ? (
                      <div style={styles.confirmBox}>
                        <button
                          onClick={(e) => handleDeleteClick(set.id, e)}
                          style={styles.confirmDeleteBtn}
                          disabled={isSyncing}
                        >
                          Apagar
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} style={styles.cancelDeleteBtn}>Não</button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => !isSyncing && handleDeleteClick(set.id, e)}
                        style={{ ...styles.deleteIconButton, ...(isSyncing ? { opacity: 0.5, cursor: 'not-allowed' } : {}) }}
                        className="deck-delete-btn"
                        title="Apagar baralho"
                        disabled={isSyncing}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                <div style={styles.expandHint}>
                  {numeros.totalBlocos > 0
                    ? `${numeros.totalBlocos} ${numeros.totalBlocos === 1 ? 'bloco na trilha' : 'blocos na trilha'}`
                    : 'Trilha vazia — abra e monte a matéria'}
                  {numeros.totalCartoes > 0 ? ` · ${numeros.dominio}% na memória de longo prazo` : ''}
                  {subItemCount > 0 ? ` · ${subItemCount} ${subItemCount === 1 ? 'material interno' : 'materiais internos'}` : ''}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {materialEditor && <StudyMaterialModal material={materialEditor.material} type={materialEditor.type} categories={categories.length ? categories : ['Faculdade']} onClose={() => setMaterialEditor(null)} onSave={saveMaterial} />}
    </div>
  );
}

const styles = {
  welcomeSection: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
    marginBottom: '28px', flexWrap: 'wrap', gap: '18px',
  },
  title: { fontSize: 'clamp(26px, 5vw, 34px)', color: '#F4F5F7', marginBottom: '6px', lineHeight: 1.15 },
  subtitle: { color: '#99A1AC', fontSize: '15px', maxWidth: '600px' },
  syncingBanner: {
    background: 'rgba(232, 147, 63, 0.08)', border: '1px solid rgba(232, 147, 63, 0.2)',
    borderRadius: '12px', color: '#EFAE6B', padding: '12px 20px', fontSize: '14px',
    fontWeight: 700, textAlign: 'center', marginBottom: '22px',
  },
  convite: {
    display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap',
    background: 'linear-gradient(135deg, rgba(232,147,63,0.13), rgba(231,121,80,0.07))',
    border: '1px solid rgba(232, 147, 63, 0.28)', borderRadius: '16px',
    padding: '18px 22px', marginBottom: '24px',
  },
  conviteTitulo: { display: 'block', fontFamily: 'var(--font-display)', fontSize: '19px', color: '#F4F5F7', marginBottom: '4px' },
  conviteTexto: { color: '#B9BFC8', fontSize: '13.5px', lineHeight: 1.5, margin: 0 },
  badgeVencido: {
    background: 'rgba(238, 165, 61, 0.16)', border: '1px solid rgba(238, 165, 61, 0.38)',
    color: '#F0BC72', borderRadius: '999px', padding: '3px 10px',
    fontSize: '11px', fontWeight: 800, letterSpacing: '0.2px',
  },
  botaoEstudar: {
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    background: 'rgba(232, 147, 63, 0.14)', border: '1px solid rgba(232, 147, 63, 0.35)',
    color: '#EFAE6B', borderRadius: '8px', padding: '7px 12px',
    fontSize: '12.5px', fontWeight: 800, cursor: 'pointer', fontFamily: 'var(--font-main)',
    whiteSpace: 'nowrap',
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '12px', marginBottom: '28px',
  },
  statsCard: { padding: '16px 18px', display: 'flex', alignItems: 'center', gap: '13px' },
  iconCircle: {
    width: '42px', height: '42px', borderRadius: '11px',
    display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0,
  },
  statsVal: { fontSize: '21px', color: '#F4F5F7', lineHeight: 1.1 },
  statsLabel: {
    fontSize: '11px', color: '#7A828E', fontWeight: 800,
    textTransform: 'uppercase', letterSpacing: '0.6px', marginTop: '3px',
  },
  filterSection: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '14px', flexWrap: 'wrap', marginBottom: '20px',
  },
  categoriesList: { display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' },
  addCategoryForm: { display: 'flex', alignItems: 'center', gap: '6px' },
  categoryInput: {
    background: 'var(--bg-primary)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', padding: '6px 12px', color: '#fff', fontSize: '13px', outline: 'none', width: '140px',
  },
  categorySubmitBtn: {
    background: 'var(--primary-color)', border: 'none', borderRadius: '8px',
    color: '#17120B', padding: '6px 12px', fontSize: '12px', fontWeight: 800, cursor: 'pointer',
  },
  categoryCancelBtn: {
    background: 'transparent', border: 'none', color: '#7A828E',
    padding: '6px', fontSize: '13px', cursor: 'pointer',
  },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    borderRadius: '10px', padding: '8px 14px', minWidth: '210px',
  },
  searchInput: {
    background: 'transparent', border: 'none', outline: 'none',
    color: '#F4F5F7', fontSize: '14px', width: '100%',
  },
  emptyTitle: { fontSize: '20px', color: '#F4F5F7', marginBottom: '8px' },
  emptyDesc: { color: '#99A1AC', fontSize: '14px', maxWidth: '460px', lineHeight: 1.6 },
  setsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '14px', paddingBottom: '40px', alignItems: 'start',
  },
  setCard: { padding: '20px', cursor: 'pointer', transition: 'all 0.25s ease' },
  setCardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px',
  },
  setMainInfo: { flex: 1, minWidth: 0 },
  badgeRow: { display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '10px' },
  setCardTitle: { fontSize: '18px', color: '#F4F5F7', marginBottom: '5px', wordBreak: 'break-word' },
  setCardDesc: { color: '#99A1AC', fontSize: '13px', lineHeight: 1.5 },
  cardCounter: {
    background: 'rgba(232, 147, 63, 0.12)', color: '#E8933F', fontSize: '11px',
    fontWeight: 800, padding: '3px 10px', borderRadius: '100px',
  },
  categoryBadge: {
    background: 'var(--bg-tertiary)', color: '#99A1AC', fontSize: '11px',
    fontWeight: 800, padding: '3px 10px', borderRadius: '100px',
  },
  setActions: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  actionIconButton: {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', color: '#99A1AC', padding: '8px', cursor: 'pointer',
    transition: 'all 0.2s ease', display: 'flex',
  },
  deleteIconButton: {
    background: 'rgba(229, 72, 77, 0.06)', border: '1px solid rgba(229, 72, 77, 0.15)',
    borderRadius: '8px', color: '#E5484D', padding: '8px', cursor: 'pointer',
    transition: 'all 0.2s ease', display: 'flex',
  },
  confirmBox: {
    display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px',
    borderRadius: '8px', border: '1px solid rgba(229, 72, 77, 0.25)',
  },
  confirmDeleteBtn: {
    background: '#E5484D', color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: 800, padding: '6px 12px', cursor: 'pointer',
  },
  cancelDeleteBtn: {
    background: 'transparent', color: '#99A1AC', border: 'none',
    fontSize: '12px', fontWeight: 800, padding: '6px 10px', cursor: 'pointer',
  },
  expandHint: {
    textAlign: 'center', marginTop: '16px', borderTop: '1px solid var(--border-subtle)',
    paddingTop: '12px', fontSize: '12px', color: '#7A828E', fontWeight: 700,
  },
  studyModesArea: {
    marginTop: '16px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px',
    display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px',
    animation: 'fadeIn 0.25s ease',
  },
  modeOption: {
    background: 'var(--bg-primary)', padding: '12px 14px', borderRadius: '10px',
    cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', transition: 'all 0.2s ease', border: '1px solid',
    textAlign: 'left', width: '100%',
  },
  modeOptionName: { fontSize: '14px', fontWeight: 800, display: 'block' },
  modeOptionDesc: { fontSize: '11px', color: '#7A828E', display: 'block', marginTop: '2px' },
};

const extraStyles = `
.deck-card:hover { border-color: rgba(255, 255, 255, 0.14) !important; }
.mode-option-btn:hover { transform: translateY(-2px); background: var(--bg-tertiary) !important; }
.deck-edit-btn:hover { color: #F4F5F7 !important; border-color: rgba(255,255,255,0.2) !important; }
.deck-delete-btn:hover { background: #E5484D !important; color: #fff !important; }
@media (max-width: 480px) {
  .deck-card .studyModesArea { grid-template-columns: 1fr !important; }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = extraStyles;
  document.head.appendChild(styleSheet);
}

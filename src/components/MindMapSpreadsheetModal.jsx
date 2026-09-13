/*
  =============================================================================
  ARQUIVO: src/components/MindMapSpreadsheetModal.jsx
  PARA QUE SERVE: Este é o "Editor em Formato de Planilha" (MindMap Spreadsheet). 
  Ele permite que o senhor Bruno Bueno visualize e edite TODOS os grupos e todas 
  as esferas do seu Cérebro Digital em uma única tabela/planilha simples e prática,
  como no Excel ou Google Sheets, mantendo um design limpo e profissional sem emojis coloridos.
  =============================================================================
*/

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Table, 
  Plus, 
  Trash2, 
  Save, 
  FolderPlus, 
  Palette, 
  Check, 
  Layers, 
  Globe, 
  FileText, 
  Tag, 
  Cpu, 
  Scale 
} from 'lucide-react';

// Cores pré-definidas para os grupos no mapa mental
const PALETTE = ["#3b82f6","#a855f7","#06b6d4","#ec4899","#22c55e","#f59e0b","#ef4444","#14b8a6","#8b5cf6","#f97316","#64748b","#eab308"];

export default function MindMapSpreadsheetModal({ 
  isOpen, 
  onClose, 
  mindMap, 
  onSaveMindMap, 
  categories = [] 
}) {
  // 1. ESTADOS DO MODAL
  const [activeTab, setActiveTab] = useState('nodes'); // 'nodes' (Esferas) ou 'groups' (Áreas/Grupos)
  const [groups, setGroups] = useState([]);
  const [rows, setRows] = useState([]);
  const [filterGroupId, setFilterGroupId] = useState('all');
  const [isSavedToast, setIsSavedToast] = useState(false);

  /*
    EFEITO AO ABRIR O MODAL:
    Converte a estrutura do mapa mental em um formato plano (lista de linhas de planilha)
    para fácil edição de cada célula.
  */
  useEffect(() => {
    if (isOpen && mindMap && mindMap.groups) {
      const clonedGroups = structuredClone(mindMap.groups);
      setGroups(clonedGroups);

      // Constrói a lista plana de linhas (uma para cada esfera)
      const flattenedRows = [];
      clonedGroups.forEach(g => {
        (g.nodes || []).forEach(n => {
          flattenedRows.push({
            id: n.id || 'node_' + Math.random().toString(36).substr(2, 9),
            groupId: g.id,
            label: n.label || '',
            note: n.note || '',
            w: n.w || 2,
            category: n.category || '',
            app: n.app || 'flashcards',
            parentId: n.parentId || null,
            relatedNodeIds: n.relatedNodeIds || []
          });
        });
      });

      setRows(flattenedRows);
    }
  }, [isOpen, mindMap]);

  /*
    FUNÇÃO: handleCellChange
    PARA QUE SERVE: Atualiza o valor de uma célula específica da planilha (ex: Nome, Grupo, Nota, Categoria, App, Peso, Pai, Conexões).
  */
  const handleCellChange = (rowId, field, value) => {
    setRows(prev => prev.map(row => {
      if (row.id === rowId) {
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  /*
    FUNÇÃO: handleAddRow
    PARA QUE SERVE: Adiciona uma nova linha (esfera) vazia à planilha.
  */
  const handleAddRow = () => {
    const targetGroupId = filterGroupId !== 'all' ? filterGroupId : (groups[0]?.id || 'g1');
    const newRow = {
      id: 'node_' + Date.now(),
      groupId: targetGroupId,
      label: 'Nova Esfera',
      note: '',
      w: 2,
      category: '',
      app: 'flashcards',
      parentId: null,
      relatedNodeIds: []
    };
    setRows(prev => [...prev, newRow]);
  };

  /*
    FUNÇÃO: handleDeleteRow
    PARA QUE SERVE: Exclui uma linha (esfera) da planilha.
  */
  const handleDeleteRow = (rowId) => {
    setRows(prev => prev.filter(r => r.id !== rowId));
  };

  /*
    FUNÇÃO: handleGroupChange
    PARA QUE SERVE: Edita as propriedades de um Grupo (Nome ou Cor) na aba de Grupos.
  */
  const handleGroupChange = (groupId, field, value) => {
    setGroups(prev => prev.map(g => {
      if (g.id === groupId) {
        return { ...g, [field]: value };
      }
      return g;
    }));
  };

  /*
    FUNÇÃO: handleAddGroup
    PARA QUE SERVE: Cria um novo Grupo (Área de Vida) no mapa mental.
  */
  const handleAddGroup = () => {
    const newId = 'g_' + Date.now();
    const colorIndex = groups.length % PALETTE.length;
    const newGroup = {
      id: newId,
      name: 'Nova Área de Vida',
      color: PALETTE[colorIndex],
      nodes: []
    };
    setGroups(prev => [...prev, newGroup]);
  };

  /*
    FUNÇÃO: handleDeleteGroup
    PARA QUE SERVE: Remove um Grupo e reatribui suas esferas para o primeiro grupo disponível.
  */
  const handleDeleteGroup = (groupId) => {
    if (groups.length <= 1) {
      alert('O Cérebro precisa ter pelo menos 1 grupo ativo.');
      return;
    }
    const remainingGroups = groups.filter(g => g.id !== groupId);
    const fallbackGroupId = remainingGroups[0].id;

    // Move as esferas do grupo deletado para o primeiro grupo restante
    setRows(prev => prev.map(r => r.groupId === groupId ? { ...r, groupId: fallbackGroupId } : r));
    setGroups(remainingGroups);
  };

  /*
    FUNÇÃO: handleSaveAll
    PARA QUE SERVE: Reconstrói o objeto completo do Mapa Mental e salva as alterações.
  */
  const handleSaveAll = () => {
    // 1. Agrupa as linhas de volta em seus respectivos grupos
    const updatedGroups = groups.map(g => {
      const groupNodes = rows
        .filter(r => r.groupId === g.id)
        .map(r => ({
          id: r.id,
          label: r.label.trim() || 'Sem Nome',
          note: r.note,
          w: Number(r.w) || 2,
          category: r.category,
          app: r.app,
          parentId: r.parentId || null,
          relatedNodeIds: r.relatedNodeIds || []
        }));

      return {
        ...g,
        nodes: groupNodes
      };
    });

    const updatedMindMap = {
      ...mindMap,
      groups: updatedGroups
    };

    // 2. Salva localmente e dispara a sincronização com a nuvem
    onSaveMindMap(updatedMindMap);

    setIsSavedToast(true);
    setTimeout(() => {
      setIsSavedToast(false);
      onClose();
    }, 600);
  };

  if (!isOpen) return null;

  // Filtra as linhas visíveis na planilha caso o usuário selecione um grupo específico
  const visibleRows = filterGroupId === 'all' 
    ? rows 
    : rows.filter(r => r.groupId === filterGroupId);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO DA PLANILHA */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Table size={24} color="#38BDF8" />
            <div>
              <h2 style={styles.title}>Planilha do Cérebro Digital</h2>
              <p style={styles.subtitle}>Visualize e edite todas as esferas e áreas de vida em formato de tabela</p>
            </div>
          </div>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* ABAS DE NAVEGAÇÃO E FILTROS DE GRUPO */}
        <div style={styles.toolbar}>
          <div style={styles.tabsGroup}>
            <button 
              style={activeTab === 'nodes' ? styles.activeTabBtn : styles.tabBtn} 
              onClick={() => setActiveTab('nodes')}
            >
              <Globe size={14} style={{ marginRight: 6 }} /> Esferas ({rows.length})
            </button>
            <button 
              style={activeTab === 'groups' ? styles.activeTabBtn : styles.tabBtn} 
              onClick={() => setActiveTab('groups')}
            >
              <Layers size={14} style={{ marginRight: 6 }} /> Grupos / Áreas ({groups.length})
            </button>
          </div>

          {activeTab === 'nodes' && (
            <div style={styles.filterGroup}>
              <span style={styles.filterLabel}>Filtrar Grupo:</span>
              <select 
                value={filterGroupId} 
                onChange={(e) => setFilterGroupId(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">Todas as Áreas ({rows.length})</option>
                {groups.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({rows.filter(r => r.groupId === g.id).length})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL (TABELA DE PLANILHA) */}
        <div style={styles.tableContainer}>
          {activeTab === 'nodes' ? (
            /* TABELA DE ESFERAS */
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '150px' }}>
                    <div style={styles.thContent}><Layers size={13} color="#94A3B8" /> Área / Grupo</div>
                  </th>
                  <th style={{ ...styles.th, width: '170px' }}>
                    <div style={styles.thContent}><Globe size={13} color="#94A3B8" /> Esfera Mãe (Pai)</div>
                  </th>
                  <th style={{ ...styles.th, width: '180px' }}>
                    <div style={styles.thContent}><Globe size={13} color="#94A3B8" /> Nome da Esfera</div>
                  </th>
                  <th style={{ ...styles.th, width: '200px' }}>
                    <div style={styles.thContent}><FileText size={13} color="#94A3B8" /> Descrição / Nota</div>
                  </th>
                  <th style={{ ...styles.th, width: '120px' }}>
                    <div style={styles.thContent}><Tag size={13} color="#94A3B8" /> Categoria</div>
                  </th>
                  <th style={{ ...styles.th, width: '130px' }}>
                    <div style={styles.thContent}><Cpu size={13} color="#94A3B8" /> App Conectado</div>
                  </th>
                  <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>
                    <div style={{ ...styles.thContent, justifyContent: 'center' }}><Scale size={13} color="#94A3B8" /> Peso</div>
                  </th>
                  <th style={{ ...styles.th, width: '60px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {visibleRows.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={styles.emptyTd}>
                      Nenhuma esfera encontrada neste filtro. Clique em "+ Adicionar Nova Esfera" abaixo!
                    </td>
                  </tr>
                ) : (
                  visibleRows.map(row => {
                    const currentGroup = groups.find(g => g.id === row.groupId) || groups[0];
                    const isSubNode = !!row.parentId;

                    return (
                      <tr key={row.id} style={{ ...styles.tr, backgroundColor: isSubNode ? 'rgba(15, 23, 42, 0.4)' : 'transparent' }}>
                        {/* COLUNA 1: SELETOR DE GRUPO */}
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ 
                              width: '8px', 
                              height: '8px', 
                              borderRadius: '50%', 
                              backgroundColor: currentGroup?.color || '#3b82f6',
                              flexShrink: 0
                            }} />
                            <select 
                              value={row.groupId}
                              onChange={(e) => handleCellChange(row.id, 'groupId', e.target.value)}
                              style={styles.cellSelect}
                            >
                              {groups.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                              ))}
                            </select>
                          </div>
                        </td>

                        {/* COLUNA 2: SELETOR DE ESFERA MÃE (PAI) */}
                        <td style={styles.td}>
                          <select 
                            value={row.parentId || ''}
                            onChange={(e) => handleCellChange(row.id, 'parentId', e.target.value || null)}
                            style={{ ...styles.cellSelect, color: isSubNode ? '#38BDF8' : '#F8FAFC' }}
                          >
                            <option value="">(Principal)</option>
                            {rows.map(otherNode => {
                              if (otherNode.id === row.id) return null;
                              return (
                                <option key={otherNode.id} value={otherNode.id}>
                                  {otherNode.label}
                                </option>
                              );
                            })}
                          </select>
                        </td>

                        {/* COLUNA 3: NOME DA ESFERA (COM INDENTAÇÃO DE SUB-RAMO) */}
                        <td style={styles.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isSubNode && <span style={{ color: '#38BDF8', fontSize: '12px', fontWeight: 'bold' }}>└─</span>}
                            <input 
                              type="text"
                              value={row.label}
                              onChange={(e) => handleCellChange(row.id, 'label', e.target.value)}
                              style={{ ...styles.cellInputBold, color: isSubNode ? '#E2E8F0' : '#F8FAFC' }}
                              placeholder="Nome da Esfera..."
                            />
                          </div>
                        </td>

                        {/* COLUNA 4: NOTAS / DESCRIÇÃO */}
                        <td style={styles.td}>
                          <input 
                            type="text"
                            value={row.note}
                            onChange={(e) => handleCellChange(row.id, 'note', e.target.value)}
                            style={styles.cellInput}
                            placeholder="Adicionar descrição..."
                          />
                        </td>

                        {/* COLUNA 5: CATEGORIA DE ESTUDOS */}
                        <td style={styles.td}>
                          <select 
                            value={row.category || ''}
                            onChange={(e) => handleCellChange(row.id, 'category', e.target.value)}
                            style={styles.cellSelect}
                          >
                            <option value="">(Nenhuma)</option>
                            {categories.map((cat, i) => (
                              <option key={i} value={cat}>{cat}</option>
                            ))}
                          </select>
                        </td>

                        {/* COLUNA 6: APLICATIVO CONECTADO */}
                        <td style={styles.td}>
                          <select 
                            value={row.app || 'flashcards'}
                            onChange={(e) => handleCellChange(row.id, 'app', e.target.value)}
                            style={styles.cellSelect}
                          >
                            <option value="flashcards">Flashcards</option>
                            <option value="notebook">Caderno Excalidraw</option>
                            <option value="finance">Finanças</option>
                            <option value="habits">Hábitos</option>
                            <option value="dreams">Quadro dos Sonhos</option>
                            <option value="docs">Documentos</option>
                          </select>
                        </td>

                        {/* COLUNA 6: PESO / TAMANHO */}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <select 
                            value={row.w}
                            onChange={(e) => handleCellChange(row.id, 'w', e.target.value)}
                            style={{ ...styles.cellSelect, textAlign: 'center' }}
                          >
                            <option value="1">1 (Pequeno)</option>
                            <option value="2">2 (Médio)</option>
                            <option value="3">3 (Grande)</option>
                          </select>
                        </td>

                        {/* COLUNA 7: BOTÃO EXCLUIR */}
                        <td style={{ ...styles.td, textAlign: 'center' }}>
                          <button 
                            onClick={() => handleDeleteRow(row.id)}
                            style={styles.deleteRowBtn}
                            title="Excluir Esfera"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* TABELA DE GERENCIAMENTO DE GRUPOS / ÁREAS */
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.th, width: '100px' }}>
                    <div style={styles.thContent}><Palette size={13} color="#94A3B8" /> Cor</div>
                  </th>
                  <th style={{ ...styles.th, width: '250px' }}>
                    <div style={styles.thContent}><Layers size={13} color="#94A3B8" /> Nome da Área de Vida</div>
                  </th>
                  <th style={{ ...styles.th, width: '120px', textAlign: 'center' }}>
                    <div style={{ ...styles.thContent, justifyContent: 'center' }}><Globe size={13} color="#94A3B8" /> Esferas</div>
                  </th>
                  <th style={{ ...styles.th, width: '80px', textAlign: 'center' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(g => {
                  const count = rows.filter(r => r.groupId === g.id).length;
                  return (
                    <tr key={g.id} style={styles.tr}>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="color" 
                            value={g.color || '#3b82f6'} 
                            onChange={(e) => handleGroupChange(g.id, 'color', e.target.value)}
                            style={styles.colorPicker}
                          />
                          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{g.color}</span>
                        </div>
                      </td>
                      <td style={styles.td}>
                        <input 
                          type="text" 
                          value={g.name} 
                          onChange={(e) => handleGroupChange(g.id, 'name', e.target.value)}
                          style={styles.cellInputBold}
                        />
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center', color: '#38BDF8', fontWeight: '600' }}>
                        {count} esfera(s)
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <button 
                          onClick={() => handleDeleteGroup(g.id)}
                          style={styles.deleteRowBtn}
                          title="Excluir Grupo"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* RODAPÉ COM AÇÕES DA PLANILHA */}
        <div style={styles.footer}>
          <div style={styles.footerLeft}>
            {activeTab === 'nodes' ? (
              <button style={styles.secondaryBtn} onClick={handleAddRow}>
                <Plus size={16} /> Adicionar Nova Esfera
              </button>
            ) : (
              <button style={styles.secondaryBtn} onClick={handleAddGroup}>
                <FolderPlus size={16} /> Criar Nova Área de Vida
              </button>
            )}
          </div>

          <div style={styles.footerRight}>
            <button style={styles.cancelBtn} onClick={onClose}>
              Cancelar
            </button>
            <button style={styles.saveBtn} onClick={handleSaveAll}>
              {isSavedToast ? (
                <>
                  <Check size={18} /> Salvo com Sucesso!
                </>
              ) : (
                <>
                  <Save size={18} /> Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ESTILOS VISUAIS E AESTHETIC DARK PREMIUM PROFISSIONAL
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 12, 30, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '24px',
    border: '1px solid #334155',
    width: '100%',
    maxWidth: '1100px',
    height: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
    overflow: 'hidden'
  },
  header: {
    padding: '24px 28px 16px 28px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #334155'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  title: {
    color: '#F8FAFC',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: '13px',
    margin: '2px 0 0 0'
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: '6px'
  },
  toolbar: {
    padding: '16px 28px',
    backgroundColor: '#0F172A',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #1E293B'
  },
  tabsGroup: {
    display: 'flex',
    gap: '8px'
  },
  tabBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    padding: '8px 16px',
    borderRadius: '10px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  activeTabBtn: {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    color: '#38BDF8',
    padding: '8px 16px',
    borderRadius: '10px',
    fontWeight: '700',
    fontSize: '13px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  },
  filterGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  filterLabel: {
    color: '#9CA3AF',
    fontSize: '13px'
  },
  filterSelect: {
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    color: '#F8FAFC',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '13px',
    outline: 'none'
  },
  tableContainer: {
    flex: 1,
    overflowY: 'auto',
    backgroundColor: '#0F172A',
    padding: '0'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  th: {
    backgroundColor: '#1E293B',
    color: '#94A3B8',
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: '700',
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
    position: 'sticky',
    top: 0,
    zIndex: 2,
    borderBottom: '1px solid #334155'
  },
  thContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  tr: {
    borderBottom: '1px solid #1E293B'
  },
  td: {
    padding: '8px 12px',
    verticalAlign: 'middle'
  },
  emptyTd: {
    padding: '40px',
    textAlign: 'center',
    color: '#64748B',
    fontSize: '14px'
  },
  cellInput: {
    width: '100%',
    backgroundColor: '#1E293B',
    border: '1px solid transparent',
    color: '#E2E8F0',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  cellInputBold: {
    width: '100%',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    color: '#F8FAFC',
    fontWeight: '600',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  cellSelect: {
    width: '100%',
    backgroundColor: '#1E293B',
    border: '1px solid #334155',
    color: '#F8FAFC',
    padding: '8px 10px',
    borderRadius: '8px',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box'
  },
  colorPicker: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    backgroundColor: 'transparent'
  },
  deleteRowBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#EF4444',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px'
  },
  footer: {
    padding: '16px 28px',
    backgroundColor: '#1E293B',
    borderTop: '1px solid #334155',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  footerLeft: {
    display: 'flex',
    gap: '12px'
  },
  footerRight: {
    display: 'flex',
    gap: '12px'
  },
  secondaryBtn: {
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    color: '#38BDF8',
    padding: '10px 16px',
    borderRadius: '12px',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: 'none',
    color: '#9CA3AF',
    padding: '10px 18px',
    fontWeight: '600',
    fontSize: '13px',
    cursor: 'pointer'
  },
  saveBtn: {
    backgroundColor: '#10B981',
    border: 'none',
    color: '#FFFFFF',
    padding: '10px 22px',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
  }
};

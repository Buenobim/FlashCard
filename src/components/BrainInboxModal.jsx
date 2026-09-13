/*
  =============================================================================
  ARQUIVO: src/components/BrainInboxModal.jsx
  PARA QUE SERVE: Este é o modal da "Caixa de Entrada Rápida" (Brain Inbox). 
  Ele permite que o senhor Bruno Bueno cole anotações, ideias ou prints de tela (Ctrl+V) 
  a qualquer momento, salvando-os instantaneamente para transformar em flashcards depois!
  =============================================================================
*/

import React, { useState, useEffect } from 'react';
import { X, Inbox, Plus, Image as ImageIcon, Trash2, ArrowRight, Sparkles, Zap } from 'lucide-react';
import { getBrainInbox, saveBrainInbox, getSets, saveSets, getCategories } from '../utils/db';

export default function BrainInboxModal({ isOpen, onClose, activeProfile, onSetsUpdated }) {
  // 1. ESTADOS DO MODAL
  const [items, setItems] = useState([]);
  const [newText, setNewText] = useState('');
  const [newImage, setNewImage] = useState(null);
  const [selectedDeckId, setSelectedDeckId] = useState('');
  const [availableSets, setAvailableSets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [convertingItemId, setConvertingItemId] = useState(null);

  /*
    EFEITO AO ABRIR O MODAL:
    Carrega as notas salvas na caixa de entrada e os baralhos do estudante ativo.
  */
  useEffect(() => {
    if (isOpen && activeProfile) {
      setItems(getBrainInbox(activeProfile));
      const sets = getSets(activeProfile);
      setAvailableSets(sets);
      if (sets.length > 0) setSelectedDeckId(sets[0].id);
      setCategories(getCategories(activeProfile));
    }
  }, [isOpen, activeProfile]);

  /*
    FUNÇÃO: handlePaste
    PARA QUE SERVE: Intercepta a colagem (Ctrl+V) de prints de tela ou imagens no campo.
  */
  const handlePaste = (e) => {
    const itemsList = e.clipboardData?.items;
    if (!itemsList) return;

    for (let i = 0; i < itemsList.length; i++) {
      if (itemsList[i].type.indexOf('image') !== -1) {
        const file = itemsList[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            setNewImage(uploadEvent.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    }
  };

  /*
    FUNÇÃO: handleAddItem
    PARA QUE SERVE: Adiciona uma nova nota/print rápido na caixa de entrada.
  */
  const handleAddItem = () => {
    if (!newText.trim() && !newImage) return;

    const newItem = {
      id: 'inbox_' + Date.now(),
      text: newText.trim(),
      image: newImage,
      createdAt: new Date().toISOString()
    };

    const updated = [newItem, ...items];
    setItems(updated);
    saveBrainInbox(updated, activeProfile);

    // Limpa os campos
    setNewText('');
    setNewImage(null);
  };

  /*
    FUNÇÃO: handleDeleteItem
    PARA QUE SERVE: Exclui uma nota da caixa de entrada.
  */
  const handleDeleteItem = (itemId) => {
    const updated = items.filter(item => item.id !== itemId);
    setItems(updated);
    saveBrainInbox(updated, activeProfile);
  };

  /*
    FUNÇÃO: handleConvertToCard
    PARA QUE SERVE: Converte uma nota da caixa de entrada em um Flashcard no baralho selecionado.
  */
  const handleConvertToCard = (item) => {
    if (!selectedDeckId) return;

    const sets = getSets(activeProfile);
    const deckIndex = sets.findIndex(s => s.id === selectedDeckId);
    if (deckIndex === -1) return;

    const newCard = {
      id: 'card_' + Date.now(),
      term: item.text || 'Nota Rápida',
      definition: 'Anotado em ' + new Date(item.createdAt).toLocaleDateString('pt-BR'),
      image: item.image || null,
      createdAt: new Date().toISOString()
    };

    sets[deckIndex].cards.push(newCard);
    saveSets(sets, activeProfile);

    // Remove o item da caixa de entrada pois já virou flashcard
    handleDeleteItem(item.id);

    if (onSetsUpdated) onSetsUpdated();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* CABEÇALHO */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <Inbox size={24} color="#38BDF8" />
            <h2 style={styles.title}>Caixa de Entrada Rápida (Brain Inbox)</h2>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <p style={styles.description}>
          Cole ideias, textos ou prints (Ctrl+V) rapidamente durante o dia. Depois você pode transformar em Flashcards com 1 clique!
        </p>

        {/* CAMPO DE CAPTURA RÁPIDA */}
        <div style={styles.inputBox} onPaste={handlePaste}>
          <textarea
            placeholder="Digite uma anotação rápida ou pressione Ctrl+V para colar um print..."
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            style={styles.textarea}
            rows={3}
          />
          {newImage && (
            <div style={styles.imagePreviewContainer}>
              <img src={newImage} alt="Print Colado" style={styles.imagePreview} />
              <button style={styles.removeImageBtn} onClick={() => setNewImage(null)}>
                <X size={14} />
              </button>
            </div>
          )}

          <div style={styles.inputActions}>
            <span style={styles.hintText}>Dica: Cole prints direto no campo</span>
            <button style={styles.addButton} onClick={handleAddItem}>
              <Plus size={16} /> Adicionar à Caixa
            </button>
          </div>
        </div>

        {/* LISTA DE ITENS NA CAIXA */}
        <h3 style={styles.sectionTitle}>
          Itens Salvos na Caixa ({items.length})
        </h3>

        {availableSets.length > 0 && (
          <div style={styles.deckSelectorRow}>
            <span style={{ color: '#9CA3AF', fontSize: '13px' }}>Converter para o Baralho:</span>
            <select
              value={selectedDeckId}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              style={styles.select}
            >
              {availableSets.map(set => (
                <option key={set.id} value={set.id}>
                  {set.title} ({set.category || 'Geral'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.itemsList}>
          {items.length === 0 ? (
            <div style={styles.emptyInbox}>
              <Sparkles size={32} color="#64748B" />
              <p style={{ color: '#64748B', marginTop: '8px' }}>Sua caixa de entrada está vazia.</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} style={styles.itemCard}>
                {item.image && (
                  <img src={item.image} alt="Print" style={styles.itemThumb} />
                )}
                <div style={styles.itemContent}>
                  <p style={styles.itemText}>{item.text || 'Sem texto (apenas imagem)'}</p>
                  <span style={styles.itemDate}>
                    {new Date(item.createdAt).toLocaleString('pt-BR')}
                  </span>
                </div>
                <div style={styles.itemActions}>
                  <button 
                    style={styles.convertBtn} 
                    onClick={() => handleConvertToCard(item)}
                    title="Converter em Flashcard"
                  >
                    <Zap size={13} style={{ marginRight: 4 }} /> Virar Flashcard
                  </button>
                  <button 
                    style={styles.deleteBtn} 
                    onClick={() => handleDeleteItem(item.id)}
                    title="Apagar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ESTILOS VISUAIS PREMIUM DARK
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
    padding: '20px'
  },
  modal: {
    backgroundColor: '#1E293B',
    borderRadius: '24px',
    border: '1px solid #334155',
    width: '100%',
    maxWidth: '650px',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: '28px',
    boxSizing: 'border-box',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
  },
  titleGroup: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  title: {
    color: '#F8FAFC',
    fontSize: '20px',
    fontWeight: '700',
    margin: 0
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#9CA3AF',
    cursor: 'pointer',
    padding: '4px'
  },
  description: {
    color: '#9CA3AF',
    fontSize: '14px',
    marginBottom: '20px'
  },
  inputBox: {
    backgroundColor: '#0F172A',
    borderRadius: '16px',
    border: '1px solid #334155',
    padding: '16px',
    marginBottom: '24px'
  },
  textarea: {
    width: '100%',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#F8FAFC',
    fontSize: '14px',
    outline: 'none',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  imagePreviewContainer: {
    position: 'relative',
    display: 'inline-block',
    marginTop: '8px'
  },
  imagePreview: {
    maxHeight: '100px',
    borderRadius: '8px',
    border: '1px solid #334155'
  },
  removeImageBtn: {
    position: 'absolute',
    top: '-6px',
    right: '-6px',
    backgroundColor: '#EF4444',
    color: '#FFF',
    border: 'none',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  inputActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '12px'
  },
  hintText: {
    color: '#64748B',
    fontSize: '12px'
  },
  addButton: {
    backgroundColor: '#3B82F6',
    color: '#FFF',
    border: 'none',
    borderRadius: '12px',
    padding: '10px 16px',
    fontWeight: '600',
    fontSize: '13px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    cursor: 'pointer'
  },
  sectionTitle: {
    color: '#E2E8F0',
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px'
  },
  deckSelectorRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px'
  },
  select: {
    backgroundColor: '#0F172A',
    border: '1px solid #334155',
    color: '#F8FAFC',
    borderRadius: '10px',
    padding: '8px 12px',
    fontSize: '13px',
    outline: 'none',
    flex: 1
  },
  itemsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  emptyInbox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '32px 0'
  },
  itemCard: {
    backgroundColor: '#0F172A',
    borderRadius: '14px',
    border: '1px solid #1E293B',
    padding: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  itemThumb: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    objectFit: 'cover'
  },
  itemContent: {
    flex: 1
  },
  itemText: {
    color: '#F1F5F9',
    fontSize: '14px',
    margin: '0 0 4px 0'
  },
  itemDate: {
    color: '#64748B',
    fontSize: '11px'
  },
  itemActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  convertBtn: {
    backgroundColor: '#065F46',
    color: '#6EE7B7',
    border: '1px solid #047857',
    borderRadius: '10px',
    padding: '8px 12px',
    fontWeight: '600',
    fontSize: '12px',
    cursor: 'pointer'
  },
  deleteBtn: {
    backgroundColor: '#1E293B',
    color: '#EF4444',
    border: 'none',
    borderRadius: '10px',
    padding: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center'
  }
};

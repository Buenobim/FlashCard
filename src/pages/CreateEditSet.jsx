/*
  =============================================================================
  ARQUIVO: src/pages/CreateEditSet.jsx
  PARA QUE SERVE: Esta é a tela do "Editor de Cartões". Ela permite criar um novo 
  baralho de estudos do zero ou alterar um baralho já existente. Você digita um 
  título, uma descrição e pode ir adicionando ou removendo cartões.
  NOVO RECURSO PREMIUM: Cada cartão agora suporta o anexo de imagens! Você pode 
  simplesmente focar na linha de um cartão e colar um print tirado com Ctrl+V! 
  No celular, há um botão de upload para escolher fotos da galeria. As imagens são 
  comprimidas automaticamente (<50KB) para não travar a memória do seu navegador.
  =============================================================================
*/

import React, { useState, useEffect } from 'react';
// Importamos ícones elegantes da Lucide
import { Plus, Save, Trash2, ArrowLeft, Image as ImageIcon, X } from 'lucide-react';

/*
  COMPONENTE: CreateEditSet
  PARAMETROS (PROPS) QUE RECEBE:
    - setEditData: Se for edição, recebe os dados do baralho atual. Se for criação, vem nulo.
    - onSaveSet: Função disparada para gravar o baralho no LocalStorage.
    - onNavigate: Função para voltar ao Painel (Dashboard).
*/
export default function CreateEditSet({ setEditData, onSaveSet, onNavigate }) {
  // 1. ESTADOS DO FORMULÁRIO
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Iniciamos com 3 cartões vazios por padrão. Cada cartão possui a propriedade 'image'
  const [cards, setCards] = useState([
    { id: 'initial-1', term: '', definition: '', image: '' },
    { id: 'initial-2', term: '', definition: '', image: '' },
    { id: 'initial-3', term: '', definition: '', image: '' }
  ]);
  const [errorMessage, setErrorMessage] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null); // Estado para controlar a imagem ampliada na tela (lightbox)

  // 2. EFETUA CARREGAMENTO SE FOR MODO DE EDIÇÃO
  useEffect(() => {
    if (setEditData) {
      setTitle(setEditData.title);
      setDescription(setEditData.description || '');
      // Mapeia garantindo que a propriedade 'image' exista em todos os cartões antigos
      setCards(setEditData.cards.map(c => ({
        id: c.id,
        term: c.term,
        definition: c.definition,
        image: c.image || ''
      })));
    }
  }, [setEditData]);

  /*
    FUNÇÃO INTERNA: compressAndResizeImage
    PARA QUE SERVE: (A rocha contra limite de espaço)
    Pega o arquivo Base64 de um print ou upload e encolhe o tamanho dele.
    Redimensiona para no máximo 600px de largura e comprime como JPEG em qualidade 0.7.
    Transforma imagens brutas de 2MB em pequenos arquivos de 35KB, garantindo que você 
    nunca preencha os 5MB do LocalStorage e seu app continue 100% robusto (Mateus 7:24).
  */
  const compressAndResizeImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        // Mantém a proporção da imagem intacta ao redimensionar
        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Converte o resultado em JPEG comprimido de peso leve
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
    });
  };

  /*
    FUNÇÃO INTERNA: handleCardChange
    PARA QUE SERVE: Atualiza campos textuais dos cartões (Termo ou Definição).
  */
  const handleCardChange = (index, field, value) => {
    const updatedCards = [...cards];
    updatedCards[index][field] = value;
    setCards(updatedCards);
    setErrorMessage('');
  };

  /*
    FUNÇÃO INTERNA: handleCardPaste (O Grande Diferencial de Produtividade)
    PARA QUE SERVE: Captura quando o usuário foca na linha do cartão e aperta Ctrl+V 
    tendo um print screen ou imagem em sua área de transferência.
    Ela captura a imagem, comprime em tempo real e anexa ao cartão!
  */
  const handleCardPaste = async (index, event) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        // Encontrou um print/imagem colado!
        event.preventDefault(); // Impede colar lixo de texto que possa vir junto
        const file = items[i].getAsFile();

        const reader = new FileReader();
        reader.onload = async (e) => {
          const rawBase64 = e.target.result;
          // Executa a nossa compressão inteligente da Rocha
          const compressed = await compressAndResizeImage(rawBase64);
          
          const updatedCards = [...cards];
          updatedCards[index].image = compressed;
          setCards(updatedCards);
        };
        reader.readAsDataURL(file);
        break; // Captura apenas uma imagem
      }
    }
  };

  /*
    FUNÇÃO INTERNA: handleImageUpload (Para uso no celular e arquivos salvos)
    PARA QUE SERVE: Abre o seletor de arquivos do celular ou computador, 
    permite escolher uma imagem salva, comprime e a anexa ao cartão correspondente.
  */
  const handleImageUpload = (index, event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const rawBase64 = e.target.result;
      const compressed = await compressAndResizeImage(rawBase64);
      
      const updatedCards = [...cards];
      updatedCards[index].image = compressed;
      setCards(updatedCards);
      
      // Reseta o input de arquivo para permitir reenviar o mesmo arquivo se quiser
      event.target.value = '';
    };
    reader.readAsDataURL(file);
  };

  /*
    FUNÇÃO INTERNA: handleRemoveImage
    PARA QUE SERVE: Exclui a imagem anexada a um cartão específico, voltando a ser 
    apenas texto.
  */
  const handleRemoveImage = (index) => {
    const updatedCards = [...cards];
    updatedCards[index].image = '';
    setCards(updatedCards);
  };

  /*
    FUNÇÃO INTERNA: handleAddCard
    PARA QUE SERVE: Adiciona uma nova linha de cartão em branco.
  */
  const handleAddCard = () => {
    const newCard = {
      id: `new-card-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      term: '',
      definition: '',
      image: ''
    };
    setCards([...cards, newCard]);
  };

  /*
    FUNÇÃO INTERNA: handleRemoveCard
    PARA QUE SERVE: Remove uma linha de cartão da grade do editor.
  */
  const handleRemoveCard = (index) => {
    if (cards.length <= 2) {
      setErrorMessage('Aviso: Um baralho de estudos precisa ter pelo menos 2 cartões!');
      return;
    }
    const updatedCards = cards.filter((_, i) => i !== index);
    setCards(updatedCards);
  };

  /*
    FUNÇÃO INTERNA: handleSave
    PARA QUE SERVE: Valida dados e salva no LocalStorage geral do app.
  */
  const handleSave = () => {
    if (!title.trim()) {
      setErrorMessage('Erro: O baralho precisa ter um Título!');
      return;
    }

    const hasEmptyFields = cards.some(card => !card.term.trim() || !card.definition.trim());
    if (hasEmptyFields) {
      setErrorMessage('Erro: Todos os cartões adicionados precisam ter um Termo e uma Definição preenchidos!');
      return;
    }

    if (cards.length < 2) {
      setErrorMessage('Erro: É necessário ter pelo menos 2 cartões cadastrados!');
      return;
    }

    const setPayload = {
      id: setEditData ? setEditData.id : `set-${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      cards: cards.map(c => ({
        id: c.id,
        term: c.term.trim(),
        definition: c.definition.trim(),
        image: c.image || '' // Salva a imagem no banco local!
      })),
      createdAt: setEditData ? setEditData.createdAt : new Date().toISOString()
    };

    onSaveSet(setPayload);
    onNavigate('dashboard');
  };

  return (
    <div className="app-container">
      
      {/* CABEÇALHO DO EDITOR */}
      <header style={styles.editorHeader}>
        <button 
          onClick={() => onNavigate('dashboard')} 
          className="btn-secondary" 
          style={styles.backBtn}
        >
          <ArrowLeft size={18} />
          Voltar ao Painel
        </button>
        
        <h2 style={styles.pageTitle}>
          {setEditData ? '✏️ Editar Baralho de Estudos' : '✨ Criar Novo Baralho de Estudos'}
        </h2>
      </header>

      {/* PAINEL CENTRAL DE INFORMAÇÕES */}
      <div style={styles.metadataCard} className="glass-panel">
        <div className="form-group">
          <label className="form-label" htmlFor="set-title">Título do Baralho</label>
          <input 
            type="text" 
            id="set-title"
            placeholder="Ex: Anatomia Humana - Sistema Esquelético" 
            value={title} 
            onChange={(e) => { setTitle(e.target.value); setErrorMessage(''); }}
            className="form-input"
            maxLength={100}
          />
        </div>

        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label" htmlFor="set-desc">Descrição (Opcional)</label>
          <input 
            type="text" 
            id="set-desc"
            placeholder="Ex: Imagens e termos fundamentais sobre ossos do crânio e membros..." 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="form-input"
            maxLength={200}
          />
        </div>
      </div>

      {/* MENSAGEM DE ERRO DINÂMICA */}
      {errorMessage && (
        <div style={styles.errorAlert} className="animate-shake">
          <span>⚠️ {errorMessage}</span>
        </div>
      )}

      {/* LISTAGEM DOS CARTÕES DINÂMICOS */}
      <section style={styles.cardsList}>
        <div style={styles.cardsListHeader}>
          <h3 style={{ ...styles.sectionHeading, marginBottom: 0 }}>Cartões do Baralho</h3>
          <span style={styles.pasteTip}>
            💡 Dica: Dê um print no computador e aperte <strong>Ctrl+V</strong> dentro de qualquer cartão para colar a imagem!
          </span>
        </div>
        
        {cards.map((card, index) => (
          <div 
            key={card.id} 
            style={styles.cardRow} 
            className="glass-panel card-row-container"
            onPaste={(e) => handleCardPaste(index, e)} // Escuta o Ctrl+V em toda a linha do cartão!
          >
            {/* Cabeçalho do Cartão */}
            <div style={styles.cardRowHeader}>
              <span style={styles.cardIndex}>Cartão #{index + 1}</span>
              <button 
                onClick={() => handleRemoveCard(index)}
                style={styles.cardDeleteBtn}
                title="Excluir este cartão"
              >
                <Trash2 size={16} />
                Remover
              </button>
            </div>

            {/* Grid de Entradas de dados */}
            <div style={styles.cardRowInputs} className="card-inputs-grid">
              
              {/* Lado do Termo */}
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Termo (Pergunta)</label>
                <textarea 
                  placeholder="Ex: Fêmur" 
                  value={card.term} 
                  onChange={(e) => handleCardChange(index, 'term', e.target.value)}
                  className="form-input"
                  style={styles.textareaInput}
                  rows={2}
                />
              </div>

              {/* Lado da Definição */}
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '11px' }}>Definição (Resposta)</label>
                <textarea 
                  placeholder="Ex: O maior osso do corpo humano, localizado na coxa." 
                  value={card.definition} 
                  onChange={(e) => handleCardChange(index, 'definition', e.target.value)}
                  className="form-input"
                  style={styles.textareaInput}
                  rows={2}
                />
                
                {/* ÁREA DE IMAGEM DO CARTÃO */}
                <div style={styles.imageSelectorArea}>
                  {card.image ? (
                    // Se já possui imagem colada/carregada, exibe o preview elegante
                    <div style={styles.imagePreviewContainer}>
                      <img 
                        src={card.image} 
                        alt="Anexo do Cartão" 
                        style={{ ...styles.thumbnailImg, cursor: 'zoom-in' }} 
                        onClick={() => setLightboxImage(card.image)}
                        title="Clique para ampliar a imagem"
                      />
                      <button 
                        type="button" 
                        onClick={() => handleRemoveImage(index)}
                        style={styles.removeImgBtn}
                        title="Remover imagem do cartão"
                      >
                        <X size={12} />
                        Excluir Imagem
                      </button>
                    </div>
                  ) : (
                    // Se não possui imagem, exibe instruções e o botão de upload (para celular/galeria)
                    <div style={styles.uploadTriggerRow}>
                      <span style={styles.pasteStatusLabel}>Nenhuma imagem anexada.</span>
                      <label style={styles.uploadBtnLabel} title="Selecionar imagem do celular ou computador">
                        <ImageIcon size={14} />
                        Anexar Foto
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => handleImageUpload(index, e)} 
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </div>
        ))}
      </section>

      {/* CONTROLES INFERIORES */}
      <footer style={styles.editorFooter}>
        <button 
          onClick={handleAddCard} 
          className="btn-secondary" 
          style={styles.addCardBtn}
        >
          <Plus size={20} />
          Adicionar Cartão (+1)
        </button>

        <button 
          onClick={handleSave} 
          className="btn-primary" 
          style={styles.saveBtn}
        >
          <Save size={20} />
          Salvar Baralho
        </button>
      </footer>

      {/* Visualizador de Imagem Ampliada (Lightbox) */}
      {lightboxImage && (
        <div 
          className="image-lightbox-overlay" 
          onClick={() => setLightboxImage(null)}
          title="Clique fora para fechar"
        >
          <img 
            src={lightboxImage} 
            alt="Imagem Ampliada" 
            className="image-lightbox-img" 
            onClick={(e) => e.stopPropagation()} 
          />
        </div>
      )}

    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS ATUALIZADOS DO EDITOR (Visual Premium e Containers de Imagem)
// -----------------------------------------------------------------------------
const styles = {
  editorHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    marginBottom: '24px',
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '10px 18px',
    fontSize: '14px',
  },
  pageTitle: {
    fontSize: '24px',
    fontWeight: '800',
    color: '#ffffff',
  },
  metadataCard: {
    padding: '24px',
    marginBottom: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  errorAlert: {
    background: 'rgba(244, 63, 94, 0.15)',
    border: '1px solid rgba(244, 63, 94, 0.3)',
    color: '#f43f5e',
    padding: '14px 20px',
    borderRadius: '12px',
    marginBottom: '24px',
    fontWeight: '600',
    fontSize: '14px',
  },
  cardsListHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  sectionHeading: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#ffffff',
  },
  pasteTip: {
    fontSize: '12px',
    color: 'var(--color-warning)',
    fontWeight: '500',
  },
  cardsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
  },
  cardRow: {
    padding: '20px',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
  },
  cardRowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
    paddingBottom: '10px',
  },
  cardIndex: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#6366f1',
    textTransform: 'uppercase',
  },
  cardDeleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'color 0.2s ease',
  },
  cardRowInputs: {
    display: 'flex',
    gap: '20px',
    width: '100%',
  },
  textareaInput: {
    resize: 'vertical',
    minHeight: '60px',
    lineHeight: '1.4',
    width: '100%',
  },
  imageSelectorArea: {
    marginTop: '12px',
    background: 'rgba(0, 0, 0, 0.15)',
    borderRadius: '10px',
    padding: '10px 14px',
    border: '1px dashed rgba(255, 255, 255, 0.06)',
  },
  uploadTriggerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '10px',
  },
  pasteStatusLabel: {
    fontSize: '12px',
    color: '#64748b',
    fontWeight: '500',
  },
  uploadBtnLabel: {
    background: 'rgba(255, 255, 255, 0.03)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#cbd5e1',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  imagePreviewContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  thumbnailImg: {
    height: '60px',
    width: 'auto',
    maxWidth: '120px',
    borderRadius: '6px',
    objectFit: 'cover',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  removeImgBtn: {
    background: 'rgba(244, 63, 94, 0.1)',
    border: '1px solid rgba(244, 63, 94, 0.2)',
    color: '#f43f5e',
    borderRadius: '6px',
    padding: '6px 10px',
    fontSize: '11px',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    transition: 'all 0.2s ease',
  },
  editorFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '16px',
    flexWrap: 'wrap',
    paddingBottom: '40px',
  },
  addCardBtn: {
    flex: '1 1 200px',
    justifyContent: 'center',
  },
  saveBtn: {
    flex: '1 1 200px',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
  }
};

/* Folha de estilos extras para hovers, focos e responsividade de imagens */
const extraEditorStyles = `
.card-row-container:focus-within {
  border-color: rgba(99, 102, 241, 0.3) !important;
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.1) !important;
}
.uploadBtnLabel:hover {
  background: var(--primary-color) !important;
  color: white !important;
  border-color: var(--primary-color) !important;
}
.removeImgBtn:hover {
  background: var(--color-danger) !important;
  color: white !important;
  border-color: var(--color-danger) !important;
}
@media (max-width: 768px) {
  .card-inputs-grid {
    flex-direction: column !important;
    gap: 14px !important;
  }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = extraEditorStyles;
  document.head.appendChild(styleSheet);
}

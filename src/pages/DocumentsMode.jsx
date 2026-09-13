/*
  =============================================================================
  ARQUIVO: src/pages/DocumentsMode.jsx
  PARA QUE SERVE: Repositório de documentos da família. Guarda arquivos pequenos
  (fotos de documentos, PDFs leves) e links importantes, organizados por categoria.
  Imagens são comprimidas automaticamente; arquivos grandes demais são recusados
  para respeitar o limite de 1MB por documento do Firestore.
  O acervo é COMPARTILHADO entre os perfis.
  =============================================================================
*/

import React, { useState } from 'react';
import {
  ArrowLeft, Plus, FolderOpen, Trash2, Link as LinkIcon, FileText,
  Image as ImageIcon, Download, ExternalLink, Upload, Check
} from 'lucide-react';

const DOC_CATEGORIES = ['Pessoal', 'Casa', 'Carro', 'Saúde', 'Trabalho', 'Outros'];

// Limite seguro por documento no Firestore (1MB) — base64 infla ~33%
const MAX_FILE_BYTES = 650 * 1024;

export default function DocumentsMode({ documents = [], onSaveDocuments, onNavigate }) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState({ name: '', category: DOC_CATEGORIES[0], notes: '', url: '' });
  const [pendingFile, setPendingFile] = useState(null); // { dataUrl, fileName, mime }
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [lightboxImage, setLightboxImage] = useState(null);

  /*
    Comprime imagens grandes para caber na nuvem (máx ~1400px, JPEG 0.8).
    Outros tipos (PDF etc.) só passam se forem menores que o limite.
  */
  const compressImage = (dataUrl) => new Promise((resolve) => {
    const img = new Image();
    img.src = dataUrl;
    img.onload = () => {
      const MAX = 1400;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const ratio = Math.min(MAX / width, MAX / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => resolve(dataUrl);
  });

  const handleFilePick = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setErrorMsg('');

    const reader = new FileReader();
    reader.onload = async (e) => {
      let dataUrl = e.target.result;
      let mime = file.type;

      if (mime.startsWith('image/')) {
        dataUrl = await compressImage(dataUrl);
        mime = 'image/jpeg';
      } else if (dataUrl.length > MAX_FILE_BYTES * 1.37) {
        setErrorMsg(`Arquivo muito grande (${(file.size / 1024).toFixed(0)} KB). O limite é ~650 KB — para arquivos maiores, salve um link (Google Drive, por exemplo).`);
        event.target.value = '';
        return;
      }

      setPendingFile({ dataUrl, fileName: file.name, mime });
      if (!form.name.trim()) {
        setForm(f => ({ ...f, name: file.name.replace(/\.[^.]+$/, '') }));
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) { setErrorMsg('Dê um nome ao documento.'); return; }

    const url = form.url.trim();
    if (!pendingFile && !url) {
      setErrorMsg('Anexe um arquivo OU informe um link.');
      return;
    }

    const newDoc = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name,
      category: form.category,
      notes: form.notes.trim(),
      type: pendingFile ? 'file' : 'link',
      fileName: pendingFile?.fileName || '',
      mime: pendingFile?.mime || '',
      dataUrl: pendingFile?.dataUrl || '',
      url: pendingFile ? '' : url,
      createdAt: new Date().toISOString(),
    };
    onSaveDocuments([...documents, newDoc]);

    setForm({ name: '', category: form.category, notes: '', url: '' });
    setPendingFile(null);
    setErrorMsg('');
    setIsFormOpen(false);
  };

  const handleDelete = (docId) => {
    if (confirmDeleteId === docId) {
      onSaveDocuments(documents.filter(d => d.id !== docId));
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(docId);
    }
  };

  const handleDownload = (docItem) => {
    const a = document.createElement('a');
    a.href = docItem.dataUrl;
    a.download = docItem.fileName || docItem.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filtered = activeCategory === 'Todos'
    ? documents
    : documents.filter(d => d.category === activeCategory);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('pt-BR');

  const getDocIcon = (d) => {
    if (d.type === 'link') return <LinkIcon size={19} />;
    if (d.mime.startsWith('image/')) return <ImageIcon size={19} />;
    return <FileText size={19} />;
  };

  return (
    <div className="app-container" style={{ animation: 'fadeIn 0.4s ease', maxWidth: '1080px' }}>

      {/* CABEÇALHO */}
      <header style={styles.header}>
        <button onClick={() => onNavigate('menu')} className="btn-secondary" style={styles.backBtn}>
          <ArrowLeft size={16} /> Cérebro
        </button>
        <div style={styles.titleArea}>
          <FolderOpen size={20} color="#6FA8D6" />
          <h2 style={styles.title}>Documentos</h2>
        </div>
      </header>

      <p style={styles.pageIntro}>
        Fotos de documentos, PDFs leves e links importantes — guardados na nuvem para os dois.
      </p>

      {/* FILTRO + NOVO */}
      <div style={styles.toolbar}>
        <div style={styles.categoriesList}>
          <button
            onClick={() => setActiveCategory('Todos')}
            className={activeCategory === 'Todos' ? 'chip chip-active' : 'chip'}
          >
            Todos
          </button>
          {DOC_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={activeCategory === cat ? 'chip chip-active' : 'chip'}
            >
              {cat}
            </button>
          ))}
        </div>
        {!isFormOpen && (
          <button onClick={() => setIsFormOpen(true)} className="btn-primary" style={{ width: 'auto' }}>
            <Plus size={17} /> Adicionar
          </button>
        )}
      </div>

      {/* FORMULÁRIO */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} style={styles.form} className="glass-panel">
          <h3 style={styles.formTitle}>Novo documento</h3>

          <div style={styles.formGrid}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome — ex: RG da Bruna"
              className="form-input"
              maxLength={60}
              autoFocus
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="form-input"
              style={{ cursor: 'pointer' }}
            >
              {DOC_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Observações (opcional) — ex: vence em 2027"
            className="form-input"
            maxLength={120}
          />

          {/* ARQUIVO ou LINK */}
          <div style={styles.attachRow}>
            <label style={styles.uploadBtn} title="Escolher arquivo (foto ou PDF pequeno)">
              <Upload size={15} />
              {pendingFile ? pendingFile.fileName : 'Anexar arquivo'}
              <input type="file" accept="image/*,.pdf" onChange={handleFilePick} style={{ display: 'none' }} />
            </label>
            <span style={styles.orText}>ou</span>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="Cole um link (Drive, site...)"
              className="form-input"
              style={{ flex: 1, minWidth: '180px' }}
              disabled={!!pendingFile}
            />
            {pendingFile && (
              <button type="button" onClick={() => setPendingFile(null)} style={styles.clearFileBtn}>
                Remover arquivo
              </button>
            )}
          </div>

          {errorMsg && <p style={styles.errorText}>{errorMsg}</p>}

          <div style={styles.formActions}>
            <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
              <Check size={16} /> Guardar documento
            </button>
            <button
              type="button"
              onClick={() => { setIsFormOpen(false); setPendingFile(null); setErrorMsg(''); }}
              className="btn-secondary"
              style={{ justifyContent: 'center' }}
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* LISTA */}
      {filtered.length === 0 ? (
        <div className="glass-panel empty-state">
          <FolderOpen size={52} style={{ color: '#3B434F', marginBottom: '16px' }} />
          <h3 style={styles.emptyTitle}>Nenhum documento aqui</h3>
          <p style={styles.emptyDesc}>
            Guarde fotos de documentos, comprovantes e links importantes.
            Tudo fica disponível para vocês dois, em qualquer aparelho.
          </p>
        </div>
      ) : (
        <div style={styles.list}>
          {filtered.map(docItem => {
            const isConfirming = confirmDeleteId === docItem.id;
            const isImage = docItem.type === 'file' && docItem.mime.startsWith('image/');

            return (
              <div key={docItem.id} style={styles.docRow} className="glass-panel doc-row">
                {/* Miniatura ou ícone */}
                {isImage ? (
                  <img
                    src={docItem.dataUrl}
                    alt={docItem.name}
                    style={styles.thumb}
                    onClick={() => setLightboxImage(docItem.dataUrl)}
                    title="Clique para ampliar"
                  />
                ) : (
                  <div style={{ ...styles.docIcon, color: docItem.type === 'link' ? '#6FA8D6' : '#E8933F' }}>
                    {getDocIcon(docItem)}
                  </div>
                )}

                {/* Infos */}
                <div style={styles.docInfo}>
                  <span style={styles.docName}>{docItem.name}</span>
                  <span style={styles.docMeta}>
                    {docItem.category} • {formatDate(docItem.createdAt)}
                    {docItem.notes && ` — ${docItem.notes}`}
                  </span>
                </div>

                {/* Ações */}
                <div style={styles.docActions}>
                  {docItem.type === 'link' ? (
                    <a
                      href={docItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.docActionBtn}
                      title="Abrir link"
                    >
                      <ExternalLink size={15} />
                    </a>
                  ) : (
                    <button onClick={() => handleDownload(docItem)} style={styles.docActionBtn} title="Baixar">
                      <Download size={15} />
                    </button>
                  )}
                  {isConfirming ? (
                    <span style={styles.confirmRow}>
                      <button onClick={() => handleDelete(docItem.id)} style={styles.confirmDelBtn}>Apagar</button>
                      <button onClick={() => setConfirmDeleteId(null)} style={styles.confirmCancelBtn}>Não</button>
                    </span>
                  ) : (
                    <button onClick={() => handleDelete(docItem.id)} style={styles.docActionBtn} title="Excluir">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox de imagem */}
      {lightboxImage && (
        <div className="image-lightbox-overlay" onClick={() => setLightboxImage(null)}>
          <img src={lightboxImage} alt="Documento ampliado" className="image-lightbox-img" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

const styles = {
  header: { display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '10px', flexWrap: 'wrap' },
  backBtn: { padding: '8px 16px', fontSize: '13px', width: 'auto' },
  titleArea: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { fontSize: '24px', color: '#F4F5F7' },
  pageIntro: { color: '#99A1AC', fontSize: '15px', marginBottom: '22px' },

  toolbar: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: '14px', flexWrap: 'wrap', marginBottom: '20px',
  },
  categoriesList: { display: 'flex', gap: '8px', flexWrap: 'wrap' },

  form: { padding: '22px', marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '14px' },
  formTitle: { fontSize: '19px', color: '#F4F5F7' },
  formGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' },
  attachRow: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  uploadBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'var(--bg-tertiary)', border: '1px dashed rgba(255,255,255,0.2)',
    borderRadius: '10px', padding: '11px 16px', fontSize: '13px', fontWeight: 700,
    color: '#C8CED6', cursor: 'pointer', transition: 'all 0.2s ease',
    maxWidth: '260px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  },
  orText: { fontSize: '12px', color: '#7A828E', fontWeight: 800 },
  clearFileBtn: {
    background: 'transparent', border: 'none', color: '#E5484D',
    fontSize: '12px', fontWeight: 800, cursor: 'pointer',
  },
  errorText: { color: '#E5484D', fontSize: '13px', fontWeight: 700 },
  formActions: { display: 'flex', gap: '10px', flexWrap: 'wrap' },

  emptyTitle: { fontSize: '20px', color: '#F4F5F7', marginBottom: '8px' },
  emptyDesc: { color: '#99A1AC', fontSize: '14px', maxWidth: '460px', lineHeight: 1.6 },

  list: { display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '40px' },
  docRow: {
    display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px',
    transition: 'all 0.2s ease',
  },
  thumb: {
    width: '46px', height: '46px', borderRadius: '10px', objectFit: 'cover',
    border: '1px solid var(--border-subtle)', cursor: 'zoom-in', flexShrink: 0,
  },
  docIcon: {
    width: '46px', height: '46px', borderRadius: '10px', display: 'flex',
    justifyContent: 'center', alignItems: 'center', background: 'var(--bg-tertiary)', flexShrink: 0,
  },
  docInfo: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' },
  docName: { fontSize: '15px', fontWeight: 800, color: '#F4F5F7', wordBreak: 'break-word' },
  docMeta: { fontSize: '12px', color: '#7A828E', fontWeight: 600 },
  docActions: { display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 },
  docActionBtn: {
    background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
    borderRadius: '8px', color: '#99A1AC', padding: '8px', cursor: 'pointer',
    display: 'flex', transition: 'all 0.2s ease', textDecoration: 'none',
  },
  confirmRow: { display: 'flex', gap: '6px', alignItems: 'center' },
  confirmDelBtn: {
    background: '#E5484D', color: '#fff', border: 'none', borderRadius: '6px',
    fontSize: '12px', fontWeight: 800, padding: '6px 12px', cursor: 'pointer',
  },
  confirmCancelBtn: {
    background: 'transparent', color: '#99A1AC', border: 'none',
    fontSize: '12px', fontWeight: 800, padding: '6px 8px', cursor: 'pointer',
  },
};

const extraDocStyles = `
.doc-row:hover { border-color: rgba(255, 255, 255, 0.14) !important; }
@media (max-width: 600px) {
  .doc-row { flex-wrap: wrap; }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.innerText = extraDocStyles;
  document.head.appendChild(styleSheet);
}

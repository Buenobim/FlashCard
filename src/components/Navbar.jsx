/*
  =============================================================================
  ARQUIVO: src/components/Navbar.jsx
  PARA QUE SERVE: Este é o "Painel de Controle Superior" ou Menu de Navegação. Ele 
  fica sempre no topo do aplicativo para permitir que você mude de tela (voltar para 
  o painel, criar um novo conjunto de cartões, etc.), além de conter os botões rápidos 
  para salvar uma cópia de segurança (exportar) ou carregar seus cartões antigos (importar).
  =============================================================================
*/

import React, { useRef } from 'react';
// Importamos os ícones bonitos da biblioteca Lucide para dar o toque visual premium
import { 
  BookOpen,      // Livrinho aberto (Logotipo)
  Plus,          // Sinal de mais (Criar novo)
  Download,      // Seta para baixo (Exportar backup)
  Upload,        // Seta para cima (Importar backup)
  Trophy         // Troféu para conquistas
} from 'lucide-react';

/*
  COMPONENTE: Navbar
  PARAMETROS (PROPS) QUE RECEBE:
    - onNavigate: Função que muda a tela atual do aplicativo.
    - currentPage: Qual é a tela que está aberta no momento (para podermos realçar).
    - onExportBackup: Função que baixa o arquivo JSON dos cartões.
    - onImportBackup: Função que processa e lê um arquivo de backup carregado.
*/
export default function Navbar({ onNavigate, currentPage, onExportBackup, onImportBackup }) {
  // O "useRef" é como um "dedo indicador virtual" no código. Usaremos ele para apontar
  // para o campo oculto de carregar arquivos, ativando-o apenas quando você clicar no botão.
  const fileInputRef = useRef(null);

  /*
    FUNÇÃO INTERNA: handleFileChange
    PARA QUE SERVE: É disparada quando você escolhe um arquivo do seu computador/celular.
    Ela lê o conteúdo do texto do arquivo e envia para a função de importação restaurar os cartões.
  */
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      onImportBackup(text);
    };
    reader.readAsText(file);
    // Limpa o input para que você possa importar o mesmo arquivo novamente se quiser
    event.target.value = '';
  };

  /*
    FUNÇÃO INTERNA: triggerFileInput
    PARA QUE SERVE: Simula um clique no campo de seleção de arquivo escondido quando 
    você clica no botão visível e bonito de "Importar".
  */
  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <header style={styles.header} className="glass-panel">
      <div style={styles.navContainer}>
        {/* LOGOTIPO DO APLICATIVO */}
        <div 
          style={styles.logoArea} 
          onClick={() => onNavigate('dashboard')} 
          title="Ir para o Painel Inicial"
        >
          <div style={styles.logoIconBg}>
            <BookOpen size={22} color="#ffffff" />
          </div>
          <span style={styles.logoText}>Flash<span style={styles.logoAccent}>Card</span></span>
        </div>

        {/* ÁREA DE BOTÕES DO MENU */}
        <nav style={styles.navButtons}>
          {/* BOTÃO EXPORTAR BACKUP */}
          <button 
            onClick={onExportBackup} 
            style={styles.actionBtn} 
            title="Salvar cópia de segurança de todos os seus baralhos"
          >
            <Download size={18} />
            <span style={styles.btnText}>Backup</span>
          </button>

          {/* BOTÃO IMPORTAR BACKUP */}
          <button 
            onClick={triggerFileInput} 
            style={styles.actionBtn} 
            title="Restaurar baralhos a partir de um arquivo de backup"
          >
            <Upload size={18} />
            <span style={styles.btnText}>Importar</span>
          </button>

          {/* Campo de arquivo invisível usado para a importação */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".json" 
            style={{ display: 'none' }} 
          />

          {/* BOTÃO CRIAR NOVO CONJUNTO */}
          <button 
            onClick={() => onNavigate('create')} 
            className="btn-primary" 
            style={styles.createBtn}
            title="Criar um novo baralho de estudos"
          >
            <Plus size={18} />
            <span style={styles.createBtnText}>Novo Baralho</span>
          </button>
        </nav>
      </div>
    </header>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS DE NAVEGAÇÃO:
// Organizam o posicionamento e o visual dos elementos do menu de cabeçalho.
// -----------------------------------------------------------------------------
const styles = {
  header: {
    position: 'sticky',
    top: 0,
    zIndex: 100,
    width: '100%',
    padding: '12px 24px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
  },
  navContainer: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '12px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoIconBg: {
    background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
    borderRadius: '10px',
    padding: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)',
  },
  logoText: {
    fontSize: '20px',
    fontWeight: '800',
    letterSpacing: '0.5px',
    color: '#ffffff',
  },
  logoAccent: {
    color: '#a855f7',
  },
  navButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  actionBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#94a3b8',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '8px 14px',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease',
  },
  btnText: {
    // Escondido em telas super pequenas por responsividade, visível no computador
    display: 'inline-block',
  },
  createBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    borderRadius: '8px',
  },
  createBtnText: {
    display: 'inline-block',
  }
};

/* 
  Aqui adicionamos um pequeno ajuste de estilo global que o CSS Inline não faz 
  sozinho para garantir que o menu fique incrível em telas pequenas de celular.
*/
const responsiveStyles = `
@media (max-width: 480px) {
  .btnText {
    display: none !important; /* Esconde texto dos botões de backup no celular para caber tudo */
  }
  .createBtnText {
    display: none !important; /* Esconde texto de "Novo Baralho" no celular, deixa só o sinal de "+" */
  }
  header {
    padding: 10px 12px !important;
  }
}
`;
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement("style");
  styleSheet.innerText = responsiveStyles;
  document.head.appendChild(styleSheet);
}

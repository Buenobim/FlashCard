/*
  =============================================================================
  ARQUIVO: src/components/Navbar.jsx
  PARA QUE SERVE: Este é o "Painel de Controle Superior" ou Menu de Navegação. Ele 
  fica sempre no topo do aplicativo para permitir que você mude de tela (voltar para 
  o painel, criar um novo conjunto de cartões, etc.), além de conter os botões rápidos 
  para salvar uma cópia de segurança (exportar) ou carregar seus cartões antigos (importar).
  Também permite ver o estudante ativo e clicar para trocá-lo instantaneamente.
  =============================================================================
*/

import React, { useRef } from 'react';
// Importamos os ícones bonitos da biblioteca Lucide para dar o toque visual premium
import { 
  BookOpen,      // Livrinho aberto (Logotipo)
  Plus,          // Sinal de mais (Criar novo)
  Download,      // Seta para baixo (Exportar backup)
  Upload,        // Seta para cima (Importar backup)
  Trophy,        // Troféu para conquistas
  Cloud,         // Nuvem conectada
  CloudOff,      // Nuvem desconectada
  User,          // Ícone de usuário para o perfil ativo
  LayoutGrid,    // Grade (voltar ao Menu principal da plataforma)
  Brain          // Cérebro (BRUNO OS)
} from 'lucide-react';

/*
  COMPONENTE: Navbar
  PARAMETROS (PROPS) QUE RECEBE:
    - onNavigate: Função que muda a tela atual do aplicativo.
    - currentPage: Qual é a tela que está aberta no momento.
    - onExportBackup: Função que baixa o arquivo JSON dos cartões.
    - onImportBackup: Função que processa e lê um arquivo de backup carregado.
    - isOnline: Identifica se estamos conectados com o Firebase.
    - onOpenSync: Abre o painel de código de sincronização.
    - activeProfile: O nome do estudante atualmente selecionado.
    - onLogoutProfile: Função para desvincular o estudante e voltar ao seletor.
*/
export default function Navbar({ 
  onNavigate, 
  currentPage, 
  onExportBackup, 
  onImportBackup, 
  isOnline, 
  onOpenSync, 
  activeProfile, 
  onLogoutProfile,
  // O selo honesto do salvamento: quantas alterações ainda não foram
  // confirmadas pela nuvem e qual foi a última recusa.
  statusDaNuvem = {}
}) {
  // Quantas alterações (gravações + exclusões) ainda estão subindo
  const pendencias = (statusDaNuvem.pendentes || 0) + (statusDaNuvem.exclusoesPendentes || 0);
  const nuvemFalhou = !!statusDaNuvem.ultimoErro;
  // O "useRef" aponta para o campo oculto de carregar arquivos
  const fileInputRef = useRef(null);

  /*
    FUNÇÃO AUXILIAR: getProfileAvatarColor
    PARA QUE SERVE: Retorna o mesmo gradiente que o avatar da tela de seleção de perfis
    para manter a consistência visual no menu superior.
  */
  const getProfileAvatarColor = (name) => {
    if (name === 'Bruno Bueno') {
      return { background: 'linear-gradient(135deg, #2C3A66 0%, #6C8FD9 100%)' };
    }
    if (name === 'Bruna Bueno') {
      return { background: 'linear-gradient(135deg, #6B2350 0%, #D96A8F 100%)' };
    }
    return { background: 'linear-gradient(135deg, #1F5C44 0%, #3ECF8E 100%)' };
  };

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
        
        {/* LADO ESQUERDO: LOGOTIPO E PERFIL DO ESTUDANTE */}
        <div style={styles.leftNavSection}>
          {/* LOGOTIPO DO APLICATIVO */}
          <div 
            style={styles.logoArea} 
            onClick={() => onNavigate('dashboard')} 
            title="Ir para o Painel Inicial"
          >
            <div style={styles.logoIconBg}>
              <BookOpen size={18} color="#E8933F" />
            </div>
            <span style={styles.logoText}>Flashcards</span>
          </div>

          {/* INDICADOR DE PERFIL ATIVO / BOTÃO DE TROCA */}
          {activeProfile && (
            <div 
              style={styles.profileIndicator} 
              className="profileIndicator"
              onClick={onLogoutProfile}
              title="Estudante ativo. Clique aqui para trocar de estudante."
            >
              <div style={{ ...styles.profileAvatar, ...getProfileAvatarColor(activeProfile) }}>
                <User size={12} color="#ffffff" />
              </div>
              <span style={styles.profileNameText}>{activeProfile}</span>
            </div>
          )}
        </div>

        {/* LADO DIREITO: ÁREA DE BOTÕES DO MENU */}
        <nav style={styles.navButtons}>
          {/* BOTÃO VOLTAR AO CÉREBRO DIGITAL (BRUNO OS) */}
          <button
            onClick={() => onNavigate('menu')}
            style={{ ...styles.actionBtn, borderColor: 'rgba(139,123,255,0.4)', background: 'rgba(139,123,255,0.15)' }}
            title="Voltar ao Cérebro Digital (BRUNO OS)"
          >
            <Brain size={18} color="#8b7bff" />
            <span style={{ ...styles.btnText, color: '#e9ecff', fontWeight: '700' }}>Cérebro</span>
          </button>

          {/* BOTÃO VOLTAR AO MENU PRINCIPAL DA PLATAFORMA */}
          <button
            onClick={() => onNavigate('menu')}
            style={styles.actionBtn}
            title="Voltar ao Menu principal da plataforma"
          >
            <LayoutGrid size={18} />
            <span style={styles.btnText}>Menu</span>
          </button>

          {/* BOTÃO STATUS DE SINCRONIZAÇÃO NUVEM */}
          <button 
            onClick={onOpenSync} 
            style={{
              ...(isOnline ? styles.cloudBtnOnline : styles.cloudBtnOffline),
              // Vermelho quando a nuvem recusou, laranja enquanto algo sobe.
              // Usamos a borda inteira (e não só a cor) porque o estilo base já
              // define `border` — misturar os dois faz o React reclamar.
              ...(nuvemFalhou ? { border: '1px solid rgba(229,72,77,0.5)', background: 'rgba(229,72,77,0.12)' }
                : pendencias > 0 ? { border: '1px solid rgba(232,147,63,0.5)', background: 'rgba(232,147,63,0.12)' } : {}),
            }}
            title={
              nuvemFalhou ? `Salvo neste aparelho, mas a nuvem recusou: ${statusDaNuvem.ultimoErro}`
                : pendencias > 0 ? `${pendencias} alteração(ões) salvas no aparelho, ainda subindo para a nuvem.`
                  : isOnline ? 'Tudo sincronizado. Clique para ver os detalhes.'
                    : 'Modo offline: salvo só neste aparelho. Clique para ver opções.'
            }
          >
            {nuvemFalhou ? <CloudOff size={18} color="#E5484D" />
              : isOnline ? <Cloud size={18} color={pendencias > 0 ? '#E8933F' : '#3ECF8E'} />
                : <CloudOff size={18} color="#99A1AC" />}
            <span style={styles.btnText}>
              {nuvemFalhou ? 'Falhou' : pendencias > 0 ? `Subindo (${pendencias})` : isOnline ? 'Nuvem' : 'Local'}
            </span>
          </button>

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
            title="Abrir um arquivo .json: você vê a prévia e escolhe entre ADICIONAR ao acervo ou RESTAURAR o backup"
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
  leftNavSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoArea: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  logoIconBg: {
    background: 'rgba(232, 147, 63, 0.12)',
    borderRadius: '10px',
    padding: '8px',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontFamily: 'var(--font-display)',
    fontSize: '19px',
    fontWeight: '600',
    color: '#F4F5F7',
  },
  logoAccent: {
    color: '#E77950',
  },
  profileIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(255, 255, 255, 0.04)',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    borderRadius: '20px',
    padding: '4px 12px 4px 6px',
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    userSelect: 'none',
  },
  profileAvatar: {
    width: '22px',
    height: '22px',
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileNameText: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#C8CED6',
  },
  navButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  cloudBtnOnline: {
    background: 'rgba(62, 207, 142, 0.05)',
    color: '#3ECF8E',
    border: '1px solid rgba(62, 207, 142, 0.15)',
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
  cloudBtnOffline: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#99A1AC',
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
  actionBtn: {
    background: 'rgba(255, 255, 255, 0.03)',
    color: '#99A1AC',
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
.profileIndicator:hover {
  background: rgba(255, 255, 255, 0.09) !important;
  border-color: rgba(255, 255, 255, 0.15) !important;
  transform: translateY(-1px);
}
@media (max-width: 580px) {
  .profileNameText {
    display: none !important; /* Oculte o nome do perfil no celular, deixe só a foto */
  }
  .profileIndicator {
    padding: 4px !important;
  }
}
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

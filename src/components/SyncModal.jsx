/*
  =============================================================================
  ARQUIVO: src/components/SyncModal.jsx
  PARA QUE SERVE: Esta é a telinha (modal) de STATUS da nuvem. Antigamente ela
  pedia para você digitar/copiar um "código de sincronização". Isso foi removido:
  agora a sincronização é 100% AUTOMÁTICA e o acervo de baralhos é COMPARTILHADO —
  qualquer pessoa que abrir o app, em qualquer aparelho, vê os mesmos baralhos, sem
  precisar digitar nem trocar código nenhum. Este modal só mostra se você está
  conectado à nuvem e explica isso de forma simples.
  =============================================================================
*/

import React from 'react';
import { X, Cloud, CloudOff, Info, RefreshCw, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

/*
  COMPONENTE: SyncModal
  PARAMETROS (PROPS) QUE RECEBE:
    - isOpen: Diz se o modal está aberto na tela (verdadeiro) ou fechado (falso).
    - onClose: Função para fechar o modal.
    - isOnline: Indica se o aplicativo está conectado com o banco de dados Firebase na nuvem.
    - statusDaNuvem: o selo honesto do salvamento — { pendentes, exclusoesPendentes,
      ultimoErro, ultimaSincronizacao }. É o que diz se a sua matéria já está
      guardada na nuvem OU se ainda está só neste aparelho.
*/
export default function SyncModal({ isOpen, onClose, isOnline, statusDaNuvem = {} }) {
  // Se o modal não estiver aberto, não desenha nada na tela
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      {/* Container principal com design Glassmorphism e impedimento de fechar ao clicar no meio */}
      <div
        className="glass-panel"
        style={styles.modal}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CABEÇALHO DO MODAL */}
        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <Cloud size={24} color="#E77950" />
            <h3 style={styles.title}>Sincronização na Nuvem</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Fechar Janela">
            <X size={20} />
          </button>
        </div>

        {/* STATUS DA CONEXÃO */}
        <div style={styles.statusSection}>
          {isOnline ? (
            <div style={{ ...styles.statusBadge, backgroundColor: 'rgba(62, 207, 142, 0.1)', color: '#3ECF8E' }}>
              <Cloud size={16} />
              <span>Conectado à Nuvem (Firebase)</span>
            </div>
          ) : (
            <div style={{ ...styles.statusBadge, backgroundColor: 'rgba(148, 163, 184, 0.1)', color: '#99A1AC' }}>
              <CloudOff size={16} />
              <span>Apenas Modo Local (Sem Conexão)</span>
            </div>
          )}
        </div>

        {/* O QUE ESTÁ ACONTECENDO COM OS SEUS DADOS AGORA */}
        {(() => {
          const pendentes = (statusDaNuvem.pendentes || 0) + (statusDaNuvem.exclusoesPendentes || 0);
          const falhou = !!statusDaNuvem.ultimoErro;
          const quando = statusDaNuvem.ultimaSincronizacao
            ? new Date(statusDaNuvem.ultimaSincronizacao).toLocaleString('pt-BR')
            : null;

          if (falhou) {
            return (
              <div style={{ ...styles.infoBox, border: '1px solid rgba(229,72,77,0.4)' }}>
                <AlertTriangle size={18} color="#E5484D" style={{ flexShrink: 0 }} />
                <p style={styles.infoText}>
                  <strong style={{ color: '#E4E6EA' }}>A nuvem recusou a última gravação.</strong>{' '}
                  Seu conteúdo está salvo NESTE APARELHO e será reenviado sozinho na próxima
                  sincronização. Motivo: {statusDaNuvem.ultimoErro}
                </p>
              </div>
            );
          }
          if (pendentes > 0) {
            return (
              <div style={{ ...styles.infoBox, border: '1px solid rgba(232,147,63,0.4)' }}>
                <Clock size={18} color="#E8933F" style={{ flexShrink: 0 }} />
                <p style={styles.infoText}>
                  <strong style={{ color: '#E4E6EA' }}>{pendentes} alteração(ões) subindo.</strong>{' '}
                  Já estão salvas no aparelho; estou terminando de guardar na nuvem.
                </p>
              </div>
            );
          }
          return (
            <div style={styles.infoBox}>
              <CheckCircle2 size={18} color="#3ECF8E" style={{ flexShrink: 0 }} />
              <p style={styles.infoText}>
                <strong style={{ color: '#E4E6EA' }}>Tudo sincronizado.</strong>{' '}
                {quando ? `A nuvem confirmou pela última vez em ${quando}.` : 'Nada pendente para enviar.'}
              </p>
            </div>
          );
        })()}

        {/* COMO A SINCRONIZAÇÃO FUNCIONA */}
        <div style={styles.infoBox}>
          <RefreshCw size={18} color="#3ECF8E" style={{ flexShrink: 0 }} />
          <p style={styles.infoText}>
            <strong style={{ color: '#E4E6EA' }}>Tudo automático!</strong> Seus baralhos são
            salvos na hora no aparelho e sincronizados sozinhos na nuvem. Você não precisa
            digitar nem trocar código nenhum.
          </p>
        </div>

        {/* O QUE É SEU E O QUE É DO CASAL */}
        <div style={styles.infoBox}>
          <Info size={18} color="#E8933F" style={{ flexShrink: 0 }} />
          <p style={styles.infoText}>
            Os <strong style={{ color: '#E4E6EA' }}>baralhos são só seus</strong>: cada perfil tem o
            próprio acervo, em todos os seus aparelhos. Um baralho só some quando VOCÊ manda
            apagar — aparelho desatualizado não apaga nada de ninguém.
          </p>
        </div>

        {/* BOTÃO DE FECHAR */}
        <button className="btn-primary" style={styles.okBtn} onClick={onClose}>
          Entendi!
        </button>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS DO MODAL:
// Define o visual premium com fundos desfocados, gradientes e bordas sutis.
// -----------------------------------------------------------------------------
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(7, 8, 10, 0.85)',
    backdropFilter: 'blur(10px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    width: '90%',
    maxWidth: '460px',
    padding: '28px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(21, 23, 26, 0.95)',
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#ffffff',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: '#99A1AC',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  statusSection: {
    display: 'flex',
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
  },
  infoBox: {
    display: 'flex',
    gap: '10px',
    backgroundColor: 'rgba(232, 147, 63, 0.05)',
    border: '1px solid rgba(232, 147, 63, 0.15)',
    padding: '14px',
    borderRadius: '12px',
  },
  infoText: {
    fontSize: '13px',
    color: '#99A1AC',
    lineHeight: '1.5',
  },
  okBtn: {
    padding: '12px 20px',
    borderRadius: '8px',
    marginTop: '4px',
  },
};

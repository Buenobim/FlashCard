/*
  =============================================================================
  ARQUIVO: src/components/ImportBackupModal.jsx
  PARA QUE SERVE: é a telinha que aparece ANTES de qualquer arquivo entrar no seu
  acervo. Ela mostra a prévia ("vou adicionar 12 baralhos; 2 já existem") e deixa
  você escolher entre duas coisas bem diferentes:

    ADICIONAR AO ACERVO  -> junta o conteúdo novo e não encosta em mais nada.
                            É o que você usa para receber uma aula nova.
    RESTAURAR O BACKUP   -> troca TUDO pelo arquivo. Só para quando você perdeu
                            os dados e quer voltar no tempo.

  POR QUE ELA EXISTE: antes havia um botão só, chamado "Importar", que fazia
  SEMPRE a segunda coisa — importar uma aulinha apagava todos os outros baralhos
  em silêncio. Esta tela é a diferença entre somar e destruir.
  =============================================================================
*/

import React from 'react';
import { X, Upload, AlertTriangle, FilePlus2, RotateCcw, Info } from 'lucide-react';

/*
  COMPONENTE: ImportBackupModal
  PARAMETROS (PROPS) QUE RECEBE:
    - previa: o resultado de analisarBackup() — { valido, erro, resumo, ... }
    - acervoAtual: quantos baralhos você tem agora (para comparar).
    - onConfirmar: recebe 'adicionar' ou 'restaurar'.
    - onClose: fecha sem mexer em nada.
*/
export default function ImportBackupModal({ previa, onConfirmar, onClose }) {
  if (!previa) return null;

  const resumo = previa.resumo || {};

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div className="glass-panel" style={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div style={styles.header}>
          <div style={styles.titleContainer}>
            <Upload size={22} color="#E77950" />
            <h3 style={styles.title}>Conferir arquivo antes de importar</h3>
          </div>
          <button style={styles.closeBtn} onClick={onClose} title="Fechar sem alterar nada">
            <X size={20} />
          </button>
        </div>

        {!previa.valido ? (
          // -------- ARQUIVO RECUSADO: nada foi alterado --------
          <>
            <div style={{ ...styles.infoBox, border: '1px solid rgba(229,72,77,0.4)' }}>
              <AlertTriangle size={18} color="#E5484D" style={{ flexShrink: 0 }} />
              <p style={styles.infoText}>
                <strong style={{ color: '#E4E6EA' }}>Arquivo recusado.</strong> {previa.erro}
              </p>
            </div>
            <p style={styles.rodape}>
              Nenhum baralho seu foi alterado — o arquivo é conferido inteiro antes de a
              primeira letra ser gravada.
            </p>
            <div style={styles.acoes}>
              <button className="btn-secondary" style={styles.botao} onClick={onClose}>Fechar</button>
            </div>
          </>
        ) : (
          // -------- ARQUIVO CONFERIDO: você escolhe o que fazer --------
          <>
            <div style={styles.grade}>
              <div style={styles.quadro}>
                <span style={styles.numero}>{resumo.baralhos || 0}</span>
                <span style={styles.rotulo}>baralhos no arquivo</span>
              </div>
              <div style={styles.quadro}>
                <span style={styles.numero}>{resumo.cartoes || 0}</span>
                <span style={styles.rotulo}>cartões no arquivo</span>
              </div>
              <div style={styles.quadro}>
                <span style={{ ...styles.numero, color: '#3ECF8E' }}>{resumo.novos || 0}</span>
                <span style={styles.rotulo}>são novos para você</span>
              </div>
              <div style={styles.quadro}>
                <span style={styles.numero}>{previa.acervoAtual || 0}</span>
                <span style={styles.rotulo}>baralhos que você já tem</span>
              </div>
            </div>

            {(resumo.iguais > 0 || resumo.conflitos > 0) && (
              <div style={styles.infoBox}>
                <Info size={18} color="#E8933F" style={{ flexShrink: 0 }} />
                <p style={styles.infoText}>
                  {resumo.iguais > 0 && (
                    <>
                      <strong style={{ color: '#E4E6EA' }}>{resumo.iguais}</strong> baralho(s) do arquivo
                      são idênticos aos seus e serão ignorados (importar duas vezes não duplica nada).{' '}
                    </>
                  )}
                  {resumo.conflitos > 0 && (
                    <>
                      <strong style={{ color: '#E4E6EA' }}>{resumo.conflitos}</strong> baralho(s) têm o mesmo
                      nome de arquivo mas conteúdo diferente: eles entram como cópia, marcada
                      "(importado)". O seu continua intacto.
                    </>
                  )}
                </p>
              </div>
            )}

            {(previa.problemas || []).length > 0 && (
              <div style={{ ...styles.infoBox, border: '1px solid rgba(232,147,63,0.35)' }}>
                <AlertTriangle size={18} color="#E8933F" style={{ flexShrink: 0 }} />
                <div style={styles.infoText}>
                  <strong style={{ color: '#E4E6EA' }}>Partes descartadas do arquivo:</strong>
                  <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
                    {previa.problemas.slice(0, 4).map((problema, i) => <li key={i}>{problema}</li>)}
                  </ul>
                </div>
              </div>
            )}

            <div style={styles.acoes}>
              <button
                className="btn-primary"
                style={styles.botao}
                onClick={() => onConfirmar('adicionar')}
                title="Junta o conteúdo novo sem apagar nada do que você já tem"
              >
                <FilePlus2 size={16} /> Adicionar ao meu acervo
              </button>
              <button
                className="btn-secondary"
                style={{ ...styles.botao, borderColor: 'rgba(229,72,77,0.45)', color: '#E5484D' }}
                onClick={() => {
                  const certeza = window.confirm(
                    `RESTAURAR APAGA O QUE VOCÊ TEM.\n\nSeus ${previa.acervoAtual || 0} baralhos atuais serão substituídos pelos ${resumo.baralhos || 0} do arquivo.\n\nUma cópia do estado atual fica guardada neste aparelho, mas o certo é usar "Adicionar" se você só quer receber conteúdo novo.\n\nTem certeza de que quer RESTAURAR?`
                  );
                  if (certeza) onConfirmar('restaurar');
                }}
                title="Substitui TODOS os seus baralhos pelos do arquivo"
              >
                <RotateCcw size={16} /> Restaurar backup (apaga tudo)
              </button>
              <button className="btn-secondary" style={styles.botao} onClick={onClose}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(6,7,9,0.72)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', zIndex: 4000, padding: '20px',
  },
  modal: {
    width: '100%', maxWidth: '560px', padding: '24px',
    display: 'flex', flexDirection: 'column', gap: '16px',
    maxHeight: '90vh', overflowY: 'auto',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' },
  titleContainer: { display: 'flex', alignItems: 'center', gap: '10px' },
  title: { margin: 0, fontSize: '18px', color: '#E4E6EA' },
  closeBtn: {
    background: 'transparent', border: 'none', color: '#99A1AC',
    cursor: 'pointer', padding: '4px', lineHeight: 0,
  },
  grade: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '10px' },
  quadro: {
    display: 'flex', flexDirection: 'column', gap: '2px', padding: '12px',
    borderRadius: '10px', background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.07)',
  },
  numero: { fontSize: '22px', fontWeight: '700', color: '#E4E6EA' },
  rotulo: { fontSize: '11px', color: '#99A1AC', lineHeight: 1.3 },
  infoBox: {
    display: 'flex', gap: '10px', padding: '12px', borderRadius: '10px',
    background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
  },
  infoText: { margin: 0, fontSize: '13px', color: '#C6CBD4', lineHeight: 1.5 },
  rodape: { margin: 0, fontSize: '12px', color: '#99A1AC' },
  acoes: { display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'flex-end' },
  botao: { display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 16px', fontSize: '13px' },
};

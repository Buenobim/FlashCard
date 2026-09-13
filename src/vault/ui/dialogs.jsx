/*
  =============================================================================
  ARQUIVO: src/vault/ui/dialogs.jsx
  PARA QUE SERVE: As duas caixinhas de interação do cofre — o menu que abre com o
  botão direito e a caixa de digitar um nome.

  POR QUE NÃO USAR window.prompt() E window.confirm() (que seriam 1 linha): porque
  no celular eles ficam feios, saem do tema do app e, no caso do confirm, o texto
  não deixa claro o que vai acontecer. Numa ferramenta onde a pessoa guarda anos de
  anotações, "tem certeza?" precisa dizer exatamente o que será apagado.
  =============================================================================
*/

import { useState, useEffect, useRef } from 'react';

/*
  COMPONENTE: ContextMenu
  Menu do botão direito. Fecha ao clicar fora ou apertar Esc, e se ajusta para
  não sair pela borda da tela.
*/
export function ContextMenu({ x, y, itens, onFechar }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({
      x: Math.min(x, window.innerWidth - r.width - 8),
      y: Math.min(y, window.innerHeight - r.height - 8),
    });
  }, [x, y]);

  useEffect(() => {
    const fechar = () => onFechar();
    const esc = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('mousedown', fechar);
    window.addEventListener('keydown', esc);
    return () => {
      window.removeEventListener('mousedown', fechar);
      window.removeEventListener('keydown', esc);
    };
  }, [onFechar]);

  return (
    <div
      ref={ref}
      className="cofre-menu-contexto"
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {itens.map((item, i) => (
        item.separador
          ? <div key={i} className="cofre-menu-separador" />
          : (
            <button
              key={i}
              className={`cofre-menu-item${item.perigo ? ' perigo' : ''}`}
              onClick={() => { onFechar(); item.acao(); }}
            >
              {item.icone && <item.icone size={14} />}
              {item.titulo}
            </button>
          )
      ))}
    </div>
  );
}

/*
  COMPONENTE: PromptModal
  Caixa para digitar um texto (nome de nota, nome de pasta) ou confirmar uma ação
  destrutiva. Um componente só para os dois casos porque a estrutura é idêntica —
  muda apenas se existe campo de texto.
*/
export function PromptModal({
  titulo,
  descricao,
  valorInicial = '',
  rotuloConfirmar = 'Confirmar',
  perigo = false,
  somenteConfirmar = false,
  onConfirmar,
  onCancelar,
}) {
  const [valor, setValor] = useState(valorInicial);
  const inputRef = useRef(null);

  useEffect(() => {
    if (somenteConfirmar) return;
    const input = inputRef.current;
    input?.focus();
    // Seleciona só o nome, sem a extensão — renomear fica um gesto só
    const semExtensao = valorInicial.replace(/\.md$/i, '');
    input?.setSelectionRange(0, semExtensao.length);
  }, [valorInicial, somenteConfirmar]);

  const confirmar = () => {
    if (!somenteConfirmar && !valor.trim()) return;
    onConfirmar(valor.trim());
  };

  return (
    <div className="cofre-modal-fundo" onMouseDown={onCancelar}>
      <div className="cofre-dialogo" onMouseDown={(e) => e.stopPropagation()}>
        <h3>{titulo}</h3>
        {descricao && <p className="cofre-dialogo-descricao">{descricao}</p>}

        {!somenteConfirmar && (
          <input
            ref={inputRef}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); confirmar(); }
              if (e.key === 'Escape') { e.preventDefault(); onCancelar(); }
            }}
            className="cofre-dialogo-campo"
          />
        )}

        <div className="cofre-dialogo-botoes">
          <button className="cofre-botao-secundario" onClick={onCancelar}>Cancelar</button>
          <button
            className={perigo ? 'cofre-botao-perigo' : 'cofre-botao-primario'}
            onClick={confirmar}
            autoFocus={somenteConfirmar}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}

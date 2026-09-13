/*
  =============================================================================
  ARQUIVO: src/components/AulaEditorModal.jsx
  PARA QUE SERVE: é a janela de "guardar uma aula" dentro de uma matéria.
  Você diz o número ("Aula 01"), o assunto e a data, e entrega a página HTML da
  aula — arrastando o arquivo, escolhendo pelo botão, ou colando o código.
  Antes de salvar, você já vê a aula renderizada aqui do lado.

  ONDE O HTML VAI PARAR (isto é importante):
  O HTML NÃO é guardado dentro do baralho. O baralho mora no LocalStorage (teto
  de ~5MB para o site inteiro) e é espelhado num documento do Firestore (teto de
  1MB por documento) — uma única aula com imagens estoura os dois sozinha e o
  baralho INTEIRO deixaria de salvar, levando junto os flashcards e a trilha.

  Por isso a aula segue o caminho já provado do Caderno: o HTML vai para o
  IndexedDB (centenas de MB) e sobe para a nuvem partido em pedaços. No baralho
  fica só a FICHA: número, assunto, data e tamanho. Quem faz esse serviço é o
  "MÓDULO AULAS" em src/utils/db.js.

  SEGURANÇA DA PRÉVIA: a aula é desenhada dentro de um <iframe sandbox> SEM
  allow-same-origin. Assim o CSS e o JavaScript da própria aula funcionam
  normalmente, mas ela fica numa caixa fechada: não enxerga nem mexe nos seus
  dados da plataforma.
  =============================================================================
*/

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Code2,
  FileUp,
  Presentation,
  Save,
  X,
} from 'lucide-react';

import { carregarAula, salvarAula } from '../utils/db';
import { newId } from '../pages/subBrainCore.js';
/*
  As contas (tamanho, próximo número, título) moram em aulasCore.js — sem React
  e sem banco — para poderem ser conferidas por `npm run testar`.
*/
import {
  bytesDoTexto,
  lerNomeDoArquivo,
  montarTituloDaAula,
  pareceHtml,
  proximoNumeroDeAula,
  tamanhoLegivel,
} from '../utils/aulasCore.js';

/*
  Acima disto a aula ainda salva, mas a subida para a nuvem fica lenta e a
  cópia local começa a pesar. Melhor avisar do que deixar você descobrir depois.
*/
const AVISO_TAMANHO = 5 * 1024 * 1024; // 5 MB

const hojeISO = () => new Date().toISOString().slice(0, 10);

export default function AulaEditorModal({
  subItem,              // a ficha da aula quando é edição; null quando é nova
  aulasExistentes = [], // as outras aulas da matéria (para sugerir o número)
  ownerLabel,           // nome da matéria / do cartão dono
  activeProfile,
  onClose,
  onSave,               // recebe a FICHA pronta; quem grava o HTML é este modal
}) {
  const ehEdicao = Boolean(subItem);

  const [numero, setNumero] = useState(
    () => (ehEdicao ? Number(subItem.numero) || 1 : proximoNumeroDeAula(aulasExistentes)),
  );
  const [assunto, setAssunto] = useState(() => subItem?.assunto || '');
  const [data, setData] = useState(() => subItem?.data || hojeISO());
  const [html, setHtml] = useState('');
  const [nomeArquivo, setNomeArquivo] = useState(() => subItem?.arquivo || '');

  const [aba, setAba] = useState('arquivo');  // 'arquivo' | 'codigo'
  const [arrastando, setArrastando] = useState(false);
  const [carregando, setCarregando] = useState(ehEdicao);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const inputArquivoRef = useRef(null);

  /*
    Na edição, o HTML não vem junto com a ficha: ele mora no IndexedDB (e, se
    esta for a primeira vez neste aparelho, na nuvem). Buscamos aqui.
  */
  useEffect(() => {
    let vivo = true;
    if (!ehEdicao) return undefined;
    (async () => {
      const { html: guardado } = await carregarAula(activeProfile, subItem.id);
      if (!vivo) return;
      if (guardado) setHtml(guardado);
      else setErro('Não encontrei o HTML desta aula nem no aparelho nem na nuvem. Você pode entregar o arquivo de novo abaixo.');
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [ehEdicao, subItem, activeProfile]);

  const bytes = useMemo(() => bytesDoTexto(html), [html]);
  const titulo = montarTituloDaAula(numero, assunto);

  /* ------------------------------------------------------------------
     ENTREGA DO ARQUIVO (botão, arrastar-e-soltar, ou colar o código)
     ------------------------------------------------------------------ */
  const lerArquivo = (file) => {
    if (!file) return;
    const nome = file.name || 'aula.html';
    if (!/\.(html?|xhtml)$/i.test(nome)) {
      setErro(`"${nome}" não é uma página HTML. Preciso de um arquivo .html.`);
      return;
    }
    const leitor = new FileReader();
    leitor.onload = () => {
      const conteudo = String(leitor.result || '');
      setHtml(conteudo);
      setNomeArquivo(nome);
      setErro(pareceHtml(conteudo) ? '' : 'Li o arquivo, mas ele não parece ter conteúdo de página. Confira a prévia antes de salvar.');

      /*
        O nome do arquivo já costuma trazer tudo: "Aula 07 - Cinematica.html".
        Aproveitamos o número dele (é uma informação que VOCÊ deu, vale mais que
        a nossa sugestão) e usamos o resto como assunto, se você ainda não tiver
        escrito um.
      */
      const doNome = lerNomeDoArquivo(nome);
      if (doNome.numero) setNumero(doNome.numero);
      if (doNome.assunto) setAssunto((atual) => atual || doNome.assunto);
    };
    leitor.onerror = () => setErro('Não consegui ler esse arquivo. Tente salvá-lo de novo e repetir.');
    leitor.readAsText(file, 'utf-8');
  };

  const aoSoltar = (e) => {
    e.preventDefault();
    setArrastando(false);
    lerArquivo(e.dataTransfer?.files?.[0]);
  };

  /* ------------------------------------------------------------------
     SALVAR: primeiro o HTML (IndexedDB + nuvem), depois a ficha no baralho.
     A ordem é de propósito — a ficha só entra no baralho se o conteúdo dela
     realmente existir. Ficha sem HTML seria uma aula fantasma na lista.
     ------------------------------------------------------------------ */
  const submit = async (e) => {
    e.preventDefault();
    if (salvando) return;

    if (!html.trim()) {
      setErro('Falta o HTML da aula. Arraste o arquivo aqui ou cole o código na aba "Colar código".');
      setAba('arquivo');
      return;
    }

    setSalvando(true);
    setErro('');
    const id = subItem?.id || newId('aula');
    const resultado = await salvarAula(activeProfile, id, html);

    if (!resultado.ok) {
      setErro(resultado.motivo);
      setSalvando(false);
      return;
    }

    onSave({
      ...(subItem || {}),
      id,
      type: 'aula',
      numero: Math.max(1, Number(numero) || 1),
      assunto: assunto.trim(),
      data,
      title: titulo,
      arquivo: nomeArquivo,
      bytes,
      createdAt: subItem?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  };

  return (
    <div className="study-modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="study-modal aula-modal" onSubmit={submit}>
        <header className="study-modal-header">
          <span className="study-modal-icon" style={{ color: '#F472B6', background: 'rgba(244,114,182,.14)' }}>
            <Presentation size={22} />
          </span>
          <div>
            <small>{ehEdicao ? 'EDITAR AULA' : 'NOVA AULA'}</small>
            <h2>{titulo}</h2>
            {ownerLabel && (
              <small style={{ color: '#8e96a3', letterSpacing: 0, fontWeight: 600, textTransform: 'none' }}>
                pertence a: {ownerLabel}
              </small>
            )}
          </div>
          <button type="button" className="study-icon-button" onClick={onClose}><X size={19} /></button>
        </header>

        <div className="aula-linha-campos">
          <label className="study-field aula-campo-numero">
            <span>Aula nº</span>
            <input
              type="number"
              min="1"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
            />
          </label>

          <label className="study-field aula-campo-assunto">
            <span>Assunto</span>
            <input
              autoFocus
              value={assunto}
              onChange={(e) => setAssunto(e.target.value)}
              placeholder="Ex.: Ligações químicas"
            />
          </label>

          <label className="study-field aula-campo-data">
            <span>Data da aula</span>
            <div className="study-url-field">
              <CalendarDays size={16} />
              <input type="date" value={data} onChange={(e) => setData(e.target.value)} />
            </div>
          </label>
        </div>

        {/* ---------- O CONTEÚDO: arquivo ou código colado ---------- */}
        <div className="aula-abas" role="tablist">
          <button type="button" role="tab" aria-selected={aba === 'arquivo'}
            className={aba === 'arquivo' ? 'is-active' : ''} onClick={() => setAba('arquivo')}>
            <FileUp size={15} /> Entregar arquivo
          </button>
          <button type="button" role="tab" aria-selected={aba === 'codigo'}
            className={aba === 'codigo' ? 'is-active' : ''} onClick={() => setAba('codigo')}>
            <Code2 size={15} /> Colar código
          </button>
          {bytes > 0 && (
            <span className="aula-selo-tamanho">
              {tamanhoLegivel(bytes)}{nomeArquivo ? ` · ${nomeArquivo}` : ''}
            </span>
          )}
        </div>

        {carregando ? (
          <div className="aula-carregando">Buscando o HTML desta aula…</div>
        ) : aba === 'arquivo' ? (
          <div
            className={`aula-zona-arquivo ${arrastando ? 'is-dragging' : ''} ${html ? 'is-full' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setArrastando(true); }}
            onDragLeave={() => setArrastando(false)}
            onDrop={aoSoltar}
            onClick={() => inputArquivoRef.current?.click()}
          >
            <FileUp size={26} />
            <strong>{html ? 'Trocar o arquivo desta aula' : 'Arraste aqui o HTML da aula'}</strong>
            <p>ou clique para escolher no computador — aceita .html</p>
            <input
              ref={inputArquivoRef}
              type="file"
              accept=".html,.htm,.xhtml,text/html"
              hidden
              onChange={(e) => { lerArquivo(e.target.files?.[0]); e.target.value = ''; }}
            />
          </div>
        ) : (
          <label className="study-field">
            <span>Código HTML da aula</span>
            <textarea
              rows="10"
              spellCheck="false"
              className="aula-codigo"
              value={html}
              onChange={(e) => { setHtml(e.target.value); setNomeArquivo(''); }}
              placeholder="Cole aqui a página inteira, do <!doctype html> ao </html>…"
            />
          </label>
        )}

        {erro && (
          <p className="aula-recado aula-recado-erro"><AlertTriangle size={15} /> {erro}</p>
        )}
        {!erro && bytes > AVISO_TAMANHO && (
          <p className="aula-recado aula-recado-aviso">
            <AlertTriangle size={15} />
            Aula grande ({tamanhoLegivel(bytes)}). Ela salva e abre normal, mas a subida para a nuvem vai demorar.
          </p>
        )}

        {/* ---------- PRÉVIA: a aula do jeito que ela vai abrir ---------- */}
        {html.trim() && (
          <div className="aula-previa">
            <div className="aula-previa-topo">Prévia — é assim que a aula vai abrir</div>
            <iframe
              title="Prévia da aula"
              className="aula-previa-quadro"
              srcDoc={html}
              sandbox="allow-scripts allow-popups"
              referrerPolicy="no-referrer"
            />
          </div>
        )}

        <footer className="study-modal-footer">
          <button type="button" className="btn-glass" onClick={onClose} disabled={salvando}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={salvando || carregando}>
            <Save size={17} /> {salvando ? 'Salvando…' : 'Salvar aula'}
          </button>
        </footer>
      </form>
    </div>
  );
}

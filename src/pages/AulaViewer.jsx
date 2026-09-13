/*
  =============================================================================
  ARQUIVO: src/pages/AulaViewer.jsx
  PARA QUE SERVE: abre uma aula guardada e a mostra INTEIRA, do jeito que ela
  foi entregue — o HTML da aula com o CSS dele, sem a plataforma se meter no
  meio e estragar a formatação.

  COMO A AULA É DESENHADA: dentro de um <iframe sandbox> sem allow-same-origin.
  Duas coisas boas saem disso de graça:

    1. ISOLAMENTO DE ESTILO. O CSS da aula (que costuma ter regras largas, do
       tipo "body { ... }" ou "h1 { ... }") fica preso lá dentro e não vaza para
       o resto do app. E o CSS do app também não entra e desfigura a aula.

    2. ISOLAMENTO DE SEGURANÇA. Sem allow-same-origin, a página ganha uma origem
       "opaca": o JavaScript dela roda e funciona, mas não consegue ler nada seu
       — nem os baralhos, nem o login, nem a nuvem.

  DE ONDE VEM O CONTEÚDO: `carregarAula` tenta o aparelho primeiro (IndexedDB,
  abre na hora e funciona sem internet) e, se a aula tiver sido criada em outro
  aparelho, busca na nuvem e já guarda a cópia local.
  =============================================================================
*/

import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CloudDownload,
  Download,
  Edit3,
  Maximize2,
  Minimize2,
  Presentation,
} from 'lucide-react';

import { carregarAula } from '../utils/db';
import { dataLegivel, tamanhoLegivel } from '../utils/aulasCore.js';
import AulaEditorModal from '../components/AulaEditorModal.jsx';

export default function AulaViewer({
  aula,
  activeProfile,
  onBack,
  onSalvarFicha,       // grava a ficha editada no baralho (vem do módulo)
  aulasDaMateria = [], // as outras aulas, para o editor sugerir o número
}) {
  const [html, setHtml] = useState(null);
  const [origem, setOrigem] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [telaCheia, setTelaCheia] = useState(false);
  const [editando, setEditando] = useState(false);
  /*
    Sobe de 1 a cada gravação para forçar a releitura do HTML.
    Sem isto, trocar o arquivo da aula salvaria certo mas a tela continuaria
    mostrando o conteúdo antigo, e você acharia que a troca não funcionou.
  */
  const [releitura, setReleitura] = useState(0);
  const podeEditar = typeof onSalvarFicha === 'function';

  /*
    Busca o HTML uma vez, na abertura.

    NÃO zeramos o estado aqui dentro de propósito: quem monta esta tela
    (FlashcardsModule) passa `key={aula.id}`. Trocar de aula troca a chave, o
    React monta o componente do zero e o estado já nasce limpo — sem o vaivém
    de renderizações que acontece quando um efeito mexe no estado antes da
    primeira pintura.
  */
  useEffect(() => {
    let vivo = true;
    (async () => {
      const resultado = await carregarAula(activeProfile, aula.id);
      if (!vivo) return;
      setHtml(resultado.html);
      setOrigem(resultado.origem);
      setCarregando(false);
    })();
    return () => { vivo = false; };
  }, [aula.id, activeProfile, releitura]);

  /*
    BAIXAR: devolve o arquivo .html original. É de propósito que não exista um
    "abrir em nova aba": numa aba comum a aula rodaria COM a origem do app e o
    JavaScript dela poderia mexer nos seus dados. Baixado, você abre e imprime
    pelo navegador com a mesma liberdade e nenhum risco.
  */
  const baixar = () => {
    if (!html) return;
    const arquivo = new Blob([html], { type: 'text/html;charset=utf-8' });
    const endereco = URL.createObjectURL(arquivo);
    const link = document.createElement('a');
    link.href = endereco;
    link.download = `${(aula.title || 'aula').replace(/[\\/:*?"<>|]+/g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    // Solta a memória do arquivo depois que o navegador já pegou o download.
    setTimeout(() => URL.revokeObjectURL(endereco), 4000);
  };

  const legenda = useMemo(() => {
    const partes = [];
    if (aula.numero) partes.push(`AULA ${String(aula.numero).padStart(2, '0')}`);
    const d = dataLegivel(aula.data);
    if (d) partes.push(d);
    if (aula.bytes) partes.push(tamanhoLegivel(aula.bytes));
    return partes.join(' · ');
  }, [aula]);

  return (
    <div className={`aula-page ${telaCheia ? 'is-fullscreen' : ''}`}>
      <header>
        <button className="btn-glass" onClick={onBack}><ArrowLeft size={17} /> Matéria</button>

        <div className="aula-page-titulo">
          <span><Presentation size={18} /></span>
          <div>
            <small>{legenda || 'AULA'}</small>
            <h2>{aula.assunto || aula.title}</h2>
          </div>
        </div>

        <div className="aula-page-acoes">
          {origem === 'nuvem' && (
            <span className="aula-selo-origem" title="Esta aula veio da nuvem e agora ficou guardada também neste aparelho">
              <CloudDownload size={13} /> baixada da nuvem
            </span>
          )}
          <button className="btn-glass" onClick={() => setTelaCheia((v) => !v)} title={telaCheia ? 'Sair da tela cheia' : 'Ver em tela cheia'}>
            {telaCheia ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button className="btn-glass" onClick={baixar} disabled={!html} title="Baixar o arquivo .html desta aula">
            <Download size={16} />
          </button>
          {podeEditar && (
            <button className="btn-glass" onClick={() => setEditando(true)} title="Editar a ficha ou trocar o arquivo desta aula">
              <Edit3 size={16} />
            </button>
          )}
        </div>
      </header>

      <div className="aula-page-corpo">
        {carregando && <div className="cofre-carregando">Abrindo a aula…</div>}

        {!carregando && !html && (
          <div className="aula-sumiu">
            <AlertTriangle size={30} />
            <strong>Não achei o conteúdo desta aula</strong>
            <p>
              A ficha existe, mas o HTML não está neste aparelho nem na nuvem.
              Isso acontece quando a aula foi criada em outro aparelho e ainda não subiu.
              {podeEditar && ' Você pode entregar o arquivo de novo aqui embaixo.'}
            </p>
            {podeEditar && <button className="btn-primary" onClick={() => setEditando(true)}><Edit3 size={16} /> Entregar o arquivo</button>}
          </div>
        )}

        {!carregando && html && (
          <iframe
            title={aula.title || 'Aula'}
            className="aula-quadro"
            srcDoc={html}
            sandbox="allow-scripts allow-popups"
            referrerPolicy="no-referrer"
          />
        )}
      </div>

      {editando && (
        <AulaEditorModal
          subItem={aula}
          aulasExistentes={aulasDaMateria}
          activeProfile={activeProfile}
          onClose={() => setEditando(false)}
          onSave={(ficha) => {
            onSalvarFicha(ficha);
            setEditando(false);
            setReleitura((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

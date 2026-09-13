/*
  =============================================================================
  ARQUIVO: src/pages/CreateEditSet.jsx
  PARA QUE SERVE: é o EDITOR DA MATÉRIA. Onde você cria um baralho novo ou mexe
  num que já existe.

  O QUE MUDOU AQUI (a mudança grande da plataforma):
  Antes esta tela era uma GRADE de cartões — linha 1: termo/definição, linha 2:
  termo/definição, e assim por diante. Aquilo obrigava a matéria inteira a caber
  no formato pergunta/resposta. Onde entrava o print do slide? E o raciocínio que
  liga um cartão ao outro? E o link da videoaula? Não entravam: iam para outro
  lugar, ou para lugar nenhum.

  Agora a primeira aba é a TRILHA: uma sequência de blocos na ordem em que você
  estuda — seção, anotação, imagem, flashcard, link, fórmula, pegadinha. O
  flashcard continua existindo (e continua sendo o mesmo cartão de sempre, que os
  modos Cartões 3D, Aprender, Combinar e Simulado leem), mas agora ele vive
  cercado do material que o explica.

  AS TRÊS ABAS:
    • Trilha    — a matéria em blocos (esta tela).
    • Caderno   — a página infinita para escrever à mão e desenhar.
    • Anotações — o texto livre, que é uma nota do Cofre de verdade.

  QUEM GRAVA: só esta tela. A Trilha avisa a cada mudança e o salvamento
  automático daqui grava um segundo depois que você para de digitar — e mostra na
  barra de baixo se deu certo ou não.
  =============================================================================
*/

import { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { Save, ArrowLeft, Layers, NotebookPen, PenLine, CircleCheck, RefreshCw, Network, AlertCircle } from 'lucide-react';

import Trilha from '../estudo/Trilha.jsx';
import { lerTrilha, gravarTrilha, blocoNovo, blocoEstaVazio, raioX as calcularRaioX } from '../estudo/trilhaCore.js';

// O Caderno (tldraw) é pesado, então carregamos SOB DEMANDA (só quando a aba abre).
const NotebookCanvas = lazy(() => import('./NotebookCanvas'));
// A aba Anotações abre uma NOTA DO COFRE: mesmo texto que aparece na barra lateral.
const DeckNoteEditor = lazy(() => import('../vault/ui/DeckNoteEditor.jsx'));

export default function CreateEditSet({
  setEditData, onSaveSet, onNavigate, categories = [], activeProfile, onAbrirNoCofre, onEstudar,
}) {
  const [activeTab, setActiveTab] = useState('trilha');

  // ID estável do baralho: o Caderno e as Anotações se penduram nele. Se for um
  // baralho novo, já nasce com id agora, para essas abas funcionarem desde já.
  const [deckId] = useState(() => (setEditData ? setEditData.id : `set-${Date.now()}`));

  // 'ocioso' | 'salvando' | 'salvo' | 'falha'
  const [estadoDoSalvamento, setEstadoDoSalvamento] = useState('ocioso');
  const [mensagemDeFalha, setMensagemDeFalha] = useState('');
  const primeiraPassada = useRef(true);
  const relogioRef = useRef(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(categories[0] || 'Sem Grupo');
  const [erro, setErro] = useState('');

  /*
    OS BLOCOS DA TRILHA.
    Baralho novo já nasce com o esqueleto mínimo (uma seção e um flashcard) para
    você ver o formato em vez de encarar uma tela em branco.
  */
  const [blocos, setBlocos] = useState(() => [blocoNovo('secao'), blocoNovo('flashcard')]);

  /*
    CARREGAMENTO — a trava do `jaCarregado`:
    o editor recebe o baralho VIVO (o mesmo objeto que o salvamento automático
    acabou de atualizar). Sem esta trava, cada gravação devolveria o baralho para
    cá e o texto que você está digitando seria substituído no meio da frase.
    Carregamos uma vez por baralho e pronto.
  */
  const jaCarregado = useRef(null);
  useEffect(() => {
    if (setEditData && jaCarregado.current !== setEditData.id) {
      jaCarregado.current = setEditData.id;
      setTitle(setEditData.title || '');
      setDescription(setEditData.description || '');
      setCategory(setEditData.category || categories[0] || 'Sem Grupo');
      // lerTrilha converte QUALQUER baralho antigo em trilha: os cartões que já
      // existiam viram blocos de flashcard, na mesma ordem. Nada se perde.
      const lidos = lerTrilha(setEditData);
      setBlocos(lidos.length ? lidos : [blocoNovo('secao'), blocoNovo('flashcard')]);
    } else if (!setEditData && !jaCarregado.current && categories.length > 0) {
      setCategory(categories[0]);
    }
  }, [setEditData, categories]);

  /*
    montarPayload: o ÚNICO lugar que decide o que é gravado. O salvamento
    automático, o botão "Voltar" e o botão "Salvar" nunca podem divergir.

    O filtro de blocos vazios: um bloco totalmente em branco (que você criou e
    ainda não preencheu) NÃO vai para o disco — senão ele viraria um cartão vazio
    aparecendo no meio do Simulado e do jogo Combinar. Ele continua na tela,
    esperando você escrever.
  */
  const montarPayload = () => {
    const base = {
      ...(setEditData || {}),
      id: deckId,
      title: title.trim() || 'Baralho sem título',
      description: description.trim(),
      category,
      createdAt: setEditData ? setEditData.createdAt : new Date().toISOString(),
    };
    return gravarTrilha(base, blocos.filter((b) => !blocoEstaVazio(b)));
  };

  /* O baralho como ele ficaria gravado — serve para o raio-X e para pesar. */
  const previsao = useMemo(
    () => gravarTrilha({ ...(setEditData || {}), id: deckId }, blocos.filter((b) => !blocoEstaVazio(b))),
    [blocos, setEditData, deckId],
  );
  const numeros = useMemo(() => calcularRaioX(previsao), [previsao]);

  /*
    SALVAMENTO AUTOMÁTICO.
    Espera 1 segundo de pausa na digitação e grava. O resultado da gravação é
    OLHADO: se o navegador recusar (memória cheia), o selo fica vermelho na sua
    frente em vez de o erro ir calado para o console.
  */
  useEffect(() => {
    if (primeiraPassada.current) { primeiraPassada.current = false; return undefined; }

    const temConteudo = title.trim().length > 0 || blocos.some((b) => !blocoEstaVazio(b));
    if (!temConteudo) return undefined;

    // O selo "salvando…" precisa acender no MOMENTO em que você digita, e quem
    // sabe que você digitou é este efeito. É de propósito.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEstadoDoSalvamento('salvando');
    if (relogioRef.current) clearTimeout(relogioRef.current);

    relogioRef.current = setTimeout(() => {
      const resultado = onSaveSet(montarPayload());
      if (resultado && resultado.ok === false) {
        setEstadoDoSalvamento('falha');
        setMensagemDeFalha(resultado.motivo || 'O navegador recusou a gravação.');
      } else {
        setEstadoDoSalvamento('salvo');
        setMensagemDeFalha('');
      }
    }, 1000);

    return () => { if (relogioRef.current) clearTimeout(relogioRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, category, blocos]);

  /* Grava na hora (usado pelo botão Voltar, pelo Salvar e antes de estudar). */
  const gravarAgora = () => {
    if (relogioRef.current) clearTimeout(relogioRef.current);
    const payload = montarPayload();
    const resultado = onSaveSet(payload);
    if (resultado && resultado.ok === false) {
      setEstadoDoSalvamento('falha');
      setMensagemDeFalha(resultado.motivo || 'O navegador recusou a gravação.');
      return null;
    }
    setEstadoDoSalvamento('salvo');
    setMensagemDeFalha('');
    return payload;
  };

  const temConteudoParaGravar = () =>
    title.trim().length > 0 || blocos.some((b) => !blocoEstaVazio(b));

  const handleBack = () => {
    if (temConteudoParaGravar()) gravarAgora();
    onNavigate('dashboard');
  };

  const handleSave = () => {
    if (!title.trim()) {
      setErro('Dê um nome à matéria antes de salvar — é por ele que você vai encontrá-la depois.');
      setActiveTab('trilha');
      return;
    }
    if (!blocos.some((b) => !blocoEstaVazio(b))) {
      setErro('A trilha está vazia. Escreva pelo menos uma anotação ou crie um flashcard.');
      return;
    }
    setErro('');
    if (!gravarAgora()) return;
    onNavigate('dashboard');
  };

  const estudarAgora = (modo) => {
    const payload = gravarAgora();
    if (payload && onEstudar) onEstudar(payload, modo);
  };

  return (
    <div className="app-container">

      {/* CABEÇALHO */}
      <header style={styles.editorHeader}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <button onClick={handleBack} className="btn-secondary" style={styles.backBtn}>
            <ArrowLeft size={18} />
            Voltar ao Painel
          </button>
          <h2 style={styles.pageTitle}>{setEditData ? 'Editar matéria' : 'Nova matéria'}</h2>
        </div>

        <div style={styles.headerRightArea}>
          {setEditData && (
            <button
              onClick={() => { gravarAgora(); onNavigate('sub_brain'); }}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '9px 15px', fontSize: '13px' }}
              title="Abrir este baralho no Sub-Cérebro para editar dentro do mapa"
            >
              <Network size={16} />
              Ver no Cérebro
            </button>
          )}
          {estadoDoSalvamento === 'salvando' && (
            <span style={styles.seloSalvando}><RefreshCw size={14} className="spin-icon" /> Salvando…</span>
          )}
          {estadoDoSalvamento === 'salvo' && (
            <span style={styles.seloSalvo}><CircleCheck size={14} /> Salvo automaticamente</span>
          )}
          {estadoDoSalvamento === 'falha' && (
            <span style={styles.seloFalha} title={mensagemDeFalha}><AlertCircle size={14} /> NÃO SALVOU</span>
          )}
        </div>
      </header>

      {/* ABAS */}
      <div style={styles.tabBar}>
        {[
          { chave: 'trilha', rotulo: 'Trilha', Icone: Layers, dica: 'A matéria em blocos, na ordem em que você estuda' },
          { chave: 'caderno', rotulo: 'Caderno', Icone: NotebookPen, dica: 'Página infinita para escrever à mão e desenhar' },
          { chave: 'anotacoes', rotulo: 'Anotações', Icone: PenLine, dica: 'Texto livre com Ctrl+V para colar prints' },
        ].map(({ chave, rotulo, Icone, dica }) => (
          <button
            key={chave}
            onClick={() => setActiveTab(chave)}
            title={dica}
            style={activeTab === chave ? { ...styles.tabBtn, ...styles.tabBtnActive } : styles.tabBtn}
          >
            <Icone size={16} /> {rotulo}
          </button>
        ))}
      </div>

      {/* ============ ABA TRILHA ============ */}
      {activeTab === 'trilha' && (
        <>
          {/* Identificação da matéria */}
          <div style={styles.metadataCard} className="glass-panel">
            <div className="form-group">
              <label className="form-label" htmlFor="set-title">Nome da matéria</label>
              <input
                type="text"
                id="set-title"
                placeholder="Ex.: Física II — Eletromagnetismo"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErro(''); }}
                className="form-input"
                maxLength={100}
              />
            </div>

            <div style={styles.duasColunas}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="set-category">Grupo de estudo</label>
                <select
                  id="set-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="form-input"
                  style={styles.selectInput}
                >
                  {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                  {categories.length === 0 && <option value="Sem Grupo">Sem Grupo</option>}
                </select>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" htmlFor="set-desc">Descrição (opcional)</label>
                <input
                  type="text"
                  id="set-desc"
                  placeholder="Ex.: prova 2 — capítulos 4 a 7"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="form-input"
                  maxLength={200}
                />
              </div>
            </div>
          </div>

          {erro && <div style={styles.erroAviso} className="animate-shake"><span>⚠️ {erro}</span></div>}

          <Trilha
            blocos={blocos}
            onMudar={setBlocos}
            estado={estadoDoSalvamento}
            mensagemDeFalha={mensagemDeFalha}
            deckParaPesar={previsao}
            raioX={numeros}
            onEstudar={onEstudar ? estudarAgora : null}
          />

          <footer style={styles.editorFooter}>
            <button onClick={handleSave} className="btn-primary" style={styles.saveBtn}>
              <Save size={20} />
              Salvar e voltar
            </button>
          </footer>
        </>
      )}

      {/* ============ ABA CADERNO ============ */}
      {activeTab === 'caderno' && (
        <section style={styles.notebookArea}>
          <div style={styles.notebookHeaderRow}>
            <span style={styles.notebookHint}>
              🖊️ Escreva à caneta, use o marca-texto, cole prints (Ctrl+V) ou toque no
              menu para inserir fotos do celular. Tudo salva sozinho.
            </span>
          </div>
          <Suspense fallback={<div style={styles.notebookLoading}>Abrindo o caderno…</div>}>
            <NotebookCanvas deckId={deckId} profile={activeProfile} />
          </Suspense>
        </section>
      )}

      {/* ============ ABA ANOTAÇÕES ============ */}
      {activeTab === 'anotacoes' && (
        <section style={styles.notebookArea}>
          <Suspense fallback={<div style={styles.notebookLoading}>Abrindo suas anotações…</div>}>
            <DeckNoteEditor
              baralho={{ id: deckId, title, category }}
              onAbrirNoCofre={onAbrirNoCofre}
            />
          </Suspense>
        </section>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// ESTILOS LOCAIS DO EDITOR
// -----------------------------------------------------------------------------
const styles = {
  editorHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: '20px', marginBottom: '24px', flexWrap: 'wrap',
  },
  headerRightArea: { display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' },
  seloSalvando: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(232, 147, 63, 0.12)', border: '1px solid rgba(232, 147, 63, 0.3)',
    color: '#E8933F', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 700,
  },
  seloSalvo: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(62, 207, 142, 0.12)', border: '1px solid rgba(62, 207, 142, 0.3)',
    color: '#3ECF8E', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 700,
  },
  seloFalha: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    background: 'rgba(229, 72, 77, 0.14)', border: '1px solid rgba(229, 72, 77, 0.4)',
    color: '#F26F73', borderRadius: '20px', padding: '6px 14px', fontSize: '13px', fontWeight: 800,
  },
  backBtn: { padding: '10px 18px', fontSize: '14px' },
  pageTitle: { fontSize: '24px', fontWeight: 800, color: '#ffffff' },
  tabBar: { display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' },
  tabBtn: {
    display: 'inline-flex', alignItems: 'center', gap: '8px',
    background: 'rgba(255,255,255,0.03)', color: '#99A1AC',
    border: '1px solid rgba(255,255,255,0.06)', borderRadius: '11px',
    padding: '10px 20px', fontSize: '14px', fontWeight: 700, cursor: 'pointer',
    fontFamily: 'var(--font-main)',
  },
  tabBtnActive: {
    background: 'rgba(232, 147, 63, 0.13)', color: '#EFAE6B',
    borderColor: 'rgba(232, 147, 63, 0.35)',
  },
  metadataCard: { padding: '22px', marginBottom: '22px' },
  duasColunas: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' },
  selectInput: { cursor: 'pointer' },
  erroAviso: {
    background: 'rgba(229, 72, 77, 0.1)', border: '1px solid rgba(229, 72, 77, 0.3)',
    color: '#F1949A', borderRadius: '12px', padding: '13px 18px',
    fontSize: '14px', fontWeight: 600, marginBottom: '18px',
  },
  editorFooter: { display: 'flex', justifyContent: 'flex-end', marginTop: '26px' },
  saveBtn: { padding: '14px 30px', fontSize: '15px' },
  notebookArea: {
    background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--border-radius-md)', padding: '14px', minHeight: '70vh',
  },
  notebookHeaderRow: { marginBottom: '12px' },
  notebookHint: { color: '#99A1AC', fontSize: '13px' },
  notebookLoading: { padding: '60px', textAlign: 'center', color: '#99A1AC' },
};

/*
  =============================================================================
  ARQUIVO: src/modules/FlashcardsModule.jsx
  PARA QUE SERVE: Empacota TODO o módulo de Flashcards (painel, editor, cartões
  3D, aprender, combinar, avaliação) dentro de uma aba do Cofre.

  POR QUE ESTE ARQUIVO EXISTE: antes, a navegação entre as telas de flashcard
  ficava no App.jsx. Agora que a plataforma tem abas, cada aba precisa lembrar
  SOZINHA em que tela está — senão abrir os flashcards em duas abas faria uma
  atropelar a outra. Este componente guarda essa "telinha atual" internamente.

  IMPORTANTE: nada da lógica de flashcards foi alterado. As mesmas páginas, os
  mesmos dados, as mesmas funções de salvar. Só mudou quem manda na navegação.
  =============================================================================
*/

import { useState } from 'react';

import Navbar from '../components/Navbar';
import Dashboard from '../pages/Dashboard';
import CreateEditSet from '../pages/CreateEditSet';
import FlashcardMode from '../pages/FlashcardMode';
import LearnMode from '../pages/LearnMode';
import MatchMode from '../pages/MatchMode';
import TestMode from '../pages/TestMode';
import StudyNotebook from '../pages/StudyNotebook';
import SubBrainView from '../pages/SubBrainView';
import AulaViewer from '../pages/AulaViewer';
import EstudarTrilha, { EscolherModo } from '../estudo/EstudarTrilha.jsx';
import { TreinoDeQuestoes } from '../estudo/Questoes.jsx';
import { raioX as calcularRaioX } from '../estudo/trilhaCore.js';
import { registrarSessaoDeEstudo } from '../utils/db';
import '../components/study-library.css';

export default function FlashcardsModule({
  sets, stats, categories, activeProfile, isSyncing, isOnline, statusDaNuvem,
  onSaveSet, onDeleteSet, onCompleteSession, onSaveRecord, onAddCategory,
  onExportBackup, onImportBackup, onOpenSync, onLogoutProfile,
  initialCategoryFilter,
  studyMaterials = [], onSaveStudyMaterials,
  // Vindos do Grafo: qual baralho abrir já expandido e/ou em qual grupo filtrar
  baralhoInicial, grupoInicial, onAbrirNoCofre,
}) {
  // A tela atual DESTA aba (outra aba de flashcards tem a sua própria)
  const [tela, setTela] = useState(baralhoInicial ? 'sub_brain' : 'dashboard');
  const [materialSelecionado, setMaterialSelecionado] = useState(null);
  /*
    A AULA aberta no momento. Guardamos o ID, não o objeto: assim, se você
    editar a ficha da aula, a tela já mostra o dado novo — mesmo truque usado
    com o baralho logo abaixo, pelo mesmo motivo.
  */
  const [aulaAbertaId, setAulaAbertaId] = useState(null);

  /*
    QUAL BARALHO ESTÁ ABERTO — guardamos o ID, nunca uma cópia do baralho.

    POR QUE ISSO IMPORTA (bug que travava o app): antes guardávamos o OBJETO do
    baralho. Quando você criava uma anotação ou um link dentro do Sub-Cérebro,
    o dado era gravado direitinho, mas a tela continuava exibindo aquela cópia
    velha, de antes da criação — e dava a impressão de que "não deu certo",
    de que nada tinha sido criado. Guardando só o id e buscando o baralho na
    lista viva, tudo que você cria aparece na hora.
  */
  const [baralhoSelecionadoId, setBaralhoSelecionadoId] = useState(baralhoInicial || null);
  const baralhoSelecionado = sets.find((s) => s.id === baralhoSelecionadoId) || null;
  const selecionarBaralho = (baralho) => setBaralhoSelecionadoId(baralho?.id || null);

  const navegar = (destino) => setTela(destino);

  /*
    ===================================================================
    A SESSÃO DE ESTUDO DA TRILHA
    ===================================================================
    Ela NÃO é uma "tela" como as outras: abre por cima de tudo, em tela
    cheia, e some quando você sai. Assim você pode disparar o estudo tanto
    do painel quanto de dentro do editor sem perder onde estava.

      escolhaDeModo -> guarda o baralho enquanto você decide COMO estudar
      sessao        -> { deck, modo } enquanto a sessão está rolando
  */
  const [escolhaDeModo, setEscolhaDeModo] = useState(null);
  const [sessao, setSessao] = useState(null);

  const pedirParaEstudar = (baralho, modo) => {
    if (!baralho) return;
    if (modo) setSessao({ deck: baralho, modo });
    else setEscolhaDeModo(baralho);
  };

  /*
    Quando você dá uma nota a um cartão, o baralho inteiro é regravado com o
    cartão atualizado. O spread preserva a trilha, as anotações do Sub-Cérebro
    e tudo o mais — só o agendamento daquele cartão muda.
  */
  const anotarNota = (cardId, cartaoAtualizado) => {
    const deckVivo = sets.find((s) => s.id === sessao?.deck?.id) || sessao?.deck;
    if (!deckVivo) return;
    onSaveSet({
      ...deckVivo,
      cards: (deckVivo.cards || []).map((c) => (c.id === cardId ? cartaoAtualizado : c)),
    });
  };

  const fecharSessao = () => setSessao(null);

  const guardarResumoDaSessao = (resumo) => {
    registrarSessaoDeEstudo(activeProfile, resumo);
    if (resumo.respondidos > 0 && onCompleteSession) onCompleteSession();
  };

  let conteudo;
  switch (tela) {
    case 'create':
      conteudo = (
        <CreateEditSet
          setEditData={null}
          onSaveSet={onSaveSet}
          onNavigate={navegar}
          categories={categories}
          activeProfile={activeProfile}
          onAbrirNoCofre={onAbrirNoCofre}
          onEstudar={pedirParaEstudar}
        />
      );
      break;

    case 'edit':
      conteudo = (
        <CreateEditSet
          setEditData={baralhoSelecionado}
          onSaveSet={onSaveSet}
          onNavigate={navegar}
          categories={categories}
          activeProfile={activeProfile}
          onAbrirNoCofre={onAbrirNoCofre}
          onEstudar={pedirParaEstudar}
        />
      );
      break;

    case 'flashcard_mode':
      conteudo = <FlashcardMode set={baralhoSelecionado} onNavigate={navegar} onCompleteSession={onCompleteSession} />;
      break;

    case 'learn_mode':
      conteudo = <LearnMode set={baralhoSelecionado} onNavigate={navegar} onCompleteSession={onCompleteSession} />;
      break;

    case 'match_mode':
      conteudo = <MatchMode set={baralhoSelecionado} stats={stats} onNavigate={navegar} onSaveRecord={onSaveRecord} />;
      break;

    case 'test_mode':
      conteudo = <TestMode set={baralhoSelecionado} onNavigate={navegar} onCompleteSession={onCompleteSession} />;
      break;

    case 'study_notebook':
      conteudo = <StudyNotebook material={materialSelecionado} activeProfile={activeProfile} onBack={() => navegar('dashboard')} />;
      break;

    case 'sub_brain':
      conteudo = (
        <SubBrainView
          set={baralhoSelecionado}
          onNavigate={navegar}
          onSelectSet={selecionarBaralho}
          onSaveSet={onSaveSet}
          onOpenNotebook={(material) => { setMaterialSelecionado(material); navegar('study_notebook'); }}
          onOpenAula={(aula) => { setAulaAbertaId(aula.id); navegar('aula'); }}
          activeProfile={activeProfile}
          categories={categories}
          onEstudarTrilha={pedirParaEstudar}
        />
      );
      break;

    /*
      A AULA EM HTML de uma matéria. Voltar daqui leva de volta ao Sub-Cérebro
      da matéria (de onde a aula foi aberta), não ao painel — é o caminho que
      a pessoa espera fazer para abrir a aula seguinte.
    */
    case 'aula': {
      const aulaAberta = (baralhoSelecionado?.subItems || []).find((si) => si.id === aulaAbertaId);
      conteudo = aulaAberta ? (
        <AulaViewer
          key={aulaAberta.id}
          aula={aulaAberta}
          activeProfile={activeProfile}
          onBack={() => navegar('sub_brain')}
          aulasDaMateria={(baralhoSelecionado.subItems || []).filter((si) => si.type === 'aula')}
          onSalvarFicha={(ficha) => onSaveSet({
            ...baralhoSelecionado,
            subItems: (baralhoSelecionado.subItems || []).map((si) => (si.id === ficha.id ? ficha : si)),
          })}
        />
      ) : (
        <div className="empty-state"><p>Esta aula não existe mais.</p></div>
      );
      break;
    }

    default:
      conteudo = (
        <Dashboard
          sets={sets}
          stats={stats}
          onNavigate={navegar}
          onSelectSet={selecionarBaralho}
          onDeleteSet={onDeleteSet}
          categories={categories}
          onAddCategory={onAddCategory}
          activeProfile={activeProfile}
          isSyncing={isSyncing}
          initialCategoryFilter={grupoInicial || initialCategoryFilter}
          initialExpandedSetId={baralhoInicial}
          studyMaterials={studyMaterials}
          onSaveStudyMaterials={onSaveStudyMaterials}
          onOpenNotebook={(material) => { setMaterialSelecionado(material); navegar('study_notebook'); }}
          onEstudarTrilha={pedirParaEstudar}
        />
      );
  }

  return (
    <div className="modulo-flashcards">
      <Navbar
        onNavigate={navegar}
        currentPage={tela}
        onExportBackup={onExportBackup}
        onImportBackup={onImportBackup}
        isOnline={isOnline}
        statusDaNuvem={statusDaNuvem}
        onOpenSync={onOpenSync}
        activeProfile={activeProfile}
        onLogoutProfile={onLogoutProfile}
      />
      <main style={{ paddingBottom: '40px' }}>{conteudo}</main>

      {/* "Como você quer estudar?" — as portas para a mesma matéria */}
      {escolhaDeModo && (
        <EscolherModo
          deck={escolhaDeModo}
          raioX={calcularRaioX(escolhaDeModo)}
          onFechar={() => setEscolhaDeModo(null)}
          onEscolher={(modo) => { setSessao({ deck: escolhaDeModo, modo }); setEscolhaDeModo(null); }}
        />
      )}

      {/*
        A sessão em si, por cima de tudo.

        As QUESTÕES DE PROVA seguem por outra porta de propósito: elas não têm
        repetição espaçada nem nota de 0 a 3 (não é um cartão que volta em X
        dias — é uma questão que a banca já cobrou). Misturar as duas coisas
        dentro do mesmo motor só sujaria o agendamento dos seus cartões.
      */}
      {sessao && sessao.modo === 'questoes' && (
        <TreinoDeQuestoes deck={sessao.deck} onSair={fecharSessao} />
      )}

      {sessao && sessao.modo !== 'questoes' && (
        <EstudarTrilha
          deck={sessao.deck}
          modo={sessao.modo}
          onSair={fecharSessao}
          onNota={anotarNota}
          onFimDaSessao={guardarResumoDaSessao}
        />
      )}
    </div>
  );
}

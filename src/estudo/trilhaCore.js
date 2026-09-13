/*
  =============================================================================
  ARQUIVO: src/estudo/trilhaCore.js
  PARA QUE SERVE: É o MIOLO da TRILHA — só contas e regras, nenhuma tela.

  O QUE É A TRILHA (em uma frase): a matéria deixa de ser uma pilha solta de
  cartões e passa a ser uma SEQUÊNCIA de blocos, na ordem em que você estuda —
  uma seção, uma anotação, um print do slide, um flashcard, um link da videoaula,
  outro flashcard, uma pegadinha de prova. Do mesmo jeito que você escreveria no
  caderno. E quando você aperta ESTUDAR, a plataforma te leva por essa sequência
  inteira: o que é contexto você LÊ, o que é flashcard você TENTA LEMBRAR antes
  de ver a resposta.

  POR QUE ESTE ARQUIVO É SEPARADO: por não ter nada de React nem de tela, ele
  pode ser conferido sozinho com `npm run testar`, sem abrir o navegador. Se a
  conta da repetição espaçada quebrar, a gente descobre antes de você perder uma
  semana de revisão.

  AS TRÊS REGRAS QUE MANDAM AQUI:
    1. Quem guarda o TEXTO e o AGENDAMENTO de um flashcard é `deck.cards` — o
       mesmo lugar de sempre. Assim os modos antigos (Cartões 3D, Aprender,
       Combinar, Simulado, Treino do Dia, Sub-Cérebro) continuam funcionando sem
       encostar em uma linha de código.
    2. Quem guarda a ORDEM e o conteúdo que NÃO é flashcard é `deck.blocos`. Um
       bloco de flashcard é só um ponteiro (`cardId`) para o cartão de verdade.
    3. Cartão sem bloco NUNCA some: ao ler a trilha, todo cartão órfão (criado no
       Cérebro, na Caixa de Entrada ou num baralho antigo) ganha um bloco no fim
       da fila. É isso que faz baralho velho abrir já virado em trilha.
  =============================================================================
*/

/* ======================================================================
   1. OS TIPOS DE BLOCO
   ====================================================================== */
/*
  Cada tipo diz três coisas: como se chama, de que cor é, e — o mais
  importante — se ele é RECORDAÇÃO (você tenta lembrar) ou CONTEXTO (você lê).
  A tela toda e o modo de estudo leem esta tabela; não existe lista de tipos
  espalhada em outro lugar.
*/
export const TIPOS_DE_BLOCO = {
  flashcard: {
    rotulo: 'Flashcard',
    dica: 'Pergunta de um lado, resposta do outro. É o que entra na revisão.',
    cor: '#E8933F',
    recordacao: true,
  },
  nota: {
    rotulo: 'Anotação',
    dica: 'Resumo, raciocínio, o "porquê" da coisa.',
    cor: '#60A5FA',
    recordacao: false,
  },
  imagem: {
    rotulo: 'Imagem',
    dica: 'Print do slide, foto do quadro, esquema, gráfico.',
    cor: '#E879C8',
    recordacao: false,
  },
  link: {
    rotulo: 'Link',
    dica: 'Videoaula, artigo, PDF, exercício on-line.',
    cor: '#F59E0B',
    recordacao: false,
  },
  codigo: {
    rotulo: 'Código',
    dica: 'Trecho de código ou comando, com fonte monoespaçada.',
    cor: '#34D399',
    recordacao: false,
  },
  formula: {
    rotulo: 'Fórmula',
    dica: 'A fórmula em destaque, para bater o olho e reconhecer.',
    cor: '#A78BFA',
    recordacao: false,
  },
  atencao: {
    rotulo: 'Pegadinha',
    dica: 'O erro que você já cometeu. O que o professor adora cobrar.',
    cor: '#E5484D',
    recordacao: false,
  },
  duvida: {
    rotulo: 'Dúvida',
    dica: 'O que ficou mal resolvido — para perguntar ou pesquisar depois.',
    cor: '#EEA53D',
    recordacao: false,
  },
  secao: {
    rotulo: 'Seção',
    dica: 'Divide a matéria em partes. Vira o título no modo de estudo.',
    cor: '#99A1AC',
    recordacao: false,
  },
};

/* A ordem em que os botões "+ Bloco" aparecem na barra do compositor. */
export const ORDEM_DOS_BOTOES = [
  'flashcard', 'nota', 'imagem', 'link', 'formula', 'codigo', 'atencao', 'duvida', 'secao',
];

export const ehBlocoDeRecordacao = (tipo) => !!(TIPOS_DE_BLOCO[tipo] || {}).recordacao;

export const configDoBloco = (tipo) => TIPOS_DE_BLOCO[tipo] || TIPOS_DE_BLOCO.nota;

/* ======================================================================
   2. IDENTIFICADORES
   ====================================================================== */
export const novoId = (prefixo) =>
  `${prefixo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/* ======================================================================
   3. LER A TRILHA (migração automática de qualquer baralho antigo)
   ====================================================================== */
/*
  lerTrilha: recebe o baralho como ele está gravado e devolve a lista de blocos
  já HIDRATADA — ou seja, cada bloco de flashcard vem com o cartão de verdade
  dentro (`.card`), pronto para a tela desenhar sem procurar nada.

  As quatro garantias desta função (são elas que impedem perda de conteúdo):
    a) bloco apontando para um cartão que não existe mais é descartado;
    b) dois blocos apontando para o mesmo cartão viram um só;
    c) cartão sem bloco nenhum entra no fim da fila (nada some da tela);
    d) baralho sem `blocos` nenhum vira uma trilha só de flashcards, na mesma
       ordem em que os cartões já estavam.
*/
export function lerTrilha(deck) {
  const cards = Array.isArray(deck?.cards) ? deck.cards : [];
  const gravados = Array.isArray(deck?.blocos) ? deck.blocos : [];

  const cardPorId = new Map(cards.map((c) => [c.id, c]));
  const jaUsados = new Set();
  const blocos = [];

  gravados.forEach((bruto) => {
    if (!bruto || typeof bruto !== 'object') return;
    const tipo = TIPOS_DE_BLOCO[bruto.tipo] ? bruto.tipo : 'nota';

    if (tipo === 'flashcard') {
      const card = cardPorId.get(bruto.cardId);
      if (!card || jaUsados.has(bruto.cardId)) return; // (a) e (b)
      jaUsados.add(bruto.cardId);
      blocos.push({
        id: bruto.id || novoId('bl'),
        tipo: 'flashcard',
        cardId: card.id,
        card: { ...card },
      });
      return;
    }

    blocos.push({
      id: bruto.id || novoId('bl'),
      tipo,
      titulo: bruto.titulo || '',
      conteudo: bruto.conteudo || '',
      url: bruto.url || '',
      imagem: bruto.imagem || '',
      linguagem: bruto.linguagem || '',
      resolvido: !!bruto.resolvido,
    });
  });

  // (c) e (d): todo cartão que ficou de fora entra no fim, na ordem original.
  cards.forEach((card) => {
    if (jaUsados.has(card.id)) return;
    blocos.push({
      id: `bl-${card.id}`,
      tipo: 'flashcard',
      cardId: card.id,
      card: { ...card },
    });
  });

  return blocos;
}

/* ======================================================================
   4. GRAVAR A TRILHA (projeção de volta para o formato do baralho)
   ====================================================================== */
/*
  gravarTrilha: pega a lista de blocos que está na tela e devolve o BARALHO
  COMPLETO pronto para salvar.

  A TRAVA MAIS IMPORTANTE DO ARQUIVO está aqui: ao remontar cada cartão nós
  copiamos PRIMEIRO o cartão antigo inteiro (`...antes`) e só depois escrevemos
  por cima o texto que veio da tela. É isso que preserva `nextReviewDate`,
  `intervalDays`, `facilidade`, `reviewsCount` — todo o agendamento da repetição
  espaçada, que a tela do compositor nem conhece. Sem essa linha, editar uma
  vírgula num cartão zeraria semanas de revisão.

  A segunda trava: `...(deck || {})` copia o baralho inteiro antes de mexer em
  `cards`/`blocos`, para que `subItems`, `subConnections` e o resto continuem
  intactos (foi assim que o editor antigo evitou apagar as anotações do
  Sub-Cérebro, e a regra continua valendo).
*/
export function gravarTrilha(deck, blocos) {
  const anteriores = new Map((deck?.cards || []).map((c) => [c.id, c]));
  const cards = [];
  const enxutos = [];

  (blocos || []).forEach((bloco) => {
    if (!bloco) return;

    if (bloco.tipo === 'flashcard') {
      const antes = anteriores.get(bloco.cardId) || {};
      const editado = bloco.card || {};
      cards.push({
        ...antes,
        id: bloco.cardId,
        term: editado.term ?? antes.term ?? '',
        definition: editado.definition ?? antes.definition ?? '',
        image: editado.image ?? antes.image ?? '',
        parentId: editado.parentId ?? antes.parentId ?? null,
      });
      enxutos.push({ id: bloco.id, tipo: 'flashcard', cardId: bloco.cardId });
      return;
    }

    enxutos.push({
      id: bloco.id,
      tipo: bloco.tipo,
      titulo: bloco.titulo || '',
      conteudo: bloco.conteudo || '',
      url: bloco.url || '',
      imagem: bloco.imagem || '',
      linguagem: bloco.linguagem || '',
      resolvido: !!bloco.resolvido,
    });
  });

  return { ...(deck || {}), cards, blocos: enxutos };
}

/*
  blocoNovo: cria um bloco vazio do tipo pedido, já com o cartão dentro quando
  for flashcard. Um lugar só decide o formato de um bloco recém-nascido.
*/
export function blocoNovo(tipo, extras = {}) {
  if (tipo === 'flashcard') {
    const cardId = extras.cardId || novoId('card');
    return {
      id: novoId('bl'),
      tipo: 'flashcard',
      cardId,
      card: {
        id: cardId,
        term: extras.term || '',
        definition: extras.definition || '',
        image: extras.image || '',
        parentId: null,
      },
    };
  }
  return {
    id: novoId('bl'),
    tipo,
    titulo: extras.titulo || '',
    conteudo: extras.conteudo || '',
    url: extras.url || '',
    imagem: extras.imagem || '',
    linguagem: extras.linguagem || (tipo === 'codigo' ? 'texto' : ''),
    resolvido: false,
  };
}

/*
  blocoEstaVazio: um bloco só é "vazio de verdade" quando não tem NADA — nem
  título, nem conteúdo, nem imagem, nem url. Serve para o compositor não gravar
  linha em branco e para o modo de estudo pular o que não tem o que mostrar.
*/
export function blocoEstaVazio(bloco) {
  if (!bloco) return true;
  if (bloco.tipo === 'flashcard') {
    const c = bloco.card || {};
    return !(c.term || '').trim() && !(c.definition || '').trim() && !c.image;
  }
  return !(bloco.titulo || '').trim()
    && !(bloco.conteudo || '').trim()
    && !(bloco.url || '').trim()
    && !bloco.imagem;
}

/* ======================================================================
   5. A REPETIÇÃO ESPAÇADA DE VERDADE (SM-2)
   ====================================================================== */
/*
  POR QUE TROCAMOS O ALGORITMO: o app usava uma escadinha fixa
  (1 → 3 → 7 → 14 → 30 dias) igual para todo cartão. O problema é que ela trata
  "a fórmula de Bhaskara", que você sabe de olhos fechados, igual ao teorema que
  você erra sempre. Resultado: você gasta tempo revisando o que já sabe e vê
  pouco o que precisa.

  O SM-2 conserta isso com UMA ideia: cada cartão carrega uma FACILIDADE própria
  (começa em 2.5). Acertou fácil, a facilidade sobe e o intervalo estica; errou,
  a facilidade cai e o cartão volta pra fila HOJE. Com o tempo, o cartão fácil
  vai para 3 meses e o difícil fica batendo na sua porta toda semana. É o mesmo
  motor do Anki, que é o que estudante de medicina usa para decorar 10 mil
  cartões — não é achismo, é o algoritmo com mais quilometragem que existe.

  AS QUATRO NOTAS (é você quem julga, ninguém corrige por você):
      0 ERREI    — não lembrei. Volta ainda hoje.
      1 DIFÍCIL  — lembrei suando. Volta bem antes do previsto.
      2 BOM      — lembrei. O intervalo normal.
      3 FÁCIL    — nem precisava perguntar. Some por muito tempo.
*/
export const NOTAS = {
  ERREI: 0,
  DIFICIL: 1,
  BOM: 2,
  FACIL: 3,
};

export const ROTULO_DAS_NOTAS = {
  0: 'Errei',
  1: 'Difícil',
  2: 'Bom',
  3: 'Fácil',
};

const FACILIDADE_INICIAL = 2.5;
const FACILIDADE_MINIMA = 1.3;
const TETO_DE_DIAS = 365;
const MINUTO = 60 * 1000;
const DIA = 24 * 60 * MINUTO;

/*
  proximoAgendamento: o coração da coisa. Recebe o cartão como está hoje e a
  nota que você deu, e devolve SÓ os campos de agendamento atualizados (quem
  junta com o cartão é quem chamou). Função pura: mesma entrada, mesma saída —
  por isso dá para testar sem navegador.
*/
export function proximoAgendamento(card = {}, nota = NOTAS.BOM, agora = new Date()) {
  const base = agora instanceof Date ? agora : new Date(agora);

  // Estado atual do cartão (com valores de partida para cartão que nunca foi visto)
  let facilidade = Number(card.facilidade) > 0 ? Number(card.facilidade) : FACILIDADE_INICIAL;
  let repeticoes = Number(card.repeticoes) >= 0 ? Number(card.repeticoes) : 0;
  let intervalo = Number(card.intervalDays) > 0 ? Number(card.intervalDays) : 0;
  let lapsos = Number(card.lapsos) >= 0 ? Number(card.lapsos) : 0;

  // Converte a nossa nota (0..3) para a escala do SM-2 (0..5)
  const q = [2, 3, 4, 5][Math.max(0, Math.min(3, Number(nota) || 0))];

  // A facilidade se move pela fórmula original do SM-2
  facilidade = facilidade + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (facilidade < FACILIDADE_MINIMA) facilidade = FACILIDADE_MINIMA;

  let proximaEmMs;

  if (q < 3) {
    // ERREI: o cartão perde a escada inteira e volta AINDA HOJE (10 minutos).
    // Voltar no mesmo dia é o que faz a sessão consertar o erro em vez de
    // apenas registrá-lo.
    repeticoes = 0;
    intervalo = 0;
    lapsos += 1;
    proximaEmMs = base.getTime() + 10 * MINUTO;
  } else {
    repeticoes += 1;

    /*
      OS DOIS PRIMEIROS DEGRAUS são fixos (é o "aprendizado" do cartão novo), e
      as três notas boas dão resultados DIFERENTES desde a primeira vez.

      Por que isso importa: no SM-2 puro, a primeira resposta certa vale 1 dia
      seja ela "difícil", "boa" ou "fácil". Na tela, os três botões diziam a
      mesma coisa — "volta amanhã" — e escolher entre eles virava perda de
      tempo. Se a nota não muda nada, você para de dar nota com atenção, e sem
      nota honesta o algoritmo inteiro deixa de funcionar.
    */
    if (repeticoes === 1) {
      intervalo = q === 5 ? 4 : (q === 3 ? 1 : 2);
    } else if (repeticoes === 2) {
      intervalo = q === 5 ? 9 : (q === 3 ? 3 : 6);
    } else if (q === 3) {
      // DIFÍCIL: cresce pouco (1.2x), independente da facilidade. É o ajuste do
      // Anki em cima do SM-2 puro, e evita que um cartão sofrido dispare para
      // três semanas só porque você conseguiu lembrar dele uma vez.
      intervalo = Math.max(1, Math.round(intervalo * 1.2));
    } else {
      intervalo = Math.max(1, Math.round(intervalo * facilidade));
      if (q === 5) intervalo = Math.round(intervalo * 1.3); // FÁCIL ganha um empurrão
    }

    if (intervalo > TETO_DE_DIAS) intervalo = TETO_DE_DIAS;
    proximaEmMs = base.getTime() + intervalo * DIA;
  }

  const acertou = q >= 3;

  return {
    facilidade: Math.round(facilidade * 1000) / 1000,
    repeticoes,
    lapsos,
    intervalDays: intervalo,
    nextReviewDate: new Date(proximaEmMs).toISOString(),
    lastStudied: base.toISOString(),
    ultimaNota: Number(nota) || 0,
    reviewsCount: (Number(card.reviewsCount) || 0) + 1,
    successCount: (Number(card.successCount) || 0) + (acertou ? 1 : 0),
  };
}

/*
  aplicarNota: junta o cartão com o agendamento novo. Açúcar, mas evita que cada
  tela repita o spread e esqueça um campo.
*/
export function aplicarNota(card, nota, agora = new Date()) {
  return { ...card, ...proximoAgendamento(card, nota, agora) };
}

/*
  estaVencido: cartão nunca estudado conta como vencido (é a primeira vez que
  você vai vê-lo — tem que aparecer).
*/
export function estaVencido(card, agora = new Date()) {
  if (!card) return false;
  const base = (agora instanceof Date ? agora : new Date(agora)).getTime();
  if (!card.nextReviewDate) return true;
  const quando = new Date(card.nextReviewDate).getTime();
  return !Number.isFinite(quando) || quando <= base;
}

/*
  previsaoEmTexto: transforma "daqui a 0.0007 anos" em "hoje". É o que aparece
  no botão de nota ANTES de você clicar, para você saber o que está escolhendo.
*/
export function previsaoEmTexto(card, nota, agora = new Date()) {
  const { intervalDays } = proximoAgendamento(card || {}, nota, agora);
  if (!intervalDays) return 'hoje';
  if (intervalDays === 1) return 'amanhã';
  if (intervalDays < 30) return `${intervalDays} dias`;
  if (intervalDays < 365) {
    const meses = Math.round(intervalDays / 30);
    return meses <= 1 ? '1 mês' : `${meses} meses`;
  }
  return '1 ano';
}

/* ======================================================================
   6. O DIAGNÓSTICO DO BARALHO
   ====================================================================== */
/*
  raioX: em uma passada, tudo que a tela precisa saber sobre um baralho —
  quantos blocos, quantos flashcards, quantos venceram hoje, quantos você ainda
  nem viu, e o quanto da matéria já está "firme" (intervalo de 21 dias ou mais,
  que é o limiar clássico de memória de longo prazo).
*/
export function raioX(deck, agora = new Date()) {
  const blocos = lerTrilha(deck);
  const cards = blocos.filter((b) => b.tipo === 'flashcard').map((b) => b.card);

  let vencidos = 0;
  let novos = 0;
  let firmes = 0;

  cards.forEach((card) => {
    if (!card.nextReviewDate) novos += 1;
    else if (estaVencido(card, agora)) vencidos += 1;
    if ((Number(card.intervalDays) || 0) >= 21) firmes += 1;
  });

  const contexto = blocos.filter((b) => b.tipo !== 'flashcard').length;

  return {
    totalBlocos: blocos.length,
    totalCartoes: cards.length,
    contexto,
    vencidos,
    novos,
    firmes,
    aRevisar: vencidos + novos,
    dominio: cards.length ? Math.round((firmes / cards.length) * 100) : 0,
  };
}

/* ======================================================================
   7. O ROTEIRO DA SESSÃO DE ESTUDO
   ====================================================================== */
/*
  montarRoteiro: decide, para uma sessão, QUAIS blocos entram e em que ordem.

  MODO 'trilha' (Estudar a matéria):
    tudo, na ordem em que você escreveu. Você lê o contexto e responde os
    flashcards no meio dele. É a leitura ativa da matéria inteira.

  MODO 'revisao' (Revisar o que venceu):
    só os flashcards vencidos ou nunca vistos. Mas — e é aqui que a plataforma
    ajuda de verdade — cada flashcard vem ACOMPANHADO da seção onde ele mora
    (`secao`), para você nunca responder uma pergunta fora de contexto. E vem
    também o bloco de contexto imediatamente anterior a ele quando é uma
    PEGADINHA ou uma FÓRMULA, porque esses dois são exatamente o material que
    você precisa reler no momento do erro.

  MODO 'sos' (Só o que eu erro):
    os cartões com mais lapsos primeiro. É o modo da véspera de prova.
*/
export function montarRoteiro(deck, { modo = 'trilha', agora = new Date(), limite = 0 } = {}) {
  const blocos = lerTrilha(deck).filter((b) => !blocoEstaVazio(b));

  // De qual seção cada bloco faz parte (a última seção declarada acima dele)
  const secaoDe = new Map();
  let secaoAtual = null;
  blocos.forEach((b) => {
    if (b.tipo === 'secao') secaoAtual = (b.titulo || '').trim() || null;
    secaoDe.set(b.id, secaoAtual);
  });

  if (modo === 'trilha') {
    const passos = blocos
      .filter((b) => b.tipo !== 'secao')
      .map((b) => ({ bloco: b, secao: secaoDe.get(b.id) || null }));
    return limite > 0 ? passos.slice(0, limite) : passos;
  }

  const flashcards = blocos.filter((b) => b.tipo === 'flashcard');

  let escolhidos;
  if (modo === 'sos') {
    escolhidos = flashcards
      .filter((b) => (Number(b.card.lapsos) || 0) > 0 || (Number(b.card.reviewsCount) || 0) === 0)
      .sort((a, b) => (Number(b.card.lapsos) || 0) - (Number(a.card.lapsos) || 0));
    if (!escolhidos.length) escolhidos = flashcards;
  } else {
    // 'revisao': vencidos primeiro (o mais atrasado na frente), depois os novos
    const vencidos = flashcards
      .filter((b) => b.card.nextReviewDate && estaVencido(b.card, agora))
      .sort((a, b) => new Date(a.card.nextReviewDate) - new Date(b.card.nextReviewDate));
    const novos = flashcards.filter((b) => !b.card.nextReviewDate);
    escolhidos = [...vencidos, ...novos];
  }

  const passos = escolhidos.map((b) => ({ bloco: b, secao: secaoDe.get(b.id) || null }));
  return limite > 0 ? passos.slice(0, limite) : passos;
}

/* ======================================================================
   8. O Ctrl+V INTELIGENTE
   ====================================================================== */
/*
  classificarColagem: olha o texto que você colou e adivinha o que ele é, para
  o bloco já nascer do tipo certo. Mesma ideia do caderno das Aulas, ajustada
  para material de estudo (aqui aparece muito mais link de videoaula e fórmula
  do que comando de terminal).
*/
export function classificarColagem(texto) {
  const t = (texto || '').trim();
  if (!t) return 'nota';

  // 1. Link puro (uma linha só, começando com http)
  if (/^https?:\/\/\S+$/i.test(t)) return 'link';

  // 2. Código / comando
  const marcasDeCodigo = /^(sudo|npm|npx|node|git|cd|ls|mkdir|apt|docker|python|pip|ssh|curl|wget|SELECT|INSERT|UPDATE|DELETE|function|const|let|var|class|def|import|public|private|#include|<\?php|\$)/i;
  if (marcasDeCodigo.test(t)) return 'codigo';
  if (t.includes('\n') && /[{};]\s*$/m.test(t)) return 'codigo';

  // 3. Fórmula: curta, cheia de símbolo matemático e pouca palavra
  const temSinal = /[=∫∑√±≈≤≥·×÷^]/.test(t);
  const poucasPalavras = t.split(/\s+/).length <= 14;
  if (temSinal && poucasPalavras && !t.includes('\n')) return 'formula';

  // 4. O resto é anotação
  return 'nota';
}

/*
  tituloAutomatico: dá um nome decente a um bloco que veio de colagem, para a
  trilha não ficar cheia de "sem título". Pega a primeira linha, corta em 60.
*/
export function tituloAutomatico(texto, limite = 60) {
  const primeira = (texto || '').trim().split('\n')[0].trim();
  if (!primeira) return '';
  return primeira.length <= limite ? primeira : `${primeira.slice(0, limite - 1)}…`;
}

/* ======================================================================
   9. IMAGENS
   ====================================================================== */
/*
  comprimirImagem: um print de 2MB vira ~60KB. Isso não é frescura de
  performance: os baralhos moram no LocalStorage (teto de ~5MB para o site
  INTEIRO) e cada baralho vira um documento no Firestore (teto de 1MB). Sem
  compressão, três prints colados travariam o salvamento de TODOS os baralhos.

  A largura de 1000px foi escolhida para print de slide continuar LEGÍVEL — o
  limite antigo de 600px embaralhava texto pequeno de fórmula.
*/
export function comprimirImagem(base64, { larguraMax = 1000, alturaMax = 750, qualidade = 0.62 } = {}) {
  return new Promise((resolve) => {
    if (typeof document === 'undefined' || !base64) { resolve(base64 || ''); return; }
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      const escala = Math.min(1, larguraMax / width, alturaMax / height);
      width = Math.max(1, Math.round(width * escala));
      height = Math.max(1, Math.round(height * escala));

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', qualidade));
    };
    img.onerror = () => resolve('');
    img.src = base64;
  });
}

/*
  lerArquivoComoBase64: promessa em cima do FileReader, para o Ctrl+V e o botão
  de upload usarem o mesmo caminho.
*/
export function lerArquivoComoBase64(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onload = () => resolve(leitor.result);
    leitor.onerror = () => reject(new Error('Não consegui ler a imagem.'));
    leitor.readAsDataURL(arquivo);
  });
}

/* ======================================================================
   10. TAMANHO — a guarda contra perder tudo por estouro de cota
   ====================================================================== */
/*
  pesoDoBaralho: quantos bytes este baralho ocupa gravado. O compositor usa isso
  para AVISAR você antes de o LocalStorage estourar, em vez de simplesmente
  falhar em silêncio (que foi como o app antigo se comportava: o `catch` gravava
  no console e devolvia `false`, e ninguém no mundo via essa mensagem).
*/
export function pesoDoBaralho(deck) {
  try {
    return new Blob([JSON.stringify(deck)]).size;
  } catch {
    try { return JSON.stringify(deck).length; } catch { return 0; }
  }
}

export const LIMITE_SEGURO_DO_BARALHO = 780 * 1024; // Firestore corta em 1MB; sobra folga

export function pesoEmTexto(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

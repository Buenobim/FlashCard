/*
  =============================================================================
  ARQUIVO: src/utils/sincroniaCore.js
  PARA QUE SERVE: guarda as CONTAS da sincronização e da conferência de arquivos
  de backup. Não conhece tela, não conhece Firebase, não conhece navegador — por
  isso pode ser conferido no terminal com `npm run testar`.

  POR QUE ISSO IMPORTA: são estas contas que decidem se um baralho seu continua
  existindo depois de sincronizar dois aparelhos, e se um arquivo importado vai
  somar ou destruir o seu acervo. Erro aqui é perda de matéria, não é botão
  torto. Regra da casa: NÃO mexer nestas funções sem rodar `npm run testar`.
  =============================================================================
*/

// Identificação do arquivo de backup e limites de sanidade (um arquivo fora
// disso é arquivo estranho, não backup deste app).
export const BACKUP_APP_ID = 'AplicativoFlashcards';
const LIMITE_BARALHOS = 1000;
const LIMITE_CARTOES = 5000;

/*
  FUNÇÃO: juntarBaralhosLocalENuvem
  PARA QUE SERVE: esta é a REGRA DE OURO da sincronização, e ela mora aqui sozinha,
  sem tela e sem internet, para poder ser conferida com `npm run testar`.

  COMO ELA DECIDE:
    - baralho que só existe no aparelho -> FICA (e sobe para a nuvem).
      Estar faltando na nuvem NÃO quer dizer que foi apagado.
    - baralho que só existe na nuvem     -> ENTRA no aparelho.
    - baralho nos dois lados             -> vence quem foi editado por ÚLTIMO.
      Empate de horário? Vence quem tem MAIS conteúdo (nunca perder cartão).
    - baralho com lápide (apagado de propósito) -> sai dos dois lados.
*/
export function juntarBaralhosLocalENuvem({ locais = [], nuvem = [], pendentes = [], excluidos = [] } = {}) {
  const apagados = new Set(excluidos);
  const naFila = new Set(pendentes);
  const vivos = (lista) => (lista || []).filter(d => d && d.id && !apagados.has(d.id));
  const mapaLocal = new Map(vivos(locais).map(d => [d.id, d]));
  const mapaNuvem = new Map(vivos(nuvem).map(d => [d.id, d]));

  const quando = (deck) => Date.parse(deck.updatedAt || deck.createdAt || '') || 0;
  const quantos = (deck) => (deck.cards || []).length + (deck.blocos || []).length;

  const escolhidos = new Map();
  const paraSubir = [];

  for (const [id, local] of mapaLocal) {
    const daNuvem = mapaNuvem.get(id);
    if (!daNuvem) {
      // Só existe aqui: pode ser novo, pode ser que a nuvem ainda não tenha
      // recebido. Nos dois casos, o certo é MANTER e subir.
      escolhidos.set(id, local);
      paraSubir.push(local);
      continue;
    }
    const tLocal = quando(local);
    const tNuvem = quando(daNuvem);
    if (tLocal > tNuvem || (tLocal === tNuvem && naFila.has(id))) {
      escolhidos.set(id, local);
      paraSubir.push(local);
    } else if (tNuvem > tLocal) {
      escolhidos.set(id, daNuvem);
    } else {
      const vencedor = quantos(local) >= quantos(daNuvem) ? local : daNuvem;
      escolhidos.set(id, vencedor);
      if (vencedor === local && quantos(local) > quantos(daNuvem)) paraSubir.push(local);
    }
  }

  for (const [id, daNuvem] of mapaNuvem) {
    if (!escolhidos.has(id)) escolhidos.set(id, daNuvem);
  }

  return { lista: Array.from(escolhidos.values()), paraSubir };
}

/*
  FUNÇÃO: validarConteudoDeBackup
  PARA QUE SERVE: confere o arquivo INTEIRO antes de encostar nos seus dados.
  Antes só se olhava o nome do app e se `sets` era uma lista — um baralho sem a
  lista de cartões passava direto e quebrava a contagem do painel.

  Ela é uma função pura (sem tela, sem nuvem) para poder ser conferida com
  `npm run testar`.
*/
export function validarConteudoDeBackup(data) {
  if (!data || typeof data !== 'object') {
    return { valido: false, erro: 'O arquivo não parece um backup (conteúdo vazio ou ilegível).' };
  }
  if (data.app !== BACKUP_APP_ID) {
    return { valido: false, erro: 'Este arquivo não é um backup do Aplicativo de Flashcards.' };
  }
  if (!Array.isArray(data.sets)) {
    return { valido: false, erro: 'O arquivo não tem a lista de baralhos (campo "sets").' };
  }
  if (data.sets.length > LIMITE_BARALHOS) {
    return { valido: false, erro: `O arquivo traz ${data.sets.length} baralhos — acima do limite de ${LIMITE_BARALHOS}.` };
  }

  const sets = [];
  const vistos = new Set();
  const problemas = [];

  data.sets.forEach((deck, i) => {
    const posicao = `baralho ${i + 1}`;
    if (!deck || typeof deck !== 'object') { problemas.push(`${posicao}: não é um baralho.`); return; }
    if (typeof deck.id !== 'string' || !deck.id.trim()) { problemas.push(`${posicao}: está sem identificação (id).`); return; }
    if (typeof deck.title !== 'string' || !deck.title.trim()) { problemas.push(`${posicao}: está sem título.`); return; }
    if (!Array.isArray(deck.cards)) { problemas.push(`"${deck.title}": está sem a lista de cartões.`); return; }
    if (deck.cards.length > LIMITE_CARTOES) { problemas.push(`"${deck.title}": tem cartões demais (${deck.cards.length}).`); return; }
    if (vistos.has(deck.id)) { problemas.push(`"${deck.title}": id repetido dentro do próprio arquivo.`); return; }

    const cartoes = [];
    const idsDeCartao = new Set();
    let cartaoRuim = false;
    deck.cards.forEach((card, j) => {
      if (!card || typeof card !== 'object' || typeof card.term !== 'string') { cartaoRuim = true; return; }
      const id = (typeof card.id === 'string' && card.id.trim()) ? card.id : `c-${i}-${j}`;
      if (idsDeCartao.has(id)) { cartaoRuim = true; return; }
      idsDeCartao.add(id);
      cartoes.push({ ...card, id, term: card.term, definition: typeof card.definition === 'string' ? card.definition : '' });
    });
    if (cartaoRuim) problemas.push(`"${deck.title}": alguns cartões vieram quebrados e foram descartados.`);

    vistos.add(deck.id);
    sets.push({
      ...deck,
      cards: cartoes,
      blocos: Array.isArray(deck.blocos) ? deck.blocos : [],
      subItems: Array.isArray(deck.subItems) ? deck.subItems : [],
      subConnections: Array.isArray(deck.subConnections) ? deck.subConnections : [],
      category: typeof deck.category === 'string' && deck.category ? deck.category : 'Sem Grupo',
      description: typeof deck.description === 'string' ? deck.description : '',
    });
  });

  if (sets.length === 0) {
    return { valido: false, erro: `Nenhum baralho aproveitável no arquivo. ${problemas[0] || ''}`.trim() };
  }
  return { valido: true, erro: '', sets, problemas, stats: data.stats || null };
}

/*
  FUNÇÃO: compararComOAcervo
  PARA QUE SERVE: monta a PRÉVIA — quantos baralhos são novos, quantos são
  exatamente iguais aos que você já tem (e serão ignorados) e quantos têm o mesmo
  id mas conteúdo diferente (e entrarão como cópia, sem apagar o seu).
  Função pura: entra lista, sai contagem.
*/
export function compararComOAcervo(setsDoArquivo, setsAtuais) {
  const atuais = new Map((setsAtuais || []).map(d => [d.id, d]));
  const resumo = { baralhos: 0, cartoes: 0, novos: 0, iguais: 0, conflitos: 0, titulos: [] };

  (setsDoArquivo || []).forEach(deck => {
    resumo.baralhos++;
    resumo.cartoes += (deck.cards || []).length;
    resumo.titulos.push(deck.title);
    const existente = atuais.get(deck.id);
    if (!existente) resumo.novos++;
    else if (assinaturaDeConteudo(existente) === assinaturaDeConteudo(deck)) resumo.iguais++;
    else resumo.conflitos++;
  });

  return resumo;
}

// Resumo do conteúdo que ignora datas: é o que diz se dois baralhos são "o mesmo".
export function assinaturaDeConteudo(deck) {
  return JSON.stringify({
    title: deck.title,
    description: deck.description || '',
    category: deck.category || 'Sem Grupo',
    cards: (deck.cards || []).map(c => [c.id, c.term, c.definition, c.image || '']),
    blocos: deck.blocos || [],
  });
}

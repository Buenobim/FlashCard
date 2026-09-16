/*
  =============================================================================
  ARQUIVO: src/estudo/questoes/index.js
  PARA QUE SERVE: é o BANCO DE QUESTÕES RESOLVIDAS — as provas de verdade da
  faculdade, cada questão com a resolução passo a passo, a pegadinha e o
  "como pensar" quando esse tipo cai de novo.

  POR QUE ISSO É UM ARQUIVO DE DADOS E NÃO UMA TELA DE CADASTRO:
  questão de prova você não digita, você RECEBE (print, PDF, foto do quadro).
  Digitar enunciado, cinco alternativas e a resolução dentro do app seria um
  trabalho que ninguém faz duas vezes. Então cada prova é um arquivo .json
  aqui dentro; para acrescentar uma prova nova basta jogar outro .json nesta
  pasta — nada mais precisa ser mexido no código.

  COMO UMA PROVA ENCONTRA A MATÉRIA: pelo campo `casaCom` do arquivo, comparado
  com o NOME do baralho. Sem acento, sem maiúscula, sem pontuação — assim
  "Química Geral e experimental" continua achando o arquivo mesmo que um dia
  você renomeie a matéria para "Quimica Geral".

  O FORMATO DE UMA QUESTÃO (todos os campos são opcionais, menos o enunciado,
  as alternativas e o índice da correta):

    numero        1
    assunto       "Concentração em mol/L → massa a pesar"
    enunciado     o texto da questão (use \n para quebrar linha)
    dados         ["MM Na: 23 g/mol", ...]   — a tabelinha de apoio
    imagem        um data:image, quando a questão tem gráfico/figura
    alternativas  ["0,4 g", "0,8 g", ...]
    correta       0  (o ÍNDICE da alternativa certa, começando em zero)
    gatilho       "vi isso → penso assim" — o reflexo a treinar
    formula       a fórmula que resolve
    passos        [{ titulo, texto }, ...] — a resolução destrinchada
    resposta      o gabarito por extenso
    pegadinha     o erro que derruba a maioria
    leveConsigo   a mini-regra para levar para a prova
  =============================================================================
*/

/*
  Carrega TODOS os .json desta pasta de uma vez, no build. `eager: true` porque
  o banco é pequeno (texto puro) e porque assim a contagem de questões fica
  disponível na hora — sem `await` — para o painel e para o menu de estudo.
*/
const arquivos = import.meta.glob('./*.json', { eager: true });

/* Tira acento, caixa e pontuação: "Química Geral e experimental" → "quimica geral e experimental". */
export function achatar(texto) {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/* Todas as matérias que têm prova cadastrada. */
export const BANCO = Object.entries(arquivos).map(([caminho, mod]) => {
  const dado = mod?.default || mod;
  return {
    arquivo: caminho.replace('./', ''),
    materia: dado.materia || caminho,
    casaCom: (dado.casaCom || [dado.materia || '']).map(achatar).filter(Boolean),
    provas: dado.provas || [],
  };
});

/*
  materiaDoBaralho: acha a matéria do banco que corresponde a este baralho.
  Casa por igualdade OU por "um contém o outro" — é o que faz "Química Geral e
  experimental — Prova 2" continuar encontrando o arquivo de Química Geral.
*/
export function materiaDoBaralho(deck) {
  const nome = achatar(deck?.title);
  if (!nome) return null;
  return (
    BANCO.find((m) => m.casaCom.some((chave) => chave === nome)) ||
    BANCO.find((m) => m.casaCom.some((chave) => nome.includes(chave) || chave.includes(nome))) ||
    null
  );
}

/* As provas desta matéria (lista vazia quando o baralho não tem prova). */
export function provasDoBaralho(deck) {
  return materiaDoBaralho(deck)?.provas || [];
}

/* Todas as questões da matéria, já numa fila só — é o que a sessão de treino usa. */
export function questoesDoBaralho(deck) {
  return provasDoBaralho(deck).flatMap((prova) =>
    (prova.questoes || []).map((q) => ({ ...q, prova: prova.titulo, provaId: prova.id })),
  );
}

/* Quantas questões existem para este baralho — para o selo do menu de estudo. */
export function contarQuestoes(deck) {
  return questoesDoBaralho(deck).length;
}

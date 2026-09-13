/*
  =============================================================================
  ARQUIVO: src/vault/core/deckNotes.js
  PARA QUE SERVE: Liga cada BARALHO à sua ANOTAÇÃO de texto.

  A IDEIA QUE FAZ ISSO SER LÓGICO: a aba "Anotações" dentro do baralho NÃO é um
  lugar separado. Ela é uma nota do Cofre, igual a qualquer outra. Ou seja:

    - Você escreve dentro do baralho, onde o assunto está fresco.
    - A mesma nota aparece na barra lateral, na pasta do grupo (ex: Faculdade/).
    - Ela entra na busca, nos backlinks e no grafo, ligada à matéria.
    - Dá para citá-la de outra nota com [[...]].

  Um texto, um lugar só. Nada de escrever no baralho e ter que copiar para o Cofre.

  COMO A LIGAÇÃO SOBREVIVE: a nota guarda o id do baralho no frontmatter
  (`baralho: set-123`). Isso é mais forte do que casar pelo nome — você pode
  renomear a nota, mover de pasta, renomear o baralho, e a ligação continua de pé.
  =============================================================================
*/

import { metadataCache } from './metadataCache.js';

/*
  FUNÇÃO: notaDoBaralho
  PARA QUE SERVE: Descobre qual nota pertence a um baralho, lendo o frontmatter.
  Devolve o caminho da nota, ou null se ela ainda não foi criada.
*/
export function notaDoBaralho(deckId) {
  if (!deckId) return null;
  for (const arquivo of metadataCache.getAllFiles()) {
    const meta = metadataCache.getMetadata(arquivo.path);
    if (meta?.frontmatter?.baralho === deckId) return arquivo.path;
  }
  return null;
}

/*
  FUNÇÃO: caminhoSugerido
  PARA QUE SERVE: Onde a nota de um baralho nasce. Dentro da pasta do grupo de
  estudo, com o nome da matéria — é onde a pessoa procuraria por instinto.
    Baralho "Cálculo I" do grupo "Faculdade"  ->  Faculdade/Cálculo I.md
*/
export function caminhoSugerido(baralho) {
  const grupo = (baralho?.category || '').trim();
  const titulo = (baralho?.title || 'Sem título').trim().replace(/[/\\|]/g, '-');
  return grupo ? `${grupo}/${titulo}.md` : `${titulo}.md`;
}

/*
  FUNÇÃO: conteudoInicial
  PARA QUE SERVE: O texto com que a nota nasce. O frontmatter carrega o vínculo
  com o baralho; o resto é só um começo amigável, não um formulário.
*/
export function conteudoInicial(baralho) {
  const grupo = (baralho?.category || '').trim();
  return [
    '---',
    `baralho: ${baralho.id}`,
    grupo ? `grupo: ${grupo}` : null,
    '---',
    '',
    `# ${baralho.title || 'Anotações'}`,
    '',
    '',
  ].filter(l => l !== null).join('\n');
}

/*
  FUNÇÃO: garantirNotaDoBaralho
  PARA QUE SERVE: Devolve o caminho da nota do baralho, criando-a se for a
  primeira vez. Recebe o `vault` por parâmetro em vez de importá-lo para manter
  este arquivo puro e fácil de testar.
*/
export async function garantirNotaDoBaralho(vault, baralho) {
  const existente = notaDoBaralho(baralho.id);
  if (existente) return existente;
  return vault.create(caminhoSugerido(baralho), conteudoInicial(baralho));
}

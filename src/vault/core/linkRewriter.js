/*
  =============================================================================
  ARQUIVO: src/vault/core/linkRewriter.js
  PARA QUE SERVE: Quando você renomeia uma nota, TODAS as outras notas que a
  citavam precisam ser corrigidas — senão o cofre enche de links quebrados e o
  conhecimento se desconecta. Este arquivo faz essa reescrita.

  É a operação mais arriscada do sistema inteiro: ela edita o texto de arquivos
  que você não está olhando. Por isso mora sozinha aqui, é uma função PURA (entra
  texto, sai texto, não toca em disco nem em nuvem) e tem teste próprio.

  O QUE ELA PRECISA PRESERVAR:
    [[Antigo]]                -> [[Novo]]
    [[Antigo|meu apelido]]    -> [[Novo|meu apelido]]     (apelido intacto)
    [[Antigo#Seção]]          -> [[Novo#Seção]]           (seção intacta)
    ![[Antigo]]               -> ![[Novo]]                (embed continua embed)
    [[Outra Nota]]            -> [[Outra Nota]]           (não mexe no que não é)
  =============================================================================
*/

const COMBINING_MARKS = new RegExp('[\u0300-\u036f]', 'g');

// Mesma normalização usada para resolver links: sem acento, sem caixa, sem .md
const norm = (s) => String(s)
  .replace(/\.md$/i, '')
  .normalize('NFD')
  .replace(COMBINING_MARKS, '')
  .trim()
  .toLowerCase();

export function rewriteWikilinks(text, oldName, newName) {
  const wanted = norm(oldName);
  if (!wanted) return text;

  return String(text).replace(/(!?)\[\[([^[\]]+?)\]\]/g, (full, bang, inner) => {
    let rest = inner;
    let alias = '';
    let sub = '';

    // Separa o apelido (|) e a seção (#) para devolvê-los sem alteração
    const pipe = rest.indexOf('|');
    if (pipe !== -1) { alias = rest.slice(pipe); rest = rest.slice(0, pipe); }

    const hash = rest.indexOf('#');
    if (hash !== -1) { sub = rest.slice(hash); rest = rest.slice(0, hash); }

    // Não é a nota renomeada? Devolve exatamente como estava.
    if (norm(rest) !== wanted) return full;

    return `${bang}[[${newName}${sub}${alias}]]`;
  });
}

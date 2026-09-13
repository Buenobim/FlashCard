/*
  =============================================================================
  ARQUIVO: src/estudo/questoesCore.js
  PARA QUE SERVE: monta as ALTERNATIVAS das questões (múltipla escolha e
  verdadeiro/falso) sem cair nas armadilhas que existiam antes. Fica aqui,
  separado das telas, para poder ser conferido com `npm run testar`.

  OS DOIS BURACOS QUE ISSO FECHA:

  1) ALTERNATIVAS REPETIDAS. As opções erradas eram sorteadas só por "ter id
     diferente". Se dois cartões do baralho tivessem a MESMA definição (coisa
     comum: "Pa", "N/m²" e "pascal" escritos em cartões diferentes), a prova
     mostrava duas alternativas idênticas — uma valendo ponto e a outra não.
     Agora nenhuma alternativa pode repetir o texto da resposta certa nem o de
     outra alternativa.

  2) "FALSO" QUE ERA VERDADEIRO. No verdadeiro/falso, o app pegava a definição
     de OUTRO cartão e afirmava que aquilo era falso. Se a definição do outro
     cartão fosse equivalente, a afirmação continuava verdadeira — e você levava
     erro por acertar. Agora, se não existir uma definição realmente diferente, a
     questão vira uma afirmação verdadeira em vez de mentir para você.
  =============================================================================
*/

import { normalizar } from './correcaoCore.js';

// Duas definições são "a mesma coisa" quando, tirando acento, caixa e pontuação,
// sobra exatamente o mesmo texto.
function mesmaResposta(a, b) {
  return normalizar(a) === normalizar(b);
}

/*
  FUNÇÃO: escolherDistratores
  PARA QUE SERVE: escolhe até `quantidade` alternativas ERRADAS para um cartão,
  jogando fora tudo que for igual à resposta certa ou igual a outra alternativa
  já escolhida.
  PARÂMETRO `sorteio`: a função que embaralha (Math.random por padrão). Receber
  isso de fora é o que permite o teste rodar sempre igual.
*/
export function escolherDistratores(cartaoCerto, todosOsCartoes, quantidade = 3, sorteio = Math.random) {
  const certo = cartaoCerto?.definition ?? '';
  const vistos = new Set([normalizar(certo)]);
  const candidatos = (todosOsCartoes || []).filter(c => {
    if (!c || c.id === cartaoCerto?.id) return false;
    const chave = normalizar(c.definition ?? '');
    if (!chave || vistos.has(chave)) return false;
    vistos.add(chave);
    return true;
  });

  // Embaralhamento simples usando o sorteio recebido
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [candidatos[i], candidatos[j]] = [candidatos[j], candidatos[i]];
  }
  return candidatos.slice(0, Math.max(0, quantidade));
}

/*
  FUNÇÃO: montarMultiplaEscolha
  PARA QUE SERVE: devolve a questão pronta de múltipla escolha, JÁ embaralhada.
  Se não sobrar nenhuma alternativa errada válida (baralho com uma definição só),
  devolve `null` — e quem chamou transforma a questão em resposta escrita, em vez
  de mostrar uma "múltipla escolha" com uma opção só.
*/
export function montarMultiplaEscolha(cartaoCerto, todosOsCartoes, sorteio = Math.random) {
  const errados = escolherDistratores(cartaoCerto, todosOsCartoes, 3, sorteio);
  if (errados.length === 0) return null;

  const opcoes = [cartaoCerto, ...errados];
  for (let i = opcoes.length - 1; i > 0; i--) {
    const j = Math.floor(sorteio() * (i + 1));
    [opcoes[i], opcoes[j]] = [opcoes[j], opcoes[i]];
  }
  return { opcoes, idCorreto: cartaoCerto.id };
}

/*
  FUNÇÃO: montarVerdadeiroFalso
  PARA QUE SERVE: monta a afirmação "o termo X significa Y" e diz se ela é
  verdadeira ou falsa — com a garantia de que uma afirmação marcada como FALSA
  seja mesmo falsa.
  DEVOLVE: { definicaoDaAfirmacao, verdadeira }
*/
export function montarVerdadeiroFalso(cartaoCerto, todosOsCartoes, sorteio = Math.random) {
  const querVerdadeira = sorteio() > 0.5;
  if (querVerdadeira) {
    return { definicaoDaAfirmacao: cartaoCerto.definition, verdadeira: true };
  }

  // Só serve como afirmação falsa a definição que REALMENTE diz outra coisa.
  const diferentes = (todosOsCartoes || []).filter(c =>
    c && c.id !== cartaoCerto.id && !mesmaResposta(c.definition ?? '', cartaoCerto.definition ?? '')
  );
  if (diferentes.length === 0) {
    // Sem nenhuma definição diferente no baralho, mentir seria injusto: a
    // afirmação vira verdadeira.
    return { definicaoDaAfirmacao: cartaoCerto.definition, verdadeira: true };
  }
  const escolhido = diferentes[Math.floor(sorteio() * diferentes.length)];
  return { definicaoDaAfirmacao: escolhido.definition, verdadeira: false };
}

/*
  =============================================================================
  ARQUIVO: src/vault/core/deckBridge.js
  PARA QUE SERVE: É a ponte entre os seus BARALHOS de flashcards e o Cofre.

  O PROBLEMA QUE ELA RESOLVE: os baralhos vivem no LocalStorage/Firebase, com a
  estrutura antiga (id, título, categoria, cartões). O Cofre não entende esse
  formato — ele só entende "coisas que existem e podem ser ligadas". Esta ponte
  traduz um para o outro.

  Depois da tradução, o grafo mostra:

      [ Faculdade ]
           ├── Cálculo I  (42 cartões)
           │        ↕  ← porque uma nota sua escreveu [[Cálculo I]]
           │     Resumo de Limites
           └── Física Geral e Experimental II

  IMPORTANTE: esta ponte é de MÃO ÚNICA. Ela LÊ os baralhos e nunca escreve
  neles. Se um dia o Cofre inteiro for removido, os flashcards continuam
  exatamente como estão — nenhum dado depende deste arquivo.
  =============================================================================
*/

import { metadataCache } from './metadataCache.js';

// Prefixos que evitam um baralho e um grupo colidirem se tiverem o mesmo nome
export const ID_GRUPO = 'grupo:';
export const ID_BARALHO = 'baralho:';

export const ehBaralho = (id) => typeof id === 'string' && id.startsWith(ID_BARALHO);
export const ehGrupo = (id) => typeof id === 'string' && id.startsWith(ID_GRUPO);

/*
  FUNÇÃO: sincronizarBaralhos
  PARA QUE SERVE: Lê a lista de baralhos e de grupos e registra tudo no índice
  do Cofre. Chamada sempre que os baralhos mudam.

  Detalhe pensado: um baralho sem grupo não fica solto no meio do nada — ele vai
  para um grupo "Sem Grupo". Ver um nó órfão no mapa é o lembrete visual de que
  aquele baralho precisa ser organizado.
*/
/*
  A "assinatura" do último estado registrado. Serve para não refazer trabalho à toa.

  POR QUE ISSO É NECESSÁRIO: o editor de baralho salva sozinho a cada 1 segundo
  enquanto você digita. Cada salvamento gera uma lista de baralhos nova, e sem
  esta guarda o Cofre reindexaria TODAS as notas uma vez por segundo — o que
  deixaria a digitação travada em quem tem muitas notas. Só o que importa para o
  índice (id, nome, grupo, nº de cartões) entra na assinatura; mudar a descrição
  de um cartão não mexe no mapa e não precisa reindexar nada.
*/
let assinaturaAnterior = null;

function calcularAssinatura(baralhos, grupos) {
  const b = baralhos
    .map(d => `${d?.id}|${d?.title}|${d?.category}|${(d?.cards || []).length}`)
    .sort().join('~');
  return `${b}##${[...grupos].sort().join('~')}`;
}

export function sincronizarBaralhos(baralhos = [], grupos = []) {
  const assinatura = calcularAssinatura(baralhos, grupos);
  if (assinatura === assinaturaAnterior) return -1; // nada relevante mudou
  assinaturaAnterior = assinatura;

  const itens = [];
  const gruposUsados = new Set();

  // 1. Os baralhos, cada um apontando para o grupo dele
  for (const baralho of baralhos) {
    if (!baralho?.id) continue;
    const nomeGrupo = (baralho.category || 'Sem Grupo').trim() || 'Sem Grupo';
    gruposUsados.add(nomeGrupo);

    itens.push({
      id: `${ID_BARALHO}${baralho.id}`,
      label: baralho.title || 'Baralho sem nome',
      kind: 'baralho',
      parent: `${ID_GRUPO}${nomeGrupo}`,
      ref: baralho.id,                       // para poder abrir o baralho ao clicar
      cardCount: (baralho.cards || []).length,
    });
  }

  // 2. Os grupos — tanto os que têm baralho quanto os que você criou e ainda
  //    estão vazios (aparecem no mapa como um espaço esperando ser preenchido)
  for (const nome of new Set([...gruposUsados, ...grupos.filter(Boolean)])) {
    itens.push({
      id: `${ID_GRUPO}${nome}`,
      label: nome,
      kind: 'grupo',
      parent: null,
      ref: nome,
    });
  }

  metadataCache.setExternals(itens);
  return itens.length;
}

/*
  FUNÇÃO: sugestoesDeLink
  PARA QUE SERVE: Alimenta o autocompletar do "[[" com os baralhos e grupos,
  além das notas. É o que permite você escrever uma nota de resumo e ligá-la ao
  baralho da matéria sem sair do teclado.
*/
export function sugestoesDeLink() {
  return metadataCache.getAllExternals().map(ext => ({
    label: ext.label,
    detalhe: ext.kind === 'baralho'
      ? `baralho · ${ext.cardCount} ${ext.cardCount === 1 ? 'cartão' : 'cartões'}`
      : 'grupo de estudo',
    kind: ext.kind,
  }));
}

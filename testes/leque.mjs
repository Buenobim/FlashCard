/*
  =============================================================================
  ARQUIVO: testes/leque.mjs
  PARA QUE SERVE: confere, sem abrir o navegador, as contas do Sub-Cérebro:
  a hierarquia dos cartões (mãe, filho, neto), as anotações penduradas em cada
  cartão e o desenho do leque da visão Micro (nenhuma esfera em cima da outra).

  COMO RODAR (no terminal, dentro da pasta do projeto):
      npm run testar

  Se aparecer "TUDO CERTO", o miolo está de pé.
  =============================================================================
*/

// Confere a conta do leque do Micro-Cérebro sem abrir o navegador.
import { buildCardIndex, buildMicroLayout, descendantIds, flattenTree } from '../src/pages/subBrainCore.js';

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome} ${extra}`); falhas++; }
};

/* ---------- CENÁRIO 1: 43 cartões soltos (o baralho de Física de hoje) ---------- */
const soltos = Array.from({ length: 43 }, (_, i) => ({ id: `c${i}`, term: `Cartão ${i}`, definition: 'x' }));
let idx = buildCardIndex(soltos, []);
ok('43 cartões antigos viram 43 cartões mãe', idx.roots.length === 43);

let out = buildMicroLayout({ index: idx, collapsed: new Set() });
ok('gera 43 esferas', out.nodes.length === 43, `(${out.nodes.length})`);
ok('nenhuma posição quebrada (NaN)', out.nodes.every(n => Number.isFinite(n.hx) && Number.isFinite(n.hy)));

const encostam = (a, b) => Math.hypot(a.hx - b.hx, a.hy - b.hy) < a.r + b.r + 6;
let colisoes = 0;
for (let i = 0; i < out.nodes.length; i++)
  for (let j = i + 1; j < out.nodes.length; j++)
    if (encostam(out.nodes[i], out.nodes[j])) colisoes++;
ok('nenhuma esfera encostando na outra', colisoes === 0, `(${colisoes} colisões)`);

/* ---------- CENÁRIO 2: a hierarquia que o Bruno pediu ---------- */
// Física II -> Elétrica -> (Coulomb, Campo elétrico -> Linhas de campo) + 1 anotação
const cards = [
  { id: 'eletrica', term: 'Elétrica' },
  { id: 'coulomb', term: 'Lei de Coulomb', parentId: 'eletrica' },
  { id: 'campo', term: 'Campo elétrico', parentId: 'eletrica' },
  { id: 'linhas', term: 'Linhas de campo', parentId: 'campo' },
  { id: 'optica', term: 'Óptica' },
];
const subs = [
  { id: 's1', type: 'note', title: 'Resumo da aula', parentCardId: 'campo' },
  { id: 's2', type: 'link', title: 'Videoaula' }, // solto: pertence ao baralho
];
idx = buildCardIndex(cards, subs);
ok('2 ramos (Elétrica e Óptica)', idx.roots.length === 2);
ok('Elétrica tem 2 filhos', (idx.childrenOf.get('eletrica') || []).length === 2);
ok('Linhas de campo é neta (nível 2)', idx.depthOf.get('linhas') === 2);
ok('a anotação pertence ao Campo elétrico', (idx.subsOf.get('campo') || []).length === 1);
ok('o link solto fica no baralho', idx.looseSubs.length === 1);

out = buildMicroLayout({ index: idx, collapsed: new Set() });
ok('desenha 5 cartões + 2 itens = 7 esferas', out.nodes.length === 7, `(${out.nodes.length})`);
const porChave = out.byKey;
ok('a neta sai da mãe certa', porChave.get('card:linhas').parentKey === 'card:campo');
ok('a anotação sai do cartão dono', porChave.get('sub:s1').parentKey === 'card:campo');
ok('o link solto não tem mãe', porChave.get('sub:s2').parentKey === null);
// numa teia, o que importa não é o anel: é o filho ficar PERTO da mãe
const dist = (a, b) => Math.hypot(porChave.get(a).hx - porChave.get(b).hx, porChave.get(a).hy - porChave.get(b).hy);
ok('filho fica perto da mãe', dist('card:linhas', 'card:campo') < 330, `(${Math.round(dist('card:linhas','card:campo'))}px)`);
ok('anotação fica perto do cartão dono', dist('sub:s1', 'card:campo') < 330, `(${Math.round(dist('sub:s1','card:campo'))}px)`);
ok('cor por tipo: cartão amarelo, anotação azul, link rosa',
  porChave.get('card:campo').color === '#EFD03C' &&
  porChave.get('sub:s1').color === '#4C9BE8' &&
  porChave.get('sub:s2').color === '#E879C8');

/* ---------- CENÁRIO 3: ramo recolhido ---------- */
out = buildMicroLayout({ index: idx, collapsed: new Set(['eletrica']) });
ok('ramo recolhido esconde os descendentes', out.nodes.length === 3, `(${out.nodes.length})`);
// escondidos = Coulomb, Campo, Linhas de campo e a anotação do Campo = 4
ok('o selo diz +4 (tudo que sumiu, inclusive netos)', out.byKey.get('card:eletrica').hiddenCount === 4,
  `(deu ${out.byKey.get('card:eletrica').hiddenCount})`);

/* ---------- CENÁRIO 4: bagunça (ciclo, pai apagado, auto-pai) ---------- */
const bagunca = [
  { id: 'a', term: 'A', parentId: 'b' },
  { id: 'b', term: 'B', parentId: 'a' },       // ciclo A<->B
  { id: 'c', term: 'C', parentId: 'sumiu' },   // pai que não existe mais
  { id: 'd', term: 'D', parentId: 'd' },       // pai de si mesmo
];
idx = buildCardIndex(bagunca, []);
ok('ciclo e órfãos não somem nem travam', idx.roots.length + [...idx.childrenOf.values()].flat().length === 4);
out = buildMicroLayout({ index: idx, collapsed: new Set() });
ok('todos os 4 continuam desenhados', out.nodes.length === 4, `(${out.nodes.length})`);
ok('nenhuma posição quebrada com dados bagunçados', out.nodes.every(n => Number.isFinite(n.hx)));

/* ---------- CENÁRIO 5: seletor de cartão mãe ---------- */
idx = buildCardIndex(cards, subs);
const proibidos = descendantIds('eletrica', idx.childrenOf);
ok('não deixa a mãe virar filha da própria neta', proibidos.has('linhas') && proibidos.has('coulomb'));
ok('ordem de árvore lista mãe antes dos filhos',
  flattenTree(idx).map(x => x.card.id).join(',') === 'eletrica,coulomb,campo,linhas,optica');

/* ---------- CENÁRIO 6: baralho vazio ---------- */
out = buildMicroLayout({ index: buildCardIndex([], []), collapsed: new Set() });
ok('baralho vazio não quebra', out.nodes.length === 0 && Number.isFinite(out.maxExtent));

/* ---------- CENÁRIO 7: a teia é sempre a mesma (nada de bolinha dançando) ---------- */
const idxA = buildCardIndex(soltos, []);
const a1 = buildMicroLayout({ index: idxA, collapsed: new Set() });
const a2 = buildMicroLayout({ index: idxA, collapsed: new Set() });
ok('mesmo baralho = mesmas posições (mapa estável)',
  a1.nodes.every((n, i) => n.hx === a2.nodes[i].hx && n.hy === a2.nodes[i].hy));

/* ---------- CENÁRIO 8: fios curtos e mapa compacto ---------- */
const arvore = [{ id: 'r', term: 'Raiz' }];
for (let i = 0; i < 12; i++) arvore.push({ id: `f${i}`, term: `Filho ${i}`, parentId: 'r' });
for (let i = 0; i < 8; i++) arvore.push({ id: `n${i}`, term: `Neto ${i}`, parentId: `f${i % 4}` });
const idxB = buildCardIndex(arvore, []);
const outB = buildMicroLayout({ index: idxB, collapsed: new Set() });
const fios = outB.nodes.filter(n => n.parentKey).map(n => {
  const p = outB.byKey.get(n.parentKey);
  return Math.hypot(n.hx - p.hx, n.hy - p.hy);
});
ok('todo fio fica curto (filho colado na mãe)', Math.max(...fios) < 340, `(maior fio: ${Math.round(Math.max(...fios))}px)`);
let colisoesB = 0;
for (let i = 0; i < outB.nodes.length; i++)
  for (let j = i + 1; j < outB.nodes.length; j++)
    if (encostam(outB.nodes[i], outB.nodes[j])) colisoesB++;
ok('ramo cheio também não encosta', colisoesB === 0, `(${colisoesB})`);
ok('mapa não explode de tamanho', outB.maxExtent < 1600, `(${Math.round(outB.maxExtent)}px)`);

console.log(falhas === 0 ? '\nTUDO CERTO' : `\n${falhas} FALHA(S)`);
process.exit(falhas === 0 ? 0 : 1);

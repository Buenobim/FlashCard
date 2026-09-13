/*
  =============================================================================
  ARQUIVO: testes/trilha.mjs
  PARA QUE SERVE: confere, SEM ABRIR O NAVEGADOR, as três contas que, se
  quebrarem, fazem você perder matéria ou perder revisão:

    1. a MIGRAÇÃO (baralho velho vira trilha sem perder um cartão sequer);
    2. o IDA-E-VOLTA (montar a trilha, gravar e ler de novo devolve o mesmo);
    3. a REPETIÇÃO ESPAÇADA (o SM-2 agenda o fácil longe e o difícil perto,
       e o agendamento NUNCA é apagado por uma edição de texto).

  COMO RODAR:  npm run testar
  =============================================================================
*/

import {
  lerTrilha, gravarTrilha, blocoNovo, blocoEstaVazio, montarRoteiro,
  proximoAgendamento, aplicarNota, estaVencido, raioX, classificarColagem,
  NOTAS,
} from '../src/estudo/trilhaCore.js';

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome} ${extra}`); falhas++; }
};

console.log('\n--- TRILHA: migração de baralho antigo ---');

/* Um baralho como os que já existem hoje: só cartões, sem `blocos`. */
const baralhoAntigo = {
  id: 'set-1',
  title: 'Física II',
  cards: [
    { id: 'c1', term: 'Lei de Coulomb', definition: 'F = k·q1·q2/r²', intervalDays: 14, nextReviewDate: '2030-01-01T00:00:00.000Z', facilidade: 2.7 },
    { id: 'c2', term: 'Campo elétrico', definition: 'E = F/q' },
    { id: 'c3', term: 'Potencial', definition: 'V = U/q', parentId: 'c2' },
  ],
  subItems: [{ id: 's1', type: 'note', title: 'Resumo' }],
};

let blocos = lerTrilha(baralhoAntigo);
ok('baralho antigo vira 3 blocos de flashcard', blocos.length === 3 && blocos.every(b => b.tipo === 'flashcard'));
ok('a ordem dos cartões é preservada', blocos.map(b => b.cardId).join(',') === 'c1,c2,c3');
ok('o cartão vem hidratado dentro do bloco', blocos[0].card.term === 'Lei de Coulomb');

console.log('\n--- TRILHA: ida e volta (o teste que impede perda de matéria) ---');

/* Monta uma trilha de verdade: seção, anotação, flashcard, imagem, link. */
const secao = blocoNovo('secao', { titulo: 'Eletrostática' });
const nota = blocoNovo('nota', { titulo: 'A ideia', conteudo: 'Carga igual se repele.' });
const novoCard = blocoNovo('flashcard', { term: 'O que é 1 Coulomb?', definition: 'A carga de ~6,24×10¹⁸ elétrons.' });
const imagem = blocoNovo('imagem', { imagem: 'data:image/jpeg;base64,AAAA', conteudo: 'Slide 12' });
const link = blocoNovo('link', { url: 'https://exemplo.com/aula', titulo: 'Videoaula' });

const trilhaMontada = [secao, nota, blocos[0], novoCard, imagem, blocos[1], link, blocos[2]];
const gravado = gravarTrilha(baralhoAntigo, trilhaMontada);

ok('o baralho gravado tem 4 cartões', gravado.cards.length === 4, `(${gravado.cards.length})`);
ok('o baralho gravado tem 8 blocos', gravado.blocos.length === 8, `(${gravado.blocos.length})`);
ok('os subItems do Sub-Cérebro sobreviveram', (gravado.subItems || []).length === 1);
ok('o título do baralho sobreviveu', gravado.title === 'Física II');

/* A TRAVA MAIS IMPORTANTE: o agendamento não pode ser apagado por uma gravação. */
const c1Depois = gravado.cards.find(c => c.id === 'c1');
ok('o agendamento do cartão sobreviveu à gravação', c1Depois.intervalDays === 14 && c1Depois.facilidade === 2.7);
ok('a hierarquia mãe/filho sobreviveu', gravado.cards.find(c => c.id === 'c3').parentId === 'c2');

/* Ler de novo tem que devolver exatamente a mesma trilha. */
const relidos = lerTrilha(gravado);
ok('reler devolve os mesmos 8 blocos', relidos.length === 8);
ok('reler devolve os tipos na mesma ordem',
  relidos.map(b => b.tipo).join(',') === 'secao,nota,flashcard,flashcard,imagem,flashcard,link,flashcard');
ok('o texto do bloco de anotação sobreviveu', relidos[1].conteudo === 'Carga igual se repele.');
ok('a url do link sobreviveu', relidos[6].url === 'https://exemplo.com/aula');

console.log('\n--- TRILHA: nenhum cartão pode sumir ---');

/* Cartão criado FORA da trilha (Caixa de Entrada, Cérebro) precisa aparecer. */
const comIntruso = { ...gravado, cards: [...gravado.cards, { id: 'c9', term: 'Colado de fora', definition: 'x' }] };
const comIntrusoLido = lerTrilha(comIntruso);
ok('cartão criado em outra tela entra no fim da trilha',
  comIntrusoLido.length === 9 && comIntrusoLido[8].cardId === 'c9');

/* Bloco apontando para cartão que já foi apagado não pode quebrar a tela. */
const comBlocoOrfao = { ...gravado, blocos: [...gravado.blocos, { id: 'bX', tipo: 'flashcard', cardId: 'NAO_EXISTE' }] };
ok('bloco órfão é descartado em silêncio', lerTrilha(comBlocoOrfao).length === 8);

/* Dois blocos apontando para o mesmo cartão viram um só. */
const comDuplicata = { ...gravado, blocos: [...gravado.blocos, { id: 'bY', tipo: 'flashcard', cardId: 'c1' }] };
ok('bloco duplicado do mesmo cartão vira um só', lerTrilha(comDuplicata).length === 8);

console.log('\n--- TRILHA: blocos vazios ---');
ok('flashcard em branco é considerado vazio', blocoEstaVazio(blocoNovo('flashcard')));
ok('seção com título NÃO é vazia', !blocoEstaVazio(secao));
ok('anotação com texto NÃO é vazia', !blocoEstaVazio(nota));
ok('imagem colada NÃO é vazia', !blocoEstaVazio(imagem));

console.log('\n--- REPETIÇÃO ESPAÇADA (SM-2) ---');

const novo = { id: 'n1', term: 'x', definition: 'y' };
ok('cartão nunca estudado conta como vencido', estaVencido(novo));

/* Primeira vez: as três notas boas TÊM que dar dias diferentes, senão os botões
   da tela dizem todos "volta amanhã" e a nota vira decoração. */
ok('1ª vez difícil = 1 dia', proximoAgendamento(novo, NOTAS.DIFICIL).intervalDays === 1);
ok('1ª vez bom = 2 dias', proximoAgendamento(novo, NOTAS.BOM).intervalDays === 2);
ok('1ª vez fácil = 4 dias', proximoAgendamento(novo, NOTAS.FACIL).intervalDays === 4);

let card = aplicarNota(novo, NOTAS.BOM);
ok('conta a revisão', card.reviewsCount === 1 && card.successCount === 1);

/* Segunda: 6 dias (o degrau clássico do SM-2). */
card = aplicarNota(card, NOTAS.BOM);
ok('2ª resposta boa agenda para 6 dias', card.intervalDays === 6, `(${card.intervalDays})`);
ok('2ª vez as três notas boas continuam diferentes',
  new Set([1, 2, 3].map(n => proximoAgendamento({ repeticoes: 1, intervalDays: 2, facilidade: 2.5 }, n).intervalDays)).size === 3);

/* Terceira: multiplica pela facilidade (~2.5) -> 15 dias. */
card = aplicarNota(card, NOTAS.BOM);
ok('3ª resposta boa passa de 6 para ~15 dias', card.intervalDays >= 13 && card.intervalDays <= 17, `(${card.intervalDays})`);

/* Errar joga tudo para trás E traz o cartão de volta AINDA HOJE. */
const errado = aplicarNota(card, NOTAS.ERREI);
ok('errar zera o intervalo', errado.intervalDays === 0);
ok('errar conta um lapso', errado.lapsos === 1);
ok('errar traz o cartão de volta hoje', new Date(errado.nextReviewDate) - new Date() < 20 * 60 * 1000);
ok('errar derruba a facilidade', errado.facilidade < card.facilidade, `(${errado.facilidade} vs ${card.facilidade})`);

/* O fácil tem que ir MAIS LONGE que o bom, e o bom mais longe que o difícil. */
const base = { id: 'b', intervalDays: 10, repeticoes: 3, facilidade: 2.5 };
const dDificil = proximoAgendamento(base, NOTAS.DIFICIL).intervalDays;
const dBom = proximoAgendamento(base, NOTAS.BOM).intervalDays;
const dFacil = proximoAgendamento(base, NOTAS.FACIL).intervalDays;
ok('difícil < bom < fácil', dDificil < dBom && dBom < dFacil, `(${dDificil}, ${dBom}, ${dFacil})`);
ok('a facilidade nunca cai abaixo de 1.3',
  proximoAgendamento({ facilidade: 1.3 }, NOTAS.ERREI).facilidade >= 1.3);
ok('o intervalo nunca passa de 1 ano',
  proximoAgendamento({ intervalDays: 300, repeticoes: 9, facilidade: 2.9 }, NOTAS.FACIL).intervalDays <= 365);

console.log('\n--- ROTEIRO DA SESSÃO ---');

const roteiroCompleto = montarRoteiro(gravado, { modo: 'trilha' });
ok('modo trilha inclui contexto e cartões', roteiroCompleto.length === 7, `(${roteiroCompleto.length})`);
ok('a seção não vira um passo (vira o título)', roteiroCompleto.every(p => p.bloco.tipo !== 'secao'));
ok('todo passo sabe a que seção pertence', roteiroCompleto.every(p => p.secao === 'Eletrostática'));

const soVencidos = montarRoteiro(gravado, { modo: 'revisao' });
ok('modo revisão traz só flashcards', soVencidos.every(p => p.bloco.tipo === 'flashcard'));
ok('modo revisão deixa de fora o que ainda não venceu',
  !soVencidos.some(p => p.bloco.cardId === 'c1'), '(c1 está agendado para 2030)');

console.log('\n--- RAIO-X E COLAGEM ---');
const numeros = raioX(gravado);
ok('conta 8 blocos', numeros.totalBlocos === 8);
ok('conta 4 cartões', numeros.totalCartoes === 4);
ok('conta 4 blocos de contexto', numeros.contexto === 4);
// "Firme" é intervalo de 21 dias ou mais. c1 está em 14 dias: ainda NÃO conta.
ok('c1 (14 dias) ainda não conta como firme', numeros.firmes === 0, `(${numeros.firmes})`);

const comCartaoFirme = {
  ...gravado,
  cards: gravado.cards.map(c => (c.id === 'c1' ? { ...c, intervalDays: 45 } : c)),
};
ok('cartão com 45 dias conta como firme', raioX(comCartaoFirme).firmes === 1);
ok('o domínio vira porcentagem dos cartões', raioX(comCartaoFirme).dominio === 25);

ok('link colado vira bloco de link', classificarColagem('https://youtu.be/abc') === 'link');
ok('comando colado vira bloco de código', classificarColagem('npm run build') === 'codigo');
ok('fórmula colada vira bloco de fórmula', classificarColagem('E = m · c²') === 'formula');
ok('texto comum vira anotação', classificarColagem('O campo elétrico aponta da carga positiva para a negativa.') === 'nota');

console.log('');
if (falhas) {
  console.log(`>>> ${falhas} FALHA(S) NA TRILHA <<<`);
  process.exitCode = 1;
} else {
  console.log('>>> TRILHA: TUDO CERTO <<<');
}

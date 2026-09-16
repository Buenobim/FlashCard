/*
  =============================================================================
  ARQUIVO: testes/questoes-de-prova.mjs
  PARA QUE SERVE: confere o BANCO DE QUESTÕES DE PROVA (src/estudo/questoes/*.json)
  antes de ele chegar na tela.

  POR QUE ISSO PRECISA DE TESTE — o erro que ele impede é o pior de todos:
  o campo `correta` é o ÍNDICE da alternativa certa, começando em ZERO. Escrever
  3 quando a resposta é a letra C (índice 2) não quebra nada, não dá erro
  nenhum: o app simplesmente te ensina a resposta errada, com uma resolução
  bonita embaixo. Você só descobriria na prova.

  Então, para cada questão, conferimos:
    1. que ela tem id, enunciado e pelo menos duas alternativas;
    2. que `correta` existe e aponta para uma alternativa que existe;
    3. que o campo `resposta` (o gabarito escrito por extenso) BATE com a
       alternativa apontada por `correta` — essa é a trava de verdade: os dois
       campos são escritos à mão, em momentos diferentes, e se discordarem
       algum dos dois está errado;
    4. que não há id repetido (id repetido faria duas questões compartilharem
       a mesma resposta marcada na tela).

  COMO RODAR:  npm run testar
  =============================================================================
*/

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const PASTA = 'src/estudo/questoes';

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome} ${extra}`); falhas++; }
};

/* Mesma achatada do app: sem acento, sem caixa, sem pontuação. */
const achatar = (t) => String(t || '')
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]/g, '');

console.log('\n--- QUESTÕES DE PROVA: o banco ---');

const arquivos = readdirSync(PASTA).filter((f) => f.endsWith('.json'));
ok('existe pelo menos um arquivo de prova', arquivos.length > 0);

const idsVistos = new Set();

for (const arquivo of arquivos) {
  let dado;
  try {
    dado = JSON.parse(readFileSync(join(PASTA, arquivo), 'utf8'));
  } catch (e) {
    ok(`${arquivo} é um JSON válido`, false, e.message);
    continue;
  }
  ok(`${arquivo} é um JSON válido`, true);
  ok(`${arquivo} diz de que matéria é`, Boolean(dado.materia));
  ok(`${arquivo} tem como casar com o baralho`, Array.isArray(dado.casaCom) && dado.casaCom.length > 0);

  for (const prova of dado.provas || []) {
    const questoes = prova.questoes || [];
    console.log(`\n  [${dado.materia} · ${prova.titulo} — ${questoes.length} questões]`);

    for (const q of questoes) {
      const onde = `q${q.numero ?? '?'} (${q.id || 'sem id'})`;

      ok(`${onde}: tem id único`, Boolean(q.id) && !idsVistos.has(q.id));
      if (q.id) idsVistos.add(q.id);

      ok(`${onde}: tem enunciado`, typeof q.enunciado === 'string' && q.enunciado.trim().length > 10);
      ok(`${onde}: tem pelo menos duas alternativas`, Array.isArray(q.alternativas) && q.alternativas.length >= 2);

      const dentroDaFaixa = Number.isInteger(q.correta)
        && q.correta >= 0
        && q.correta < (q.alternativas?.length || 0);
      ok(`${onde}: 'correta' aponta para uma alternativa que existe`, dentroDaFaixa, `correta=${q.correta}`);

      /*
        A TRAVA PRINCIPAL. `resposta` é o gabarito escrito por extenso e
        `correta` é o índice; os dois são digitados à mão. Se discordarem, é
        porque um deles está errado — e é exatamente assim que uma resolução
        certa acaba colada numa alternativa errada.
      */
      if (dentroDaFaixa && q.resposta) {
        const mesma = achatar(q.resposta) === achatar(q.alternativas[q.correta]);
        ok(`${onde}: o gabarito por extenso bate com a alternativa marcada`, mesma,
          `\n         resposta:    "${q.resposta}"\n         alternativa: "${q.alternativas[q.correta]}"`);
      }

      // Não é obrigatório, mas uma questão sem "como pensar" não ensina nada
      // além do gabarito — que é justamente o que esta tela existe para evitar.
      ok(`${onde}: explica como pensar`, Boolean(q.gatilho));
      ok(`${onde}: tem resolução em passos`, Array.isArray(q.passos) && q.passos.length > 0);
    }
  }
}

console.log('');
if (falhas) {
  console.log(`>>> ${falhas} FALHA(S) NAS QUESTÕES DE PROVA <<<`);
  process.exitCode = 1;
} else {
  console.log('>>> QUESTÕES DE PROVA: TUDO CERTO <<<');
}

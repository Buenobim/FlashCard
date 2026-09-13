/*
  =============================================================================
  ARQUIVO: testes/sincronia.mjs
  PARA QUE SERVE: confere, sem abrir o navegador e sem tocar na nuvem, as contas
  que decidem se os seus baralhos SOBREVIVEM: a junção local x nuvem e a
  conferência dos arquivos de backup.

  COMO RODAR (no terminal, dentro da pasta do projeto):
      npm run testar

  Cada teste aqui é um dos "critérios para liberar uma nova versão" da auditoria:
  aparelho desatualizado não apaga baralho do outro, edição offline sobrevive,
  exclusão apaga só o que você escolheu, importar aula não destrói o acervo e
  arquivo inválido não altera nada.
  =============================================================================
*/

import {
  juntarBaralhosLocalENuvem,
  validarConteudoDeBackup,
  compararComOAcervo,
} from '../src/utils/sincroniaCore.js';

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome} ${extra}`); falhas++; }
};

const baralho = (id, opcoes = {}) => ({
  id,
  title: opcoes.title || `Baralho ${id}`,
  description: '',
  category: 'Faculdade',
  cards: opcoes.cards || [{ id: `${id}-c1`, term: 'a', definition: 'b' }],
  blocos: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: opcoes.updatedAt || '2026-01-01T00:00:00.000Z',
});

console.log('\n--- JUNÇÃO ENTRE O APARELHO E A NUVEM ---');

/* 1) O aparelho desatualizado não pode apagar o que foi criado no outro. */
{
  const nuvem = [baralho('fisica'), baralho('calculo')];
  const locais = [baralho('fisica')]; // celular que nunca viu o "calculo"
  const { lista } = juntarBaralhosLocalENuvem({ locais, nuvem });
  ok('baralho criado no computador aparece no celular', lista.length === 2, `(${lista.length})`);
}

/* 2) O que foi escrito offline não pode sumir quando a nuvem responde. */
{
  const nuvem = [baralho('fisica')];
  const locais = [baralho('fisica'), baralho('resistencia')]; // criado sem internet
  const { lista, paraSubir } = juntarBaralhosLocalENuvem({ locais, nuvem, pendentes: ['resistencia'] });
  ok('baralho criado offline sobrevive à sincronização', lista.some(d => d.id === 'resistencia'));
  ok('e é enviado para a nuvem', paraSubir.some(d => d.id === 'resistencia'));
}

/* 3) Editou no celular depois do computador? O celular vence. */
{
  const nuvem = [baralho('fisica', { title: 'versão da nuvem', updatedAt: '2026-02-01T10:00:00.000Z' })];
  const locais = [baralho('fisica', { title: 'versão nova do celular', updatedAt: '2026-02-01T18:00:00.000Z' })];
  const { lista, paraSubir } = juntarBaralhosLocalENuvem({ locais, nuvem });
  ok('a edição mais recente vence', lista[0].title === 'versão nova do celular', `(${lista[0].title})`);
  ok('a versão vencedora sobe para a nuvem', paraSubir.length === 1);
}

/* 4) Empate de horário: nunca perder conteúdo. */
{
  const gordo = baralho('fisica', { cards: [1, 2, 3].map(n => ({ id: `c${n}`, term: `t${n}`, definition: 'd' })) });
  const magro = baralho('fisica');
  const { lista } = juntarBaralhosLocalENuvem({ locais: [magro], nuvem: [gordo] });
  ok('no empate, vence quem tem mais cartões', lista[0].cards.length === 3, `(${lista[0].cards.length})`);
}

/* 5) Exclusão de verdade apaga só o escolhido — e não ressuscita. */
{
  const nuvem = [baralho('fisica'), baralho('ingles')];
  const locais = [baralho('fisica')];
  const { lista } = juntarBaralhosLocalENuvem({ locais, nuvem, excluidos: ['ingles'] });
  ok('o baralho apagado de propósito não volta', !lista.some(d => d.id === 'ingles'));
  ok('e os outros continuam vivos', lista.some(d => d.id === 'fisica'));
}

/* 6) Nuvem vazia (ou fora do ar) não pode esvaziar o aparelho. */
{
  const locais = [baralho('fisica'), baralho('calculo')];
  const { lista, paraSubir } = juntarBaralhosLocalENuvem({ locais, nuvem: [] });
  ok('nuvem vazia não apaga nada do aparelho', lista.length === 2, `(${lista.length})`);
  ok('e tudo é reenviado para a nuvem', paraSubir.length === 2);
}

console.log('\n--- CONFERÊNCIA DO ARQUIVO DE BACKUP ---');

/* 7) Arquivo de outro app é recusado inteiro. */
{
  const r = validarConteudoDeBackup({ app: 'OutroApp', sets: [] });
  ok('arquivo de outro aplicativo é recusado', r.valido === false);
}

/* 8) Baralho sem a lista de cartões não passa mais (era o que quebrava o painel). */
{
  const r = validarConteudoDeBackup({
    app: 'AplicativoFlashcards',
    sets: [
      { id: 'a', title: 'Bom', cards: [{ id: 'c1', term: 'x', definition: 'y' }] },
      { id: 'b', title: 'Quebrado' }, // sem cards
    ],
  });
  ok('o arquivo é aproveitado', r.valido === true);
  ok('o baralho sem cartões é descartado', r.sets.length === 1, `(${r.sets.length})`);
  ok('e o motivo é explicado', (r.problemas || []).length === 1);
}

/* 9) Arquivo sem nada aproveitável não altera nada. */
{
  const r = validarConteudoDeBackup({ app: 'AplicativoFlashcards', sets: [{ id: 'a' }] });
  ok('arquivo inválido é recusado por inteiro', r.valido === false);
}

/* 10) A prévia da importação diz a verdade antes de gravar. */
{
  const atuais = [baralho('fisica'), baralho('ingles')];
  const doArquivo = [
    baralho('fisica'),                                  // idêntico -> ignorado
    baralho('ingles', { title: 'Inglês mudado' }),      // mesmo id, outro conteúdo -> conflito
    baralho('hidraulica'),                              // novo
  ];
  const resumo = compararComOAcervo(doArquivo, atuais);
  ok('conta os baralhos novos', resumo.novos === 1, `(${resumo.novos})`);
  ok('reconhece os idênticos', resumo.iguais === 1, `(${resumo.iguais})`);
  ok('reconhece os conflitos', resumo.conflitos === 1, `(${resumo.conflitos})`);
}

console.log(falhas === 0 ? '\nTUDO CERTO (sincronia)\n' : `\n${falhas} FALHA(S) em sincronia\n`);
if (falhas > 0) process.exit(1);

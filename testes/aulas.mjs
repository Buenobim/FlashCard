/*
  =============================================================================
  ARQUIVO: testes/aulas.mjs
  PARA QUE SERVE: confere, SEM ABRIR O NAVEGADOR, as regrinhas das AULAS —
  aquelas que, se quebrarem, você só descobre depois de já ter guardado meio
  semestre errado:

    1. a NUMERAÇÃO (a próxima aula é sempre um número novo, mesmo depois de
       você apagar uma do meio);
    2. o TÍTULO (o que aparece na esfera, na lista e no cabeçalho);
    3. o TAMANHO (o selo que avisa quando a aula está pesada);
    4. a CONTAGEM DE BYTES (acento ocupa 2 — contar letras mentiria).

  COMO RODAR:  npm run testar
  =============================================================================
*/

import {
  bytesDoTexto,
  dataLegivel,
  lerNomeDoArquivo,
  montarTituloDaAula,
  pareceHtml,
  proximoNumeroDeAula,
  tamanhoLegivel,
} from '../src/utils/aulasCore.js';

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome} ${extra}`); falhas++; }
};

console.log('\n--- AULAS: numeração ---');

ok('matéria sem aula nenhuma começa na 1', proximoNumeroDeAula([]) === 1);
ok('depois da 1 e da 2 vem a 3', proximoNumeroDeAula([{ numero: 1 }, { numero: 2 }]) === 3);

/*
  O CASO QUE JUSTIFICA O TESTE: contar as aulas daria 2, e o app criaria uma
  SEGUNDA "Aula 03". Tem que ser o maior + 1.
*/
ok('apagar a do meio não repete número', proximoNumeroDeAula([{ numero: 1 }, { numero: 3 }]) === 4);
ok('ficha bagunçada (sem número) não quebra', proximoNumeroDeAula([{}, { numero: 'x' }, { numero: 5 }]) === 6);
ok('lista indefinida não quebra', proximoNumeroDeAula(undefined) === 1);

console.log('\n--- AULAS: título ---');

ok('número vira dois dígitos', montarTituloDaAula(1, 'Ligações químicas') === 'Aula 01 — Ligações químicas');
ok('aula 12 continua legível', montarTituloDaAula(12, 'Termodinâmica') === 'Aula 12 — Termodinâmica');
ok('sem assunto fica só o número', montarTituloDaAula(3, '') === 'Aula 03');
ok('assunto só com espaços conta como vazio', montarTituloDaAula(3, '   ') === 'Aula 03');
ok('número inválido cai para a aula 01', montarTituloDaAula(0, '') === 'Aula 01');

console.log('\n--- AULAS: tamanho e conteúdo ---');

ok('zero byte não vira "NaN"', tamanhoLegivel(0) === '0 KB');
ok('menos de 1 KB aparece em bytes', tamanhoLegivel(724) === '724 B');
ok('KB com vírgula (não ponto)', tamanhoLegivel(8452) === '8,3 KB');
ok('MB com vírgula (não ponto)', tamanhoLegivel(3 * 1024 * 1024) === '3,0 MB');

// "Ligações" tem 8 letras mas 10 bytes: dois acentos ocupam 2 cada.
ok('acento conta 2 bytes', bytesDoTexto('Ligações') === 10, `(deu ${bytesDoTexto('Ligações')})`);
ok('texto vazio dá 0', bytesDoTexto('') === 0);

ok('reconhece uma página de verdade', pareceHtml('<!doctype html><html><body><h1>Oi</h1></body></html>'));
ok('não confunde texto solto com página', pareceHtml('Aula sobre ligações químicas') === false);

console.log('\n--- AULAS: o nome do arquivo ---');

/*
  POR QUE ISTO IMPORTA: você salva as aulas como "Aula 07 - Cinematica.html".
  Se o app não separar o número do assunto, o título sai "Aula 01 — Aula 07
  Cinematica": número errado e a palavra "Aula" repetida.
*/
const n1 = lerNomeDoArquivo('Aula 07 - Cinematica.html');
ok('pega o número e o assunto do nome', n1.numero === 7 && n1.assunto === 'Cinematica', JSON.stringify(n1));

const n2 = lerNomeDoArquivo('aula_03_ligacoes-quimicas.html');
ok('entende traço e sublinhado', n2.numero === 3 && n2.assunto === 'ligacoes quimicas', JSON.stringify(n2));

const n3 = lerNomeDoArquivo('Aula07-Optica.html');
ok('entende sem espaço depois de "Aula"', n3.numero === 7 && n3.assunto === 'Optica', JSON.stringify(n3));

const n4 = lerNomeDoArquivo('aula nº 5 - acidos.html');
ok('entende "nº"', n4.numero === 5 && n4.assunto === 'acidos', JSON.stringify(n4));

const n5 = lerNomeDoArquivo('Resumo de quimica.html');
ok('nome sem número não inventa número', n5.numero === null && n5.assunto === 'Resumo de quimica', JSON.stringify(n5));

const n6 = lerNomeDoArquivo('Aula 123456.html');
ok('número absurdo não é aceito como aula', n6.numero === null, JSON.stringify(n6));

ok('nome vazio não quebra', lerNomeDoArquivo('').assunto === '');

console.log('\n--- AULAS: data ---');

ok('data vira dia/mês/ano', dataLegivel('2026-08-20') === '20/08/2026');
ok('data vazia não quebra', dataLegivel('') === '');
ok('data estranha não quebra', dataLegivel('sei-la') === '');

console.log('');
if (falhas) {
  console.log(`>>> ${falhas} FALHA(S) NAS AULAS <<<`);
  process.exitCode = 1;
} else {
  console.log('>>> AULAS: TUDO CERTO <<<');
}

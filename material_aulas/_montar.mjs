/*
  Monta o HTML final de uma aula: cabeça (CSS) + corpo + flashcards + extras + rodapé.
  Uso: node _montar.mjs 01 "#60A5FA"
  Espera encontrar: aulaNN-dados.json, _corpoNN.html, _extrasNN.html
*/
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const nn = process.argv[2];
const cor = process.argv[3] || '#E8933F';

const dados = JSON.parse(readFileSync(`aula${nn}-dados.json`, 'utf8'));

/* 1. gera a seção de flashcards a partir do JSON (fonte única da verdade) */
execFileSync(process.execPath, ['_gerar_flash.mjs', `aula${nn}-dados.json`, `_flash${nn}.html`, cor], { stdio: 'inherit' });

/* 2. troca só o <title> da cabeça reaproveitada */
const titulo = `Aula ${nn} — ${dados.aula.assunto} | Química Geral e Experimental`;
const cabeca = readFileSync('_cabeca.html', 'utf8')
  .replace(/<title>[\s\S]*?<\/title>/, `<title>${titulo}</title>`);

const partes = [
  cabeca,
  readFileSync(`_corpo${nn}.html`, 'utf8'),
  readFileSync(`_flash${nn}.html`, 'utf8'),
  readFileSync(`_extras${nn}.html`, 'utf8'),
  readFileSync('_rodape.html', 'utf8'),
];

const saida = dados.arquivoAula;
writeFileSync(saida, partes.join('\n'), 'utf8');

const bytes = Buffer.byteLength(partes.join('\n'), 'utf8');
const cartoes = dados.trilha.filter((b) => b.tipo === 'flashcard').length;
console.log(`OK  ${saida}  —  ${(bytes / 1024).toFixed(1)} KB · ${cartoes} cartões · ${dados.trilha.length} blocos de trilha`);

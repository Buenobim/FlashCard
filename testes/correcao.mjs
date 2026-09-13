/*
  =============================================================================
  ARQUIVO: testes/correcao.mjs
  PARA QUE SERVE: confere o CORRETOR de respostas escritas (número, unidade e
  tolerância) e a montagem das alternativas das questões.

  COMO RODAR (no terminal, dentro da pasta do projeto):
      npm run testar

  O que está sendo protegido aqui: uma prova de Engenharia não pode dar erro em
  "12500 N" quando o gabarito é "12,5 kN", nem dar ponto para "12,5 kg". E uma
  questão não pode mostrar duas alternativas iguais, nem chamar de FALSA uma
  afirmação que é verdadeira.
  =============================================================================
*/

import { corrigirResposta, lerNumero, lerMedida, normalizar } from '../src/estudo/correcaoCore.js';
import { escolherDistratores, montarMultiplaEscolha, montarVerdadeiroFalso } from '../src/estudo/questoesCore.js';

let falhas = 0;
const ok = (nome, cond, extra = '') => {
  if (cond) console.log(`  ok   ${nome}`);
  else { console.log(`  FALHA ${nome} ${extra}`); falhas++; }
};
const situacao = (resp, gab, opcoes) => corrigirResposta(resp, gab, opcoes).situacao;

console.log('\n--- LEITURA DE NÚMEROS (do jeito brasileiro e do americano) ---');
ok('12,5 vira 12.5', lerNumero('12,5') === 12.5);
ok('1.234,56 vira 1234.56', lerNumero('1.234,56') === 1234.56);
ok('1.500 é mil e quinhentos', lerNumero('1.500') === 1500);
ok('1.5 é um e meio', lerNumero('1.5') === 1.5);
ok('3x10^5 vira 300000', lerNumero('3x10^5') === 300000);
ok('texto não vira número', lerNumero('Paris') === null);

console.log('\n--- LEITURA DE MEDIDAS (valor + unidade) ---');
ok('12,5 kN é força', lerMedida('12,5 kN').dimensao === 'forca');
ok('12,5 kN valem 12500 N', lerMedida('12,5 kN').base === 12500);
ok('25 MPa valem 25.000.000 Pa', lerMedida('25 MPa').base === 25e6);
ok('150 cm valem 1,5 m', Math.abs(lerMedida('150 cm').base - 1.5) < 1e-9);
ok('número sem unidade é reconhecido', lerMedida('42').temUnidade === false);

console.log('\n--- CORREÇÃO DE RESPOSTA ESCRITA ---');
ok('mesma resposta em outra unidade vale ponto', situacao('12500 N', '12,5 kN') === 'certo');
ok('mesmo valor escrito com ponto vale ponto', situacao('12.5 kN', '12,5 kN') === 'certo');
ok('unidade de outra grandeza é ERRO', situacao('12,5 kg', '12,5 kN') === 'errado');
ok('a explicação do erro fala da unidade',
  /incompat/i.test(corrigirResposta('12,5 kg', '12,5 kN').motivo));
ok('arredondamento dentro de 1% passa', situacao('12,45 kN', '12,5 kN') === 'certo');
ok('erro de 10% não passa', situacao('11 kN', '12,5 kN') === 'errado');
ok('número certo sem unidade vai para conferência', situacao('12,5', '12,5 kN') === 'revisar');
ok('resposta vazia é erro', situacao('', '12,5 kN') === 'errado');
ok('texto quando se espera número é erro', situacao('não sei', '12,5 kN') === 'errado');

console.log('\n--- CORREÇÃO DE RESPOSTA DE TEXTO ---');
ok('acento e maiúscula não reprovam', situacao('agua', 'Água') === 'certo');
ok('ponto final não reprova', situacao('Paris.', 'Paris') === 'certo');
ok('resposta alternativa aprovada vale ponto',
  situacao('momento fletor', 'momento de flexão | momento fletor') === 'certo');
ok('campo respostasAceitas também vale',
  situacao('E = mc2', 'energia', { aceitas: ['E = mc2'] }) === 'certo');
ok('resposta parecida vai para conferência humana',
  situacao('a força que puxa os corpos para o centro da terra',
    'é a força de atração que a terra exerce sobre os corpos, para o centro') === 'revisar');
ok('resposta sem relação é erro', situacao('banana', 'momento de inércia') === 'errado');
ok('gabarito que começa com número não vira conta',
  situacao('segunda lei de Newton', '2ª lei de Newton') !== 'errado');

console.log('\n--- ALTERNATIVAS DAS QUESTÕES ---');
const sorteioFixo = () => 0.42; // sorteio previsível, para o teste dar sempre igual
{
  const cartoes = [
    { id: '1', term: 'Pascal', definition: 'unidade de pressão' },
    { id: '2', term: 'Pa', definition: 'Unidade de Pressão' },   // mesma coisa, escrita diferente
    { id: '3', term: 'Newton', definition: 'unidade de força' },
    { id: '4', term: 'Joule', definition: 'unidade de energia' },
  ];
  const distratores = escolherDistratores(cartoes[0], cartoes, 3, sorteioFixo);
  ok('a alternativa igual à resposta certa é descartada',
    !distratores.some(d => normalizar(d.definition) === 'unidade de pressao'));
  ok('sobram as alternativas realmente diferentes', distratores.length === 2, `(${distratores.length})`);

  const q = montarMultiplaEscolha(cartoes[0], cartoes, sorteioFixo);
  const textos = q.opcoes.map(o => normalizar(o.definition));
  ok('nenhuma alternativa repetida na tela', new Set(textos).size === textos.length);
  ok('a resposta certa está entre as opções', q.opcoes.some(o => o.id === q.idCorreto));
}
{
  // Baralho com uma definição só: não dá para montar múltipla escolha honesta.
  const iguais = [
    { id: '1', term: 'Pa', definition: 'unidade de pressão' },
    { id: '2', term: 'Pascal', definition: 'Unidade de pressão' },
  ];
  ok('sem alternativa válida, a múltipla escolha é recusada',
    montarMultiplaEscolha(iguais[0], iguais, sorteioFixo) === null);

  const vf = montarVerdadeiroFalso(iguais[0], iguais, () => 0.1); // 0.1 => queria FALSA
  ok('não inventa afirmação falsa quando a outra definição é a mesma', vf.verdadeira === true);
}
{
  const cartoes = [
    { id: '1', term: 'Pascal', definition: 'unidade de pressão' },
    { id: '2', term: 'Newton', definition: 'unidade de força' },
  ];
  const vf = montarVerdadeiroFalso(cartoes[0], cartoes, () => 0.1);
  ok('a afirmação marcada como falsa é mesmo falsa',
    vf.verdadeira === false && normalizar(vf.definicaoDaAfirmacao) !== 'unidade de pressao');
}

console.log(falhas === 0 ? '\nTUDO CERTO (correção)\n' : `\n${falhas} FALHA(S) em correção\n`);
if (falhas > 0) process.exit(1);

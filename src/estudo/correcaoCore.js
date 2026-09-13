/*
  =============================================================================
  ARQUIVO: src/estudo/correcaoCore.js
  PARA QUE SERVE: é o CORRETOR de respostas escritas. Ele mora aqui sozinho, sem
  tela e sem internet, para poder ser conferido com `npm run testar`.

  POR QUE ELE EXISTE: a correção antiga comparava o texto letra por letra (só
  baixando as maiúsculas e tirando os espaços das pontas). Para Engenharia isso
  é inútil: "12,5 kN", "12.5 kN" e "12500 N" são a MESMA resposta, e a prova dava
  erro nas três. Pior: "12,5 kg" também passaria a valer, porque ninguém olhava a
  unidade.

  COMO ELE CORRIGE, NESTA ORDEM:
    1. resposta vazia                      -> errado;
    2. respostas alternativas aprovadas    -> certo (você pode escrever
       "12,5 kN | 12500 N" no verso do cartão, ou usar o campo respostasAceitas);
    3. os dois lados são NÚMERO            -> compara valor E unidade de verdade:
       converte o que é convertível (kN->N, cm->m, MPa->Pa...), recusa unidade de
       outra grandeza (kg nunca é kN) e aceita uma tolerância de 1%;
    4. texto igual (sem acento, sem caixa) -> certo;
    5. texto parecido                      -> "revisar": a máquina NÃO chuta, quem
       decide é você, no gabarito.

  O QUE ELE NÃO FAZ DE PROPÓSITO: não usa "parecença de texto" para dar ponto em
  conta de engenharia. Parecido não é igual quando o assunto é número.
  =============================================================================
*/

// Tolerância padrão: 1% do valor esperado (o suficiente para arredondamento de
// régua de cálculo e casas decimais, pouco demais para deixar passar erro real).
export const TOLERANCIA_PADRAO = 0.01;

/*
  A TABELA DE UNIDADES: cada unidade conhecida diz a que GRANDEZA pertence e
  quanto vale na unidade base dessa grandeza. Comparar kN com kg é comparar
  grandezas diferentes — e isso é erro, não arredondamento.
*/
const UNIDADES = {
  // comprimento (base: metro)
  km: ['comprimento', 1000], m: ['comprimento', 1], dm: ['comprimento', 0.1],
  cm: ['comprimento', 0.01], mm: ['comprimento', 0.001], 'µm': ['comprimento', 1e-6],
  // área (base: metro quadrado)
  'km2': ['area', 1e6], 'm2': ['area', 1], 'cm2': ['area', 1e-4], 'mm2': ['area', 1e-6],
  // volume (base: metro cúbico)
  'm3': ['volume', 1], 'cm3': ['volume', 1e-6], 'mm3': ['volume', 1e-9],
  l: ['volume', 0.001], ml: ['volume', 1e-6],
  // massa (base: quilograma)
  t: ['massa', 1000], kg: ['massa', 1], g: ['massa', 0.001], mg: ['massa', 1e-6],
  // força (base: newton)
  mn: ['forca', 1e6], kn: ['forca', 1000], n: ['forca', 1],
  kgf: ['forca', 9.80665], tf: ['forca', 9806.65],
  // pressão e tensão (base: pascal)
  gpa: ['pressao', 1e9], mpa: ['pressao', 1e6], kpa: ['pressao', 1000], pa: ['pressao', 1],
  // momento (base: newton-metro)
  'knm': ['momento', 1000], 'nm': ['momento', 1], 'kgfm': ['momento', 9.80665],
  // tempo (base: segundo)
  h: ['tempo', 3600], min: ['tempo', 60], s: ['tempo', 1], ms: ['tempo', 0.001],
  // ângulo (base: radiano)
  rad: ['angulo', 1], '°': ['angulo', Math.PI / 180], graus: ['angulo', Math.PI / 180],
  grau: ['angulo', Math.PI / 180],
  // porcentagem (base: fração)
  '%': ['porcentagem', 0.01],
};

/*
  FUNÇÃO: normalizar
  PARA QUE SERVE: deixa o texto "nu" para comparação: sem acento, sem maiúscula,
  sem espaço sobrando e sem ponto final. "Água " e "agua" viram a mesma coisa.
*/
export function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[.;,!?]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/*
  FUNÇÃO: lerNumero
  PARA QUE SERVE: transforma o que você digitou em número de verdade, entendendo
  o jeito brasileiro e o jeito americano de escrever:
     "12,5" -> 12.5      "1.234,56" -> 1234.56      "1.500" -> 1500
     "1.5"  -> 1.5       "3x10^5"   -> 300000       "-2,5e3" -> -2500
  Regra do ponto sozinho: se ele separa exatamente 3 casas ("1.500"), é separador
  de milhar (é assim que se escreve aqui); qualquer outro caso é decimal.
*/
export function lerNumero(texto) {
  let t = String(texto ?? '').trim().replace(/\s/g, '');
  if (!t) return null;
  // notação científica escrita à mão: 3x10^5 / 3·10^5 / 3*10^5
  t = t.replace(/[x*·]10\^?/gi, 'e');
  t = t.replace(/\^/g, 'e');

  const temVirgula = t.includes(',');
  const temPonto = t.includes('.');
  if (temVirgula && temPonto) {
    // O separador decimal é o ÚLTIMO que aparece; o outro é de milhar.
    if (t.lastIndexOf(',') > t.lastIndexOf('.')) t = t.replace(/\./g, '').replace(',', '.');
    else t = t.replace(/,/g, '');
  } else if (temVirgula) {
    t = t.replace(',', '.');
  } else if (temPonto && /^[+-]?\d{1,3}(\.\d{3})+$/.test(t)) {
    t = t.replace(/\./g, ''); // "1.500" e "12.345.678" são milhares
  }

  if (!/^[+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?$/i.test(t)) return null;
  const valor = Number(t);
  return Number.isFinite(valor) ? valor : null;
}

/*
  FUNÇÃO: lerMedida
  PARA QUE SERVE: separa o NÚMERO da UNIDADE ("12,5 kN" -> 12.5 + kN) e traduz a
  unidade para a base da grandeza dela (kN vira newton). Devolve null quando o
  texto não é uma medida.
*/
export function lerMedida(texto) {
  const cru = String(texto ?? '').trim()
    .replace(/^[≈~=±]+/, '')
    .replace(/\s+/g, ' ');
  if (!cru) return null;

  // Pega o número no começo e o resto vira unidade.
  const casou = cru.match(/^([+-]?[\d.,]+(?:\s*[x*·]\s*10\s*\^?\s*[+-]?\d+)?(?:[eE][+-]?\d+)?)\s*(.*)$/);
  if (!casou) return null;
  const valor = lerNumero(casou[1]);
  if (valor === null) return null;

  let unidadeCrua = casou[2].trim();
  // tira multiplicadores e plural: "kN.m", "kN·m", "metros"
  const unidade = unidadeCrua
    .replace(/[.·*\s]/g, '')
    .replace(/²/g, '2').replace(/³/g, '3')
    .toLowerCase()
    .replace(/^metros?$/, 'm').replace(/^centimetros?$/, 'cm').replace(/^milimetros?$/, 'mm')
    .replace(/^quilometros?$/, 'km').replace(/^quilos?$/, 'kg').replace(/^gramas?$/, 'g')
    .replace(/^toneladas?$/, 't').replace(/^segundos?$/, 's').replace(/^minutos?$/, 'min')
    .replace(/^horas?$/, 'h').replace(/^newtons?$/, 'n');

  if (!unidade) return { valor, unidade: '', dimensao: '', base: valor, temUnidade: false };

  const achada = UNIDADES[unidade];
  if (!achada) return { valor, unidade, dimensao: 'desconhecida', base: valor, temUnidade: true };
  return { valor, unidade, dimensao: achada[0], base: valor * achada[1], temUnidade: true };
}

/*
  FUNÇÃO: respostasAceitas
  PARA QUE SERVE: junta todas as formas válidas de responder um cartão:
  o próprio gabarito, o campo `respostasAceitas` do cartão e as alternativas
  escritas com "|" dentro do verso ("12,5 kN | 12500 N").
*/
export function respostasAceitas(gabarito, extras = []) {
  const lista = [];
  String(gabarito ?? '').split('|').forEach(p => { if (p.trim()) lista.push(p.trim()); });
  (extras || []).forEach(p => { if (String(p).trim()) lista.push(String(p).trim()); });
  return lista.length ? lista : [String(gabarito ?? '')];
}

// Compara palavra a palavra: quantas palavras importantes do gabarito aparecem
// na resposta. Serve SÓ para decidir se vale a pena você conferir à mão — nunca
// para dar ponto sozinho.
function parecenca(a, b) {
  // Tira a pontuação colada nas palavras: "corpos," e "corpos" são a mesma
  // palavra, e era essa vírgula que fazia a conta de parecença errar.
  const palavras = (t) => normalizar(t)
    .split(' ')
    .map(p => p.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter(p => p.length > 3);
  const alvo = palavras(b);
  if (alvo.length === 0) return 0;
  const ditas = new Set(palavras(a));
  return alvo.filter(p => ditas.has(p)).length / alvo.length;
}

/*
  FUNÇÃO: corrigirResposta
  PARA QUE SERVE: o corretor em si.
  DEVOLVE: { situacao: 'certo' | 'errado' | 'revisar', motivo: 'texto explicando' }

  'revisar' quer dizer: "a máquina não tem como garantir; olhe o gabarito e diga
  você mesmo se acertou". Essa resposta NÃO conta ponto sozinha.
*/
export function corrigirResposta(resposta, gabarito, opcoes = {}) {
  const tolerancia = opcoes.tolerancia ?? TOLERANCIA_PADRAO;
  const dita = String(resposta ?? '').trim();
  if (!dita) return { situacao: 'errado', motivo: 'Não respondida.' };

  const aceitas = respostasAceitas(gabarito, opcoes.aceitas);

  // 1) bateu com alguma forma aprovada, no texto
  const ditaNua = normalizar(dita);
  if (aceitas.some(a => normalizar(a) === ditaNua)) {
    return { situacao: 'certo', motivo: 'Igual ao gabarito.' };
  }

  // 2) conta de engenharia: número + unidade
  const medidaDita = lerMedida(dita);
  for (const aceita of aceitas) {
    const medidaEsperada = lerMedida(aceita);
    // Só entra na conta de engenharia quando o gabarito é MESMO uma medida.
    // "2ª lei de Newton" começa com número, mas não é um valor com unidade —
    // esse cai no corretor de texto, logo abaixo.
    if (!medidaEsperada || medidaEsperada.dimensao === 'desconhecida') continue;
    if (!medidaDita) {
      return { situacao: 'errado', motivo: `A resposta esperada é um valor numérico (${aceita}).` };
    }

    const esperadaConhecida = medidaEsperada.dimensao && medidaEsperada.dimensao !== 'desconhecida';
    const ditaConhecida = medidaDita.dimensao && medidaDita.dimensao !== 'desconhecida';

    // unidade de outra grandeza NUNCA é "quase certo"
    if (esperadaConhecida && ditaConhecida && medidaDita.dimensao !== medidaEsperada.dimensao) {
      return {
        situacao: 'errado',
        motivo: `Unidade incompatível: ${medidaDita.unidade} mede ${medidaDita.dimensao}, e a resposta é em ${medidaEsperada.unidade} (${medidaEsperada.dimensao}).`,
      };
    }

    const usaBase = esperadaConhecida && ditaConhecida;
    const alvo = usaBase ? medidaEsperada.base : medidaEsperada.valor;
    const obtido = usaBase ? medidaDita.base : medidaDita.valor;
    const margem = Math.abs(alvo) * tolerancia || tolerancia;

    if (Math.abs(obtido - alvo) <= margem) {
      if (medidaEsperada.temUnidade && !medidaDita.temUnidade) {
        return { situacao: 'revisar', motivo: `O número está certo, mas faltou a unidade (${medidaEsperada.unidade}).` };
      }
      if (!usaBase && medidaEsperada.temUnidade && medidaDita.unidade !== medidaEsperada.unidade) {
        return { situacao: 'revisar', motivo: `Número certo, mas não reconheço a unidade "${medidaDita.unidade}". Confira você mesmo.` };
      }
      return { situacao: 'certo', motivo: 'Valor e unidade conferem.' };
    }
    return {
      situacao: 'errado',
      motivo: `Valor fora da tolerância de ${(tolerancia * 100).toFixed(0)}%: esperado ${aceita}.`,
    };
  }

  // 3) texto: parecido vira "confira você mesmo"; nada a ver vira errado
  const maiorParecenca = Math.max(...aceitas.map(a => parecenca(dita, a)));
  if (maiorParecenca >= 0.6) {
    return { situacao: 'revisar', motivo: 'Você escreveu com outras palavras. Confira no gabarito e diga se valeu.' };
  }
  return { situacao: 'errado', motivo: 'Diferente do gabarito.' };
}

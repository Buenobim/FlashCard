/*
  =============================================================================
  ARQUIVO: src/utils/aulasCore.js
  PARA QUE SERVE: é o MIOLO das aulas — só contas, nenhuma tela e nenhum banco.
  Aqui moram três regrinhas que parecem bobas e não são:

    - tamanhoLegivel:      724 -> "724 B", 8452 -> "8,3 KB"
    - proximoNumeroDeAula: já tem 1, 2 e 5? a próxima é a 6
    - montarTituloDaAula:  (1, "Ligações químicas") -> "Aula 01 — Ligações químicas"

  POR QUE FICAM SEPARADAS: pelo mesmo motivo do subBrainCore.js. Sem React e
  sem navegador, elas podem ser conferidas por um teste de terminal
  (`npm run testar`). Se a numeração das aulas quebrar, a gente descobre antes
  de você abrir a matéria e ver duas "Aula 03".
  =============================================================================
*/

/* 8452 -> "8,3 KB". Serve para você perceber, de relance, uma aula pesada. */
export function tamanhoLegivel(bytes) {
  const n = Number(bytes) || 0;
  if (n <= 0) return '0 KB';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

/*
  O próximo número livre.

  É o MAIOR + 1, de propósito — não "quantidade + 1". Se você apagar a Aula 02
  de um conjunto 1, 2, 3, contar daria 3 e criaria uma segunda "Aula 03".
*/
export function proximoNumeroDeAula(aulas = []) {
  const maior = (aulas || []).reduce((max, a) => Math.max(max, Number(a?.numero) || 0), 0);
  return maior + 1;
}

/* O título que aparece na lista, na esfera e no cabeçalho da leitura. */
export function montarTituloDaAula(numero, assunto) {
  const n = String(Math.max(1, Number(numero) || 1)).padStart(2, '0');
  const tema = (assunto || '').trim();
  return tema ? `Aula ${n} — ${tema}` : `Aula ${n}`;
}

/*
  lerNomeDoArquivo: aproveita o que você já escreveu no nome do arquivo.

  Você salva as aulas como "Aula 07 - Cinematica.html". Sem isto, o app jogaria
  o nome inteiro no campo Assunto e o título sairia "Aula 01 — Aula 07
  Cinematica" — com o número errado e a palavra "Aula" duas vezes. Aqui a gente
  separa as duas informações: o NÚMERO (7) e o ASSUNTO ("Cinematica").

  Devolve { numero, assunto }. `numero` vem null quando o nome não diz nenhum —
  nesse caso quem manda continua sendo a sugestão de proximoNumeroDeAula.
*/
export function lerNomeDoArquivo(nome) {
  const limpo = String(nome || '')
    .replace(/\.(html?|xhtml)$/i, '')   // tira a extensão
    .replace(/[-_]+/g, ' ')             // "aula_07-cinematica" -> "aula 07 cinematica"
    .replace(/\s+/g, ' ')               // espaços repetidos viram um só
    .trim();

  const casou = limpo.match(/^aulas?\s*n?[.º°]?\s*0*(\d{1,3})(?!\d)[\s\-–—:.]*/i);
  if (casou) {
    return { numero: Number(casou[1]) || null, assunto: limpo.slice(casou[0].length).trim() };
  }
  return { numero: null, assunto: limpo };
}

/* Conta os bytes de verdade do texto (acentos ocupam 2). `.length` mentiria. */
export function bytesDoTexto(texto) {
  if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(texto || '').length;
  return new Blob([texto || '']).size;
}

/* Um empurrãozinho: o que foi entregue parece mesmo uma página? */
export function pareceHtml(texto) {
  return /<\s*(html|head|body|div|section|h1|h2|p|table|article|main|style)\b/i.test(texto || '');
}

/* "2026-08-20" -> "20/08/2026". Sem fuso: a data da aula é só uma etiqueta. */
export function dataLegivel(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const [ano, mes, dia] = iso.split('-');
  return ano && mes && dia ? `${dia}/${mes}/${ano}` : '';
}

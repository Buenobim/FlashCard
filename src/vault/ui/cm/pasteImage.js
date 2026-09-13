/*
  =============================================================================
  ARQUIVO: src/vault/ui/cm/pasteImage.js
  PARA QUE SERVE: Colar print com Ctrl+V direto dentro da anotação.

  Você dá um PrintScreen, aperta Ctrl+V no meio do texto e a imagem entra ali,
  já aparecendo. Sem botão de anexar, sem escolher arquivo, sem sair do teclado.

  POR QUE A IMAGEM É REDIMENSIONADA ANTES DE ENTRAR: um print de tela cheia em
  PNG passa fácil de 3MB. Guardar isso cru encheria o banco e deixaria a nota
  lenta de abrir e de sincronizar. Então redesenhamos a imagem num canvas, com
  no máximo 1600px de largura, e salvamos em JPEG — o que costuma render uma
  imagem 10 a 20 vezes menor, sem diferença visível para leitura de print.

  (Antes, no editor de cartões, o limite era bem mais agressivo — 50KB — porque
  tudo ia para o LocalStorage de 5MB. Aqui a anotação mora no IndexedDB, que tem
  espaço de sobra, então dá para manter a imagem legível.)
  =============================================================================
*/

import { EditorView } from '@codemirror/view';

const LARGURA_MAXIMA = 1600;
const QUALIDADE = 0.82;

/*
  FUNÇÃO: comprimirImagem
  PARA QUE SERVE: Recebe o arquivo colado e devolve uma data-URI leve.
  Fica em JPEG por padrão; imagens com transparência (PNG) que sejam pequenas
  são mantidas como estão, para não ganharem fundo preto.
*/
function comprimirImagem(arquivo) {
  return new Promise((resolve, reject) => {
    const leitor = new FileReader();
    leitor.onerror = () => reject(new Error('Não consegui ler a imagem colada.'));
    leitor.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('A imagem colada parece estar corrompida.'));
      img.onload = () => {
        // Imagem pequena com transparência: melhor deixar intacta
        if (arquivo.type === 'image/png' && arquivo.size < 300 * 1024) {
          resolve(leitor.result);
          return;
        }

        const escala = Math.min(1, LARGURA_MAXIMA / img.width);
        const largura = Math.round(img.width * escala);
        const altura = Math.round(img.height * escala);

        const canvas = document.createElement('canvas');
        canvas.width = largura;
        canvas.height = altura;

        const ctx = canvas.getContext('2d');
        // Fundo branco: sem isso, um PNG transparente vira preto no JPEG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, largura, altura);
        ctx.drawImage(img, 0, 0, largura, altura);

        resolve(canvas.toDataURL('image/jpeg', QUALIDADE));
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(arquivo);
  });
}

/*
  FUNÇÃO: colarImagem
  PARA QUE SERVE: A extensão em si. Intercepta o Ctrl+V e, SÓ quando há imagem
  na área de transferência, assume o controle. Colar texto continua funcionando
  normalmente — é o comportamento que o editor já tinha.
*/
export function colarImagem({ aoFalhar } = {}) {
  return EditorView.domEventHandlers({
    paste(evento, view) {
      const itens = Array.from(evento.clipboardData?.items || []);
      const imagem = itens.find(i => i.type.startsWith('image/'));
      if (!imagem) return false; // não é imagem: deixa o editor colar o texto

      const arquivo = imagem.getAsFile();
      if (!arquivo) return false;

      evento.preventDefault();

      // Marcador enquanto a imagem é processada: colar um print grande leva um
      // instante, e sem esse aviso parece que o Ctrl+V não funcionou.
      const posicao = view.state.selection.main;
      const marcador = '![colando imagem...]()';
      view.dispatch({
        changes: { from: posicao.from, to: posicao.to, insert: marcador },
      });
      const inicio = posicao.from;

      comprimirImagem(arquivo)
        .then((dataUri) => {
          const markdown = `![](${dataUri})`;
          view.dispatch({
            changes: { from: inicio, to: inicio + marcador.length, insert: markdown },
            selection: { anchor: inicio + markdown.length },
          });
        })
        .catch((erro) => {
          // Desfaz o marcador para não deixar lixo no texto
          view.dispatch({
            changes: { from: inicio, to: inicio + marcador.length, insert: '' },
          });
          console.error('[Anotações] Falha ao colar imagem:', erro.message);
          aoFalhar?.(erro.message);
        });

      return true;
    },
  });
}

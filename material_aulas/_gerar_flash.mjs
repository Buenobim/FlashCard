/*
  Gera a seção de flashcards do HTML da aula a partir do JSON de dados.
  Escrever os cartões UMA única vez evita que o app e a página divirjam.
  Uso: node _gerar_flash.mjs aula01-dados.json _flash01.html "#60A5FA"
*/
import { readFileSync, writeFileSync } from 'node:fs';

const arquivo = process.argv[2];
const saida = process.argv[3];
const cor = process.argv[4] || '#E8933F';

const d = JSON.parse(readFileSync(arquivo, 'utf8'));
const cartoes = d.trilha.filter((b) => b.tipo === 'flashcard');
const nAula = String(d.aula.numero).padStart(2, '0');

/* O texto vai para dentro de uma string JS entre aspas duplas: escapa o que quebraria. */
const esc = (s) => String(s)
  .replace(/\\/g, '\\\\')
  .replace(/"/g, '\\"')
  .replace(/\n/g, ' ');

const linhas = cartoes
  .map((c) => `    ["Aula ${nAula}","${esc(c.term)}","${esc(c.definition)}"]`)
  .join(',\n');

const FECHA = '</' + 'script>';

const html = `
<!-- ================================================ FLASHCARDS ========== -->
<section id="sfc">
  <div class="sec-cab">
    <div class="sec-ico" style="background:${cor}1f; border-color:${cor}52">&#127183;</div>
    <div>
      <h2>Flashcards da aula ${nAula}</h2>
      <p>${cartoes.length} cartões &mdash; os mesmos que estão gravados na matéria. Clique para virar.</p>
    </div>
  </div>

  <div class="fc-barra">
    <button class="btn btn-l" id="fc-embaralhar">&#127922; Embaralhar</button>
    <button class="btn" id="fc-virar">&#128260; Virar todos</button>
    <button class="btn" id="fc-fechar">&#8617; Desvirar todos</button>
    <span style="font-size:12.5px; color:var(--mut); font-weight:600" id="fc-conta"></span>
  </div>

  <div class="fc-grid" id="fc-grid"></div>

  <script>
  var CARTOES = [
${linhas}
  ];

  (function(){
    var grid = document.getElementById('fc-grid');
    if(!grid) return;

    function pintar(lista){
      grid.innerHTML = '';
      lista.forEach(function(c, i){
        var b = document.createElement('button');
        b.className = 'fc'; b.type = 'button';
        b.setAttribute('aria-label', 'Flashcard ' + (i+1));
        b.innerHTML =
          '<div class="fc-int">' +
            '<div class="fc-face fc-frente">' +
              '<span class="fc-tema">' + c[0] + ' &middot; ' + (i+1) + '/' + lista.length + '</span>' +
              '<span class="fc-txt">' + c[1] + '</span>' +
              '<span class="fc-pista">clique para ver a resposta</span>' +
            '</div>' +
            '<div class="fc-face fc-tras">' +
              '<span class="fc-tema">Resposta</span>' +
              '<span class="fc-txt">' + c[2] + '</span>' +
            '</div>' +
          '</div>';
        b.addEventListener('click', function(){ b.classList.toggle('virado'); });
        grid.appendChild(b);
      });
      var conta = document.getElementById('fc-conta');
      if(conta) conta.textContent = lista.length + ' cartões';
    }

    pintar(CARTOES);

    document.getElementById('fc-embaralhar').addEventListener('click', function(){
      var c = CARTOES.slice();
      for(var i = c.length - 1; i > 0; i--){
        var j = Math.floor(Math.random() * (i + 1));
        var t = c[i]; c[i] = c[j]; c[j] = t;
      }
      pintar(c);
      grid.scrollIntoView({behavior:'smooth', block:'start'});
    });
    document.getElementById('fc-virar').addEventListener('click', function(){
      grid.querySelectorAll('.fc').forEach(function(f){ f.classList.add('virado'); });
    });
    document.getElementById('fc-fechar').addEventListener('click', function(){
      grid.querySelectorAll('.fc').forEach(function(f){ f.classList.remove('virado'); });
    });
  })();
  ${FECHA}
</section>
`;

writeFileSync(saida, html, 'utf8');
console.log(`${saida}: ${cartoes.length} cartões`);

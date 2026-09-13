# 📌 ARQUITETURA DO PROJETO: Aplicativo de Flashcards (Estilo Quizlet)

> **Regra de Ouro (Mateus 7:24-27 NVI):**
> *"Portanto, quem ouve estas minhas palavras e as pratica é como o homem prudente que construiu a sua casa sobre a rocha. Caiu a chuva, transbordaram os rios, sopraram os ventos e deram contra aquela casa, mas ela não caiu, porque estava alicerçada na rocha."*

Este documento serve como o alicerce técnico e conceitual para o desenvolvimento do nosso aplicativo de Flashcards. Ele foi estruturado para ser robusto, rápido, bonito e fácil de entender, mesmo por quem não entende de programação.

---

## 🎯 Objetivo do Aplicativo
Criar uma plataforma de estudos de Flashcards altamente interativa e responsiva (perfeita tanto para computador quanto para celular), inspirada nas melhores funcionalidades do Quizlet:
1. **Estudo Clássico (Cartões/Flashcards)**: Virar o cartão em 3D, marcar o que já sabe e o que ainda precisa estudar.
2. **Modo Aprender**: Exercícios de múltipla escolha gerados automaticamente a partir dos seus cartões para fixar o conteúdo.
3. **Modo Combinar (Jogo de Associação)**: Um jogo de arrastar e clicar para ligar termos às suas definições corretas no menor tempo possível, salvando o recorde.
4. **Modo Avaliação (Simulado)**: Um teste rápido com questões de verdadeiro/falso ou múltipla escolha para validar o aprendizado.
5. **Criação e Gestão de Listas (Sets)**: Adicionar, editar e remover listas de cartões de forma simples e intuitiva.
6. **Persistência Segura**: Todo o progresso, listas criadas e recordes salvos no próprio aparelho do usuário de forma automática (LocalStorage), com opção de exportar/importar arquivos JSON como backup (nunca perca seus dados!).

---

## 🏗️ Estrutura Tecnológica (Nossa "Rocha")

Para garantir que o aplicativo funcione perfeitamente, seja ultra-rápido, moderno e não dependa de servidores caros ou conexões de internet instáveis, escolhemos a seguinte estrutura:

1. **Frontend: React.js + Vite**
   - **Vite**: É a ferramenta mais moderna do mercado para iniciar projetos rápidos e leves.
   - **React.js**: Biblioteca do Facebook para criar interfaces interativas que reagem instantaneamente aos cliques do usuário (ótimo para virar cartões e rodar jogos).
2. **Estilização: Vanilla CSS (CSS Puro e Moderno)**
   - Sem frameworks pesados que deixam o site lento. Usaremos CSS moderno com variáveis, gradientes elegantes, animações 3D de alta performance para a rotação de cartões e total respo3. **Banco de Dados Local (LocalStorage)**
   - Os dados são salvos no próprio navegador do seu celular ou computador. Rápido, seguro, gratuito e offline!
4. **Hospedagem e Banco de Dados em Nuvem (Firebase)**
   - O aplicativo atuará de forma Híbrida: Salvamento local em **LocalStorage** para velocidade instantânea e tolerância a falhas (Zero Delay e Offline First) e sincronização em background com **Firebase Firestore** para backup seguro e uso em múltiplos dispositivos. 
   - **Isolamento por Código de Sincronização**: Cada usuário tem seu próprio código de sincronização único que impede a sobreposição de baralhos na nuvem do Firebase, permitindo sincronizar múltiplos aparelhos com total privacidade.
   - **Sistema de Categorias (Grupos de Estudo)**: O aplicativo permite organizar baralhos sob os grupos de estudos: Faculdade, Inglês, IA, BIM ou grupos criados sob demanda.
   - **Isolamento por Perfis de Estudantes (Desvio Autorizado)**: O aplicativo oferece uma tela inicial de perfis ("Quem vai estudar?") que isola baralhos, recordes, categorias, mapa mental e códigos de sincronização por estudante (ex: **Bruno Bueno** e **Bruna Bueno**), garantindo que os estudos de um não sobrescrevam ou interferiram nos dados do outro.
   - **BRUNO OS (O Cérebro Digital - Desvio Autorizado)**: O aplicativo utiliza o Mapa Mental em 3D Canvas (`BrunoMindMap.jsx`) como o portal inicial do sistema. Cada nódulo/esfera do cérebro (Faculdade, Estudos, Finanças, Hábitos) atua como um disparador de sub-aplicativos (Flashcards, Caderno, Finanças, Hábitos), salvando e sincronizando a estrutura do mapa mental no Firebase.
   - A hospedagem do site na internet é feita utilizando o **Firebase Hosting**, permitindo a distribuição em alta velocidade global via CDN. O acesso é feito através da URL: `https://flashcards-fd7eb.web.app`.
5. **Suporte a Imagens Offline via Área de Transferência (Ctrl+V)**
   - O usuário pode tirar um print do computador e colá-lo diretamente com Ctrl+V nas definições de resposta dos cartões no editor.
   - Para respeitar o princípio da "Rocha" (robustez e segurança a longo prazo) e evitar que o LocalStorage de 5MB do navegador fique cheio com imagens gigantes de alta resolução, o aplicativo comprime e redimensiona a imagem colada de forma invisível em tempo real usando um Canvas do HTML5. O resultado é um arquivo JPEG leve (< 50KB) em formato Base64, que é salvo e exportado com facilidade em backups JSON!

---

## 📂 Organização das Pastas (Diretórios)

```text
Aplicativo_Flash_Card/
├── @ARQUITETURA.md               <- Este arquivo com o plano estrutural (Não alterar sem aprovação)
├── @historico_de_execucao.md      <- Diário de bordo contendo tudo que já foi feito passo a passo
├── package.json                   <- Configurações de dependências do projeto
├── vite.config.js                 <- Configurações do Vite
├── firebase.json                  <- Configuração do Firebase Hosting (publica a pasta "dist")
├── .firebaserc                    <- Aponta para o projeto Firebase de destino (flashcards-fd7eb)
├── .env                           <- Chaves secretas do Firebase (protegido pelo .gitignore, NUNCA vai para o GitHub)
├── .env.example                   <- Modelo de etiqueta mostrando quais chaves preencher no .env
├── index.html                     <- Página HTML principal (a casca do aplicativo)
└── src/                           <- Onde fica toda a mágica (código fonte)
    ├── main.jsx                   <- Ponto de partida do React
    ├── App.jsx                    <- Componente principal que gerencia as páginas e a sincronização
    ├── index.css                  <- Nosso sistema de design (cores, fontes, temas escuros)
    ├── components/                <- Componentes reutilizáveis (menu e modais)
    │   ├── Navbar.jsx             <- Menu superior + botões de Backup (Exportar/Importar JSON) e status da Nuvem
    │   ├── AulaEditorModal.jsx    <- Janela de guardar uma AULA (número, assunto, data e o HTML)
    │   └── SyncModal.jsx          <- Modal para gerenciar código e pareamento na nuvem do Firebase
    ├── pages/                     <- Nossas telas principais
    │   ├── ProfileSelect.jsx      <- Tela de seleção de perfil "Quem vai estudar?" (Estilo Netflix)
    │   ├── BrunoMindMap.jsx       <- BRUNO OS: O Cérebro Digital (Mapa 3D interativo com atalhos de apps)
    │   ├── Dashboard.jsx          <- Painel de Flashcards (suas listas, estatísticas e filtro por grupos)
    │   ├── CreateEditSet.jsx      <- Editor de listas de cartões (inclui colar imagem com Ctrl+V)
    │   ├── FlashcardMode.jsx      <- Modo Clássico (a virada 3D do cartão é feita aqui mesmo, sem componente à parte)
    │   ├── LearnMode.jsx          <- Modo Aprender (Múltipla escolha dinâmico)
    │   ├── MatchMode.jsx          <- Modo Combinar (Jogo de ligar cartões com tempo)
    │   ├── TestMode.jsx           <- Modo Avaliação (Simulado com nota)
    │   ├── HabitsMode.jsx          <- Módulo de Hábitos gamificado
    │   ├── FinanceMode.jsx         <- Módulo de Controle Financeiro
    │   ├── NotebookCanvas.jsx     <- Caderno de anotações e desenhos (Excalidraw)
    │   └── AulaViewer.jsx         <- Leitura da AULA em HTML (dentro de um iframe isolado)
    └── utils/                     <- Funções auxiliares (salvar dados e sincronizar a nuvem)
        ├── db.js                  <- Gerenciador Híbrido de dados (LocalStorage + Firebase Firestore)
        ├── aulasCore.js           <- Miolo das aulas (numeração, título, tamanho) — testável sem navegador
        └── firebase.js            <- Conexão segura e resiliente com o Firebase (Firestore)
```

### 🎓 AS AULAS DA FACULDADE (guardadas dentro da matéria)

Cada matéria do Sub-Cérebro tem uma esfera **Aula**. Dentro dela ficam as aulas que
você teve — "Aula 01", "Aula 02" — e cada uma é a **página HTML pronta**, aberta com
o visual original intacto.

**Onde cada coisa mora (e por quê):**

| O quê | Onde | Por quê |
|---|---|---|
| Ficha da aula (número, assunto, data, tamanho) | `deck.subItems`, junto do baralho | É leve: algumas centenas de bytes |
| O HTML da aula | IndexedDB, na chave `aula:<id>` | O LocalStorage tem teto de ~5MB para o site TODO |
| Cópia na nuvem | `users/<deckCloudId>/aulas/<id>/parts/<n>` | Um documento do Firestore só aguenta 1MB — vai partido em pedaços |

> ⚠️ **A regra que não pode ser quebrada:** o HTML **nunca** entra no objeto do
> baralho. Uma única aula com imagens embutidas estoura o LocalStorage e o limite do
> Firestore — e aí o baralho INTEIRO deixa de salvar, levando junto os flashcards e a
> trilha. É o mesmo caminho já provado pelo Caderno.

> ⚠️ **A nuvem nunca é esperada na hora de salvar.** Sem internet, o `setDoc` do
> Firestore não devolve erro: ele fica pendurado até a rede voltar. Se a tela
> esperasse por ele, o botão ficaria em "Salvando…" para sempre. O IndexedDB é quem
> decide se salvou; a subida acontece em segundo plano.

**Segurança:** a aula é desenhada num `<iframe sandbox="allow-scripts allow-popups">`,
**sem** `allow-same-origin`. O CSS e o JavaScript da própria aula funcionam, mas a
página fica com origem opaca: não enxerga nem mexe nos seus baralhos, no seu login ou
na nuvem. Por isso também não existe "abrir em nova aba" — existe **baixar o .html**,
que dá a mesma liberdade sem tirar a aula da caixa.

> 📝 **Nota de rastreabilidade:** O modo Flashcards Clássico (virada 3D) e as funções de Backup (Importar/Exportar JSON) foram integrados diretamente dentro de `FlashcardMode.jsx` e `Navbar.jsx`, respectivamente. Por isso não existem os arquivos separados `Flashcard.jsx` e `ImportExportModal.jsx` — a lógica mora dentro dos componentes acima.

---

## 🗄️ O COFRE — A Casca da Plataforma (estilo Obsidian)

A partir do Passo 36, o aplicativo **abre no Cofre**. Ele é a janela da plataforma inteira, no mesmo espírito do [Obsidian](https://obsidian.md/): notas em Markdown que se ligam por `[[links]]`, um grafo do conhecimento, abas e divisão de tela.

### O Grafo é o mapa dos seus ESTUDOS (não de notas soltas)
Um grafo só de notas seria uma constelação bonita e inútil. Por isso os **grupos de estudo** e os **baralhos de flashcards** são nós de primeira classe no mapa:

```text
   [ FACULDADE ]  ←─ grupo (laranja, com halo, nome sempre visível)
        ├── Física Geral e Experimental II · 43 cartões   ←─ baralho (amarelo)
        │          ↕                                       ←─ [[link]] que VOCÊ escreveu
        │     Resumo de Ondas                              ←─ sua nota (azul)
        └── Cálculo Integral e Diferencial II · 4 cartões
```

**Dois tipos de ligação, de propósito:**
- **Estrutural** (Faculdade → Cálculo I): vem da organização dos seus baralhos, é automática, você não escreve nada. Mola curta e forte — é o que faz cada grupo virar um **cacho** visível.
- **Por `[[link]]`**: nota ↔ baralho, nota ↔ nota. Mola longa e frouxa, então uma nota que conecta duas matérias fica **entre** os dois cachos — que é a informação mais valiosa que o mapa pode te dar.

**Como isso se mantém sozinho:** `src/vault/core/deckBridge.js` lê os baralhos e registra no índice. Criou, apagou ou renomeou um baralho? O mapa se redesenha. A ponte é de **mão única** — ela lê os flashcards e **nunca escreve neles**. Se o Cofre inteiro for removido, os baralhos continuam intactos.

**O que dá para fazer com isso:**
- Escrever `[[Física Ger` numa nota e o autocompletar já oferece o baralho da matéria.
- Clicar no baralho no grafo (ou no link dentro da nota) abre os Flashcards **já naquele baralho**, com os 4 modos de estudo à mostra.
- Clicar num grupo abre os Flashcards **filtrados por aquele grupo**.
- Um baralho sem grupo cai num nó "Sem Grupo" — o lembrete visual de que falta organizar.

### A regra que faz tudo ficar lógico: **tudo é aba**
Existe um único tipo de recipiente — a **aba**. Dentro dela pode morar qualquer coisa: uma nota, o grafo, os Flashcards, as Finanças, os Hábitos, o Cérebro Digital. Por isso dá para estudar com os flashcards de um lado e a nota de resumo do outro, ao mesmo tempo. Os módulos deixaram de ser ilhas.

### Por que NÃO viramos um app de computador (Tauri/Electron)
O plano de referência sugeria reescrever tudo em Tauri + Rust. Isso jogaria fora o aplicativo atual e, principalmente, **deixaria de funcionar no celular**. Mantivemos React + Vite + Firebase e implementamos a *lógica* do Obsidian dentro dele — assim você tem as duas coisas.

### Por que as notas NÃO usam o LocalStorage
O LocalStorage tem teto de **~5MB para o site inteiro**, e ele já está dividido entre baralhos, cadernos com fotos, finanças e hábitos. Um cofre de notas ali dentro estouraria e **derrubaria os flashcards junto**. As notas moram no **IndexedDB** (o banco de dados de verdade do navegador, centenas de MB), num banco **separado** chamado `bueno_vault`. Nada do que já existia foi tocado.

### O caminho de um dado, sempre nesta ordem
```text
 você digita
     ↓
 1. ÍNDICE EM MEMÓRIA   -> a tela e os backlinks reagem na hora
     ↓
 2. IndexedDB           -> não perde se fechar o navegador (funciona offline)
     ↓
 3. Firebase Firestore  -> chega nos seus outros aparelhos
```
A tela **nunca espera** os passos 2 e 3. É isso que dá a sensação de instantâneo.

### Privacidade das notas
- Notas normais: **privadas por perfil** (mesmo endereço já usado pelos baralhos).
- Pasta **`Compartilhado/`**: acervo único do casal — Bruno e Bruna enxergam e editam.
- Apagar grava uma **lápide** na nuvem. Sem isso, apagar no celular faria a nota ressuscitar no computador.

### Estrutura de pastas do Cofre
```text
src/
├── vault/                       <- O COFRE (não conhece Flashcards nem Finanças)
│   ├── core/                    <- Regras puras: entra dado, sai dado
│   │   ├── parser.js            <- Lê a nota: wikilinks, tags, títulos, tarefas, frontmatter
│   │   ├── metadataCache.js     <- Índice em memória: backlinks, links quebrados, grafo
│   │   ├── linkRewriter.js      <- Ao renomear, conserta os [[links]] de quem citava
│   │   ├── vaultManager.js      <- O gerente: TODA escrita passa por aqui
│   │   ├── search.js            <- Busca por nome (Ctrl+O) e no texto (Ctrl+Shift+F)
│   │   └── events.js            <- Quadro de avisos que desacopla as peças
│   ├── storage/
│   │   ├── idb.js               <- O "disco": IndexedDB
│   │   └── cloudSync.js         <- Firebase: privado por perfil + pasta compartilhada
│   ├── ui/
│   │   ├── ObsidianShell.jsx    <- A casca: trilho, laterais, abas, divisão de tela
│   │   ├── Explorer.jsx         <- Árvore de arquivos (as pastas são deduzidas do caminho)
│   │   ├── NoteEditor.jsx       <- Editor CodeMirror 6
│   │   ├── BacklinksPanel.jsx   <- Quem cita esta nota, com a frase de contexto
│   │   ├── SearchPanel.jsx      <- Busca global + nuvem de tags
│   │   ├── GraphView.jsx        <- O grafo (canvas com física de atração/repulsão)
│   │   ├── Palette.jsx          <- Ctrl+O e Ctrl+P
│   │   ├── dialogs.jsx          <- Menu do botão direito e caixas de confirmação
│   │   ├── useVault.js          <- Ponte entre o cofre e o React (com throttle)
│   │   └── cm/                  <- Extensões do editor
│   │       ├── livePreview.js   <- Esconde o Markdown fora da linha do cursor
│   │       ├── wikilinkComplete.js <- Autocompletar ao digitar "[["
│   │       └── editorTheme.js   <- Aparência do editor
│   └── vault.css                <- Tema do Cofre (todas as classes começam com "cofre-")
└── modules/
    └── FlashcardsModule.jsx     <- Flashcards empacotado para caber numa aba
```

### Atalhos de teclado
| Atalho | O que faz |
|---|---|
| `Ctrl+O` | Abrir nota (digite parte do nome) |
| `Ctrl+P` | Paleta de comandos (tudo que dá para fazer) |
| `Ctrl+N` | Nova nota |
| `Ctrl+G` | Abrir o grafo |
| `Ctrl+Shift+F` | Buscar em todas as notas |
| `Ctrl+B` | Mostrar/esconder a lateral |
| `Ctrl+\` | Dividir a tela |
| `Ctrl+W` | Fechar a aba |

### Sem aprisionamento
As notas são Markdown puro. Os `[[links]]`, `#tags` e `- [ ]` são a mesma sintaxe do Obsidian de verdade — se um dia você quiser levar tudo para lá, os arquivos abrem sem conversão.

---

---

## 🧭 A TRILHA — como uma matéria é montada e estudada

### O que é
Uma matéria não é uma pilha de cartões: é uma **sequência de blocos**, na ordem em que
você estuda. Seção → anotação → print do slide → flashcard → link da videoaula →
pegadinha de prova → flashcard. Você escreve de cima para baixo, como no caderno.

Nove tipos de bloco (`src/estudo/trilhaCore.js` → `TIPOS_DE_BLOCO`):

| Tipo | Para que serve | É cobrado? |
|---|---|---|
| `flashcard` | pergunta e resposta | **sim** — entra na revisão |
| `nota` | resumo, raciocínio, o "porquê" | não, se lê |
| `imagem` | print do slide, foto do quadro | não, se lê |
| `link` | videoaula, artigo, PDF | não, se lê |
| `formula` | a fórmula em destaque | não, se lê |
| `codigo` | trecho de código, fonte monoespaçada | não, se lê |
| `atencao` | a pegadinha, o erro que já cometeu | não, se lê |
| `duvida` | o que ficou mal resolvido | não, se lê |
| `secao` | divide a matéria; vira o título no estudo | não, é o cabeçalho |

### A regra de ouro do armazenamento (é ela que impede tudo de quebrar)

> **`deck.cards` guarda o TEXTO e o AGENDAMENTO dos flashcards.
> `deck.blocos` guarda só a ORDEM e o conteúdo que NÃO é flashcard.**

Um bloco de flashcard é apenas um ponteiro (`{ tipo:'flashcard', cardId }`). Por causa
disso:

* **Cartões 3D, Aprender, Combinar, Simulado, Treino do Dia e o Sub-Cérebro continuam
  lendo `deck.cards` como sempre** — nenhum deles precisou de uma linha de mudança;
* **todo baralho antigo abre já virado em trilha**: `lerTrilha()` transforma cada cartão
  existente num bloco, na mesma ordem;
* **cartão criado em outra tela nunca some**: ao ler a trilha, todo cartão sem bloco entra
  no fim da fila.

Ida-e-volta garantido por teste (`testes/trilha.mjs`): montar → gravar → reler devolve
exatamente a mesma trilha, **sem perder o agendamento da repetição espaçada**.

### A repetição espaçada (SM-2)
Saiu a escadinha fixa 1→3→7→14→30 dias, igual para todo cartão. Entrou o **SM-2**, o
motor do Anki: cada cartão carrega a **facilidade** dele, e o intervalo cresce conforme
o quanto CUSTOU lembrar. Quatro notas — **Errei / Difícil / Bom / Fácil** — e o botão já
mostra quando o cartão volta. Errar traz o cartão de volta **na mesma sessão**.

A conta mora em `trilhaCore.js` (`proximoAgendamento`), sem nenhuma tela, e é conferida
por `npm run testar`. O `db.js` apenas a aplica.

### Arquivos
```text
src/estudo/
├── trilhaCore.js        <- miolo sem tela: tipos, migração, projeção, SM-2, roteiro
├── Trilha.jsx           <- o compositor (montar a matéria em blocos)
├── EstudarTrilha.jsx    <- a sessão de estudo em tela cheia + a escolha do modo
└── trilha.css           <- visual das duas telas
testes/trilha.mjs        <- 47 conferências do miolo (roda com `npm run testar`)
```

### Os três modos de estudar a mesma matéria
* **Estudar a matéria** — a trilha inteira, do primeiro ao último bloco. Para quando você
  está aprendendo o assunto.
* **Revisar o que venceu** — só os cartões que a repetição espaçada marcou para hoje.
  É o estudo de manutenção; é ele que segura a matéria na cabeça.
* **Só o que eu erro** — os cartões com mais tropeços primeiro. Para a véspera da prova.

### O diário de estudo
`db.js` guarda um registro **por dia** (respostas, acertos, minutos) e dele sai a
**sequência de dias seguidos** que aparece no painel. Sincroniza na nuvem pegando sempre
o maior número de cada dia, para estudar no celular e no computador somar em vez de
apagar.


---

## ☁️ A SINCRONIZAÇÃO — as regras que impedem a matéria de sumir

Esta é a parte do sistema onde um erro não é um botão torto: é conteúdo perdido.
Por isso as CONTAS ficam em `src/utils/sincroniaCore.js` — um arquivo sem tela, sem
navegador e sem Firebase, conferido por `npm run testar`.

### As quatro regras

1. **Salvar nunca apaga.** `saveSets` só escreve (e só os baralhos cuja assinatura
   de conteúdo mudou). Um baralho faltar na lista deste aparelho NÃO quer dizer que
   ele foi apagado — pode ser que ele tenha nascido no outro aparelho.
2. **Apagar é uma decisão sua, e ela viaja.** `registrarExclusaoDeBaralho` grava uma
   "lápide" (`{id, em}`) no aparelho e em `users/<código>/exclusoes/<id>`, e manda a
   nuvem apagar o documento. É a lápide que apaga o baralho no celular também — e
   que impede um aparelho desatualizado de ressuscitá-lo.
3. **Sincronizar é JUNTAR, nunca substituir.** `juntarBaralhosLocalENuvem` decide:
   só no aparelho → fica e sobe; só na nuvem → entra; nos dois → vence o `updatedAt`
   mais novo; empate → vence quem tem mais conteúdo; com lápide → sai dos dois lados.
   (A única exceção é a PRIMEIRA sincronização de um perfil num aparelho novo, em que
   a nuvem manda — ali a gaveta local está vazia mesmo.)
4. **Quem não confirmou não está salvo.** Todo envio entra numa fila; só sai dela
   quando a nuvem confirma. O selo (`assinarEstadoDaNuvem`) leva esse estado para a
   tela: "Nuvem" (tudo certo), "Subindo (n)" ou "Falhou", com o motivo em português.
   Falha de nuvem nunca é perda: a cópia do aparelho já está gravada e sobe sozinha
   na próxima sincronização.

### Backup: adicionar ≠ restaurar

* **Adicionar ao acervo** — junta o conteúdo e não encosta em mais nada. Baralho
  idêntico é ignorado (importar duas vezes não duplica); baralho com o mesmo id e
  conteúdo diferente entra como cópia "(importado)", sem tocar no seu.
* **Restaurar backup** — substitui tudo. Só com prévia, confirmação em duas etapas e
  uma cópia do estado anterior guardada no aparelho.

O arquivo é conferido INTEIRO (`validarConteudoDeBackup`) antes da primeira gravação:
arquivo inválido não altera nada, nem pela metade.

---

## ✅ O CORRETOR — por que a prova parou de dar erro em resposta certa

`src/estudo/correcaoCore.js` (sem tela, testado por `npm run testar`):

* **Número e unidade**: "12,5 kN", "12.5 kN" e "12500 N" são a mesma resposta;
  "12,5 kg" **não** é — unidade de outra grandeza é erro, não arredondamento.
  Tolerância de 1%. Entende número brasileiro ("1.234,56") e científico ("3x10^5").
* **Respostas alternativas**: aprovadas por você, com "|" no verso do cartão
  ("momento fletor | momento de flexão") ou no campo `respostasAceitas`.
* **Texto conceitual**: igual (sem acento/caixa) vale ponto; escrito com outras
  palavras vira **"Confira você mesmo"** — a máquina não chuta, você decide no
  gabarito e a nota se refaz. Toda correção explica o porquê.

`src/estudo/questoesCore.js` monta as alternativas: nenhuma opção errada pode repetir
a resposta certa, e uma afirmação só é marcada como FALSA quando é mesmo falsa. Sem
alternativa honesta disponível, a questão vira escrita.

## 🎨 Sistema de Design e Experiência do Usuário (Premium & Wow Factor!)

Para que você se sinta em um aplicativo premium, usaremos as seguintes diretrizes de design:
- **Cores Sofisticadas**: Um tema escuro elegante por padrão, com tons de azul profundo, roxo vibrante e gradientes suaves para realçar botões e cartões de forma moderna.
- **Tipografia Moderna**: Importação da fonte **Outfit** ou **Inter** do Google Fonts para leitura perfeita, mesmo em telas pequenas de celular.
- **Animações Fluidas**: Virar o cartão deve parecer natural, com sombras dinâmicas que dão sensação de profundidade. Efeitos de "hover" (passar o mouse) interativos nos botões.
- **Feedback Visual Claro**: Quando você acertar uma resposta no modo Combinar, a tela piscará em verde suave; se errar, um leve balanço indicará o erro.

---

## 🧪 Plano de Validação (Como testaremos tudo)
1. **Testes de Usabilidade**: Verificar se os cartões viram com 1 clique (ou toque na tela do celular).
2. **Design Responsivo**: Testar em telas de celular emuladas e computadores para garantir que nenhum texto saia da tela ou fique cortado.
3. **Persistência de Dados**: Fechar o navegador, reabrir e garantir que as listas criadas continuem salvas exatamente como estavam.
4. **Estatísticas e Recordes**: Verificar se o menor tempo do modo Combinar é salvo e atualizado corretamente ao quebrar recordes.

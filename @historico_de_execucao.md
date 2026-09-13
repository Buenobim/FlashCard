# 📝 HISTÓRICO DE EXECUÇÃO: Aplicativo de Flashcards

Este arquivo registra todo o progresso do desenvolvimento do aplicativo, passo a passo, para garantir rastreabilidade, qualidade e alinhamento com a arquitetura definida. Seguindo o nosso versículo de ouro (**Mateus 7:24-27**), construímos a aplicação sobre a rocha da simplicidade, da robustez sem banco de dados complexo (100% persistente no navegador) e com design premium.

---

## 📅 Status Atual do Projeto
* **Data de Início**: 18 de Maio de 2026
* **Última Atualização**: 01 de Julho de 2026
* **Fase Atual**: Expansão de Flashcards para **Plataforma Bueno** (Fases 1–3 concluídas: Menu, Hábitos e Finanças)
* **Status**: 🟢 **ONLINE E EM USO!** (Hospedado no Firebase e sincronizando na nuvem)

---

## 🛠️ Registro de Passos Executados

### Passo 1: Análise e Fundação da Arquitetura
* **Data**: 18 de Maio de 2026
* **O que foi feito**:
  - Analisamos a pasta de trabalho que estava vazia.
  - Desenvolvemos e criamos o arquivo `@ARQUITETURA.md`, estabelecendo a escolha do **React.js + Vite** e **Vanilla CSS** para construir uma aplicação bonita, extremamente rápida, responsiva e independente de servidores através do **LocalStorage** e recursos de **Importação/Exportação JSON**.
  - Criamos este arquivo `@historico_de_execucao.md` para documentar todo o processo de forma clara e legível para leigos.
* **Resultado**: Estrutura mental e técnica definida na "rocha" (Mateus 7:24-27).

### Passo 2: Inicialização Física e Módulo de Persistência (Alicerce)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - Inicializamos o projeto React com Vite na raiz da pasta `Aplicativo_Flash_Card` de forma limpa.
  - Instalamos o pacote de ícones modernos `lucide-react`.
  - Criamos o módulo `src/utils/db.js` que gerencia a gravação e leitura de dados no **LocalStorage** do navegador. Ele já vem com dois baralhos de demonstração prontos (Viagem e Geografia) para o usuário não ver uma tela vazia no primeiro uso. Ele também implementa a exportação e importação de backups em arquivo `.json`.
* **Resultado**: O alicerce de dados foi testado e fixado com sucesso na rocha. Os dados não somem mesmo se o computador for desligado!

### Passo 3: Criação do Design System e Estilos Premium (Pintura e Acabamento)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - Desenvolvemos o arquivo `src/index.css` contendo uma paleta de cores Dark Mode moderna baseada em HSL, tipografia elegante integrada ao Google Fonts, e os efeitos complexos de animação 3D (como rotação tridimensional de cartões, efeitos shake de erro e pulse de acertos).
* **Resultado**: Um visual extremamente moderno, escuro e premium com animações fluidas.

### Passo 4: Navbar, Dashboard e Editor de Baralhos (Interface Principal)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - **Menu Superior (`src/components/Navbar.jsx`)**: Desenvolvemos uma barra superior com o logotipo "FlashCard", um botão de atalho para novos baralhos e a área de Importação/Exportação de Backups.
  - **Painel Principal (`src/pages/Dashboard.jsx`)**: Criamos um painel estatístico com quatro cartões de conquistas e a grade de baralhos criados. Cada baralho possui um botão de "Excluir" com confirmação dupla de segurança e um botão de "Editar".
  - **Editor Dinâmico (`src/pages/CreateEditSet.jsx`)**: Criamos um formulário altamente responsivo onde o usuário pode dar título e descrição ao baralho e adicionar/remover cartões de termo e definição dinamicamente em tempo real com validações completas (título obrigatório e mínimo de 2 cartões).
* **Resultado**: Telas administrativas fluidas e com total controle de dados pelo usuário.

### Passo 5: Modos de Estudo Interativos (Coração do Aplicativo)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - **Modo Flashcards Clássico (`src/pages/FlashcardMode.jsx`)**: Desenvolvemos a física 3D real de rotação de cartões. Implementamos atalhos de teclado de alto desempenho (Espaço vira, Seta Esquerda marca como "Ainda Aprendendo", Seta Direita marca como "Sei Tudo!"). Adicionamos a opção de reestudar apenas os cartões difíceis.
  - **Modo Aprender Inteligente (`src/pages/LearnMode.jsx`)**: Desenvolvemos uma IA local de quiz múltipla escolha que gera alternativas falsas embaralhadas a partir de outros cartões do baralho e oferece reestudo inteligente de erros.
  - **Modo Combinar (`src/pages/MatchMode.jsx`)**: Jogo de associação cronometrado contra o relógio em milissegundos. Combinações corretas desaparecem e erros trepidam em vermelho. Guarda o recorde de menor tempo em LocalStorage.
  - **Modo Simulado / Avaliação (`src/pages/TestMode.jsx`)**: Avaliação completa que mistura questões de Verdadeiro/Falso, Múltipla Escolha e questões Dissertativas (onde você digita e o corretor compara sem ligar para maiúsculas/minúsculas). Dá nota em percentual e atribui conceito (como A+ ou F).
* **Resultado**: As quatro ferramentas clássicas do Quizlet integradas de forma 100% responsiva para celular e computador.

### Passo 6: Roteamento Central e Verificação Visual Automatizada (Polimento e Entrega)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - Modificamos o `src/App.jsx` para atuar como roteador de estado e persistência global do LocalStorage, integrando a Navbar, o Dashboard e todas as 5 páginas criadas em um fluxo contínuo.
  - Atualizamos a página principal `index.html` para definir o idioma padrão em português (`pt-BR`) e dar o título premium da plataforma: `"⚡ FlashCard | Estude como um Gênio!"`.
  - Executamos com sucesso o comando `npm run build` para garantir que toda a plataforma compila sem erros (100% de sucesso em apenas 322 milissegundos!).
  - Rodamos o navegador automatizado e realizamos um estudo interativo completo jogando o modo Combinar e os Flashcards. O teste foi concluído com sucesso total, gravando o recorde de **41.46s** no LocalStorage e atualizando a interface em tempo real!
* **Resultado**: Entrega perfeita. O aplicativo está ativo, rodando perfeitamente.

### Passo 7: Suporte Avançado de Imagens por Área de Transferência (Ctrl+V) e Seletor
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - **Recurso de Ctrl+V no Editor (`CreateEditSet.jsx`)**: Implementamos a interceptação de eventos de colagem (`onPaste`) na linha de cada cartão. Ao pressionar `Ctrl+V` contendo um print screen ou imagem da área de transferência, ela é capturada automaticamente.
  - **Algoritmo de Compressão Inteligente por Canvas**: Construímos uma rotina que redimensiona imagens grandes para no máximo 600px de largura e as exporta em formato JPEG ultra-compacto (<50KB) em Base64. Isso respeita a regra da "Rocha" (Mateus 7:24-27), garantindo que a memória de 5MB do LocalStorage nunca seja esgotada por prints de alta resolução.
  - **Seletor para Celulares**: Adicionamos um botão físico de upload ("Anexar Foto") em cada cartão para que usuários em dispositivos móveis possam facilmente anexar capturas da galeria ou tirar fotos com a câmera.
  - **Renderização nos Modos de Estudo**:
    - **Modo Flashcards (`FlashcardMode.jsx`)**: Renderiza a imagem perfeitamente ajustada na face traseira (resposta) da carta de estudos em 3D.
    - **Modo Aprender (`LearnMode.jsx`)**: Exibe uma miniatura estilizada nas alternativas do questionário.
    - **Jogo Combinar (`MatchMode.jsx`)**: Exibe as miniaturas nas metades de definição do tabuleiro de associação de cartões.
    - **Simulado Avaliativo (`TestMode.jsx`)**: Apresenta as imagens tanto nas alternativas da prova ativa quanto na folha de correção (Gabarito) para que você saiba exatamente o que errou de forma visual.
  - **Validação de Compilação final**: Executamos o build que terminou com sucesso total em 344 milissegundos!
* **Resultado**: Um recurso de extrema produtividade implementado com perfeição técnica e integrado aos dados offline.

### Passo 8: Sistema de Visualização Ampliada (Lightbox) em Todo o Sistema (Cinema Mode)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - **Estilização Premium (`src/index.css`)**: Desenvolvemos uma folha de estilos contendo desfoque de fundo (backdrop-filter de 8px), cores escuras em azul profundo e animação spring com curva cúbica de aceleração suave (`zoomIn`) para ampliação imediata.
  - **Estado e Modais nos 5 Componentes de Tela**:
    - **Editor de Cartões (`CreateEditSet.jsx`)**: Ao clicar na miniatura no editor de baralho, ela se expande instantaneamente em tela cheia com alta qualidade.
    - **Modo Flashcards (`FlashcardMode.jsx`)**: Ao clicar na foto dentro da face traseira da carta 3D, a imagem se expande sem rotacionar ou desvirar o cartão graças à interceptação cirúrgica com `e.stopPropagation()`.
    - **Modo Aprender Quiz (`LearnMode.jsx`)**: Ampliação de diagramas direto nas opções de múltipla escolha sem ativar a resposta correspondente (com `e.stopPropagation()`).
    - **Jogo Combinar (`MatchMode.jsx`)**: Expansão dos blocos na grade de ligar sem selecionar as cartas no tabuleiro de jogo.
    - **Simulado Avaliativo (`TestMode.jsx`)**: Oferece zoom tanto nas imagens das alternativas durante a prova quanto nas figuras contidas no gabarito pós-entrega.
  - **Usabilidade Simples**: O fechamento é intuitivo, bastando o usuário clicar em qualquer área vazia do fundo escuro.
  - **Compilação de Validação**: Testamos com `npm run build` e o projeto compilou perfeitamente em 317 milissegundos!
* **Resultado**: Uma experiência visual extremamente profissional e útil para estudar esquemas e diagramas detalhados.

### Passo 9: Sincronização em Nuvem em Tempo Real (Supabase + GitHub + Vercel)
* **Data**: 19 de Maio de 2026
* **O que foi feito**:
  - **Instalação do SDK do Supabase**: Adicionamos a biblioteca oficial `@supabase/supabase-js` para gerenciar a conexão em nuvem de forma leve e otimizada.
  - **Conector Resiliente (`src/utils/supabase.js`)**: Desenvolvemos um módulo de conexão inteligente. Se as chaves do banco de dados não estiverem configuradas no ambiente (como ao rodar pela primeira vez ou localmente), o cliente desliga de forma silenciosa e o aplicativo opera 100% no modo local LocalStorage. Isso é a "casa construída sobre a rocha", impedindo travamentos por oscilação de rede!
  - **Persistência Híbrida (`src/utils/db.js`)**: Atualizamos o banco de dados do aplicativo. O salvamento e exclusão acontecem de forma síncrona e instantânea na memória do navegador (garantindo velocidade incrível) e, paralelamente, são enviados em segundo plano para o banco de dados Supabase na internet.
  - **Algoritmo de Sincronização Bidirecional (`syncDecksWithCloud`, `syncStatsWithCloud`)**: Criamos funções inteligentes que rodam ao iniciar o aplicativo:
    - Se a nuvem tiver baralhos salvos (ex: criados no seu celular), o computador os baixa e atualiza a sua tela.
    - Se a nuvem estiver vazia, seu computador sobe o seu progresso local para a nuvem automaticamente.
    - Sincroniza recordes do Combinar de forma inteligente, mantendo sempre a sua melhor conquista.
  - **Segurança Blindada (`.gitignore`)**: Adicionamos regras estritas para garantir que as suas chaves secretas do banco contidas em arquivos `.env` fiquem protegidas localmente e NUNCA sejam vazadas publicamente para o GitHub.
  - **Modelos e Arquivos de Publicação (`.env.example`, `vercel.json`)**: Criamos as etiquetas de configuração simplificadas e as regras de reescrita de rotas para implantação automatizada na Vercel.
  - **Build de Validação de Nuvem**: Compilamos com `npm run build` com sucesso total de 100% em apenas 424 milissegundos!
* **Resultado**: O código do aplicativo está 100% preparado para rodar em nuvem de forma extremamente estável e segura, restando apenas criarmos as contas online nas plataformas.

### Passo 10: Migração Ágil para o Firebase Firestore (Estabilidade)
* **Data**: 24 de Maio de 2026
* **O que foi feito**:
  - Devido a problemas de interface do painel do Supabase com extensões do navegador (o que fere o princípio de facilidade para o usuário), foi arquitetada uma migração rápida e limpa para o **Firebase**.
  - O arquivo `supabase.js` foi substituído por `firebase.js`.
  - Toda a camada de abstração em `db.js` foi reescrita para utilizar o Firestore nativo do Google, mantendo o excelente mecanismo de funcionamento Híbrido (LocalStorage + Sincronização em nuvem 100% invisível ao usuário).
* **Resultado**: Maior flexibilidade e estabilidade no painel administrativo sem perda da arquitetura fundamental do aplicativo.
### Passo 11: Configuração Final e Implantação no Firebase Hosting
* **Data**: 25 de Maio de 2026
* **O que foi feito**:
  - Configuramos as variáveis de ambiente em `.env` com as chaves reais de conexão do Firebase do usuário.
  - Criamos os arquivos `firebase.json` e `.firebaserc` para estabelecer o projeto `flashcards-fd7eb` como a origem de hospedagem.
  - O usuário autenticou a Firebase CLI de forma simplificada através de um link seguro na interface web.
  - Construímos a versão otimizada de produção com `npm run build`.
  - Executamos o deploy (`npx firebase-tools deploy`) para o Firebase Hosting, colocando o site ao vivo.
* **Resultado**: O aplicativo de Flashcards está 100% online, hospedado em servidores globais do Google e conectado em tempo real ao banco de dados, com o link oficial da nuvem pronto para acesso: https://flashcards-fd7eb.web.app.

### Passo 12: Sistema de Sincronização por Código Exclusivo (Multi-Dispositivo)
* **Data**: 27 de Maio de 2026
* **O que foi feito**:
  - **Isolamento de Dados no Firestore (`db.js`)**: Desenvolvemos um gerador automático de códigos de sincronização no formato `FC-XXXX-XXXX` salvo localmente no navegador. Reestruturamos todas as consultas e gravações no Firebase Firestore para serem salvas sob o caminho exclusivo daquele código (`/users/{codigo_sync}/decks` e `/users/{codigo_sync}/stats`). Isso impede que usuários diferentes sobrescrevam os dados uns dos outros no servidor de nuvem compartilhado!
  - **Componente SyncModal (`SyncModal.jsx`)**: Criamos um modal com efeito Glassmorphism premium que permite ao usuário visualizar seu código, copiá-lo com um clique (com feedback visual de sucesso) ou vincular outro dispositivo colando seu respectivo código.
  - **Botão de Status de Nuvem no Menu (`Navbar.jsx`)**: Adicionamos um ícone dinâmico (`Cloud` ou `CloudOff`) e um botão estilizado na Navbar superior, permitindo que o usuário veja na hora se está online ou offline no Firebase e abra o modal com facilidade.
  - **Orquestração Geral (`App.jsx`)**: Integramos o controle do modal e o salvamento reativo de códigos na raiz do React, disparando a atualização imediata dos baralhos e estatísticas no momento em que um novo dispositivo é vinculado.
* **Resultado**: Segurança total dos dados contra sobreposições e suporte completo para sincronização multi-dispositivo sem chaves complexas ou cadastros difíceis.

### Passo 13: Grupos de Estudo (Categorias) e Saudação Personalizada
* **Data**: 27 de Maio de 2026
* **O que foi feito**:
  - **Saudação ao Senhor Bruno Bueno (`Dashboard.jsx`)**: Alteramos a saudação padrão do aplicativo para uma mensagem personalizada e premium: *"Bem-vindo, senhor Bruno Bueno. Vamos aos estudos! ⚡ O que vai estudar hoje?"*.
  - **Mecanismo de Filtro e Criação de Categorias (`Dashboard.jsx`)**: Criamos uma linha de filtros em forma de botões clicáveis ("pills") com categorias padrão (**Faculdade**, **Inglês**, **IA**, **BIM**). Adicionamos um formulário de adição simples ("+ Novo Grupo") que permite cadastrar e selecionar novos grupos na hora.
  - **Seletor de Categoria no Editor (`CreateEditSet.jsx`)**: Integramos um campo seletor (`select` em HTML) elegante com seta customizada para definir a qual categoria o baralho pertence no momento em que é criado ou editado.
  - **Gerenciador de Dados e Nuvem (`db.js`, `App.jsx`)**: Criamos funções para ler, gravar e sincronizar as categorias no LocalStorage e no Firebase Firestore sob o caminho `/users/{codigo_sync}/categories/list`. Modificamos os métodos de gravação de baralhos para salvar a propriedade `category` de cada item.
* **Resultado**: Organização eficiente e flexível dos baralhos de estudo de acordo com os temas de interesse do usuário.

### Passo 14: Sistema de Perfis de Estudantes (Netflix-Style) com Isolamento de Dados
* **Data**: 27 de Maio de 2026
* **O que foi feito**:
  - **Tela de Seleção de Perfis (`ProfileSelect.jsx`)**: Desenvolvemos uma interface premium (estilo seletor de perfis da Netflix) com gradientes coloridos e vibrantes para **Bruno Bueno** (azul/neon) e **Bruna Bueno** (rosa/pink). Inclui opção para deletar perfis personalizados e botão dinâmico "+ Novo Perfil" para cadastrar novos estudantes direto no layout.
  - **Particionamento de Dados no LocalStorage e Firebase (`db.js`)**: Adaptamos o banco de dados híbrido para que todas as gravações (`sets`, `stats`, `categories` e `syncCode`) possuam o sufixo do estudante ativo (`_nomeDoEstudante`). Isso garante isolamento total das listas de cartões e estatísticas entre Bruno, Bruna e novos perfis.
  - **Orquestração de Troca e Login (`App.jsx`)**: Integramos o fluxo de perfil na raiz. Se o perfil ativo for `null`, o app exibe apenas a tela de perfis. Ao escolher um estudante, os dados locais e sincronizações na nuvem do Firebase são carregados e o usuário é redirecionado ao dashboard.
  - **Troca Rápida de Perfil no Menu (`Navbar.jsx`)**: Adicionamos um indicador visual com avatar no cabeçalho. Ao clicar no nome do estudante, o usuário desloga do perfil ativo e volta para a tela de seleção "Quem vai estudar?".
  - **Ajuste Gramatical de Boas-Vindas (`Dashboard.jsx`)**: Implementamos a personalização de gênero da saudação. Bruno recebe *"Bem-vindo, senhor Bruno Bueno"*, Bruna recebe *"Bem-vinda, senhora Bruna Bueno"*, e novos perfis recebem a saudação neutra correspondente.
* **Resultado**: Aplicativo totalmente isolado para uso multi-estudante, com layout de altíssimo padrão premium e preservação das regras da rocha (Mateus 7:24-27).

### Passo 15: Atualização e Deploy (Nuvem)
* **Data**: 08 de Junho de 2026
* **O que foi feito**:
  - Recompilamos o projeto executando `npm run build` para incorporar as atualizações recentes de perfis (Bruno e Bruna) e as lógicas em nuvem.
  - Executamos `npx firebase-tools deploy` para atualizar os arquivos em produção.
* **Resultado**: As últimas modificações estão 100% ativas no celular e disponíveis através do link oficial (https://flashcards-fd7eb.web.app).

### Passo 16: Refinamento Visual e Rolagem Inteligente nos Flashcards (Mobile e Desktop)
* **Data**: 08 de Junho de 2026
* **O que foi feito**:
  - Resolvemos um problema onde perguntas ou respostas muito longas "vazavam" para fora do cartão (overflow visual), especialmente nas telas menores de celulares.
  - Adicionamos a propriedade `overflow-y: auto` nos elementos `.flip-card-front` e `.flip-card-back` do `index.css`, ativando uma barra de rolagem minimalista e elegante.
  - Implementamos a função `clamp()` no CSS (`clamp(18px, 4vw, 24px)`) para o texto interno (`cardContentText`), fazendo com que o tamanho da fonte se adapte perfeitamente e fique mais "profissional" de acordo com o tamanho da tela.
  - Realizamos o build (`npm run build`) e novo deploy no Firebase Hosting.
* **Resultado**: Leitura impecável. O texto longo agora não vaza do cartão e pode ser rolado pelo usuário, mantendo o aspecto altamente premium.

### Passo 17: Limpeza Visual dos Cartões (Remoção de Textos de Dica)
* **Data**: 08 de Junho de 2026
* **O que foi feito**:
  - Removemos os textos fixos "Clique para virar 🔄" e "Clique para voltar 🔄" que ficavam na parte inferior de todos os cartões de estudo, atendendo à preferência por um visual mais limpo e livre de distrações desnecessárias.
  - O código CSS foi atualizado (remoção dos pseudo-elementos `::after`) e uma nova versão de produção foi gerada e enviada para o Firebase.
* **Resultado**: Cartões com visual ainda mais limpo e profissional focado 100% no conteúdo.

### Passo 18: Bloqueio de Sincronização e Prevenção de Conflitos (Race Condition)
* **Data**: 08 de Junho de 2026
* **O que foi feito**:
  - Investigamos um problema onde a exclusão de baralhos logo após o login (como no perfil da Bruna) falhava aparentemente, fazendo o baralho "voltar" à tela.
  - O problema ocorria porque a exclusão local acontecia ao mesmo tempo em que o aplicativo ainda baixava os dados antigos da nuvem (Race Condition), o que fazia a nuvem reescrever o baralho apagado.
  - Criamos uma variável global `isSyncing` no `App.jsx` e a passamos para o `Dashboard.jsx`.
  - Adicionamos um banner visual de "Sincronizando com a nuvem..." e desativamos o botão de "Apagar" enquanto o aplicativo atualiza. Agora, o usuário aguarda o carregamento terminar antes de poder modificar as listas com segurança.
  - Recompilamos o projeto e o enviamos para o Firebase.
* **Resultado**: Exclusões 100% seguras. Os baralhos apagados nunca mais "voltarão dos mortos" logo após o login!

### Passo 19: Melhoria de Usabilidade no Editor (Ordem Decrescente e Botão Topo)
* **Data**: 08 de Junho de 2026
* **O que foi feito**:
  - Ajustamos a tela de Criação/Edição de Baralhos para exibir os cartões em **ordem decrescente**. Agora, os cartões com maior numeração (os mais recentes) ficam no topo da lista.
  - O array `cards` continua armazenando os dados na mesma ordem lógica para não quebrar os modos de estudo, apenas invertemos a renderização visual usando `[...cards].reverse()`.
  - Movemos o botão de **"Adicionar Cartão"** que ficava lá no rodapé para o **topo da lista**, bem ao lado do título "Cartões do Baralho". 
  - Dessa forma, o usuário pode clicar em adicionar e imediatamente preencher o cartão novo sem precisar rolar a página até o fim.
* **Resultado**: Maior agilidade e produtividade na criação de baralhos muito longos.

---

## 🚀 EXPANSÃO: De Aplicativo de Flashcards para a "Plataforma Bueno"

> A partir daqui o projeto deixou de ser apenas um app de flashcards e passou a ser uma **plataforma pessoal e familiar** (Bruno & Bruna), com vários módulos (facetas): Flashcards, Finanças, Empresa da Bruna, Quadro dos Sonhos, Documentos e Hábitos, além de um Relatório Geral que une os dois perfis.

### Passo 20: Códigos de Sincronização Fixos por Perfil
* **Data**: 01 de Julho de 2026
* **O que foi feito**:
  - Antes, cada aparelho sorteava um código de sincronização **aleatório**, então ao abrir o app num celular ou computador novo os baralhos não vinham sozinhos (era preciso digitar o código na mão).
  - Reescrevemos a função `getSyncCode` (`db.js`) para que o código seja **fixo por perfil**: Bruno e Bruna mantêm exatamente os códigos que já usavam (`FC-FT6M-6E3U` e `FC-8KIP-ASZU`, preservando os dados já na nuvem), e perfis novos passam a receber um código **determinístico** gerado a partir do nome (o mesmo nome sempre gera o mesmo código em qualquer aparelho).
* **Resultado**: Ao trocar de aparelho, os dados são baixados automaticamente sem precisar copiar/colar código nenhum.

### Passo 21: Fundação da Plataforma — Menu Principal (Fase 1)
* **Data**: 01 de Julho de 2026
* **O que foi feito**:
  - Criamos a tela `MainMenu.jsx`: o novo hub central da plataforma, exibido após a escolha do perfil ("Quem vai usar?" → Menu). Ele mostra os cartões dos módulos e um botão de **Relatório Geral**.
  - Criamos `GeneralReport.jsx` (Relatório Geral de Bruno & Bruna), por enquanto como página de "em construção", já listando o que vai reunir (financeiro dos dois, tempo de estudo e desempenho dos hábitos).
  - Reestruturamos o `App.jsx` para rotear as telas de plataforma (tela cheia) separadas do módulo de Flashcards, e adicionamos um botão "Menu" na Navbar do Flashcard para voltar ao hub. Nenhum dado foi perdido nessa reorganização.
* **Resultado**: A base modular ficou pronta, com o Flashcard virando o primeiro de vários módulos.

### Passo 22: Módulo de Hábitos Gamificado (Fase 2)
* **Data**: 01 de Julho de 2026
* **O que foi feito**:
  - Criamos `HabitsMode.jsx` e as funções `getHabits`/`saveHabits`/`syncHabitsWithCloud` no `db.js` (mesmo padrão híbrido dos baralhos: LocalStorage + Firebase, isolado por perfil).
  - Mecânicas de gamificação para deixar gostoso de cumprir: **ofensiva (streak) 🔥** de dias seguidos, **XP e Nível** (+10 XP por conclusão), barra de **progresso do dia**, histórico dos últimos 7 dias e feedback comemorativo ("+10 XP ✨") ao concluir.
  - Cada hábito tem emoji e cor à escolha, e pode ser excluído com dupla confirmação.
* **Resultado**: Módulo de hábitos completo, testado (criar, concluir, XP/ofensiva, excluir) e integrado ao Menu.

### Passo 23: Módulo Financeiro Completo (Fase 3)
* **Data**: 01 de Julho de 2026
* **O que foi feito**:
  - Criamos `FinanceMode.jsx` e as funções `getFinance`/`saveFinance`/`syncFinanceWithCloud` no `db.js`. Na nuvem, as transações (com recibos) ficam numa **subcoleção** (uma por documento, para escalar sem estourar o limite de 1MB por doc) e as contas fixas + meta num doc de configuração.
  - Funcionalidades: lançamento de **receitas e despesas** por categoria, **contas fixas mensais** (salário, aluguel, assinaturas) que entram automaticamente em todo mês, **anexo de recibo** por foto, navegação **mês a mês**, cartões de resumo (Receitas, Despesas, Saldo, Fixas), **meta de gastos** com barra de progresso, **gastos por categoria** e **relatórios semanal e mensal** (com comparação ao mês anterior, maior gasto e taxa de poupança).
  - Já deixamos a categoria de receita "Empresa 3D" pronta para, no futuro, o lucro da empresa da Bruna entrar direto aqui.
* **Resultado**: Controle financeiro pessoal completo, testado (lançar, conta fixa, resumo, relatórios, excluir) e integrado ao Menu.

### Passo 24: Build e Deploy da Nova Plataforma
* **Data**: 01 de Julho de 2026
* **O que foi feito**:
  - Recompilamos o projeto com `npm run build` (sucesso) e executamos `npx firebase-tools deploy --only hosting` para publicar a nova versão.
  - Assim, todas as novidades (códigos fixos, Menu, Hábitos e Finanças) passaram a valer também no celular.
* **Resultado**: Plataforma ao vivo e atualizada em https://flashcards-fd7eb.web.app.

### Passo 25: Migração do Caderno — tldraw ➜ Excalidraw (Correção da Tela Preta)
* **Data**: 09 de Julho de 2026
* **O que foi feito**:
  - O usuário relatou que o caderno (aba "Caderno" no editor de baralho) aparecia corretamente por 3 segundos e depois ficava com a tela completamente preta, impossibilitando o uso.
  - **Diagnóstico REAL**: O tldraw v5 exige uma **licença paga** para funcionar em produção. Em ambiente de desenvolvimento (localhost), ele funciona normalmente. Porém, ao hospedar no Firebase (produção), ele bloqueia o canvas e mostra o erro no console: `"No tldraw license key provided! A license is required for production deployments."` Ou seja, após 3 segundos de "trial", ele simplesmente apaga o canvas — não é bug de tema escuro, é bloqueio comercial.
  - **Solução — Migração para o Excalidraw**: Substituímos o tldraw pelo **Excalidraw** (`@excalidraw/excalidraw`), que é 100% gratuito (Licença MIT) e funciona sem restrições em qualquer ambiente (localhost ou produção). O Excalidraw oferece:
    - Canvas infinito com zoom e rolagem
    - Ferramentas de desenho à mão livre, retângulos, elipses, setas, texto, imagens
    - Suporte a colagem de prints (Ctrl+V)
    - Interface em português brasileiro (`langCode="pt-BR"`)
    - Tema claro forçado para boa legibilidade
  - **Alterações nos arquivos**:
    - `NotebookCanvas.jsx`: Reescrito completamente para usar o componente `<Excalidraw>`. Manteve toda a lógica de salvamento automático (local + nuvem) e carregamento de dados. A API mudou (de `getSnapshot/loadSnapshot` para `getSceneElements/getAppState/getFiles`), mas as funções de persistência no `db.js` (que salvam/carregam JSON genérico) continuam 100% compatíveis.
    - `index.css`: Substituídas as regras de isolamento `.tl-container` por `.excalidraw` para evitar que os estilos globais interfiram no canvas.
    - `package.json`: Removido `tldraw` e adicionado `@excalidraw/excalidraw`.
  - Testamos no navegador: o canvas carrega com fundo branco, todas as ferramentas funcionam (testamos desenhando um retângulo), e não apresenta mais a tela preta.
  - Recompilamos e fizemos deploy no Firebase Hosting.
* **Resultado**: O caderno agora funciona perfeitamente em produção, sem restrições de licença, com todas as funcionalidades de desenho preservadas.

### Passo 26: Botão de Sincronização Manual e Mesclagem Inteligente (Overlay) no Caderno
* **Data**: 09 de Julho de 2026
* **O que foi feito**:
  - **Demanda do Usuário**: Necessidade de sincronizar as atualizações no caderno entre dispositivos (ex: PC e Tablet) manualmente, sem recarregar a página e sem que um dispositivo sobrescreva (apague) cegamente o trabalho do outro.
  - **Botão "Sincronizar Nuvem" (`NotebookCanvas.jsx`)**: Adicionamos uma barra de controle superior acima do caderno com um botão premium contendo um indicador de status ("Último salvamento automático às HH:MM", "Sincronizando...", ou "Sincronizado com sucesso às HH:MM").
  - **Mecanismo de Mesclagem (Merge/Overlay)**: 
    - Criamos a função `mergeElements` que compara os elementos gráficos locais e os da nuvem a partir de seus IDs exclusivos.
    - Se um elemento existe nos dois lados, ela compara as chaves `version` e `updatedAt` para reter o elemento mais recente.
    - Se o elemento é novo, ele é sobreposto/adicionado à cena.
    - Mesclamos as listas de arquivos e mídias (`files`), adicionando os novos arquivos no registro interno do Excalidraw com `api.addFiles()`.
    - **Ajuste de Delay Assíncrono (150ms)**: Descobrimos que o Excalidraw precisa de uma pequena pausa assíncrona entre o carregamento dos arquivos (`addFiles`) e o desenho final da tela (`updateScene`). Sem isso, o canvas tenta renderizar a imagem antes de registrá-la, resultando em caixas vazias até que a página fosse recarregada (F5). Adicionamos um delay de 150ms para corrigir esse comportamento.
    - Ao final, atualizamos a tela instantaneamente usando `api.updateScene()`, garantindo que ambos os dispositivos exibam o mesmo caderno mesclado.
  - Recompilamos o projeto e realizamos o deploy de produção no Firebase Hosting.
### Passo 27: Transformação no BRUNO OS (O Cérebro Digital) com Sub-Aplicativos Conectados nas Esferas
* **Data**: 01 de Agosto de 2026
* **O que foi feito**:
  - **Requisito do Usuário**: Transformar o aplicativo na plataforma **BRUNO OS — O Cérebro**, onde a tela de entrada é o Mapa da Vida interativo em 3D Canvas (originário do `BRUNO_BUENO`), e a faculdade/estudos (Flashcards) e demais módulos ficam dentro das esferas do mapa mental.
  - **Desenvolvimento do Componente `BrunoMindMap.jsx`**:
    - Convertemos a engine interativa em Canvas 2D/3D com física de partículas, órbitas e nebulosas em um componente React modular e de alta performance.
    - Ao clicar em qualquer nódulo/esfera (como **Faculdade**, **Programação**, **Finanças**, **Hábitos**), abre-se um painel lateral dinâmico contendo:
      - ⚡ **Estudar Flashcards**: Dispara o aplicativo de Flashcards já filtrado para o assunto correspondente à esfera.
      - 📝 **Abrir Caderno de Anotações**: Conecta ao canvas de desenho Excalidraw.
      - 💰 **Controle Financeiro**: Ativa o módulo de finanças do casal.
      - 🔥 **Hábitos Diários**: Abre o gerenciador gamificado de tarefas com XP e ofensiva.
      - 🌟 **Quadro dos Sonhos** e 📄 **Guarda de Documentos**.
  - **Sincronização em Nuvem do Cérebro (`src/utils/db.js`)**:
    - Criamos as funções `getMindMap`, `saveMindMap` e `syncMindMapWithCloud`.
    - Todas as alterações (novas esferas, edições de grupos, cores, aplicativos vinculados) são gravadas localmente (LocalStorage) e sincronizadas na nuvem do Firebase sob a chave exclusiva `/users/{codigo_sync}/mindmap/data`.
  - **Integração no Fluxo Principal (`App.jsx` & `Navbar.jsx`)**:
    - Definimos o `BrunoMindMap` como a página inicial padrão do aplicativo (`currentPage === 'menu'`).
    - Adicionamos o botão **🧠 Cérebro** no menu superior de navegação para que o usuário possa retornar ao mapa a qualquer momento de dentro de qualquer módulo.
  - **Compilação e Validação**:
    - Executamos `npm run build` com sucesso total em 1.37 segundos sem nenhum erro de código!
### Passo 28: Transformação no Super Cérebro Digital (Treino de 5 Minutos + Repetição Espaçada + Brain Inbox)
* **Data**: 02 de Agosto de 2026
* **O que foi feito**:
  - **Algoritmo de Repetição Espaçada (`db.js`)**: Desenvolvemos as funções `getDailyReviewCards` e `recordCardReviewResult` baseadas na Curva do Esquecimento de Ebbinghaus (Método Leitner). O sistema calcula dinamicamente a data da próxima revisão de cada cartão de acordo com seus acertos e erros, dobrando o intervalo quando você acerta e trazendo de volta no dia seguinte se você errar.
  - **Modo Treino Cerebral Diário de 5 Minutos (`DailyWorkoutMode.jsx`)**: Criamos uma tela minimalista de revisão relâmpago que seleciona automaticamente os 10-15 cartões mais urgentes do dia de todas as áreas de estudo. Oferece botões de feedback imediato ("Errei / Difícil" e "Acertei / Fácil") e concede **+20 XP** nos Hábitos ao concluir o treino!
  - **Caixa de Entrada Rápida - Brain Inbox (`BrainInboxModal.jsx`)**: Desenvolvemos um modal inteligente para captura rápida no dia a dia. Suporta digitação rápida e colagem direta de prints da área de transferência (`Ctrl+V`), permitindo salvar anotações rápidas e transformá-las em Flashcards com 1 clique.
  - **Indicadores Visuais no Cérebro 3D (`BrunoMindMap.jsx`)**:
    - Adicionamos na barra de ferramentas superior os botões **"⚡ Treino 5min"** (com contador vermelho de cartões vencidos) e **"📥 Caixa de Entrada"**.
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 1.58s sem nenhum erro!
### Passo 29: Editor em Formato de Planilha do Cérebro Digital (MindMap Spreadsheet)
* **Data**: 02 de Agosto de 2026
* **O que foi feito**:
  - **Componente `MindMapSpreadsheetModal.jsx`**: Desenvolvemos uma interface em formato de tabela/planilha interativa onde o senhor Bruno Bueno pode visualizar e editar **TODOS os grupos (áreas de vida)** e **TODAS as esferas** do seu cérebro de forma centralizada.
  - **Recursos da Planilha**:
    - Edição direta nas células: Nomes das esferas, Notas/Descrição, Seletor do Grupo, Categoria de Estudo, Aplicativo Conectado (Flashcards, Caderno, Finanças, Hábitos, Sonhos, Documentos) e Peso/Tamanho (1 a 3).
    - Botão **"+ Adicionar Nova Esfera"** para criar novas linhas na tabela.
    - Aba **"🎨 Grupos / Áreas"** para renomear grupos, gerenciar cores e criar novas áreas de vida.
    - Botão **"💾 Salvar Alterações"** que grava instantaneamente no LocalStorage e Firebase, atualizando a renderização 3D do Cérebro na hora.
  - **Integração no HUD (`BrunoMindMap.jsx`)**:
    - Adicionamos o botão **"📊 Planilha"** na barra de ferramentas superior.
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 1.89s sem nenhum erro!
### Passo 30: Refinamento Visual Executivo (Remoção de Emojis do SO e Ícones Vetoriais Monocromáticos)
* **Data**: 02 de Agosto de 2026
* **O que foi feito**:
  - **Requisito do Usuário**: Eliminar o aspecto de "interface gerada por IA" removendo emojis coloridos do sistema operacional, substituindo-os por ícones vetoriais monocromáticos elegantes com traço fino (`Lucide React`), dando um aspecto de software profissional de alta credibilidade (padrão Vercel/Linear).
  - **Arquivos Refatorados**:
    - `MindMapSpreadsheetModal.jsx`: Removidos emojis dos cabeçalhos da tabela, seletores de app e botões. Inseridos ícones vetoriais `Layers`, `Globe`, `FileText`, `Tag`, `Cpu`, `Scale`, `Palette`, `Save`, `Plus`, `Trash2`.
    - `BrunoMindMap.jsx`: Removidos emojis das barras de ferramentas e painéis de disparo.
    - `DailyWorkoutMode.jsx` e `BrainInboxModal.jsx`: Substituídos textos com emojis por tipografia limpa e ícones minimalistas.
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 1.14s sem nenhum erro!
### Passo 31: Ramificações Hierárquicas e Sub-Esferas Filhas (Árvore de Conhecimento N-Níveis)
* **Data**: 02 de Agosto de 2026
* **O que foi feito**:
  - **Suporte no Banco de Dados (`db.js`)**: Adicionado a propriedade `parentId` em cada esfera. Atualizado o `DEFAULT_MIND_MAP` com exemplos de sub-ramos para a **Faculdade** (`Cálculo I`, `Cálculo II`, `Ergonomia do Trabalho`, `Química Geral`), **Cálculo II** (`Derivadas Parciais`, `Integrais Múltiplas`) e **Inglês** (`Phrasal Verbs`, `Vocabulário & Expressões`).
  - **Engine 3D de Constelações (`BrunoMindMap.jsx`)**:
    - Reescrevemos o `layoutScene` para calcular órbitas secundárias e N-níveis de sub-esferas filhas ao redor de suas esferas mães.
    - Desenho de filamentos luminosos conectando nódulos pais a nódulos filhos com feixes de luz animados.
    - Atualizado o modal "Adicionar Nó" com seletor de "Esfera Mãe / Pai".
  - **Editor de Planilha com Indentação Visual (`MindMapSpreadsheetModal.jsx`)**:
    - Adicionada a coluna **"Esfera Mãe (Pai)"** e indentação em árvore (`└─ Cálculo I`, `   └─ Derivadas Parciais`) na tabela.
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 1.05s sem nenhum erro!
### Passo 32: Expansão dos Nós de Demonstração em Múltiplos Níveis (Secundários, Terciários e Quaternários)
* **Data**: 02 de Agosto de 2026
* **O que foi feito**:
  - **Múltiplas Árvores de Conhecimento (`db.js`)**: Populamos o `DEFAULT_MIND_MAP` e atualizamos o leitor `getMindMap` para mesclar automaticamente nós secundários, terciários e quaternários em várias esferas da vida do senhor Bruno:
    - **Faculdade ➔ Cálculo II ➔ Integrais Múltiplas ➔ Coordenadas Polares & Esféricas** (4º Nível)
    - **Faculdade ➔ Ergonomia do Trabalho ➔ Análise Biomecânica / NR-17**
    - **Faculdade ➔ Química Geral ➔ Estequiometria**
    - **Programação ➔ Front-end & React ➔ Componentes & Hooks / Canvas 2D/3D**
    - **Idiomas ➔ Chinês (Mandarim) ➔ Pinyin & Tons / Ideogramas (Hanzi)**
    - **Idiomas ➔ Inglês ➔ Phrasal Verbs / Vocabulário de Negócios**
    - **Stecla Engenharia ➔ Gestão de Obras ➔ Cronograma Físico-Financeiro**
    - **BIM & Projetos ➔ Revit & Modelagem 3D ➔ Famílias Paramétricas**
    - **Finanças ➔ Controle Financeiro ➔ Orçamento Mensal / Contas Fixas**
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 1.16s sem nenhum erro!
### Passo 33: Algoritmo Anti-Colisão e Correção na Sincronização Firebase do Cérebro
* **Data**: 02 de Agosto de 2026
* **O que foi feito**:
  - **Diagnóstico do Piscar/Reset de Tela**: Identificamos que a função `syncMindMapWithCloud` baixava dados antigos sem sub-nós salvos anteriormente no Firestore e sobrescrevia os novos ramos locais. Atualizamos a função para mesclar sub-nós padrão e atualizar o Firestore em background.
  - **Algoritmo Anti-Colisão de Esferas (`BrunoMindMap.jsx`)**:
    - Implementamos um algoritmo de física de repulsão no `layoutScene` (50 iterações com margem de segurança de 38px) e repulsão dinâmica em tempo real no loop de renderização para garantir que as esferas **NUNCA fiquem sobrepostas** (como `Esposa & Família` e `Quadro dos Sonhos`), mantendo distanciamento orgânico perfeito.
  - **Botão "Restaurar Ramos"**: Adicionado botão no HUD superior que permite forçar a restauração/mesclagem instantânea da árvore de sub-esferas a qualquer momento.
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 983ms sem nenhum erro!
* **Resultado**: Esferas perfeitamente espaçadas sem sobreposição e persistência de dados 100% estável.


### Passo 34: Correção Definitiva de Sobreposição de Cartões (Flashcards 3D, Jogo de Combinar e Editor)
* **Data**: 03 de Agosto de 2026
* **O que foi feito**:
  - **Ajuste de Visibilidade Verso/Frente 3D (`src/index.css`)**:
    - Adicionadas as propriedades de prefixo `-webkit-backface-visibility: hidden;` e `-webkit-transform-style: preserve-3d;` nos cartões de Flashcard, além de ancoragem absoluta `top: 0; left: 0;` e rotação inicial limpa `rotateY(0deg)` / `rotateY(180deg)`. Isso evita que a pergunta e a resposta do cartão vazem ou fiquem desenhadas uma por cima da outra em navegadores WebKit/celulares.
  - **Correção da Grade Responsiva do Modo Combinar (`src/pages/MatchMode.jsx`)**:
    - Corrigido erro de sintaxe CSS (`grid-templateColumns` ➔ `grid-template-columns`) e adicionadas as classes `.gameGrid`, `.gameCard` e `.cardText` aos elementos HTML para que a grade de cartões respeite o grid de 2 colunas no celular sem esticar ou sobrepor cartões.
  - **Espaçamento de Segurança no Editor de Baralhos (`src/pages/CreateEditSet.jsx`)**:
    - Garantida a margem inferior `margin-bottom: 16px` em cada bloco de cartão do editor para que as caixas de Pergunta/Resposta mantenham distância clara em todas as telas.
  - **Validação e Compilação**:
    - Executamos `npm run build` com 100% de sucesso em 1.78s sem nenhum erro!
* **Resultado**: Todos os cartões do aplicativo (Flashcards, Modo Combinar e Editor) agora possuem separação visual limpa, fluida e perfeita sem nenhuma sobreposição em telas grandes ou celulares.

### Passo 35: Salvamento Automático em Tempo Real no Editor de Cartões (Auto-Save)
* **Data**: 04 de Agosto de 2026
* **O que foi feito**:
  - **Mecanismo de Salvamento Automático (`src/pages/CreateEditSet.jsx`)**:
    - Implementado um hook `useEffect` com inteligência de debounce (1 segundo de pausa após a digitação). Qualquer alteração no Título, Descrição, Categoria, Termos, Definições ou Imagens coladas (Ctrl+V) / enviadas é gravada automaticamente no LocalStorage e no Firebase Firestore.
  - **Indicador Visual de Status de Salvamento**:
    - Adicionado um elemento visual no cabeçalho do editor que exibe `🔄 Salvando...` durante o processo e `🟢 ✓ Salvo automaticamente` quando concluído com sucesso.
  - **Salvamento Instantâneo ao Sair (`handleBack`)**:
    - O botão "Voltar ao Painel" agora dispara o salvamento instantâneo de alterações pendentes antes de retornar ao Dashboard.
  - **Validação e Compilação**:
    - Executado `npm run build` com 100% de sucesso em 1.60s sem nenhum erro!
* **Resultado**: O usuário pode criar e editar baralhos com total tranquilidade, sem risco de perder conteúdo caso se esqueça de clicar manualmente em salvar.

### Passo 36: O COFRE — A Plataforma vira um Obsidian (Notas ligadas, Grafo e Abas)
* **Data**: 05 de Agosto de 2026
* **Objetivo**: Transformar a plataforma numa ferramenta estilo **Obsidian** (notas em Markdown ligadas por `[[links]]`, grafo do conhecimento, abas e painéis divididos) **sem perder nenhum dado** dos Flashcards, Finanças, Hábitos, Sonhos ou Documentos.

* **Duas decisões de rumo (e o porquê)**:
  - **NÃO migramos para Tauri/Rust** (como sugeria o plano original). Isso exigiria reescrever o aplicativo do zero e o resultado **não funcionaria no celular** — hoje a plataforma roda em qualquer aparelho pela web. Mantivemos React + Vite + Firebase e implementamos a **lógica** do Obsidian dentro dele.
  - **NÃO usamos o LocalStorage para as notas.** O LocalStorage tem teto de ~5MB para o site inteiro e já está dividido entre baralhos, cadernos com fotos, finanças e hábitos. Um cofre de notas ali estouraria e **derrubaria os flashcards junto**. As notas foram para o **IndexedDB** (banco de dados de verdade do navegador, centenas de MB), num banco separado chamado `bueno_vault`. Nada do que já existia foi tocado.

* **O que foi construído** (pasta nova `src/vault/`, em camadas independentes):
  - **`core/parser.js`** — lê o texto da nota e extrai wikilinks `[[...]]`, tags `#assim`, títulos, tarefas `- [ ]`, embeds e frontmatter YAML. Ignora corretamente o que está dentro de blocos de código.
  - **`core/metadataCache.js`** — o índice em memória. Guarda quem cita quem (backlinks), quem é citado (links de saída), links quebrados, tags e o grafo pronto para desenhar. É o que faz busca, backlinks e grafo serem instantâneos.
  - **`core/linkRewriter.js`** — a peça mais perigosa do sistema, isolada e testada: ao renomear uma nota, reescreve os `[[links]]` de **todas** as notas que a citavam, preservando apelidos (`|`) e seções (`#`).
  - **`core/vaultManager.js`** — o gerente. Toda criação/edição/renomeação/exclusão passa por ele, sempre na mesma ordem: memória → IndexedDB → Firebase. A tela nunca espera o disco nem a internet.
  - **`core/search.js`** — busca difusa por nome (Ctrl+O) e busca global no texto (Ctrl+Shift+F), com suporte a expressão regular.
  - **`storage/idb.js`** — o "disco" (IndexedDB).
  - **`storage/cloudSync.js`** — sincronização com o Firebase, com **lápides** (registro de exclusão) para que apagar no celular não faça a nota ressuscitar no computador.
  - **`ui/`** — casca com abas e divisão de tela, explorador de arquivos, editor CodeMirror 6 com **Live Preview**, painel de conexões, grafo em canvas, paleta de comandos e diálogos.

* **Privacidade das notas (conforme decidido)**:
  - Notas normais são **privadas por perfil**, no mesmo endereço já usado pelos baralhos.
  - Tudo que estiver na pasta **`Compartilhado/`** vai para um acervo único do casal — Bruno e Bruna enxergam e editam.

* **Como a plataforma ficou**:
  - O aplicativo abre direto no Cofre. **Tudo virou aba**: uma nota, o grafo, os Flashcards, as Finanças, os Hábitos, o Cérebro Digital. Dá para deixar os flashcards de um lado e a nota de estudo do outro, ao mesmo tempo (`Ctrl+\`).
  - Atalhos: `Ctrl+O` abrir nota · `Ctrl+P` paleta de comandos · `Ctrl+N` nova nota · `Ctrl+G` grafo · `Ctrl+Shift+F` buscar · `Ctrl+B` esconder lateral · `Ctrl+\` dividir tela.
  - `src/App.jsx` **deixou de decidir telas** e voltou a ter uma responsabilidade só: cuidar dos dados. A navegação de cada aba mora na própria aba (`src/modules/FlashcardsModule.jsx`).

* **Validação executada**:
  - **34 testes automatizados** do núcleo, todos passando: 22 no parser/índice (blocos de código, acentos, backlinks, links quebrados, órfãs, grafo) e 12 no renomeador de links (apelido, seção, embed, nomes parecidos).
  - `npm run build` compilando 100%, sem erros.
  - **Teste no navegador de ponta a ponta**: criar nota → escrever `[[link]]` → Live Preview escondendo a sintaxe → clicar no link quebrado criando a nota → backlink aparecendo sozinho com a frase de contexto → renomear corrigindo o link na outra nota → recarregar a página e tudo continuar lá → grafo desenhando → busca com destaque.
  - **Dados antigos conferidos e intactos**: 3 baralhos e 49 cartões continuam exatamente onde estavam.

* **Resultado**: A plataforma agora é um segundo cérebro de verdade. As notas se ligam sozinhas, o conhecimento vira um mapa visível, e os módulos que antes eram ilhas separadas agora convivem lado a lado na mesma janela — sem que uma linha de dado antigo fosse perdida.

### Passo 37: Anotações no baralho, Grafo dos estudos e o conserto do Caderno
* **Data**: 05 de Agosto de 2026

* **1) O Grafo virou o mapa dos ESTUDOS**
  - Grupos de estudo e baralhos agora são nós de primeira classe (`src/vault/core/deckBridge.js`), com a estrutura `Faculdade → matéria → nota`.
  - Duas molas diferentes: a estrutural (curta, forma cachos por grupo) e a de `[[link]]` (longa, deixa a nota entre dois cachos).
  - Clicar num baralho abre os Flashcards JÁ naquele baralho, com os 4 modos à mostra.
  - A ponte é de mão única: lê os flashcards e NUNCA escreve neles.

* **2) Terceira aba do baralho: ANOTAÇÕES**
  - Texto livre, página infinita, com Ctrl+V para colar prints (`src/vault/ui/cm/pasteImage.js`, redimensiona para no máx. 1600px).
  - Não é um caderninho escondido: é uma NOTA DO COFRE. Aparece na barra lateral dentro da pasta do grupo, entra na busca, nos backlinks e no grafo.
  - O vínculo com o baralho fica no frontmatter (`baralho: set-123`), não no nome — então renomear ou mover a nota não quebra a ligação.
  - O frontmatter aparece pequeno e apagado, como etiqueta, para não competir com o texto.

* **3) CONSERTO DO CADERNO (perda de desenho)**
  - **Diagnóstico com prova**: os 4 cadernos existiam no Firebase, mas com 0,1 a 3,3 KB — telas VAZIAS. E não havia nenhuma cópia local.
  - **Causa**: sem cópia local, tudo dependia da leitura da nuvem. Se ela falhasse, o canvas abria em branco e, 1,5s depois, o branco era salvo POR CIMA do desenho. Os erros eram engolidos por `.catch(() => {})`.
  - **Correções**: (a) cópia local movida do LocalStorage (teto de 5MB, estourava com fotos) para o **IndexedDB**, com migração automática; (b) trava que BLOQUEIA o salvamento enquanto não se souber o que já existia; (c) trava que recusa gravar tela vazia por cima de desenho existente; (d) erros agora aparecem na tela em português; (e) botão "Limpar caderno" para esvaziar de propósito, com confirmação.

* **Validação**: 51 testes automatizados do núcleo passando (22 parser/índice + 12 renomeação + 17 baralhos no grafo). Build limpo. No navegador: nota do baralho criada com o vínculo, imagem colada e renderizada inline, nota aparecendo na pasta Faculdade da barra lateral, persistência após recarregar, e o site publicado puxando as 6 notas da nuvem.
* **Deploy**: publicado em https://flashcards-fd7eb.web.app
* **Pendente de conferência do usuário**: o salvamento do Caderno ponta a ponta (não consegui desenhar no Excalidraw por script — precisa de um traço humano para confirmar).

### Passo 38: Ajuste Estrutural de Hierarquia do Cérebro Digital (Mãe: Cérebro ➔ Filho: Grupo/Faculdade ➔ Filhos do Filho: Conteúdos)
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **Atendimento à Solicitação do Usuário**: Refatoramos o sistema visual e a estrutura de dados do Cérebro Digital para refletir a hierarquia exata solicitada pelo senhor Bruno:
    - **Mãe (Raiz Central)**: BRUNO (CÉREBRO) — A esfera central do mapa mental em 3D Canvas.
    - **Filho (1º Nível)**: Grupo / Categoria de Estudos (ex: **Faculdade**, **Inglês**, **IA**, **BIM**, etc.) — Cada grupo ganha uma esfera-mãe ligada diretamente ao Cérebro Central.
    - **Filhos do Filho (2º Nível)**: Os conteúdos contidos dentro do grupo (ex: os 4 baralhos/cartões da Faculdade: *Física Geral II*, *Cálculo II · Ativ. 02*, *Física II · Ativ. 02*, *Química Geral*) — Cada item vira uma esfera-filha pendurada diretamente na esfera do seu grupo (**Faculdade**), e NÃO solta ou ligada direto ao Cérebro Central.
  - **Aprimoramento na Deduplicação e Encadear de IDs (`src/utils/db.js`)**:
    - Atualizamos a função `buildEssentialMindMap` e a rotina de deduplicação `dedupeNodes` para garantir que nós antigos ou salvos com IDs herdados ou títulos extensos não fiquem duplicados ou soltos.
    - Validação de `parentId`: Qualquer item pertencente à Faculdade ou a um grupo de estudos cujo pai anterior seja nulo ou inválido passa a ter automaticamente o `parentId` apontando para a esfera do grupo (`hub-faculdade`), garantindo o desenho da linha conectora no Canvas.
  - **Ajustes no Engine 3D Canvas (`src/pages/BrunoMindMap.jsx`)**:
    - Atualizamos o `layoutScene` para realizar comparações estritas de ID em formato `String`, garantindo a montagem correta das órbitas primárias (Grupos) e secundárias (Conteúdos dos grupos).
  - **Preservação Total dos Dados**:
    - Todos os 4 baralhos da Faculdade (e seus 62 cartões), além de todos os dados de hábitos, finanças, documentos, metas e notas do Cofre continuam 100% preservados e intactos.
  - **Validação e Compilação**:
    - Executamos `npm run build` com sucesso total em 9.10s sem nenhum erro de código.
* **Resultado**: Hierarquia de 3 níveis perfeita (Mãe ➔ Filho ➔ Filhos do Filho), com visualização ultra-limpa no Cérebro Digital.

### Passo 39: Implementação de Conexões Cruzadas (Cross-Links) Entre Esferas e Grupos Diferentes
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **Recurso de Conexões Cruzadas (Cross-Links)**:
    - Desenvolvemos a capacidade de conectar esferas ou grupos entre áreas distintas do Cérebro (ex: conectar o curso no **EDX** / *Introdução à Ciência da Computação* diretamente com o projeto da **STECLA** / *Estudo IA GitHub*).
  - **Renderização Visual no Canvas 3D (`src/pages/BrunoMindMap.jsx`)**:
    - As conexões primárias permanecem como feixes contínuos na cor do grupo.
    - As conexões cruzadas são renderizadas como **filamentos cibernéticos pontilhados azul-ciano/neon** com partículas energéticas navegando continuamente entre as esferas conectadas.
    - Destaque interativo ao passar o mouse ou selecionar uma esfera com conexões cruzadas.
  - **Painel Lateral e Seleção Múltipla**:
    - Adicionado o bloco *"🔗 Conexões Cruzadas"* no painel lateral de detalhes da esfera, permitindo navegar para a esfera conectada com 1 clique.
    - Adicionado o seletor com checkboxes no modal de inclusão/edição de nó para marcar com quais outras esferas ou grupos aquele item se relaciona (`relatedNodeIds`).
  - **Persistência de Dados (`src/utils/db.js` & `MindMapSpreadsheetModal.jsx`)**:
    - Preservação completa do array `relatedNodeIds` tanto na geração automática das esferas quanto na edição via planilha/LocalStorage/Firebase.
  - **Visibilidade Inteligente em Grupos Ocultados (`src/pages/BrunoMindMap.jsx`)**:
    - Quando um grupo é ocultado no filtro do canto inferior esquerdo (ex: ocultar a **Faculdade** e deixar apenas o **EDX** visível), qualquer esfera pertencente ao grupo ocultado (ex: **Física Geral II**) que possua conexão cruzada com uma esfera visível (**Introdução à Ciência da Computação**) **PERMANECE 100% VISÍVEL**, mantendo o feixe ciano neon ativo na tela!
  - **Validação e Compilação**:
    - Executado `npm run build` com 100% de sucesso em 1.62s sem nenhum erro.
* **Resultado**: O Cérebro Digital agora suporta conexões relacionais cruzadas com visibilidade inteligente entre múltiplos grupos e temas, exatamente como o Sr. Bruno idealizou!

### Passo 40: Otimização para Celular (Fim do Pull-to-Refresh, Texto de Alta Nitidez e Modo Estudo Rápido)
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **Bloqueio de Recarregamento por Gestos (Pull-to-Refresh) no Celular**:
    - Adicionados manipuladores de evento de toque não-passivos (`touchstart`, `touchmove`, `touchend`) com `e.preventDefault()` e regras CSS `touch-action: none; overscroll-behavior: none` no Canvas 3D.
    - Agora o senhor pode arrastar e navegar pelo Cérebro no celular com total fluidez sem que a página recarregue involuntariamente!
  - **Ajuste Dinâmico do Texto para Caber Estritamente Dentro da Esfera**:
    - Removida completamente qualquer sombra ou contorno escuro em volta das letras.
    - Implementado algoritmo de cálculo dinâmico do tamanho da fonte (`fs` auto-fit): o texto agora diminui automaticamente proporcionalmente ao diâmetro útil interno da esfera (`maxAllowedWidth = nr * 1.5`), garantindo que **nenhuma palavra ou letra vaze ou saia do círculo da bolha**!
  - **Novo Modo Celular / Lista de Estudo Rápido**:
    - Criado o botão **`📱 MODO CELULAR`** na barra superior HUD.
    - Ao tocar no botão, a tela alterna instantaneamente para uma visão em cards ultra-limpa e organizada por matérias/grupos com botão direto *"Estudar Agora"*, perfeita para revisões rápidas pelo celular!
  - **Validação e Compilação**:
    - Executado `npm run build` com 100% de sucesso em 1.62s sem nenhum erro.
* **Resultado**: Experiência mobile de primeira classe, 100% fluida, legível e prática para estudar no celular!

### Passo 41: Sub-Cérebro — Cada Cartão Vira um Universo Interno
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **Nova Página `SubBrainView.jsx`**:
    - Criada a tela do Sub-Cérebro, que abre ao clicar em qualquer Cartão (baralho) no Dashboard.
    - Mostra: cabeçalho com nome do cartão e grupo, seção de Flashcards com 4 modos de estudo (3D, Aprender, Combinar, Simulado), botão "Editar Cartões", e grid de materiais internos.
    - Permite criar sub-itens dentro de cada cartão: Anotações, Links, Cadernos e Exercícios.
    - Cada sub-item pode ser editado, excluído (com confirmação em 2 cliques) e aberto diretamente.
    - Editor de sub-itens interno (SubItemEditor) com formulário completo por tipo.
  - **Modelo de Dados (`db.js`)**:
    - Adicionados campos `subItems` (lista de sub-itens) e `subConnections` (ligações internas) em `saveSets`, `syncDecksWithCloud` e no upload para a nuvem.
    - Tudo salvo DENTRO do mesmo objeto do baralho: zero risco de perda de dados e sincronização automática com Firebase.
  - **FlashcardsModule.jsx**:
    - Adicionada rota `sub_brain` no switch de navegação para renderizar o SubBrainView.
  - **Dashboard.jsx**:
    - Ao clicar num cartão, agora navega para o Sub-Cérebro (`sub_brain`) ao invés de expandir inline os modos de estudo.
    - Texto do hint atualizado para "Toque para abrir" com contagem de materiais internos.
    - Removidas variáveis e imports não utilizados (expandedSetId, studyModes, startStudyMode, ChevronRight).
  - **CSS (`study-library.css`)**:
    - Adicionados estilos completos do Sub-Cérebro: cabeçalho, seções, modos de estudo, grid de sub-itens, responsividade mobile.
  - **Hierarquia Implementada**:
    - Bruno (Cérebro) → Grupo (Filho) → Cartão (Filho do Filho) → Flashcards + Anotações + Links + Cadernos + Exercícios (conteúdo interno)
  - **Preservação de Dados**:
    - NENHUM flashcard existente foi apagado ou alterado. Os 43 cartões de Física Geral II e todos os outros permanecem 100% intactos.
  - **Validação e Compilação**:
    - Executado `npm run build` com 100% de sucesso em 1.28s sem nenhum erro.
* **Resultado**: Cada cartão agora é um universo interno completo com flashcards preservados e materiais organizados!

### Passo 42: Ajuste de Layout do Sub-Cérebro 3D (Tela Cheia e Zero Sobreposição)
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **CSS (`study-library.css`)**:
    - `.sub-brain-canvas-container` ajustado para `position: fixed; inset: 64px 0 0 0; width: 100vw; height: calc(100vh - 64px); z-index: 90;` expandindo a área do Canvas para a tela inteira abaixo da navbar.
    - HUD superior e inferior com botões de navegação e "+ Novo Sub-Item" estilizados em glassmorphic translucidez.
    - Overlay de modais ajustado com `backdrop-filter: blur(12px)` para exibição elegante.
  - **Engine Canvas 3D (`SubBrainView.jsx`)**:
    - Esfera central 3D desenhada com degradês cromáticos, brilho especular e texto auto-ajustável.
    - Esferas orbitantes com algoritmo anti-colisão em 50 iterações impedindo qualquer tipo de sobreposição.
    - Rótulos e números de contagem formatados e ajustados ao diâmetro de cada bolha.
  - **Validação e Compilação**:
    - Executado `npm run build` com 100% de sucesso em 1.44s.
* **Resultado**: Layout do Sub-Cérebro 100% em tela cheia, sem nada achatado e com visual espacial incrível!

### Passo 43: Visão MICRO do Sub-Cérebro + Cartões dentro de Cartões
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **Duas visões no Sub-Cérebro (`SubBrainView.jsx`)**:
    - Nova chave **Macro / Micro** no HUD do topo. A **Macro** continua exatamente como estava (matéria no centro, cinco esferas em volta).
    - A **Micro** é o leque inteiro aberto: SEM a matéria no centro, aparecem todos os cartões, os filhos de cada cartão e as anotações penduradas neles.
  - **Hierarquia de cartões (o pedido do "cartão dentro de cartão")**:
    - Cada cartão ganhou o campo `parentId`: vazio = **cartão mãe** (nasce da matéria); preenchido = **filho** daquele cartão. Sem limite de níveis (filho de filho de filho).
    - Cada sub-item (anotação, caderno, exercícios, link) ganhou `parentCardId`: agora uma anotação pode pertencer a UM cartão específico, e não só ao baralho.
    - Cartões antigos, sem `parentId`, viram cartões mãe automaticamente — nenhum dos 68 cartões existentes foi tocado.
  - **Novo arquivo `src/pages/subBrainCore.js` (o miolo)**:
    - `buildCardIndex` resolve a família (mãe/filho/anotação) e é à prova de bagunça: pai apagado, cartão apontando pra si mesmo e ciclo A→B→A viram cartão mãe em vez de sumir da tela.
    - `buildMicroLayout` desenha o leque: cada ponta reserva uma fatia da roda, ramos grandes recebem fatias maiores e o primeiro anel se afasta o quanto for preciso para NENHUMA esfera encostar na outra.
  - **Novo arquivo `src/pages/MicroBrainView.jsx`**:
    - Canvas navegável (arrastar para andar, scroll para zoom, botões de aproximar/afastar/centralizar), cada ramo com sua cor, filhos herdando uma versão mais clara da cor da mãe, linhas com pulso de luz e selo "+N" nos ramos recolhidos.
    - Clicar numa esfera acende o ramo dela e escurece o resto; a busca no topo acende só os cartões que casam com o texto.
    - **Painel de edição dentro do próprio mapa**: termo, resposta e foto (Ctrl+V cola print) salvando sozinho, criar cartão filho, pendurar anotação/caderno/exercício/link naquele cartão, recolher o ramo e excluir.
    - Excluir cartão NÃO apaga os filhos: eles sobem um nível (viram filhos do avô), e as anotações vão junto.
  - **Editor de cartões em lista (`CreateEditSet.jsx`)**:
    - A lista agora é lida como árvore: cartão mãe, filhos recuados logo abaixo, com etiquetas de nível e de quantidade de filhos.
    - Cada linha ganhou o seletor **"Cartão mãe"** (que não deixa escolher um descendente, para o ramo nunca entrar em looping).
    - Botão **"Editar no Cérebro"** salta do editor direto para o mapa.
    - **Correção importante de perda de dados**: o editor montava o baralho do zero ao salvar e, com isso, apagava `subItems`/`subConnections` (anotações, cadernos, exercícios e links criados no Sub-Cérebro). Agora existe um único `montarPayload` que copia tudo que já existia antes de gravar.
  - **Validação e Compilação**:
    - Novo teste `testes/leque.mjs` (`npm run testar`): 22 conferências da hierarquia e do leque — 43 cartões soltos sem colisão, ramo com neto e anotação, ramo recolhido, dados bagunçados e baralho vazio. **Todas passaram.**
    - `npx eslint` sem nenhum apontamento nos arquivos novos.
    - `npm run build` com 100% de sucesso em 1.31s.
* **Resultado**: agora dá para abrir Física II, ver o leque inteiro dos 43 cartões e criar dentro dele o ramo da Elétrica com seus filhos e anotações — tudo conectado, organizado e editável sem sair do mapa!

---

### Passo 44: A visão Micro virou TEIA (o anel saiu) + cor por tipo
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **Problema**: com os 43 cartões sem nenhum vínculo, todos viravam "cartão mãe" e o leque radial os colocava num anel perfeito, gigante e confuso.
  - **Novo desenho (`subBrainCore.js` → `buildMicroLayout`)**: saiu o leque por setores, entrou uma simulação de forças — todas as bolinhas se empurram, cada vínculo (mãe→filho, cartão→anotação) puxa as duas pontas e um puxão fraco para o meio segura os pedaços soltos. No fim, uma passada de desempate garante que nada fique encostado. O resultado é a teia orgânica do rascunho do Bruno.
  - **Posições estáveis**: o ponto de partida de cada bolinha vem de um hash do id (nada de sorteio), então o mesmo baralho sempre desenha o mesmo mapa — as bolinhas não dançam a cada letra digitada.
  - **Cor por TIPO** (`MICRO_COLORS`): amarelo = flashcard, azul = anotação, rosa = link, roxo = caderno, verde = exercícios. Legenda fixa no canto inferior esquerdo.
  - **Nome embaixo da bolinha** (estilo mapa de conhecimento), em vez do texto espremido dentro dela; aparece por completo quando a bolinha está selecionada ou sob o mouse.
  - **Desempenho**: acima de ~160 bolinhas a simulação encurta sozinha (43 cartões: 10ms; 300 cartões: 153ms).
* **Resultado**: o mapa deixou de ser um anel decorativo e virou o desenho de como a matéria está realmente conectada.


### Passo 45: O bug que fazia parecer que "não criava" nada + menu "+ Novo" no Micro
* **Data**: 17 de Agosto de 2026
* **O que foi feito**:
  - **O BUG (cópia velha do baralho)**: o `FlashcardsModule` guardava o OBJETO do baralho aberto. Quando o Sub-Cérebro criava uma anotação/link, o dado era gravado certinho no navegador e na nuvem, mas a tela continuava exibindo aquela cópia de antes — dava a impressão de que a criação tinha falhado. Agora guardamos só o **id** e o baralho é buscado na lista viva (`sets`), então tudo que se cria aparece na hora.
    - Comprovação: o link "teste" que o Bruno tinha criado às 00:03 estava salvo no baralho o tempo todo — só não aparecia na tela.
  - **Trava no editor em lista (`CreateEditSet.jsx`)**: como o editor passou a receber o baralho vivo, foi criada a trava `jaCarregado` — o baralho é carregado uma vez por id, senão cada gravação automática sobrescreveria o texto que está sendo digitado.
  - **Menu "+ Novo" na visão Micro**: no lugar do botão que só criava "Cartão mãe", agora um menu único cria **Cartão mãe, Cartão filho, Anotação, Caderno, Exercícios e Link**. Se houver um cartão selecionado, o menu avisa "Criando dentro de <cartão>" e o item nasce pendurado nele; sem seleção, nasce solto no baralho.
  - **Validação**: no app rodando, criar → o mapa e o contador subiram na hora (2 → 3 itens); apagar → voltaram (3 → 2). Os itens de teste foram removidos e o baralho ficou exatamente como estava (43 cartões + o link "teste" do Bruno). `npm run testar` e `npm run build` sem falhas.
* **Resultado**: criar anotação, link, caderno ou exercício dentro do Sub-Cérebro agora funciona e aparece na hora, de qualquer uma das duas visões.

---


### Passo 46: A TRILHA — a matéria deixou de ser uma pilha de cartões
* **Data**: 18 de Agosto de 2026
* **O pedido do Bruno**: "gostei de como você fez a plataforma das Aulas (o caderno de blocos). Eu tenho a matéria, quero fazer um flash card, agora uma anotação, agora uma imagem, agora um link, e assim vai — e enquanto eu estudo, mostre todos."
* **O problema que existia**: o editor era uma GRADE de termo/definição. Tudo que não coubesse em pergunta/resposta ficava de fora: o print do slide, o raciocínio que liga um cartão ao outro, a pegadinha da prova, o link da videoaula. O flashcard vivia sozinho, sem o contexto que o explica.
* **O que foi feito**:
  - **`src/estudo/trilhaCore.js` (miolo, sem tela)** — 9 tipos de bloco (flashcard, anotação, imagem, link, fórmula, código, pegadinha, dúvida, seção), a migração `lerTrilha`, a projeção `gravarTrilha`, o **SM-2** de verdade, o roteiro da sessão e a heurística do Ctrl+V.
  - **`src/estudo/Trilha.jsx` (o compositor)** — a matéria é uma sequência de blocos, com linha do tempo à esquerda, reordenar/duplicar/apagar, campos que crescem sozinhos, imagem por botão ou Ctrl+V, e o seletor de cartão mãe (a hierarquia do Micro-Cérebro continua editável aqui).
  - **`src/estudo/EstudarTrilha.jsx` (a sessão)** — tela cheia que percorre a trilha inteira: contexto se lê, flashcard vira **recordação ativa** (resposta escondida, sem botão de pular) com **quatro notas** que já mostram quando o cartão volta. O que você **erra volta na mesma sessão**. No fim: acerto, tempo e a lista do que revisar antes da prova.
  - **A convivência com o que já existia** — quem guarda o texto e o agendamento do flashcard continua sendo `deck.cards`; `deck.blocos` guarda só a ORDEM e o conteúdo que não é flashcard. Por isso **Cartões 3D, Aprender, Combinar, Simulado, Treino do Dia e o Sub-Cérebro continuam funcionando sem uma linha alterada**, e todo baralho antigo abre já virado em trilha (cartão sem bloco entra no fim da fila, nada some).
  - **A repetição espaçada trocada** (`db.js` → `recordCardReviewResult`): a escadinha fixa 1→3→7→14→30, igual para todo cartão, deu lugar ao SM-2 (o motor do Anki). Cada cartão carrega a facilidade dele; o fácil some por meses, o difícil volta toda semana. A assinatura antiga (`true`/`false`) continua valendo, então o Treino do Dia não precisou mudar.
  - **O diário de estudo** (`db.js`): registro por dia (respostas, acertos, minutos) + **sequência de dias seguidos**, sincronizado na nuvem pegando sempre o maior número de cada dia (estudar no celular e no PC no mesmo dia soma, não apaga).
  - **O painel virou lista de pendências**: cada matéria mostra quantos cartões venceram hoje e quanto já está na memória de longo prazo, e no topo aparece um convite direto para a matéria mais atrasada.
  - **Dois consertos de fundo**: (1) `deck.blocos` foi acrescentado ao gravador da nuvem em um lugar só (`paraNuvem`) — sem isso a matéria montada sumiria ao trocar de aparelho; (2) `saveSets` deixou de falhar em silêncio: quando o navegador recusa a gravação, o editor pinta **NÃO SALVOU** em vermelho em vez de mandar o erro para o console.
* **Validação**: `npm run testar` roda agora 2 arquivos (leque + trilha, 47 conferências) — migração, ida-e-volta sem perder agendamento, cartão órfão/duplicado, SM-2 e roteiro. `npx eslint` limpo nos arquivos novos, `npm run build` OK. No app rodando: baralho de Física II (43 cartões) abriu já como trilha; sessão completa percorrida com contexto, erro reprocessado e placar final; o baralho de teste foi criado e apagado, deixando os 5 baralhos do Bruno exatamente como estavam.
* **Resultado**: o flashcard parou de ser uma pergunta solta no vácuo. Estudar virou percorrer a matéria — e o que você erra volta na hora certa, não quando dá na telha.

---


### Passo 47: A auditoria — os quatro jeitos de perder matéria, fechados
* **Data**: 13 de Setembro de 2026
* **De onde veio**: auditoria externa do repositório (relatório de 13/09/2026). Ela apontou quatro caminhos por onde a sua matéria podia sumir e três lugares onde o app dava erro em resposta certa. Nada disso é "botão torto": é perda de conteúdo.
* **O que foi consertado**:
  - **A nuvem parou de apagar o que não conhece** (`db.js` → `saveSets`). A função varria a nuvem e apagava todo baralho cujo id não estivesse na lista LOCAL. Ou seja: abrir o app num aparelho desatualizado (ou antes de a sincronização terminar) apagava os baralhos criados no outro. Agora `saveSets` só ESCREVE — e só o que mudou de verdade (comparando a assinatura do conteúdo).
  - **Exclusão virou uma decisão sua, com "lápide"** (`registrarExclusaoDeBaralho`). Quando VOCÊ apaga um baralho, fica gravado no aparelho E na nuvem que aquele id foi apagado. É isso que apaga o baralho no celular também — e o que impede um aparelho velho de ressuscitá-lo. Faltar não é mais sinônimo de apagado.
  - **O que você escreve sem internet não é mais jogado fora** (`syncDecksWithCloud`). Antes, se a nuvem tivesse qualquer coisa, a lista de lá substituía a daqui inteira. Agora as duas listas são JUNTADAS pela regra de ouro (`juntarBaralhosLocalENuvem`): vence quem foi editado por último (carimbo `updatedAt`), no empate vence quem tem mais conteúdo, e o que só existe aqui sobe para lá.
  - **Importar deixou de ser destruir** (`importBackup`, `analisarBackup`, `ImportBackupModal.jsx`). O botão "Importar" trocava TODO o acervo pelo arquivo — receber uma aula apagava o resto, sem aviso. Agora o arquivo é conferido inteiro ANTES de gravar a primeira letra, aparece uma prévia ("1 baralho novo; 2 idênticos serão ignorados; você tem 5") e você escolhe: **Adicionar ao acervo** (junta e não encosta em nada) ou **Restaurar backup** (substitui, com confirmação em duas etapas e cópia de segurança do estado anterior).
  - **A nuvem parou de fingir que está tudo certo** (selo da nuvem). Todo envio agora passa por uma fila: o que não foi confirmado fica pendente, a recusa é guardada em português e o botão da nuvem, lá em cima, muda para "Subindo (n)" ou "Falhou". A telinha da nuvem diz o estado real e quando foi a última confirmação.
  - **O corretor aprendeu Engenharia** (`src/estudo/correcaoCore.js`). A prova comparava texto letra por letra: "12500 N" dava erro quando o gabarito era "12,5 kN", e "12,5 kg" passaria batido. Agora o corretor lê valor e unidade, converte o que é convertível (kN↔N, cm↔m, MPa↔Pa, kgf, graus…), RECUSA unidade de outra grandeza, aceita 1% de tolerância e entende número escrito à brasileira ou à americana. Resposta escrita com outras palavras vira **"Confira você mesmo"** — a máquina não chuta: você decide no gabarito, e a nota se refaz na hora. Cada correção mostra o PORQUÊ.
  - **Fim das alternativas impossíveis** (`src/estudo/questoesCore.js`). Os distratores eram sorteados só por "ter id diferente": dois cartões com a mesma definição viravam duas alternativas idênticas, uma valendo ponto e a outra erro. E o Verdadeiro/Falso podia afirmar que era FALSO algo verdadeiro. Agora alternativa repetida é descartada, afirmação falsa só usa definição que diz outra coisa, e quando não há alternativa honesta a questão vira escrita.
  - **Um toque = um cartão** (`FlashcardMode.jsx`). Durante os 200 ms da virada, todo clique e toda tecla entravam na fila e cada um agendava um avanço — o cartão seguinte era marcado e pulado sem você ver. Entraram a trava de virada, o descarte de tecla segurada (`event.repeat`) e o cancelamento do relógio ao sair da tela.
* **O que ficou testado de verdade**: `npm run testar` passou de 3 para 5 arquivos. `testes/sincronia.mjs` (18 conferências) transforma os critérios de aceite da auditoria em teste de regressão: aparelho desatualizado não apaga o baralho do outro, edição offline sobrevive, exclusão apaga só o escolhido, arquivo inválido não altera nada, importar não duplica. `testes/correcao.mjs` (32 conferências) cobre número, unidade, tolerância e a montagem das questões. As contas que decidem isso moram em arquivos sem tela (`src/utils/sincroniaCore.js`, `src/estudo/correcaoCore.js`, `src/estudo/questoesCore.js`) — **não mexer neles sem rodar `npm run testar`**.
* **Validação no app rodando**: perfil do Bruno abriu com os 5 baralhos e 341 cartões vindos da nuvem; um arquivo de teste foi importado pelo modo "Adicionar" (5 baralhos preservados + 1 novo = 6, com o baralho quebrado do arquivo recusado e explicado na prévia); o baralho de teste foi apagado pelo caminho normal e, depois de recarregar o app e sincronizar de novo, NÃO voltou — e os 5 baralhos e 341 cartões do Bruno ficaram exatamente como estavam. Simulado gerado e entregue: gabarito mostrando o motivo de cada correção e os botões de revisão. `npm run build` OK.
* **O que a auditoria pediu e NÃO foi feito agora**: login com dono de verdade no banco (as regras do Firestore precisam ser revistas junto), IA dentro do app e o caderno de erros classificado por tipo de erro. Ficam para um passo próprio — o combinado era primeiro proteger os dados.
* **Resultado**: os quatro caminhos por onde a matéria sumia estão fechados e cobertos por teste, e a prova parou de dar erro em resposta certa.

---


> 🏠 *"Portanto, quem ouve estas minhas palavras e as pratica é como o homem prudente que construiu a sua casa sobre a rocha."* — **Mateus 7:24**








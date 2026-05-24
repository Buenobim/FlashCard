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
   - Sem frameworks pesados que deixam o site lento. Usaremos CSS moderno com variáveis, gradientes elegantes, animações 3D de alta performance para a rotação de cartões e total responsividade (layout flexível para celulares e monitores ultra-wide).
3. **Banco de Dados Local (LocalStorage)**
   - Os dados são salvos no próprio navegador do seu celular ou computador. Rápido, seguro, gratuito e offline!
4. **Backup e Portabilidade (Exportar/Importar)**
   - O aplicativo terá um botão para salvar todas as listas em um arquivo `.json`. Você pode baixar esse arquivo no computador e abri-lo no celular para continuar estudando!
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
├── index.html                     <- Página HTML principal (a casca do aplicativo)
└── src/                           <- Onde fica toda a mágica (código fonte)
    ├── main.jsx                   <- Ponto de partida do React
    ├── App.jsx                    <- Componente principal que gerencia as páginas
    ├── index.css                  <- Nosso sistema de design (cores, fontes, temas escuros)
    ├── components/                <- Componentes reutilizáveis (botões, modais, etc.)
    │   ├── Navbar.jsx             <- Menu de navegação superior (bonito e responsivo)
    │   ├── Flashcard.jsx          <- Cartão individual com efeito de virada 3D
    │   └── ImportExportModal.jsx  <- Modal para fazer backup ou restaurar listas
    ├── pages/                     <- Nossas telas principais
    │   ├── Dashboard.jsx          <- Tela inicial (suas listas, estatísticas gerais)
    │   ├── CreateEditSet.jsx      <- Tela de criação/edição de listas de cartões
    │   ├── FlashcardMode.jsx      <- Modo de estudo Clássico (Virar e deslizar)
    │   ├── LearnMode.jsx          <- Modo Aprender (Múltipla escolha dinâmico)
    │   ├── MatchMode.jsx          <- Modo Combinar (Jogo de ligar cartões com tempo)
    │   └── TestMode.jsx           <- Modo Avaliação (Simulado com nota)
    └── utils/                     <- Funções auxiliares (salvar dados, gerar questões)
        └── db.js                  <- Gerenciador do armazenamento local (LocalStorage)
```

---

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

/*
  =============================================================================
  ARQUIVO: src/main.jsx
  PARA QUE SERVE: Este arquivo é a "faísca de ignição" ou a chave de partida do nosso 
  sistema. Ele pega toda a estrutura do React (nossa plataforma) e a injeta dentro 
  do arquivo "index.html" para que ela apareça na tela do seu computador ou celular.
  =============================================================================
*/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css' // Importa o nosso sistema de design e estilo (cores, fontes, etc.)
import App from './App.jsx' // Importa o coração do aplicativo, que controla as telas

// EXPLICANDO A LINHA ABAIXO:
// Esta função cria a "raiz" (root) visual do aplicativo. Ela procura um elemento HTML 
// chamado 'root' (raiz) e renderiza (desenha) o nosso componente central <App /> dentro dele.
// O <StrictMode> é uma ferramenta de segurança que ajuda o programador a evitar erros no código.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)


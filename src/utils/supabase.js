/*
  =============================================================================
  ARQUIVO: src/utils/supabase.js
  PARA QUE SERVE: Este arquivo é o "Mensageiro do aplicativo na Nuvem". Ele é 
  responsável por estabelecer a conexão segura e direta entre o seu aplicativo 
  de Flashcards (que roda no celular ou computador) e o banco de dados da Supabase 
  na internet.
  Ele lê as chaves públicas configuradas de forma invisível. Se você ainda não 
  configurou as chaves, ele funciona em modo silencioso "Local", permitindo que 
  tudo continue funcionando 100% offline no LocalStorage do seu navegador!
  =============================================================================
*/

import { createClient } from '@supabase/supabase-js';

// 1. LEITURA DAS CHAVES DE CONEXÃO:
// Buscamos o link do seu projeto e a chave anônima que o Supabase te forneceu.
// Em ambiente local, elas são lidas de um arquivo chamado ".env". Na Vercel,
// elas são lidas de forma criptografada do painel de administração.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 2. INICIALIZAÇÃO DO CLIENTE SUPABASE:
// Se o link e a chave estiverem configurados, criamos o túnel de conexão.
// Se as chaves estiverem vazias, o cliente fica nulo. Isso é a nossa "Rocha" de 
// segurança para garantir que o aplicativo NUNCA trave por falta de internet!
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

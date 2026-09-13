/*
  =============================================================================
  ARQUIVO: src/utils/firebase.js
  PARA QUE SERVE: Este arquivo é o novo "Mensageiro do aplicativo na Nuvem". 
  Ele é responsável por estabelecer a conexão segura e direta entre o seu aplicativo 
  de Flashcards e o banco de dados da Firebase (Firestore) do Google.
  Ele lê as chaves públicas configuradas. Se as chaves não estiverem lá, o app
  continua funcionando 100% offline no LocalStorage de forma segura!
  =============================================================================
*/

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// 1. LEITURA DAS CHAVES DE CONEXÃO:
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

// 2. INICIALIZAÇÃO DO CLIENTE FIREBASE:
// Verificamos se pelo menos a chave principal (apiKey) está presente
export let app = null;
export let db = null;

if (firebaseConfig.apiKey) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
  } catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
  }
}

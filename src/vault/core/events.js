/*
  =============================================================================
  ARQUIVO: src/vault/core/events.js
  PARA QUE SERVE: É o "quadro de avisos" do Cofre. Quando alguma coisa acontece
  (uma nota foi criada, apagada, renomeada, o índice foi reconstruído), quem fez
  a mudança apenas PENDURA o aviso no quadro. Quem se interessa fica olhando o
  quadro e reage sozinho.

  POR QUE ISSO IMPORTA: sem isso, o editor precisaria conhecer o explorador de
  arquivos, que precisaria conhecer o grafo, que precisaria conhecer a busca...
  e mexer em um quebraria os outros. Com o quadro de avisos, cada peça só conhece
  o quadro. É o que permite o app crescer sem virar um nó.
  =============================================================================
*/

// Nomes oficiais dos avisos. Usar a constante (e não o texto solto) evita erro
// de digitação silencioso, que é o bug mais chato de caçar nesse tipo de sistema.
export const VaultEvent = {
  READY: 'vault:ready',                 // o cofre terminou de carregar do disco
  FILE_CREATED: 'vault:file-created',
  FILE_MODIFIED: 'vault:file-modified',
  FILE_DELETED: 'vault:file-deleted',
  FILE_RENAMED: 'vault:file-renamed',
  METADATA_UPDATED: 'vault:metadata-updated', // o índice de links/tags mudou
  SYNC_STATE: 'vault:sync-state',       // começou/terminou de falar com a nuvem
};

/*
  CLASSE: EventBus
  O quadro de avisos em si. Bem pequeno de propósito.
*/
export class EventBus {
  constructor() {
    // Mapa: nome do aviso -> conjunto de funções que querem ser chamadas
    this.listeners = new Map();
  }

  /*
    on: registra interesse num aviso.
    Devolve uma função de "cancelar" — chame-a para parar de escutar. Isso é o que
    o React usa no retorno do useEffect para não vazar memória ao fechar a tela.
  */
  on(event, handler) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(handler);
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.listeners.get(event)?.delete(handler);
  }

  /*
    emit: pendura o aviso no quadro e avisa todo mundo.
    Um ouvinte que quebra NÃO pode derrubar os outros — por isso o try/catch.
  */
  emit(event, payload) {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of Array.from(set)) {
      try {
        handler(payload);
      } catch (err) {
        console.error(`[Cofre] Ouvinte do evento "${event}" quebrou:`, err);
      }
    }
  }
}

// Um único quadro de avisos para o app inteiro.
export const vaultEvents = new EventBus();

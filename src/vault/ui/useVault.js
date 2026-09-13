/*
  =============================================================================
  ARQUIVO: src/vault/ui/useVault.js
  PARA QUE SERVE: A ponte entre o cofre (que vive fora do React) e as telas.

  O PROBLEMA QUE ELE RESOLVE: o índice do cofre é um objeto comum em memória, não
  um "estado do React". Quando ele muda, o React não fica sabendo. Este gancho
  escuta o quadro de avisos e força a tela a se redesenhar.

  E O CUIDADO QUE ELE TOMA: digitar dispara um aviso a CADA tecla. Redesenhar a
  árvore de arquivos 10 vezes por segundo travaria o app em celular. Por isso os
  avisos são agrupados numa janelinha de tempo antes de acordar o React.
  =============================================================================
*/

import { useEffect, useState, useCallback } from 'react';
import { vaultEvents, VaultEvent } from '../core/events.js';

const THROTTLE_MS = 220;

/*
  useVaultVersion: devolve um número que muda toda vez que o cofre muda.
  Colocar esse número nas dependências de um useMemo faz a tela recalcular
  na hora certa — nem mais, nem menos.
*/
export function useVaultVersion(events = [
  VaultEvent.READY,
  VaultEvent.FILE_CREATED,
  VaultEvent.FILE_DELETED,
  VaultEvent.FILE_RENAMED,
  VaultEvent.FILE_MODIFIED,
  VaultEvent.METADATA_UPDATED,
]) {
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let timer = null;
    const bump = () => {
      if (timer) return; // já tem um redesenho agendado; não agenda outro
      timer = setTimeout(() => {
        timer = null;
        setVersion(v => v + 1);
      }, THROTTLE_MS);
    };

    const unsubscribers = events.map(e => vaultEvents.on(e, bump));
    return () => {
      clearTimeout(timer);
      unsubscribers.forEach(off => off());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return version;
}

/*
  useSyncState: só para o indicadorzinho de "sincronizando com a nuvem".
  Separado do resto para não redesenhar a tela inteira por causa dele.
*/
export function useSyncState() {
  const [syncing, setSyncing] = useState(false);
  useEffect(() => vaultEvents.on(VaultEvent.SYNC_STATE, ({ syncing }) => setSyncing(syncing)), []);
  return syncing;
}

/*
  useHotkeys: registra atalhos de teclado globais.
  Recebe um mapa tipo { 'mod+o': fn, 'mod+shift+f': fn } onde "mod" é Ctrl no
  Windows e Cmd no Mac.
*/
export function useHotkeys(map) {
  const handler = useCallback((event) => {
    // Não sequestra atalhos enquanto a pessoa digita num campo de texto comum
    const tag = event.target?.tagName;
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA';

    const mod = event.ctrlKey || event.metaKey;
    const parts = [];
    if (mod) parts.push('mod');
    if (event.shiftKey) parts.push('shift');
    if (event.altKey) parts.push('alt');
    parts.push(event.key.toLowerCase());
    const combo = parts.join('+');

    const fn = map[combo];
    if (!fn) return;
    if (isTyping && !mod && event.key !== 'Escape') return;

    event.preventDefault();
    event.stopPropagation();
    fn(event);
  }, [map]);

  useEffect(() => {
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [handler]);
}

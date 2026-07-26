import type { OfflineReport, PlayerView } from '@covil/core';
import { useCallback, useEffect, useState } from 'react';

import { ApiError, api, getToken, type Command } from '../api/client';

export type SessionStatus = 'carregando' | 'visitante' | 'autenticado';

/**
 * Ausência mínima para o relatório de retorno aparecer.
 *
 * Toda leitura de estado aplica o catch-up, então qualquer comando volta com
 * um relatório de alguns segundos. Interromper o jogador com "você esteve
 * fora por 4s" a cada clique é ruído — o relatório é para quem volta depois
 * de horas.
 */
const REPORT_MIN_MS = 5 * 60 * 1000;

export interface Session {
  status: SessionStatus;
  name: string | null;
  player: PlayerView | null;
  /** Relatório do tempo fora, até o jogador dispensá-lo. */
  report: OfflineReport | null;
  error: string | null;
  busy: boolean;
}

/**
 * Sessão com o servidor.
 *
 * Sem muro de login: quem chega joga como visitante, com a simulação rodando
 * local. Ao entrar, o servidor passa a ser a verdade — inclusive sobre o que
 * aconteceu enquanto o app esteve fechado.
 */
export function useSession() {
  const [session, setSession] = useState<Session>({
    status: getToken() ? 'carregando' : 'visitante',
    name: null,
    player: null,
    report: null,
    error: null,
    busy: false,
  });

  const apply = useCallback(
    (
      payload: { name: string; player: PlayerView; report?: OfflineReport },
      { withReport = false }: { withReport?: boolean } = {},
    ) => {
      const worthShowing =
        withReport &&
        payload.report !== undefined &&
        payload.report.simulatedMs > 0 &&
        payload.report.elapsedMs >= REPORT_MIN_MS;

      setSession((current) => ({
        status: 'autenticado',
        name: payload.name,
        player: payload.player,
        report: worthShowing ? payload.report! : current.report,
        error: null,
        busy: false,
      }));
    },
    [],
  );

  // Token guardado: sincroniza assim que a tela abre.
  useEffect(() => {
    if (!getToken()) return;

    let cancelled = false;
    api
      .state()
      .then((payload) => {
        if (!cancelled) apply(payload, { withReport: true });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        // Token expirado ou inválido: volta a visitante em silêncio.
        if (error instanceof ApiError && error.status === 401) api.logout();
        setSession((current) => ({
          ...current,
          status: 'visitante',
          error:
            error instanceof ApiError && error.status === 0
              ? 'Servidor fora do ar — jogando em modo visitante.'
              : null,
        }));
      });

    return () => {
      cancelled = true;
    };
  }, [apply]);

  const run = useCallback(
    async (
      action: () => Promise<{ name: string; player: PlayerView; report?: OfflineReport }>,
      options: { withReport?: boolean } = {},
    ) => {
      setSession((current) => ({ ...current, busy: true, error: null }));
      try {
        apply(await action(), options);
        return true;
      } catch (error) {
        setSession((current) => ({
          ...current,
          busy: false,
          error: error instanceof Error ? error.message : 'Algo deu errado.',
        }));
        return false;
      }
    },
    [apply],
  );

  // Login e sincronização manual mostram o relatório; comandos, nunca — quem
  // acabou de clicar num botão não esteve "fora".
  const login = useCallback(
    (email: string, password: string) =>
      run(() => api.login(email, password), { withReport: true }),
    [run],
  );

  const register = useCallback(
    (input: Parameters<typeof api.register>[0]) => run(() => api.register(input)),
    [run],
  );

  const command = useCallback((next: Command) => run(() => api.command(next)), [run]);

  const refresh = useCallback(() => run(() => api.state(), { withReport: true }), [run]);

  const logout = useCallback(() => {
    api.logout();
    setSession({
      status: 'visitante',
      name: null,
      player: null,
      report: null,
      error: null,
      busy: false,
    });
  }, []);

  const dismissReport = useCallback(() => {
    setSession((current) => ({ ...current, report: null }));
  }, []);

  const clearError = useCallback(() => {
    setSession((current) => ({ ...current, error: null }));
  }, []);

  return { session, login, register, logout, command, refresh, dismissReport, clearError };
}

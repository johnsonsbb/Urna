import type { Doctrine, HuntPolicy, OfflineReport, PlayerView, Vocation } from '@covil/core';

const BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:3333').replace(/\/$/, '');
const TOKEN_KEY = 'covil.token';

export interface SessionPayload {
  token?: string;
  name: string;
  player: PlayerView;
  report?: OfflineReport;
}

export interface RankingEntry {
  position: number;
  name: string;
  level: number;
  clearedWaves: number;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    // Navegação privada em alguns navegadores lança ao tocar no localStorage.
    return null;
  }
}

export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* sem persistência de sessão; o jogo continua funcionando */
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(init.headers);
  headers.set('content-type', 'application/json');
  if (token) headers.set('authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new ApiError('Não foi possível falar com o servidor.', 0);
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    const message =
      typeof body.error === 'string' ? body.error : `Falha na requisição (${response.status}).`;
    throw new ApiError(message, response.status);
  }

  return body as T;
}

export const api = {
  async register(input: {
    email: string;
    password: string;
    name: string;
    party: { name: string; vocation: Vocation }[];
  }): Promise<SessionPayload> {
    const result = await request<SessionPayload>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (result.token) setToken(result.token);
    return result;
  },

  async login(email: string, password: string): Promise<SessionPayload> {
    const result = await request<SessionPayload>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (result.token) setToken(result.token);
    return result;
  },

  /** Aplica o catch-up no servidor e devolve estado + relatório. */
  state(): Promise<SessionPayload> {
    return request<SessionPayload>('/api/game/state');
  },

  command(command: Command): Promise<SessionPayload> {
    return request<SessionPayload>('/api/game/command', {
      method: 'POST',
      body: JSON.stringify(command),
    });
  },

  async ranking(): Promise<RankingEntry[]> {
    const result = await request<{ ranking: RankingEntry[] }>('/api/ranking');
    return result.ranking;
  },

  logout(): void {
    setToken(null);
  },
};

export type Command =
  | { type: 'politica'; policy: HuntPolicy }
  | { type: 'arena'; arenaId: string }
  | { type: 'doutrina'; memberIndex: number; patch: Partial<Doctrine> }
  | { type: 'comprar'; item: 'vida' | 'mana'; quantity: number };

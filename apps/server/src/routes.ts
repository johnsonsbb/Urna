import {
  ARENAS,
  MAX_PARTY_SLOTS,
  createPlayer,
  expToNext,
  memberLevel,
  partyLevel,
  runOffline,
  switchArena,
  type OfflineReport,
  type PlayerState,
  type Vocation,
} from '@covil/core';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';

import { hashPassword, verifyPassword } from './auth.js';
import {
  createAccount,
  createPlayerRow,
  findAccountByEmail,
  findPlayerByAccount,
  parseState,
  playerNameTaken,
  savePlayerState,
  topPlayers,
  type PlayerRow,
} from './db.js';

/** Preço dos suprimentos. Repor poção é o principal dreno de gold do jogo. */
const POTION_PRICE = { vida: 45, mana: 55 } as const;

const credentials = z.object({
  email: z.string().email().max(180),
  password: z.string().min(8, 'a senha precisa de pelo menos 8 caracteres').max(200),
});

const registerBody = credentials.extend({
  name: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[\p{L}\p{N} _-]+$/u, 'use apenas letras, números, espaço, hífen ou sublinhado'),
  party: z
    .array(
      z.object({
        name: z.string().min(2).max(16),
        vocation: z.enum(['knight', 'paladin', 'sorcerer', 'druid']),
      }),
    )
    .min(1)
    .max(MAX_PARTY_SLOTS),
});

const commandBody = z.discriminatedUnion('type', [
  z.object({ type: z.literal('politica'), policy: z.enum(['seguro', 'empurrar']) }),
  z.object({ type: z.literal('arena'), arenaId: z.string() }),
  z.object({
    type: z.literal('doutrina'),
    memberIndex: z.number().int().min(0).max(MAX_PARTY_SLOTS - 1),
    patch: z
      .object({
        targetPriority: z.enum(['mais-proximo', 'mais-fraco', 'mais-forte', 'conjurador']),
        engageDistance: z.number().int().min(1).max(6),
        potionBelowPct: z.number().int().min(0).max(95),
        manaPotionBelowPct: z.number().int().min(0).max(95),
        healAllyBelowPct: z.number().int().min(0).max(95),
        line: z.enum(['frente', 'meio', 'tras']),
      })
      .partial(),
  }),
  z.object({
    type: z.literal('comprar'),
    item: z.enum(['vida', 'mana']),
    quantity: z.number().int().min(1).max(10_000),
  }),
]);

interface TokenPayload {
  accountId: number;
}

/**
 * Sincroniza o jogador com o relógio do servidor.
 *
 * É aqui que o progresso offline acontece: toda leitura de estado primeiro
 * aplica o tempo decorrido. O cliente nunca informa quanto ganhou — ele só
 * pergunta que horas são, e o servidor responde com o que aconteceu.
 */
function syncPlayer(row: PlayerRow): { state: PlayerState; report: OfflineReport } {
  const state = parseState(row);
  const report = runOffline(state, Date.now());
  savePlayerState(row.id, state, partyLevel(state));
  return { state, report };
}

/** Só o que o cliente precisa ver — nunca a semente nem o estado bruto. */
function toView(state: PlayerState) {
  const arena = ARENAS[state.arenaId];
  return {
    gold: state.gold,
    stamina: Math.round(state.stamina),
    arenaId: state.arenaId,
    arenaName: arena?.name ?? state.arenaId,
    clearedWaves: state.clearedWaves,
    totalWaves: arena?.waves.length ?? 0,
    policy: state.policy,
    level: partyLevel(state),
    totals: state.totals,
    lastTickAt: state.lastTickAt,
    party: state.party.map((member) => ({
      id: member.id,
      name: member.name,
      vocation: member.vocation,
      level: memberLevel(member),
      experience: member.experience,
      expToNext: expToNext(member),
      potions: member.potions,
      manaPotions: member.manaPotions,
      doctrine: member.doctrine,
    })),
  };
}

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  /** Exige token válido e devolve o jogador correspondente. */
  async function requirePlayer(request: FastifyRequest): Promise<PlayerRow | null> {
    await request.jwtVerify();
    const { accountId } = request.user as TokenPayload;
    return findPlayerByAccount(accountId);
  }

  app.get('/api/health', async () => ({ ok: true, now: Date.now() }));

  app.get('/api/arenas', async () => ({
    arenas: Object.values(ARENAS).map((arena) => ({
      id: arena.id,
      name: arena.name,
      theme: arena.theme,
      totalWaves: arena.waves.length,
    })),
  }));

  // --- contas --------------------------------------------------------------

  const authLimit = { config: { rateLimit: { max: 12, timeWindow: '1 minute' } } };

  app.post('/api/auth/register', authLimit, async (request, reply) => {
    const body = registerBody.parse(request.body);

    if (findAccountByEmail(body.email)) {
      return reply.code(409).send({ error: 'Este e-mail já está cadastrado.' });
    }
    if (playerNameTaken(body.name)) {
      return reply.code(409).send({ error: 'Este nome já está em uso.' });
    }

    const accountId = createAccount(body.email, await hashPassword(body.password));
    const state = createPlayer({
      party: body.party.map((member) => ({
        name: member.name,
        vocation: member.vocation as Vocation,
      })),
    });
    createPlayerRow(accountId, body.name, state, partyLevel(state));

    const token = app.jwt.sign({ accountId } satisfies TokenPayload, { expiresIn: '30d' });
    return reply.code(201).send({ token, name: body.name, player: toView(state) });
  });

  app.post('/api/auth/login', authLimit, async (request, reply) => {
    const body = credentials.parse(request.body);
    const account = findAccountByEmail(body.email);

    // Mesmo erro e mesmo custo nos dois casos: dizer "e-mail não existe"
    // transforma o login num verificador de cadastro.
    const valid = account ? await verifyPassword(body.password, account.password_hash) : false;
    if (!account || !valid) {
      return reply.code(401).send({ error: 'E-mail ou senha inválidos.' });
    }

    const row = findPlayerByAccount(account.id);
    if (!row) return reply.code(404).send({ error: 'Personagem não encontrado.' });

    const { state, report } = syncPlayer(row);
    const token = app.jwt.sign({ accountId: account.id } satisfies TokenPayload, {
      expiresIn: '30d',
    });
    return { token, name: row.name, player: toView(state), report };
  });

  // --- jogo ----------------------------------------------------------------

  app.get('/api/game/state', async (request, reply) => {
    let row: PlayerRow | null;
    try {
      row = await requirePlayer(request);
    } catch {
      return reply.code(401).send({ error: 'Não autenticado.' });
    }
    if (!row) return reply.code(404).send({ error: 'Personagem não encontrado.' });

    const { state, report } = syncPlayer(row);
    return { name: row.name, player: toView(state), report };
  });

  app.post('/api/game/command', async (request, reply) => {
    let row: PlayerRow | null;
    try {
      row = await requirePlayer(request);
    } catch {
      return reply.code(401).send({ error: 'Não autenticado.' });
    }
    if (!row) return reply.code(404).send({ error: 'Personagem não encontrado.' });

    const command = commandBody.parse(request.body);

    // O catch-up roda ANTES do comando: o tempo decorrido pertence à política
    // antiga. Trocar para "empurrar" não pode reescrever a noite que passou.
    const { state, report } = syncPlayer(row);

    switch (command.type) {
      case 'politica':
        state.policy = command.policy;
        break;

      case 'arena': {
        if (!ARENAS[command.arenaId]) {
          return reply.code(400).send({ error: 'Arena desconhecida.' });
        }
        switchArena(state, command.arenaId);
        break;
      }

      case 'doutrina': {
        const member = state.party[command.memberIndex];
        if (!member) return reply.code(400).send({ error: 'Personagem inexistente.' });
        member.doctrine = { ...member.doctrine, ...command.patch };
        break;
      }

      case 'comprar': {
        const cost = POTION_PRICE[command.item] * command.quantity;
        if (state.gold < cost) {
          return reply.code(400).send({ error: 'Gold insuficiente.', cost, gold: state.gold });
        }
        state.gold -= cost;
        // A compra é dividida igualmente entre os membros do grupo.
        const share = Math.floor(command.quantity / state.party.length);
        const remainder = command.quantity - share * state.party.length;
        state.party.forEach((member, index) => {
          const amount = share + (index < remainder ? 1 : 0);
          if (command.item === 'vida') member.potions += amount;
          else member.manaPotions += amount;
        });
        break;
      }
    }

    savePlayerState(row.id, state, partyLevel(state));
    return { name: row.name, player: toView(state), report };
  });

  // --- ranking -------------------------------------------------------------

  app.get('/api/ranking', async () => ({
    ranking: topPlayers(50).map((entry, index) => ({
      position: index + 1,
      name: entry.name,
      level: entry.level,
      clearedWaves: entry.cleared_waves,
    })),
  }));
}

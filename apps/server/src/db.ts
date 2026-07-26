import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

import type { PlayerState } from '@covil/core';

import { env } from './env.js';

/**
 * Persistência.
 *
 * SQLite via `node:sqlite`, sem dependência nativa e sem banco gerenciado —
 * custo de infra é restrição de design neste projeto. Todo o acesso passa por
 * aqui, então trocar para Postgres depois fica contido a este arquivo.
 */

const file = resolve(process.cwd(), env.DATABASE_FILE);
mkdirSync(dirname(file), { recursive: true });

export const db = new DatabaseSync(file);

// WAL deixa leitura e escrita concorrerem sem bloquear uma à outra.
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');
db.exec('PRAGMA busy_timeout = 5000');

db.exec(`
  CREATE TABLE IF NOT EXISTS accounts (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT    NOT NULL,
    created_at    INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS players (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id    INTEGER NOT NULL UNIQUE REFERENCES accounts(id) ON DELETE CASCADE,
    name          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    state         TEXT    NOT NULL,
    level         INTEGER NOT NULL DEFAULT 1,
    cleared_waves INTEGER NOT NULL DEFAULT 0,
    updated_at    INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS players_ranking
    ON players (level DESC, cleared_waves DESC, updated_at ASC);
`);

export interface AccountRow {
  id: number;
  email: string;
  password_hash: string;
  created_at: number;
}

export interface PlayerRow {
  id: number;
  account_id: number;
  name: string;
  state: string;
  level: number;
  cleared_waves: number;
  updated_at: number;
}

export function findAccountByEmail(email: string): AccountRow | null {
  return (db.prepare('SELECT * FROM accounts WHERE email = ?').get(email) as
    | AccountRow
    | undefined) ?? null;
}

export function createAccount(email: string, passwordHash: string): number {
  const result = db
    .prepare('INSERT INTO accounts (email, password_hash, created_at) VALUES (?, ?, ?)')
    .run(email, passwordHash, Date.now());
  return Number(result.lastInsertRowid);
}

export function findPlayerByAccount(accountId: number): PlayerRow | null {
  return (db.prepare('SELECT * FROM players WHERE account_id = ?').get(accountId) as
    | PlayerRow
    | undefined) ?? null;
}

export function playerNameTaken(name: string): boolean {
  return db.prepare('SELECT 1 FROM players WHERE name = ?').get(name) !== undefined;
}

export function createPlayerRow(
  accountId: number,
  name: string,
  state: PlayerState,
  level: number,
): number {
  const result = db
    .prepare(
      `INSERT INTO players (account_id, name, state, level, cleared_waves, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(accountId, name, JSON.stringify(state), level, state.clearedWaves, Date.now());
  return Number(result.lastInsertRowid);
}

export function savePlayerState(id: number, state: PlayerState, level: number): void {
  db.prepare(
    `UPDATE players SET state = ?, level = ?, cleared_waves = ?, updated_at = ? WHERE id = ?`,
  ).run(JSON.stringify(state), level, state.clearedWaves, Date.now(), id);
}

export interface RankingRow {
  name: string;
  level: number;
  cleared_waves: number;
}

export function topPlayers(limit: number): RankingRow[] {
  return db
    .prepare(
      `SELECT name, level, cleared_waves FROM players
       ORDER BY level DESC, cleared_waves DESC, updated_at ASC
       LIMIT ?`,
    )
    .all(limit) as unknown as RankingRow[];
}

export function parseState(row: PlayerRow): PlayerState {
  return JSON.parse(row.state) as PlayerState;
}

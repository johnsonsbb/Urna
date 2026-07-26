import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * Hash de senha com scrypt do próprio Node.
 *
 * Sem dependência nativa de propósito: bcrypt e argon2 exigem compilação, e o
 * scrypt do `node:crypto` é uma função de derivação adequada para senhas.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${derived.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, saltPart, hashPart] = stored.split('$');
  if (scheme !== 'scrypt' || !saltPart || !hashPart) return false;

  const salt = Buffer.from(saltPart, 'base64');
  const expected = Buffer.from(hashPart, 'base64');
  const derived = await scryptAsync(password, salt, expected.length);

  // Comparação em tempo constante: comparar com === vaza o tamanho do prefixo
  // correto e abre espaço para ataque de temporização.
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

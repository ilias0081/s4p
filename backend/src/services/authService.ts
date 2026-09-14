import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { db } from '../db/database.js';
import type { Database } from '../db/types.js';

const scrypt = promisify(nodeScrypt);
const HASH_LENGTH = 64;
const SALT_LENGTH = 16;

export type User = Database['users'];

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type SafeUser = Omit<User, 'password'>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex');
  const hashed = (await scrypt(password, salt, HASH_LENGTH)) as Buffer;

  return `${salt}:${hashed.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const candidateHash = (await scrypt(password, salt, HASH_LENGTH)) as Buffer;
  const actualHash = Buffer.from(hash, 'hex');

  if (candidateHash.length !== actualHash.length) {
    return false;
  }

  try {
    return timingSafeEqual(candidateHash, actualHash);
  } catch {
    return false;
  }
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  const user = await db
    .insertInto('users')
    .values({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email,
      password: passwordHash
    })
    .returningAll()
    .executeTakeFirstOrThrow();

  return user;
}

export async function findUserByEmail(email: string): Promise<User | undefined> {
  const normalizedEmail = normalizeEmail(email);

  return db
    .selectFrom('users')
    .selectAll()
    .where('email', '=', normalizedEmail)
    .executeTakeFirst();
}

export async function authenticateUser(email: string, password: string): Promise<SafeUser | null> {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    return null;
  }

  const { password: _password, ...safeUser } = user;

  return safeUser;
}

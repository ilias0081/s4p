import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

import { db } from '../db/database.js';
import type { Database } from '../db/types.js';

const scrypt = promisify(nodeScrypt);

export type UserRow = Database['users'];

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
};

export type SafeUser = Omit<UserRow, 'password'>;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;

  return `${salt}:${derivedKey.toString('hex')}`;
}

async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, hashString] = storedHash.split(':');

  if (!salt || !hashString) {
    return false;
  }

  const candidateHash = (await scrypt(password, salt, 64)) as Buffer;
  const actualHash = Buffer.from(hashString, 'hex');

  if (candidateHash.length !== actualHash.length) {
    return false;
  }

  try {
    return timingSafeEqual(candidateHash, actualHash);
  } catch {
    return false;
  }
}

export async function createUser(input: CreateUserInput): Promise<SafeUser> {
  const email = normalizeEmail(input.email);
  const passwordHash = await hashPassword(input.password);

  const createdUser = await db
    .insertInto('users')
    .values({
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      email,
      password: passwordHash,
    })
    .returning(['id', 'first_name', 'last_name', 'email'])
    .executeTakeFirstOrThrow();

  return createdUser;
}

export async function findUserByEmail(email: string): Promise<UserRow | undefined> {
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

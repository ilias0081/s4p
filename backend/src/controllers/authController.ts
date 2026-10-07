import type { Request, Response } from 'express';
import { z } from 'zod';
import { db } from '../db/database.js';

import { getUserId, handleCommonError, notAuthenticatedError, validateBody } from '../lib/utils.js';
import { authenticateUser, createUser, findUserByEmail } from '../services/authService.js';

export async function registerUser(request: Request, response: Response) {
  try {
    const { firstName, lastName, email, password } = validateBody(request.body, z.object({
      firstName: z.string().trim().min(1),
      lastName: z.string().trim().min(1),
      email: z.email(),
      password: z.string().min(1),
    }));
    const existingUser = await findUserByEmail(email);

    if (existingUser) {
      return response.status(409).json({ error: 'User already exists.' });
    }

    const user = await createUser({
      firstName,
      lastName,
      email,
      password,
    });

    return response.status(201).json({
      message: 'User created successfully.',
      user,
    });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to create user.' });
  }
}

export async function loginUser(request: Request, response: Response) {
  try {
    const { email, password } = validateBody(request.body, z.object({
      email: z.email(),
      password: z.string().min(1),
    }));
    const user = await authenticateUser(email, password);

    if (!user) {
      return response.status(401).json({ error: 'Invalid email or password.' });
    }

    request.session.regenerate((sessionError) => {
      if (sessionError) {
        return handleCommonError(sessionError, response) ?? response.status(500).json({ error: 'Unable to sign in.' });
      }

      request.session.userId = user.id.toString();
      request.session.userEmail = user.email;

      return response.status(200).json({
        message: 'Login successful.',
        user,
      });
    });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to sign in.' });
  }
}

export async function getUserData(request: Request, response: Response) {
  try {
    if (!request.session.userId) {
      return response.status(200).json({ user: null });
    }

    const user = await db
      .selectFrom('s4p.users')
      .select(['id', 'first_name', 'last_name', 'email'])
      .where('id', '=', getUserId(request))
      .executeTakeFirst();

    if (!user) {
      request.session.destroy(() => undefined);
    }

    return response.status(200).json({ user: user ?? null });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to get user data.' });
  }
}

export async function getCurrentUser(request: Request, response: Response) {
  try {
    const userId = getUserId(request);
    const user = await findUserByEmail(request.session.userEmail ?? '');

    if (!user || user.id.toString() !== userId) {
      request.session.destroy(() => undefined);
      throw notAuthenticatedError();
    }

    const { password: _password, ...safeUser } = user;

    return response.status(200).json({ user: safeUser });
  } catch (error) {
    return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to get current user.' });
  }
}

export function logoutUser(request: Request, response: Response) {
  request.session.destroy((error) => {
    if (error) {
      return handleCommonError(error, response) ?? response.status(500).json({ error: 'Unable to sign out.' });
    }

    response.clearCookie('connect.sid');
    return response.status(204).send();
  });
}

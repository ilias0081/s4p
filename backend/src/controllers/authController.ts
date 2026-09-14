import type { Request, Response } from 'express';

import { authenticateUser, createUser, findUserByEmail } from '../services/auth.js';

export async function registerUser(request: Request, response: Response) {
  try {
    const { firstName, lastName, email, password } = request.body ?? {};

    if (!firstName || !lastName || !email || !password) {
      return response.status(400).json({ error: 'Missing required fields.' });
    }

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
    console.error('Register user failed:', error);
    return response.status(500).json({ error: 'Unable to create user.' });
  }
}

export async function loginUser(request: Request, response: Response) {
  try {
    const { email, password } = request.body ?? {};

    if (!email || !password) {
      return response.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await authenticateUser(email, password);

    if (!user) {
      return response.status(401).json({ error: 'Invalid email or password.' });
    }

    request.session.regenerate((sessionError) => {
      if (sessionError) {
        console.error('Create login session failed:', sessionError);
        return response.status(500).json({ error: 'Unable to sign in.' });
      }

      request.session.userId = user.id.toString();
      request.session.userEmail = user.email;

      return response.status(200).json({
        message: 'Login successful.',
        user,
      });
    });
  } catch (error) {
    console.error('Login failed:', error);
    return response.status(500).json({ error: 'Unable to sign in.' });
  }
}

export async function getCurrentUser(request: Request, response: Response) {
  if (!request.session.userId) {
    return response.status(401).json({ error: 'Not authenticated.' });
  }

  const user = await findUserByEmail(request.session.userEmail ?? '');

  if (!user || user.id.toString() !== request.session.userId) {
    request.session.destroy(() => undefined);
    return response.status(401).json({ error: 'Not authenticated.' });
  }

  const { password: _password, ...safeUser } = user;

  return response.status(200).json({ user: safeUser });
}

export function logoutUser(request: Request, response: Response) {
  request.session.destroy((error) => {
    if (error) {
      return response.status(500).json({ error: 'Unable to sign out.' });
    }

    response.clearCookie('connect.sid');
    return response.status(204).send();
  });
}

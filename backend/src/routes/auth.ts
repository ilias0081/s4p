import { Router } from 'express';

import { getCurrentUser, loginUser, logoutUser, registerUser } from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/signup', registerUser);
authRouter.post('/login', loginUser);
authRouter.get('/session', getCurrentUser);
authRouter.post('/logout', logoutUser);

export { authRouter };

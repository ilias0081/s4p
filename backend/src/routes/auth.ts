import { Router } from 'express';

import { getCurrentUser, getUserData, loginUser, logoutUser, registerUser } from '../controllers/authController.js';

const authRouter = Router();

authRouter.post('/signup', registerUser);
authRouter.post('/login', loginUser);
authRouter.get('/session', getCurrentUser);
authRouter.get('/user-data', getUserData);
authRouter.post('/logout', logoutUser);

export { authRouter };

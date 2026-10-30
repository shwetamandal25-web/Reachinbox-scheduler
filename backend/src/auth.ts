import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from './config';
import { pool } from './db';

export interface AuthedReq extends Request { userId?: string }
export const authRouter = Router();

export function requireAuth(req: AuthedReq, res: Response, next: NextFunction) {
  try {
    req.userId = (jwt.verify(req.cookies.token, config.jwtSecret) as { uid: string }).uid;
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

authRouter.get('/google', (_req, res) => {
  const p = new URLSearchParams({
    client_id: config.google.id, redirect_uri: config.google.redirect,
    response_type: 'code', scope: 'openid email profile', prompt: 'select_account',
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${p}`);
});

authRouter.get('/google/callback', async (req, res) => {
  try {
    const t: any = await (await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ code: String(req.query.code), client_id: config.google.id, client_secret: config.google.secret, redirect_uri: config.google.redirect, grant_type: 'authorization_code' }),
    })).json();
    const g: any = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${t.access_token}` } })).json();
    const { rows } = await pool.query(
      `INSERT INTO users(google_id,email,name,avatar) VALUES ($1,$2,$3,$4)
       ON CONFLICT (google_id) DO UPDATE SET email=$2,name=$3,avatar=$4 RETURNING id`,
      [g.sub, g.email, g.name, g.picture]);
    const token = jwt.sign({ uid: rows[0].id }, config.jwtSecret, { expiresIn: '7d' });
    res.cookie('token', token, { httpOnly: true, sameSite: 'lax', maxAge: 7 * 864e5 });
    res.redirect(config.frontendUrl);
  } catch { res.redirect(`${config.frontendUrl}/?error=login_failed`); }
});

authRouter.get('/me', requireAuth, async (req: AuthedReq, res) => {
  const { rows } = await pool.query('SELECT id,name,email,avatar FROM users WHERE id=$1', [req.userId]);
  rows[0] ? res.json(rows[0]) : res.status(401).json({ error: 'Unauthorized' });
});

authRouter.post('/logout', (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); });

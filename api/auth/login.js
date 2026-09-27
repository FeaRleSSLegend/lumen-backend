import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../_lib/db.js';
import { cors, signToken } from '../_lib/auth.js';

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1).max(128),
});

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  const parsed = schema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const result = await query('SELECT id, email, password_hash FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }
    const token = signToken(user);
    res.status(200).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error('login failed');
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../_lib/db.js';
import { cors, signToken } from '../_lib/auth.js';

const schema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
});

export default async function handler(req, res) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }

  let body;
  try {
    body = req.body ?? {};
  } catch {
    res.status(400).json({ error: 'Invalid JSON' });
    return;
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid input' });
    return;
  }
  const { email, password } = parsed.data;
  try {
    const password_hash = await bcrypt.hash(password, 12);
    const userResult = await query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email',
      [email, password_hash]
    );
    const user = userResult.rows[0];
    await query('INSERT INTO planner_data (user_id) VALUES ($1)', [user.id]);
    const token = signToken(user);
    res.status(201).json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    if (err?.code === '23505') {
      res.status(409).json({ error: 'Email already registered' });
      return;
    }
    console.error('register failed', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

import { z } from 'zod';
import { query } from './_lib/db.js';
import { cors, requireUser } from './_lib/auth.js';

const putSchema = z.object({
  data: z.record(z.string(), z.any()),
  baseVersion: z.number().int().min(0),
});

export default async function handler(req, res) {
  if (cors(req, res)) return;
  const userId = requireUser(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    try {
      const result = await query('SELECT data, version, updated_at FROM planner_data WHERE user_id = $1', [userId]);
      const row = result.rows[0];
      if (!row) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(row);
    } catch (err) {
      console.error('sync get failed');
      res.status(500).json({ error: 'Internal Server Error' });
    }
    return;
  }

  if (req.method === 'PUT') {
    const parsed = putSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid input' });
      return;
    }
    const { data, baseVersion } = parsed.data;
    try {
      const updated = await query(
        'UPDATE planner_data SET data = $1::jsonb, version = version + 1, updated_at = now() WHERE user_id = $2 AND version = $3 RETURNING data, version, updated_at',
        [JSON.stringify(data), userId, baseVersion]
      );
      if (updated.rows[0]) {
        res.status(200).json(updated.rows[0]);
        return;
      }
      const current = await query('SELECT data, version, updated_at FROM planner_data WHERE user_id = $1', [userId]);
      const currentRow = current.rows[0];
      if (!currentRow) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(409).json({ error: 'Version conflict', server: currentRow });
    } catch (err) {
      console.error('sync put failed');
      res.status(500).json({ error: 'Internal Server Error' });
    }
    return;
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}

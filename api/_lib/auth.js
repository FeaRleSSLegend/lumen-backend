import jwt from 'jsonwebtoken';

export function signToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

export function requireUser(req, res) {
  const header = req.headers?.authorization || '';
  const parts = header.split(' ');
  const token = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload?.sub) {
      res.status(401).json({ error: 'Unauthorized' });
      return null;
    }
    return payload.sub;
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
}

export function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGIN || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}

function parseTokens() {
  const raw = process.env.API_TOKENS || '';
  if (raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (error) {
      // fall through to custom format support
    }

    const tokens = {};
    raw.split(',').forEach((entry) => {
      const trimmed = entry.trim();
      if (!trimmed) return;
      const [role, value] = trimmed.split(':');
      if (role && value) tokens[role.trim()] = value.trim();
    });
    return tokens;
  }

  const singleToken = process.env.API_TOKEN;
  if (singleToken) return { admin: singleToken };

  return {};
}

function resolveUserFromToken(token) {
  const tokens = parseTokens();

  for (const [role, value] of Object.entries(tokens)) {
    if (value === token) {
      return { role, token };
    }
  }

  return null;
}

function authMiddleware(requiredRole = null) {
  return function (req, res, next) {
    const header = req.headers.authorization || req.headers['x-api-key'];
    const token = typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7) : header;

    if (!token) {
      return res.status(401).json({ error: 'missing_auth_token' });
    }

    const user = resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: 'invalid_auth_token' });
    }

    if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
      return res.status(403).json({ error: 'insufficient_role' });
    }

    req.user = user;
    next();
  };
}

module.exports = { authMiddleware, resolveUserFromToken, parseTokens };

import jwt from 'jsonwebtoken';
export { requireAuth as auth };


function extractToken(req) {
  const fromCookie = req.cookies?.token;
  const fromHeader = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.split(' ')[1]
    : null;
  return fromCookie || fromHeader || null;
}

export function requireAuth(req, res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET); // throws on expired/invalid
    // Normalize payload into a minimal, trusted user object
    const id = payload?.sub || payload?.user?.id || payload?.id;
    if (!id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }

    req.user = { id: String(id), role: payload?.role || 'user' };
    return next();
  } catch (err) {
    // err.name can be JsonWebTokenError / TokenExpiredError
    const code = err.name === 'TokenExpiredError' ? 401 : 401;
    return res.status(code).json({ message: 'Unauthorized' });
  }
}

export function requireSelf(paramName = 'id') {
  return (req, res, next) => {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const targetId = String(req.params?.[paramName] || '');
    if (!targetId || targetId !== String(req.user.id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    return next();
  };
}

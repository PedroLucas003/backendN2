const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    
    if (!decoded.isAdmin) {
      return res.status(403).json({ error: 'Acesso não autorizado - Requer privilégios de administrador' });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
};
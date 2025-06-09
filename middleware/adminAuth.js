const jwt = require('jsonwebtoken');

const adminAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Nema tokena, pristup odbijen' });
  }

  jwt.verify(token, 'tajni_admin_kljuc', (err, admin) => {
    if (err || admin.role !== 'admin') {
      return res.status(403).json({ message: 'Nevažeći ili nedozvoljen pristup' });
    }

    req.admin = admin;
    next();
  });
};

module.exports = adminAuth;

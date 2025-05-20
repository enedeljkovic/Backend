const jwt = require('jsonwebtoken');


const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Nema tokena, pristup odbijen' });
  }

  jwt.verify(token, 'tajni_kljuc', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Nevažeći token' });
    }

    req.user = user; 
    next(); 
  });
};

module.exports = authenticateToken;

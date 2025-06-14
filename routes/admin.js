const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const SECRET = 'tajni_kljuc';

module.exports = (pool) => {
  const router = express.Router();

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
      const result = await pool.query('SELECT * FROM admins WHERE email = $1', [email]);
      const admin = result.rows[0];

      if (!admin) {
        return res.status(401).json({ message: 'Pogrešan email ili lozinka' });
      }

      const isValid = await bcrypt.compare(password, admin.password);
      if (!isValid) {
        return res.status(401).json({ message: 'Pogrešan email ili lozinka' });
      }

      const token = jwt.sign({ adminId: admin.id, email: admin.email }, SECRET, { expiresIn: '1h' });
      res.json({ message: 'Prijava uspješna', token });
    } catch (err) {
      console.error('Greška pri admin loginu:', err);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  function authenticateAdmin(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Nema tokena' });

    jwt.verify(token, SECRET, (err, decoded) => {
      if (err || !decoded.adminId) return res.status(403).json({ message: 'Zabranjen pristup' });
      req.admin = decoded;
      next();
    });
  }

  router.get('/users', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, email FROM users');
      res.json({ users: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri dohvaćanju korisnika' });
    }
  });

  router.delete('/user/:id', authenticateAdmin, async (req, res) => {
  try {
   
    await pool.query('DELETE FROM favorite_recipes WHERE id = $1', [req.params.id]);

    
    await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);

    
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);

    res.json({ message: 'Korisnik i povezani podaci su obrisani' });
  } catch (err) {
    console.error('Greška pri brisanju korisnika:', err);
    res.status(500).json({ message: 'Greška pri brisanju korisnika' });
  }
});


  router.get('/recipes', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM recipes');
      res.json({ recipes: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri dohvaćanju recepata' });
    }
  });

  router.delete('/recipe/:id', authenticateAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM recipes WHERE id = $1', [req.params.id]);
      res.json({ message: 'Recept obrisan' });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri brisanju recepta' });
    }
  });

  router.get('/comments', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM comments');
      res.json({ comments: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri dohvaćanju komentara' });
    }
  });

  router.delete('/comment/:id', authenticateAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM comments WHERE id = $1', [req.params.id]);
      res.json({ message: 'Komentar obrisan' });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri brisanju komentara' });
    }
  });

  router.get('/substitutions', authenticateAdmin, async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM ingredient_substitutes');
      res.json({ substitutions: result.rows });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri dohvaćanju zamjena' });
    }
  });

  router.delete('/substitution/:id', authenticateAdmin, async (req, res) => {
    try {
      await pool.query('DELETE FROM ingredient_substitutes WHERE id = $1', [req.params.id]);
      res.json({ message: 'Zamjena obrisana' });
    } catch (err) {
      res.status(500).json({ message: 'Greška pri brisanju zamjene' });
    }
  });

  return router;
};

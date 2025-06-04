const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const unique = `avatar-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, unique);
  }
});
const upload = multer({ storage });

module.exports = (pool) => {
  router.post('/register', async (req, res) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Molimo unesite ime, email i lozinku' });
    }

    try {
      const existingUser = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ message: 'Korisnik s tim emailom već postoji' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
        [username, email, hashedPassword]
      );

      res.status(201).json({ message: 'Korisnik uspješno registriran', user: result.rows[0] });
    } catch (error) {
      console.error('Greška pri registraciji:', error);
      res.status(500).json({ message: 'Greška pri registraciji korisnika' });
    }
  });

  router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Molimo unesite email i lozinku' });
    }

    try {
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(400).json({ message: 'Korisnik s tim emailom ne postoji' });
      }

      const user = result.rows[0];
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Pogrešna lozinka' });
      }

      const token = jwt.sign(
        { userId: user.id, name: user.username, email: user.email },
        'tajni_kljuc',
        { expiresIn: '1h' }
      );

      res.status(200).json({ message: 'Uspješno prijavljivanje', token });
    } catch (error) {
      console.error('Greška pri prijavi:', error);
      res.status(500).json({ message: 'Greška pri prijavi korisnika' });
    }
  });

  router.get('/profile', authenticateToken, async (req, res) => {
    const { userId } = req.user;

    try {
      const userResult = await pool.query(
        'SELECT id, username, email, avatar_url FROM users WHERE id = $1',
        [userId]
      );
      const favResult = await pool.query(
        'SELECT COUNT(*) FROM favorite_recipes WHERE user_id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      res.status(200).json({
        user: {
          id: userResult.rows[0].id,
          name: userResult.rows[0].username,
          email: userResult.rows[0].email,
          avatarUrl: userResult.rows[0].avatar_url,
          favorites: favResult.rows[0].count
        }
      });
    } catch (error) {
      console.error('Greška pri dohvaćanju profila:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  router.post('/profile/change-password', authenticateToken, async (req, res) => {
    const { userId } = req.user;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ message: 'Unesite novu lozinku' });
    }

    try {
      const hashedNew = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNew, userId]);
      res.status(200).json({ message: 'Lozinka promijenjena' });
    } catch (error) {
      console.error('Greška pri promjeni lozinke:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  router.post('/profile/upload-avatar', authenticateToken, upload.single('image'), async (req, res) => {
    const { userId } = req.user;
    const avatarPath = `/uploads/${req.file.filename}`;

    try {
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [avatarPath, userId]);
      res.status(200).json({ message: 'Avatar spremljen', avatarUrl: avatarPath });
    } catch (error) {
      console.error('Greška pri spremanju avatara:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  router.delete('/profile/delete', authenticateToken, async (req, res) => {
    const { userId } = req.user;

    try {
      await pool.query('DELETE FROM favorite_recipes WHERE user_id = $1', [userId]);
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      res.status(200).json({ message: 'Račun je obrisan' });
    } catch (error) {
      console.error('Greška pri brisanju računa:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  router.get('/favorites/count', authenticateToken, async (req, res) => {
    const { userId } = req.user;

    try {
      const result = await pool.query(
        'SELECT COUNT(*) FROM favorite_recipes WHERE user_id = $1',
        [userId]
      );

      res.status(200).json({ count: parseInt(result.rows[0].count) });
    } catch (error) {
      console.error('Greška pri dohvaćanju broja favorita:', error);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

router.get('/search/last', authenticateToken, async (req, res) => {
  const { userId } = req.user;

  try {
    const result = await pool.query(
      'SELECT ingredients FROM search_history WHERE user_id = $1 ORDER BY timestamp DESC LIMIT 1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(200).json({ lastSearch: null });
    }

    const ingredients = result.rows[0].ingredients.join(', ');
    res.status(200).json({ lastSearch: ingredients });
  } catch (error) {
    console.error('Greška pri dohvaćanju zadnje pretrage:', error);
    res.status(500).json({ message: 'Greška na serveru' });
  }
});


  return router;
};

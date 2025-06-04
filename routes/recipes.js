const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authenticateToken = require('../middleware/auth');

module.exports = (pool) => {
  
  const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueName = `recipe-${Date.now()}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    }
  });
  const upload = multer({ storage });

  
  router.post('/recipes', authenticateToken, upload.single('image'), async (req, res) => {
    const { name, description, ingredients, category } = req.body;
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

    if (!name || !description || !ingredients || !category || !imagePath) {
      return res.status(400).json({ message: 'Sva polja i slika su obavezni.' });
    }

    try {
      const result = await pool.query(
        'INSERT INTO recipes (name, description, ingredients, category, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [name, description, ingredients, category, imagePath]
      );
      res.status(201).json({ message: 'Recept dodan', recipe: result.rows[0] });
    } catch (error) {
      console.error('Greška pri dodavanju recepta:', error);
      res.status(500).json({ message: 'Greška na serveru.' });
    }
  });

  
  router.get('/recipes', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM recipes ORDER BY id DESC');
      res.status(200).json({ recipes: result.rows });
    } catch (error) {
      console.error('Greška pri dohvaćanju recepata:', error);
      res.status(500).json({ message: 'Greška na serveru.' });
    }
  });

  return router;
};

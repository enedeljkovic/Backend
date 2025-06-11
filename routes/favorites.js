
const express = require('express');


module.exports = (pool) => {
  const router = express.Router();
console.log('Pozvan je POST /user/:userId/favorites');

  router.get('/user/:userId/favorites', async (req, res) => {
    const { userId } = req.params;
    try {
      const result = await pool.query(
        `SELECT r.*
         FROM recipes r
         JOIN user_favorites uf ON r.id = uf.recipe_id
         WHERE uf.user_id = $1`,
        [userId]
      );
      res.status(200).json({ favorites: result.rows });
    } catch (err) {
      console.error('Greška pri dohvaćanju omiljenih recepata:', err);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  router.post('/user/:userId/favorites', async (req, res) => {
    const { userId } = req.params;
    const { recipeId } = req.body;

    if (!userId || !recipeId) {
      return res.status(400).json({ message: 'Nedostaje userId ili recipeId' });
    }

    try {
      const userCheck = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Korisnik nije pronađen' });
      }

      const recipeCheck = await pool.query('SELECT * FROM recipes WHERE id = $1', [recipeId]);
      if (recipeCheck.rows.length === 0) {
        return res.status(404).json({ message: 'Recept nije pronađen' });
      }

      const exists = await pool.query(
        'SELECT * FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      if (exists.rows.length > 0) {
        return res.status(400).json({ message: 'Recept je već u omiljenima' });
      }

      await pool.query(
        'INSERT INTO user_favorites (user_id, recipe_id) VALUES ($1, $2)',
        [userId, recipeId]
      );
      res.status(201).json({ message: 'Recept dodan u omiljene' });
    } catch (err) {
      console.error('Greška pri dodavanju u omiljene:', err);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  router.delete('/user/:userId/favorites/:recipeId', async (req, res) => {
    const { userId, recipeId } = req.params;
    try {
      await pool.query(
        'DELETE FROM user_favorites WHERE user_id = $1 AND recipe_id = $2',
        [userId, recipeId]
      );
      res.status(200).json({ message: 'Recept uklonjen iz omiljenih' });
    } catch (err) {
      console.error('Greška pri uklanjanju iz omiljenih:', err);
      res.status(500).json({ message: 'Greška na serveru' });
    }
  });

  return router;
};

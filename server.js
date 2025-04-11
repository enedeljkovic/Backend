const express = require('express');
const { Pool } = require('pg'); 
const app = express();
const port = 3001;

app.use(express.json());


const pool = new Pool({
  user: 'postgres', 
  host: 'localhost', 
  database: 'InstaRecipe', 
  password: 'fdg5ahee', 
  port: 5432, 
});


pool.connect()
  .then(() => {
    console.log('Povezano s PostgreSQL-om');
  })
  .catch((err) => {
    console.error('Greška pri povezivanju s PostgreSQL-om:', err);
  });


app.post('/api/v1/Users', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Morate unijeti username, email i password' });
  }

  try {
    const existingUserQuery = 'SELECT * FROM users WHERE email = $1';
    const result = await pool.query(existingUserQuery, [email]);

    if (result.rows.length > 0) {
      return res.status(400).json({ message: 'Korisnik s tim emailom već postoji' });
    }

    const insertUserQuery = 'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *';
    const newUser = await pool.query(insertUserQuery, [username, email, password]);

    res.status(201).json({ message: 'Korisnik uspješno dodan', userId: newUser.rows[0].id });
  } catch (error) {
    console.error('Greška pri dodavanju korisnika:', error);
    res.status(500).json({ message: 'Greška pri dodavanju korisnika' });
  }
});
//
app.post('/api/v1/recipes', async (req, res) => {
  const { name, ingredients, category } = req.body;

  if (!name || !ingredients || !Array.isArray(ingredients)) {
    return res.status(400).json({ message: 'Unesite naziv, listu sastojaka i (opcionalno) kategoriju.' });
  }

  try {
    const query = 'INSERT INTO recipes (name, ingredients, category) VALUES ($1, $2, $3) RETURNING *';
    const values = [name, ingredients, category || null];

    const result = await pool.query(query, values);

    res.status(201).json({
      message: 'Recept uspješno dodan',
      recipe: result.rows[0]
    });
  } catch (error) {
    console.error('Greška pri dodavanju recepta:', error);
    res.status(500).json({ message: 'Greška na serveru' });
  }
});
//



let ingredients = [];
app.post('/api/v1/ingredients', (req, res) => {
  const { ingredientsList } = req.body;
  if (!ingredientsList || ingredientsList.length === 0) {
    return res.status(400).json({ message: 'Morate unijeti barem jedan sastojak' });
  }
  ingredients = ingredientsList;
  res.status(200).json({ message: 'Sastojci uspješno uneseni', ingredients });
});


let recipes = [
  { id: 1, name: "Pasta", ingredients: ["pasta", "tomato sauce", "cheese"], category: "vegetarian" },
  { id: 2, name: "Pizza", ingredients: ["dough", "tomato sauce", "cheese"], category: "vegetarian" },
  { id: 3, name: "Salad", ingredients: ["lettuce", "tomato", "cheese"], category: "vegan" },
];
//
app.get('/api/v1/recipes', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM recipes');
    res.status(200).json({ recipes: result.rows });
  } catch (error) {
    console.error('Greška pri dohvaćanju recepata:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju recepata' });
  }
});
//


let favoriteRecipes = [];
app.post('/api/v1/favorites', async (req, res) => {
  const { userId, recipeId } = req.body;

  if (!userId || !recipeId) {
    return res.status(400).json({ message: 'Nedostaje userId ili recipeId' });
  }

  try {
   
    const recipeCheck = await pool.query('SELECT * FROM recipes WHERE id = $1', [recipeId]);
    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Recept s tim ID-om ne postoji' });
    }

    
    const favoriteCheck = await pool.query(
      'SELECT * FROM favorite_recipes WHERE user_id = $1 AND recipe_id = $2',
      [userId, recipeId]
    );
    if (favoriteCheck.rows.length > 0) {
      return res.status(400).json({ message: 'Recept je već u omiljenima' });
    }

    
    await pool.query(
      'INSERT INTO favorite_recipes (user_id, recipe_id) VALUES ($1, $2)',
      [userId, recipeId]
    );

    res.status(200).json({ message: 'Recept je dodan u omiljene' });
  } catch (error) {
    console.error('Greška pri dodavanju u omiljene:', error);
    res.status(500).json({ message: 'Greška pri dodavanju u omiljene' });
  }
});



let searchHistory = [];
app.post('/api/v1/history', (req, res) => {
  const { ingredientsList } = req.body;

  if (!ingredientsList || ingredientsList.length === 0) {
    return res.status(400).json({ message: 'Morate unijeti sastojke za spremanje u povijest.' });
  }

  searchHistory.push({ ingredientsList, timestamp: new Date() });

  if (searchHistory.length > 10) {
    searchHistory.shift();
  }

  res.status(200).json({ message: 'Pretraga dodana u povijest.', searchHistory });
});


app.get('/api/v1/history', (req, res) => {
  if (searchHistory.length === 0) {
    return res.status(200).json({ message: 'Povijest pretraživanja je prazna.' });
  }

  res.status(200).json({ searchHistory });
});


app.post('/api/v1/user/:userId/favorites', async (req, res) => {
  const { userId } = req.params;  
  const { recipeId } = req.body;  

  try {
    
    const userQuery = 'SELECT * FROM users WHERE id = $1';
    const userResult = await pool.query(userQuery, [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'Korisnik nije pronađen' });
    }

    
    const recipeQuery = 'SELECT * FROM recipes WHERE id = $1';
    const recipeResult = await pool.query(recipeQuery, [recipeId]);
    if (recipeResult.rows.length === 0) {
      return res.status(404).json({ message: 'Recept nije pronađen' });
    }

    
    const insertFavoriteQuery = 'INSERT INTO user_favorites (user_id, recipe_id) VALUES ($1, $2)';
    await pool.query(insertFavoriteQuery, [userId, recipeId]);

    
    res.status(201).json({ message: 'Recept dodan u omiljene' });
  } catch (error) {
    console.error('Greška pri dodavanju u omiljene:', error);
    res.status(500).json({ message: 'Greška pri dodavanju u omiljene' });
  }
});

app.get('/api/v1/recipes/search', async (req, res) => {
  const { query } = req.query;  

  if (!query) {
    return res.status(400).json({ message: 'Morate unijeti upit za pretragu' });
  }

  try {
    const searchQuery = `
      SELECT * FROM recipes
      WHERE name ILIKE $1 OR category ILIKE $1 OR ingredients::text ILIKE $1
    `;
    const result = await pool.query(searchQuery, [`%${query}%`]);

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Nema recepata koji odgovaraju vašem upitu' });
    }

    res.status(200).json({ recipes: result.rows });
  } catch (error) {
    console.error('Greška pri pretrazi recepata:', error);
    res.status(500).json({ message: 'Greška pri pretrazi recepata' });
  }
});



app.listen(port, () => {
  console.log(`Server pokrenut na http://localhost:${port}`);
});

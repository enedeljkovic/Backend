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


app.post('/api/v1/users', async (req, res) => {
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

app.get('/api/v1/recipes', (req, res) => {
  if (ingredients.length === 0) {
    return res.status(400).json({ message: 'Morate prvo unijeti sastojke' });
  }

  const matchingRecipes = recipes.filter((recipe) =>
    recipe.ingredients.every((ingredient) => ingredients.includes(ingredient))
  );

  if (matchingRecipes.length === 0) {
    return res.status(200).json({ message: 'Nema recepata koji odgovaraju vašim sastojcima' });
  }

  res.status(200).json({ recipes: matchingRecipes });
});


let favoriteRecipes = [];
app.post('/api/v1/favorites', (req, res) => {
  const { recipeId } = req.body;

  const recipeExists = recipes.find((recipe) => recipe.id === recipeId);
  if (!recipeExists) {
    return res.status(404).json({ message: 'Recept s tim ID-om ne postoji' });
  }

  if (favoriteRecipes.includes(recipeId)) {
    return res.status(400).json({ message: 'Ovaj recept je već u vašim omiljenima' });
  }

  favoriteRecipes.push(recipeId);
  res.status(200).json({ message: 'Recept je dodan u omiljene', favoriteRecipes });
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

app.listen(port, () => {
  console.log(`Server pokrenut na http://localhost:${port}`);
});

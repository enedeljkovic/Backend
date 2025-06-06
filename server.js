const express = require('express');
const { Pool } = require('pg'); 
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const port = 3001;

app.use(express.json());
app.use(cors());
app.use(bodyParser.json());

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


const recipeImageStorage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => {
    const uniqueName = `recipe-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const recipeImageUpload = multer({ storage: recipeImageStorage });




const pool = new Pool({
  user: 'postgres', 
  host: 'localhost', 
  database: 'InstaRecipe', 
  password: 'fdg5ahee', 
  port: 5432, 
});

const usersRouter = require('./routes/users')(pool);
app.use('/api/v1', usersRouter);

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
//
app.post('/api/v1/recipes', recipeImageUpload.single('image'), async (req, res) => {
  const { name, category } = req.body;
  let ingredients = [];

  try {
    ingredients = JSON.parse(req.body.ingredients);
  } catch (err) {
    return res.status(400).json({ message: 'Neispravan format za sastojke' });
  }

  const formattedIngredients = `{${ingredients.map(i => `"${i}"`).join(',')}}`;
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

  if (!name || ingredients.length === 0 || !category) {
    return res.status(400).json({ message: 'Morate unijeti ime, sastojke i kategoriju' });
  }

  try {
    const insertRecipeQuery = 'INSERT INTO recipes (name, ingredients, category, image_url) VALUES ($1, $2, $3, $4) RETURNING *';
    const newRecipe = await pool.query(insertRecipeQuery, [name, formattedIngredients, category, imageUrl]);

    res.status(201).json({ message: 'Recept uspješno dodan', recipe: newRecipe.rows[0] });
  } catch (error) {
    console.error('Greška pri dodavanju recepta:', error);
    res.status(500).json({ message: 'Greška pri dodavanju recepta' });
  }
});




//

let ingredients = [];
let recipes = [
  { id: 1, name: "Pasta", ingredients: ["pasta", "tomato sauce", "cheese"], category: "vegetarian" },
  { id: 2, name: "Pizza", ingredients: ["dough", "tomato sauce", "cheese"], category: "vegetarian" },
  { id: 3, name: "Salad", ingredients: ["lettuce", "tomato", "cheese"], category: "vegan" },
];

//
app.get('/api/v1/recipes/:id', async (req, res) => {
  const recipeId = req.params.id;

  try {
    const result = await pool.query('SELECT * FROM recipes WHERE id = $1', [recipeId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Recept nije pronađen' });
    }

    res.json({ recipe: result.rows[0] });
  } catch (error) {
    console.error('Greška pri dohvaćanju recepta:', error);
    res.status(500).json({ message: 'Greška na serveru' });
  }
});

//
app.post('/api/v1/ingredients', async (req, res) => {
  const { ingredientsList } = req.body;

  if (!ingredientsList || ingredientsList.length === 0) {
    return res.status(400).json({ message: 'Morate unijeti barem jedan sastojak' });
  }

  try {
    
    const insertPromises = ingredientsList.map(async (ingredient) => {
      const result = await pool.query(
        'INSERT INTO ingredients (name) VALUES ($1) ON CONFLICT (name) DO NOTHING RETURNING *',
        [ingredient]
      );
      return result.rows[0];
    });

    
    const addedIngredients = await Promise.all(insertPromises);

    res.status(200).json({ message: 'Sastojci uspješno uneseni', ingredients: addedIngredients });
  } catch (error) {
    console.error('Greška pri dodavanju sastojaka:', error);
    res.status(500).json({ message: 'Greška pri dodavanju sastojaka' });
  }
});

app.get('/api/v1/ingredients', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients');
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Nema pohranjenih sastojaka' });
    }
    res.status(200).json({ ingredients: result.rows });
  } catch (error) {
    console.error('Greška pri dohvaćanju sastojaka:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju sastojaka' });
  }
});


//
app.get('/api/v1/recipes', async (req, res) => {
  const { category, page = 1, limit = 5 } = req.query;
  
  try {
    
    let query = 'SELECT * FROM recipes';  
    const values = [];

    
    if (category) {
      query += ' WHERE category = $1';
      values.push(category);
    }

   
    const startIndex = (page - 1) * limit;
    query += ` LIMIT $${values.length + 1} OFFSET $${values.length + 2}`;
    values.push(limit, startIndex); 

    
    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(200).json({ message: 'Nema recepata u bazi' });
    }

    
    res.status(200).json({
      recipes: result.rows,
      totalRecipes: result.rows.length,
      currentPage: page,
      totalPages: Math.ceil(result.rows.length / limit),
    });
  } catch (error) {
    console.error('Greška pri dohvaćanju recepata:', error);
    res.status(500).json({ message: 'Greška pri dohvaćanju recepata' });
  }
});






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

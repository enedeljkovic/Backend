
const express = require('express');
const app = express();
const port = 3001;


app.use(express.json());


let ingredients = [];  
let recipes = [
    { id: 1, name: "Pasta", ingredients: ["pasta", "tomato sauce", "cheese"], category: "vegetarian" },
    { id: 2, name: "Pizza", ingredients: ["dough", "tomato sauce", "cheese"], category: "vegetarian" },
    { id: 3, name: "Salad", ingredients: ["lettuce", "tomato", "cheese"], category: "vegan" },
  ];


let favoriteRecipes = [];


app.post('/api/v1/ingredients', (req, res) => {
  const { ingredientsList } = req.body;
  if (!ingredientsList || ingredientsList.length === 0) {
    return res.status(400).json({ message: 'Morate unijeti barem jedan sastojak' });
  }
  ingredients = ingredientsList;
  res.status(200).json({ message: 'Sastojci uspješno uneseni', ingredients });
});


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


app.get('/api/v1/favorites', (req, res) => {
    console.log('GET /api/v1/favorites zahtjev primljen');
  const favorites = recipes.filter((recipe) => favoriteRecipes.includes(recipe.id));
  
  if (favorites.length === 0) {
    console.log('Nema omiljenih recepata');
    return res.status(200).json({ message: 'Nemate omiljene recepte' });
  }
  console.log('Omiljeni recepti:', favorites);
  res.status(200).json({ favoriteRecipes: favorites });
});

let ingredientSubstitutes = {
  cheese: ["vegan cheese", "tofu"],
  milk: ["almond milk", "oat milk"],
  tomato: ["salsa", "red bell pepper"],
  lettuce: ["spinach", "arugula"],
};


app.get("/api/v1/substitute/:ingredient", (req, res) => {
  const ingredient = req.params.ingredient.toLowerCase();

  
  const substitutes = ingredientSubstitutes[ingredient];
  
  if (!substitutes) {
    return res.status(404).json({ message: `Nema zamjena za sastojak "${ingredient}"` });
  }
  
  res.status(200).json({ ingredient, substitutes });
});


  
app.listen(port, () => {
  console.log(`Server pokrenut na http://localhost:${port}`);
});

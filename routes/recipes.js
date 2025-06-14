router.post('/recipes', authenticateToken, upload.single('image'), async (req, res) => {
  const name = req.body.name;
  const description = req.body.description;
  const category = req.body.category;
  const imagePath = req.file ? `/uploads/${req.file.filename}` : null;

  let ingredients;
  try {
    ingredients = JSON.parse(req.body.ingredients);
  } catch {
    ingredients = [];
  }

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

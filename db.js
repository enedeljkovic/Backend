
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'InstaRecipe',
  password: 'fdg5ahee',
  port: 5432,
});

module.exports = pool;

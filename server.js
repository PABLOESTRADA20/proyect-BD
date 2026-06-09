// ============================================================
//  Velvet & Co. — Servidor Node.js + PostgreSQL
// ============================================================

require('dotenv').config();
const express  = require('express');
const { Pool } = require('pg');
const path     = require('path');

const app = express();
app.use(express.json());

// ── Servir archivos estáticos del frontend ─────────────────
app.use(express.static(path.join(__dirname)));

// ── Conexión a PostgreSQL ──────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5432,
  database: process.env.DB_NAME     || 'velvetco',
  user:     process.env.DB_USER     || 'postgres',
  password: process.env.DB_PASSWORD || 'tu_password',
});

// Verificar conexión al arrancar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
  } else {
    release();
    console.log('✅ Conectado a PostgreSQL correctamente');
  }
});

// ── RUTAS API ──────────────────────────────────────────────

// GET /api/products — todos los productos (con filtro opcional por categoría)
app.get('/api/products', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query  = 'SELECT * FROM products';
    const params = [];

    if (category && category !== 'Todos') {
      params.push(category);
      query += ` WHERE category = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      const connector = params.length === 1 ? 'WHERE' : 'AND';
      query += ` ${connector} (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ' ORDER BY id ASC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/:id — un producto por ID
app.get('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// GET /api/categories — lista de categorías únicas
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT category FROM products ORDER BY category');
    const cats = ['Todos', ...result.rows.map(r => r.category)];
    res.json(cats);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST /api/products — crear producto
app.post('/api/products', async (req, res) => {
  try {
    const { name, category, emoji, price, stars, badge, description, tags } = req.body;
    const result = await pool.query(
      `INSERT INTO products (name, category, emoji, price, stars, badge, description, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [name, category, emoji, price, stars, badge, description, JSON.stringify(tags)]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// PUT /api/products/:id — actualizar producto
app.put('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, emoji, price, stars, badge, description, tags } = req.body;
    const result = await pool.query(
      `UPDATE products SET name=$1, category=$2, emoji=$3, price=$4,
       stars=$5, badge=$6, description=$7, tags=$8 WHERE id=$9 RETURNING *`,
      [name, category, emoji, price, stars, badge, description, JSON.stringify(tags), id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// DELETE /api/products/:id — eliminar producto
app.delete('/api/products/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM products WHERE id = $1', [id]);
    res.json({ message: 'Producto eliminado' });
  } catch (err) {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ── Iniciar servidor ───────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
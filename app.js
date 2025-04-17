// app.js com PostgreSQL no lugar de SQLite

const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Conexão com PostgreSQL
const pool = new Pool({
  user: 'db_camisas_user',
  host: 'dpg-d007p0vgi27c73b0kqkg-a',
  database: 'db_camisas',
  password: 'H6CIwBqNIIySCY1ETjvmQdNNxUpxSlfg',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Cria a tabela se não existir
const createTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS pedidos (
      id SERIAL PRIMARY KEY,
      nome TEXT,
      modelo TEXT,
      tamanho TEXT,
      personalizacao TEXT,
      observacoes TEXT,
      data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};
createTable();

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Rota principal para receber pedidos
app.post('/api/pedido', async (req, res) => {
  const { nome, modelo, tamanho, personalizacao, observacoes } = req.body;

  try {
    await pool.query(
      `INSERT INTO pedidos (nome, modelo, tamanho, personalizacao, observacoes) VALUES ($1, $2, $3, $4, $5)`,
      [nome, modelo, tamanho, personalizacao, observacoes]
    );

    const mensagem = `Novo Pedido de Camisa:%0A👤 Nome: ${nome}%0A👕 Modelo: ${modelo}%0A📏 Tamanho: ${tamanho}%0A✍️ Personalização: ${personalizacao || 'Nenhuma'}%0A📝 Observações: ${observacoes || 'Nenhuma'}`;
    const whatsappLink = `https://wa.me/5531992537858?text=${mensagem}`;
    res.redirect(whatsappLink);

  } catch (err) {
    console.error('Erro ao salvar no banco:', err);
    res.status(500).send('Erro ao salvar o pedido.');
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
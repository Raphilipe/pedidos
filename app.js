// app.js com tela de admin protegida

const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Banco PostgreSQL
const pool = new Pool({
  user: 'db_camisas_user',
  host: 'dpg-d007p0vgi27c73b0kqkg-a',
  database: 'db_camisas',
  password: 'H6CIwBqNIIySCY1ETjvmQdNNxUpxSlfg',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

// Criação da tabela (se não existir)
pool.query(`
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

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({ secret: 'esportepremium2024', resave: false, saveUninitialized: true }));

// Rota principal para salvar pedidos
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

// Login admin
app.get('/admin/login', (req, res) => {
  res.send(`
    <form method="post" action="/admin/login" style="max-width:400px;margin:auto;margin-top:100px;font-family:sans-serif">
      <h2>Login Admin</h2>
      <input name="user" placeholder="Usuário" style="width:100%;padding:10px;margin-bottom:10px" />
      <input type="password" name="pass" placeholder="Senha" style="width:100%;padding:10px;margin-bottom:10px" />
      <button type="submit" style="padding:10px 20px">Entrar</button>
    </form>
  `);
});

app.post('/admin/login', (req, res) => {
  const { user, pass } = req.body;
  if (user === 'admin' && pass === '1234') {
    req.session.authenticated = true;
    res.redirect('/admin/pedidos');
  } else {
    res.send('Acesso negado');
  }
});

// Tela de pedidos (protegida)
app.get('/admin/pedidos', async (req, res) => {
  if (!req.session.authenticated) return res.redirect('/admin/login');

  const { rows } = await pool.query('SELECT * FROM pedidos ORDER BY data_pedido DESC');

  let html = `<h2 style="text-align:center">Pedidos Recebidos</h2><table border="1" cellspacing="0" cellpadding="8" style="width:95%;margin:auto;font-family:sans-serif;text-align:left">
    <tr><th>ID</th><th>Nome</th><th>Modelo</th><th>Tamanho</th><th>Personalização</th><th>Observações</th><th>Data</th></tr>`;
  rows.forEach(p => {
    html += `<tr><td>${p.id}</td><td>${p.nome}</td><td>${p.modelo}</td><td>${p.tamanho}</td><td>${p.personalizacao}</td><td>${p.observacoes}</td><td>${new Date(p.data_pedido).toLocaleString('pt-BR')}</td></tr>`;
  });
  html += '</table>';

  res.send(html);
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});

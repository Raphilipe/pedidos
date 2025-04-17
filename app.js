// app.js com edição e exclusão na tela de administração

const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  user: 'db_camisas_user',
  host: 'dpg-d007p0vgi27c73b0kqkg-a.virginia-postgres.render.com',
  database: 'db_camisas',
  password: 'H6CIwBqNIIySCY1ETjvmQdNNxUpxSlfg',
  port: 5432,
  ssl: { rejectUnauthorized: false }
});

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use(session({ secret: 'esportepremium2024', resave: false, saveUninitialized: true }));

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
    res.status(500).send('Erro ao salvar o pedido.');
  }
});

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

app.get('/admin/pedidos', async (req, res) => {
  if (!req.session.authenticated) return res.redirect('/admin/login');
  const { rows } = await pool.query('SELECT * FROM pedidos ORDER BY data_pedido DESC');

  let html = `<h2 style="text-align:center">Pedidos Recebidos</h2><table border="1" cellspacing="0" cellpadding="8" style="width:98%;margin:auto;font-family:sans-serif;text-align:left">
    <tr>
      <th>ID</th><th>Nome</th><th>Modelo</th><th>Tamanho</th><th>Personalização</th><th>Observações</th>
      <th>Valor Vendido</th><th>Valor Pago</th><th>Status Envio</th><th>Data</th><th>Ações</th>
    </tr>`;

  rows.forEach(p => {
    html += `
      <tr>
        <td>${p.id}</td>
        <td>${p.nome}</td>
        <td>${p.modelo}</td>
        <td>${p.tamanho}</td>
        <td>${p.personalizacao}</td>
        <td>${p.observacoes}</td>
        <form method="post" action="/admin/update">
          <input type="hidden" name="id" value="${p.id}" />
          <td><input name="valor_vendido" value="${p.valor_vendido || ''}" style="width:90px" /></td>
          <td><input name="valor_pago" value="${p.valor_pago || ''}" style="width:90px" /></td>
          <td><input name="status_envio" value="${p.status_envio || ''}" style="width:110px" /></td>
          <td>${new Date(p.data_pedido).toLocaleString('pt-BR')}</td>
          <td>
            <button type="submit">Salvar</button>
            <a href="/admin/delete/${p.id}" onclick="return confirm('Tem certeza que deseja excluir?')">🗑️</a>
          </td>
        </form>
      </tr>
    `;
  });

  html += '</table>';
  res.send(html);
});

app.post('/admin/update', async (req, res) => {
  const { id, valor_vendido, valor_pago, status_envio } = req.body;
  await pool.query(`
    UPDATE pedidos SET valor_vendido=$1, valor_pago=$2, status_envio=$3 WHERE id=$4
  `, [valor_vendido, valor_pago, status_envio, id]);
  res.redirect('/admin/pedidos');
});

app.get('/admin/delete/:id', async (req, res) => {
  const id = req.params.id;
  await pool.query('DELETE FROM pedidos WHERE id=$1', [id]);
  res.redirect('/admin/pedidos');
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
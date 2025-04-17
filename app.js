// app.js com código de rastreio, dropdown de status e formatação

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
      `INSERT INTO pedidos (nome, modelo, tamanho, personalizacao, observacoes, status_envio) VALUES ($1, $2, $3, $4, $5, 'Aguardando pedido')`,
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

// Parte do app.js (rota /admin/pedidos) com busca, ordenação e status colorido

app.get('/admin/pedidos', async (req, res) => {
  if (!req.session.authenticated) return res.redirect('/admin/login');

  const { q, sort } = req.query;
  const { rows } = await pool.query('SELECT * FROM pedidos ORDER BY data_pedido DESC');

  const pendentes = rows.filter(p => p.status_envio === 'Aguardando pedido').length;
  const filtros = q ? q.toLowerCase() : '';
  const pedidos = rows.filter(p => {
    return !q ||
      p.nome?.toLowerCase().includes(filtros) ||
      p.codigo_rastreio?.toLowerCase().includes(filtros) ||
      p.status_envio?.toLowerCase().includes(filtros);
  });

  if (sort === 'data') pedidos.sort((a, b) => new Date(b.data_pedido) - new Date(a.data_pedido));
  if (sort === 'valor') pedidos.sort((a, b) => (b.valor_vendido || 0) - (a.valor_vendido || 0));

  const totalVendido = pedidos.reduce((acc, p) => acc + (parseFloat(p.valor_vendido) || 0), 0);
  const totalPago = pedidos.reduce((acc, p) => acc + (parseFloat(p.valor_pago) || 0), 0);

  let html = `
    <h2 style="text-align:center">Pedidos Recebidos</h2>
    <form method="get" style="text-align:center; margin-bottom:10px">
      <input name="q" placeholder="Buscar por nome, status ou código..." value="${q || ''}" style="padding:8px;width:250px" />
      <button type="submit">Buscar</button>
    </form>
  `;

  if (pendentes > 0) {
    html += `<div style="background:yellow;padding:10px;text-align:center;font-weight:bold;color:black">⚠️ Há ${pendentes} pedido(s) com status 'Aguardando pedido'!</div>`;
  }

  html += `
    <table border="1" cellspacing="0" cellpadding="8" style="width:98%;margin:auto;font-family:sans-serif;text-align:left">
    <thead>
    <tr>
      <th>ID</th><th>Nome</th><th>Modelo</th><th>Tamanho</th><th>Personalização</th><th>Observações</th>
      <th><a href="?sort=valor">Valor Vendido</a></th><th>Valor Pago</th><th>Status Envio</th><th>Código Rastreio</th><th><a href="?sort=data">Data</a></th><th>Ações</th>
    </tr>
    </thead>
    <tbody>
  `;

  const coresStatus = {
    'Aguardando pedido': 'orange',
    'Pedido feito': 'blue',
    'Pedido enviado': 'purple',
    'Pedido recebido': 'gray',
    'Pedido entregue': 'green'
  };

  pedidos.forEach(p => {
    const cor = coresStatus[p.status_envio] || 'black';
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
          <td>
            <select name="status_envio" style="color:${cor};font-weight:bold">
              ${['Aguardando pedido','Pedido feito','Pedido enviado','Pedido recebido','Pedido entregue'].map(opt => `<option value="${opt}" ${p.status_envio === opt ? 'selected' : ''}>${opt}</option>`).join('')}
            </select>
          </td>
          <td><input name="codigo_rastreio" value="${p.codigo_rastreio || ''}" style="width:140px" /></td>
          <td>${new Date(p.data_pedido).toLocaleString('pt-BR')}</td>
          <td>
            <button type="submit">Salvar</button>
            <a href="/admin/delete/${p.id}" onclick="return confirm('Tem certeza que deseja excluir?')">🗑️</a>
          </td>
        </form>
      </tr>`;
  });

  html += `</tbody>
    <tfoot>
      <tr><td colspan="6"><strong>Totais</strong></td>
          <td><strong>R$ ${totalVendido.toFixed(2)}</strong></td>
          <td><strong>R$ ${totalPago.toFixed(2)}</strong></td>
          <td colspan="4"></td></tr>
    </tfoot>
  </table>`;

  res.send(html);
});

app.post('/admin/update', async (req, res) => {
  const parseOrNull = (v) => v === "" ? null : v;
  const { id, valor_vendido, valor_pago, status_envio, codigo_rastreio } = req.body;
  await pool.query(`
    UPDATE pedidos SET valor_vendido=$1, valor_pago=$2, status_envio=$3, codigo_rastreio=$4 WHERE id=$5
  `, [
    parseOrNull(valor_vendido),
    parseOrNull(valor_pago),
    status_envio,
    codigo_rastreio,
    id
  ]);
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

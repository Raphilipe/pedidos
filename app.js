const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const port = 3000;

// Banco de dados SQLite
const db = new sqlite3.Database('./pedidos.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS pedidos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    modelo TEXT,
    tamanho TEXT,
    personalizacao TEXT,
    observacoes TEXT,
    data_pedido DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Middlewares
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Serve o index.html

// Rota POST para salvar pedidos
app.post('/api/pedido', (req, res) => {
  const { nome, modelo, tamanho, personalizacao, observacoes } = req.body;

  db.run(
    `INSERT INTO pedidos (nome, modelo, tamanho, personalizacao, observacoes) VALUES (?, ?, ?, ?, ?)`,
    [nome, modelo, tamanho, personalizacao, observacoes],
    (err) => {
      if (err) {
        console.error('Erro ao salvar pedido:', err);
        return res.status(500).send('Erro ao salvar pedido.');
      }

      const mensagem = `Novo Pedido de Camisa:%0A👤 Nome: ${nome}%0A👕 Modelo: ${modelo}%0A📏 Tamanho: ${tamanho}%0A✍️ Personalização: ${personalizacao || 'Nenhuma'}%0A📝 Observações: ${observacoes || 'Nenhuma'}`;
      const whatsappLink = `https://wa.me/+5531992537858?text=${mensagem}`;
      res.redirect(whatsappLink);
    }
  );
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});


app.get('/admin/pedidos', (req, res) => {
    db.all('SELECT * FROM pedidos ORDER BY data_pedido DESC', (err, rows) => {
      if (err) return res.send('Erro ao buscar pedidos.');
      res.send(rows);
    });
  });
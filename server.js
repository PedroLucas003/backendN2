require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); // Adicionado para suporte AWS

const app = express();

// Configuração CORS atualizada com o endpoint AWS
app.use(cors({
  origin: [
    'https://frontendn2.vercel.app',
    'http://localhost:3000',
    'http://projeto-n2-aws.s3-website-us-east-1.amazonaws.com' // Adicionado seu endpoint AWS
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());

// Conexão com MongoDB (mantida igual)
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('✅ Conectado ao MongoDB Atlas'))
.catch(err => {
  console.error('❌ Falha na conexão com o MongoDB:', err);
  process.exit(1);
});

// Rotas (mantidas iguais)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/beers', require('./routes/beers'));
app.use('/api/users', require('./routes/users'));

// Rota de saúde (mantida igual)
app.get('/api/health', (req, res) => {
  req.setTimeout(10000);
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    version: '1.0.1'
  });
});

// Configuração específica para AWS (única adição necessária)
if (process.env.NODE_ENV === 'production') {
  // Servir arquivos estáticos do frontend se necessário
  app.use(express.static(path.join(__dirname, 'public')));
  
  // Rota para o frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });
}

// Tratamento de erros global (mantido igual)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => { // Modificado para ouvir em todos os IPs
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
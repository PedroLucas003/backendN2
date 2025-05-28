require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Configuração CORS atualizada
app.use(cors({
  origin: [
    'http://projeto-n2-aws.s3-website-us-east-1.amazonaws.com', // Nova URL do frontend na AWS
    'https://frontendn2.vercel.app',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));

app.use(express.json());

// Conexão com MongoDB com tratamento melhorado
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000
})
.then(() => console.log('✅ Conectado ao MongoDB Atlas'))
.catch(err => {
  console.error('❌ Falha na conexão com o MongoDB:', err);
  process.exit(1);
});

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/beers', require('./routes/beers'));
app.use('/api/users', require('./routes/users'));

// Rota de saúde com timeout
app.get('/api/health', (req, res) => {
  req.setTimeout(10000);
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado',
    version: '1.0.1'
  });
});

// Tratamento de erros global
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Erro interno do servidor' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
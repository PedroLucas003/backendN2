require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// Configurações básicas
app.use(cors());
app.use(cors({
  origin: [
    'http://projeto-n2-aws.s3-website-us-east-1.amazonaws.com',
    'http://localhost:3000' // para desenvolvimento local
  ],
  credentials: true
}));
app.use(express.json());

// Conexão com o MongoDB
// Conexão com o MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
  .catch(err => {
    console.error('❌ Falha na conexão com o MongoDB:', err.message);
    process.exit(1); // Encerra o aplicativo com erro
  });

// Rotas
app.use('/api/auth', require('./routes/auth'));
app.use('/api/beers', require('./routes/beers'));
app.use('/api/users', require('./routes/users'));

// Rota de saúde
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    database: mongoose.connection.readyState === 1 ? 'Conectado' : 'Desconectado' 
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
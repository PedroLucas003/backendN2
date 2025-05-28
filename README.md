<div align="center">
  <img src="https://img.icons8.com/color/96/000000/server.png" alt="Logo Backend"/>
  <h1>API RESTful para Gestão de Cervejaria</h1>
  
  ![Node.js](https://img.shields.io/badge/Node.js-18.x-green)
  ![Express](https://img.shields.io/badge/Express-5.x-lightgrey)
  ![MongoDB](https://img.shields.io/badge/MongoDB-6.x-green)
  ![JWT](https://img.shields.io/badge/Auth-JWT-orange)
  ![AWS](https://img.shields.io/badge/Deploy-EC2-orange)

  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
  [![API Status](https://img.shields.io/website?url=http%3A%2F%2F54.167.254.163%3A5000%2Fapi%2Fhealth)](http://54.167.254.163:5000/api/health)
</div>

## 🔍 Visão Geral

API robusta para o sistema de gerenciamento de cervejas artesanais com:

- Autenticação JWT segura
- CRUD completo de produtos
- Gerenciamento de usuários
- Banco de dados MongoDB Atlas
- Hospedagem AWS EC2

## 🛠️ Pré-requisitos

- Node.js v18+
- MongoDB Atlas (ou local)
- PM2 (para produção)
- AWS CLI (para deploy)

## 🚀 Instalação Rápida

```bash
# Clone o repositório
git clone https://github.com/PedroLucas003/backend-cervejaria.git
cd backend-cervejaria

# Instale as dependências
npm install

# Configure o ambiente (renomeie o arquivo)
cp .env.example .env

# Banco de dados
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/dbname?retryWrites=true&w=majority

# Autenticação
JWT_SECRET=seu_super_segredo_aqui
JWT_EXPIRES_IN=1h

# Servidor
PORT=5000
NODE_ENV=development

# CORS (para produção)
CORS_ORIGINS=http://localhost:3000,http://seusite.com

📡 Endpoints Principais
🔐 Autenticação
Método	Endpoint	Descrição
POST	/api/auth/login	Login de usuário
POST	/api/auth/register	Registro de novo usuário
GET	/api/auth/validate	Valida token JWT
🍺 Gerenciamento de Cervejas
Método	Endpoint	Descrição
GET	/api/beers	Lista todas cervejas
POST	/api/beers	Cria nova cerveja
PUT	/api/beers/:id	Atualiza cerveja
DELETE	/api/beers/:id	Remove cerveja
👥 Gerenciamento de Usuários (Admin)
Método	Endpoint	Descrição
GET	/api/users	Lista todos usuários
DELETE	/api/users/:id	Remove usuário
🏗️ Estrutura do Projeto
backend-cervejaria/
├── config/            # Configurações do app
├── controllers/       # Lógica dos endpoints
├── middlewares/       # Middlewares customizados
│   └── auth.js        # Autenticação JWT
├── models/            # Modelos MongoDB
│   ├── Beer.js        # Modelo de cervejas
│   └── User.js        # Modelo de usuários
├── routes/            # Definição de rotas
├── services/          # Serviços/business logic
├── utils/             # Utilitários
├── server.js          # Ponto de entrada
├── .env.example       # Modelo de variáveis
└── package.json       # Dependências

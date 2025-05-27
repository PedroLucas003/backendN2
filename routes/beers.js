const express = require('express');
const Beer = require('../models/Beer');
const router = express.Router();

// Middleware de autenticação SIMPLES (sem JWT por enquanto)
const auth = (req, res, next) => {
  // Verificação básica - podemos remover isso depois
  console.log('Acesso à rota de cervejas');
  next(); // Remove esta linha quando adicionar JWT
};

// Listar todas as cervejas (pública temporariamente)
router.get('/', async (req, res) => {
  try {
    const beers = await Beer.find();
    res.json(beers);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cervejas' });
  }
});

// Rotas protegidas
router.use(auth);

// Adicionar nova cerveja
router.post('/', async (req, res) => {
  try {
    const beer = new Beer(req.body);
    await beer.save();
    res.status(201).json(beer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Atualizar cerveja
router.put('/:id', async (req, res) => {
  try {
    const beer = await Beer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!beer) return res.status(404).json({ error: 'Cerveja não encontrada' });
    res.json(beer);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Deletar cerveja
router.delete('/:id', async (req, res) => {
  try {
    const beer = await Beer.findByIdAndDelete(req.params.id);
    if (!beer) return res.status(404).json({ error: 'Cerveja não encontrada' });
    res.json({ message: 'Cerveja removida com sucesso' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
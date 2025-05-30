const express = require('express');
const Beer = require('../models/Beer');
const router = express.Router();
const auth = require('../middleware/auth');

// Listar todas as cervejas (público)
router.get('/', async (req, res) => {
  try {
    const beers = await Beer.find().sort({ beerType: 1 });
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
    const { beerType, description, alcoholContent, yearCreated, quantity, price } = req.body;
    
    const beer = new Beer({
      beerType,
      description,
      alcoholContent,
      yearCreated,
      quantity,
      price
    });
    
    await beer.save();
    res.status(201).json(beer);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Este tipo de cerveja já existe' });
    }
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
const express = require('express');
const User = require('../models/User');
const router = express.Router();
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth'); // Adicione esta linha

// Listar todos os usuários (apenas admin)
router.get('/', auth, adminAuth, async (req, res) => {
  try {
    const users = await User.find({}, '-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Obter um usuário específico
router.get('/:id', auth, adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id, '-password');
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Atualizar usuário
router.patch('/:id', auth, adminAuth, async (req, res) => {
  try {
    // Não permitir que um admin se desative
    if (req.body.isAdmin === false && req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Você não pode remover seus próprios privilégios de admin' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, select: '-password' }
    );
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json(user);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Deletar usuário
router.delete('/:id', auth, adminAuth, async (req, res) => {
  try {
    // Não permitir que um admin se delete
    if (req.params.id === req.user.userId) {
      return res.status(400).json({ error: 'Você não pode deletar sua própria conta' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.json({ message: 'Usuário deletado com sucesso' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
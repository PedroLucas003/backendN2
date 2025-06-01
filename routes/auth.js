const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();


const ADMIN_EMAIL = 'admin@gmail.com';

// Registro
router.post('/register', async (req, res) => {
  try {
    const user = new User(req.body);
    await user.save();
    
    const token = jwt.sign({ 
      userId: user._id,
      email: user.email,
      isAdmin: user.email === ADMIN_EMAIL
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    
    res.status(201).json({ 
      token, 
      user: { 
        email: user.email,
        isAdmin: user.email === ADMIN_EMAIL
      } 
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    
    const token = jwt.sign({ 
      userId: user._id,
      email: user.email,
      isAdmin: user.email === ADMIN_EMAIL
    }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });
    
    res.json({ 
      token, 
      user: { 
        email: user.email,
        isAdmin: user.email === ADMIN_EMAIL
      } 
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Validação
router.get('/validate', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ valid: false });
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) return res.status(401).json({ valid: false });
    
    res.json({ 
      valid: true, 
      user: { 
        email: user.email, 
        _id: user._id,
        isAdmin: user.email === ADMIN_EMAIL
      } 
    });
  } catch (err) {
    res.status(401).json({ valid: false });
  }
});

module.exports = router;
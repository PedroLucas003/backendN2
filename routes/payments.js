const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');
const mercadopago = require('mercadopago');

// Configuração correta do Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
  options: {
    timeout: 5000,
    integrator_id: process.env.MP_INTEGRATOR_ID
  }
});

router.post('/create-preference', auth, async (req, res) => {
  try {
    const { items, deliveryData } = req.body;
    const user = req.user;

    // Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }

    if (!deliveryData?.cep) {
      return res.status(400).json({ error: 'CEP é obrigatório' });
    }

    // Cálculos
    const itemPrice = 15.90;
    const itemsTotal = items.reduce((total, item) => total + (itemPrice * item.quantity), 0);
    const orderTotal = itemsTotal.toFixed(2);

    // Configuração da preferência
    const preference = {
      items: items.map((item, index) => ({
        id: index + 1,
        title: item.nome.substring(0, 250),
        unit_price: parseFloat(itemPrice),
        quantity: item.quantity,
        description: item.tipo.substring(0, 250),
        picture_url: item.imagem || 'https://via.placeholder.com/100x150.png?text=Cerveja+Virada',
      })),
      payer: {
        email: user.email || "cliente@cervejariavirada.com",
        address: {
          zip_code: deliveryData.cep.replace(/\D/g, ''),
          street_name: deliveryData.address?.substring(0, 100) || '',
          street_number: deliveryData.number?.substring(0, 10) || 'S/N',
        }
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/order-success`,
        failure: `${process.env.FRONTEND_URL}/order-failure`,
        pending: `${process.env.FRONTEND_URL}/order-pending`,
      },
      auto_return: "approved",
      external_reference: `ORDER_${Date.now()}_${user.userId}`,
    };

    const response = await mercadopago.preferences.create(preference);

    // Salvar pedido no banco de dados
    const order = new Order({
      user: user.userId,
      items: items.map(item => ({
        nome: item.nome,
        tipo: item.tipo,
        imagem: item.imagem,
        preco: itemPrice,
        quantity: item.quantity
      })),
      deliveryData,
      mpPreferenceId: response.body.id,
      status: 'pending',
      total: orderTotal,
      externalReference: preference.external_reference
    });

    await order.save();

    res.json({
      id: response.body.id,
      init_point: response.body.init_point,
      sandbox_init_point: response.body.sandbox_init_point,
    });

  } catch (error) {
    console.error('Erro no pagamento:', error);
    res.status(500).json({ 
      error: 'Erro ao processar pagamento',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rotas auxiliares
router.get('/order-status/:preferenceId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      mpPreferenceId: req.params.preferenceId,
      user: req.user.userId
    });
    res.json({ status: order?.status || 'pending' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao verificar status' });
  }
});

module.exports = router;
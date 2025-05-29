const express = require('express');
const mercadopago = require('mercadopago');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');

// Configuração do Mercado Pago
mercadopago.configure({
  access_token: process.env.REACT_APP_MP_ACCESS_TOKEN || 'APP_USR-1033194409526725-052912-384749a140d7670bc8e8bd57e1bff0c8-585645372',
  client_id: '1033194409526725',
  client_secret: 'Va0aykNKw8UQBzx27Ct89PVzP73hIaAe',
  sandbox: process.env.NODE_ENV !== 'production',
  integrator_id: 'dev_24c65fb163bf11ea96500242ac130004'
});

// Middleware para verificar webhook
const verifyWebhook = (req, res, next) => {
  const signature = req.headers['x-signature'];
  if (!signature) {
    return res.status(401).send('Assinatura não fornecida');
  }
  
  const expectedSignature = 'd85703ab22d1fae4b343111d12ae7d801346668c950c903310fceac84011af4f';
  if (signature !== expectedSignature) {
    return res.status(401).send('Assinatura inválida');
  }
  
  next();
};

// Rota para criar preferência
router.post('/create-preference', auth, async (req, res) => {
  try {
    const { items, deliveryData, shippingOption } = req.body;
    const user = req.user;

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Itens inválidos' });
    }

    const mpItems = items.map(item => ({
      title: item.nome,
      unit_price: parseFloat(item.preco || 15.90),
      quantity: item.quantity,
      description: item.tipo,
      picture_url: item.imagem || 'https://via.placeholder.com/100x150.png?text=Cerveja+Virada',
      currency_id: 'BRL'
    }));

    const preference = {
      items: mpItems,
      payer: {
        name: "Cliente",
        email: user.email || "cliente@example.com",
        address: {
          zip_code: deliveryData.cep.replace(/\D/g, ''),
          street_name: deliveryData.address,
          street_number: deliveryData.number,
          neighborhood: deliveryData.neighborhood,
          city: deliveryData.city,
          federal_unit: deliveryData.state
        }
      },
      shipments: {
        cost: parseFloat(shippingOption.Valor.replace(',', '.')),
        mode: "custom"
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/order-success`,
        failure: `${process.env.FRONTEND_URL}/order-failure`,
        pending: `${process.env.FRONTEND_URL}/order-pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      statement_descriptor: "VIRADA CERVEJA"
    };

    const response = await mercadopago.preferences.create(preference);

    const newOrder = new Order({
      user: user.userId,
      items: items,
      deliveryData: deliveryData,
      shippingOption: shippingOption,
      mpPreferenceId: response.body.id,
      status: 'pending',
      total: mpItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0) + 
             parseFloat(shippingOption.Valor.replace(',', '.'))
    });

    await newOrder.save();

    res.json({ 
      id: response.body.id,
      init_point: response.body.init_point
    });

  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao processar pagamento' });
  }
});

// Webhook
router.post('/webhook', verifyWebhook, async (req, res) => {
  try {
    const { action, data } = req.body;
    
    if (action === 'payment.created' || action === 'payment.updated') {
      const payment = await mercadopago.payment.get(data.id);
      
      await Order.findOneAndUpdate(
        { mpPreferenceId: payment.body.order.id },
        { 
          status: payment.body.status,
          mpPaymentId: payment.body.id,
          updatedAt: new Date()
        }
      );
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Erro ao processar webhook');
  }
});

// Rota para verificar status
router.get('/order-status/:preferenceId', auth, async (req, res) => {
  try {
    const order = await Order.findOne({
      mpPreferenceId: req.params.preferenceId,
      user: req.user.userId
    });

    if (!order) {
      return res.status(404).json({ error: 'Pedido não encontrado' });
    }

    if (order.status === 'pending' && order.mpPaymentId) {
      const payment = await mercadopago.payment.get(order.mpPaymentId);
      order.status = payment.body.status;
      
      if (payment.body.status !== 'pending') {
        await Order.updateOne(
          { _id: order._id },
          { status: payment.body.status }
        );
      }
    }

    res.json({
      status: order.status,
      orderDetails: order
    });
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Erro ao buscar status' });
  }
});

module.exports = router;
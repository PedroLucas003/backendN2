const express = require('express');
const mercadopago = require('mercadopago');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order');

// Configuração robusta do Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
  integrator_id: process.env.MP_INTEGRATOR_ID,
  sandbox: process.env.NODE_ENV !== 'production', // Sandbox em desenvolvimento
  timeout: 15000 // 15 segundos de timeout
});

/**
 * @route POST /api/payments/create-preference
 * @description Cria uma preferência de pagamento no Mercado Pago
 * @access Private
 */
router.post('/create-preference', auth, async (req, res) => {
  try {
    // Verificação inicial do Mercado Pago
    if (!mercadopago.configurations.getAccessToken()) {
      console.error('Erro de configuração do Mercado Pago');
      throw new Error('Configuração do Mercado Pago inválida');
    }

    const { items, deliveryData, shippingOption } = req.body;
    const user = req.user;

    // Validação robusta dos dados de entrada
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ 
        error: 'Carrinho vazio',
        details: 'Nenhum item foi enviado para o checkout'
      });
    }

    if (!deliveryData || !deliveryData.cep || !deliveryData.address) {
      return res.status(400).json({
        error: 'Dados de entrega incompletos',
        details: 'CEP e endereço são obrigatórios'
      });
    }

    if (!shippingOption || !shippingOption.Valor) {
      return res.status(400).json({
        error: 'Opção de frete inválida',
        details: 'Nenhuma opção de frete foi selecionada'
      });
    }

    // Log detalhado para depuração
    console.log('Iniciando criação de pedido:', {
      userId: user.userId,
      itemsCount: items.length,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0)
    });

    // Formatação dos itens para o Mercado Pago
    const mpItems = items.map((item, index) => ({
      id: index + 1,
      title: item.nome?.substring(0, 250) || `Cerveja ${index + 1}`,
      unit_price: parseFloat((item.preco || 15.90).toFixed(2)),
      quantity: item.quantity,
      description: item.tipo?.substring(0, 250) || 'Cerveja artesanal',
      picture_url: item.imagem || 'https://via.placeholder.com/100x150.png?text=Cerveja+Virada',
      category_id: 'food', // Categoria específica para alimentos/bebidas
      currency_id: 'BRL'
    }));

    // Cálculo do total do pedido
    const itemsTotal = mpItems.reduce((total, item) => total + (item.unit_price * item.quantity), 0);
    const shippingCost = parseFloat(shippingOption.Valor.replace(',', '.')) || 0;
    const orderTotal = parseFloat((itemsTotal + shippingCost).toFixed(2));

    // Construção do objeto de preferência
    const preference = {
      items: mpItems,
      payer: {
        name: "Cliente",
        surname: "Virada",
        email: user.email || "cliente@cervejariavirada.com",
        phone: {
          area_code: "",
          number: ""
        },
        address: {
          zip_code: deliveryData.cep.replace(/\D/g, ''),
          street_name: deliveryData.address?.substring(0, 100) || '',
          street_number: deliveryData.number?.substring(0, 10) || 'S/N',
          neighborhood: deliveryData.neighborhood?.substring(0, 100) || '',
          city: deliveryData.city?.substring(0, 50) || '',
          federal_unit: deliveryData.state?.substring(0, 2) || ''
        }
      },
      shipments: {
        cost: shippingCost,
        mode: "custom",
        free_methods: [],
        receiver_address: {
          zip_code: deliveryData.cep.replace(/\D/g, ''),
          street_name: deliveryData.address?.substring(0, 100) || '',
          street_number: deliveryData.number?.substring(0, 10) || 'S/N',
          neighborhood: deliveryData.neighborhood?.substring(0, 100) || '',
          city: deliveryData.city?.substring(0, 50) || '',
          federal_unit: deliveryData.state?.substring(0, 2) || ''
        }
      },
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 1
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/order-success`,
        failure: `${process.env.FRONTEND_URL}/order-failure`,
        pending: `${process.env.FRONTEND_URL}/order-pending`
      },
      auto_return: "approved",
      notification_url: `${process.env.BACKEND_URL}/api/payments/webhook`,
      statement_descriptor: "CERVVI", // Máximo 13 caracteres
      external_reference: `ORDER_${Date.now()}_${user.userId}`,
      expires: false,
      date_of_expiration: new Date(Date.now() + 3600000 * 24).toISOString(), // 24 horas para pagar
      metadata: {
        user_id: user.userId,
        app: "Cervejaria Virada"
      }
    };

    console.debug('Preferência detalhada:', JSON.stringify(preference, null, 2));

    // Criação da preferência no Mercado Pago
    const mpResponse = await mercadopago.preferences.create(preference);
    
    if (!mpResponse.body?.id) {
      throw new Error('Resposta inválida do Mercado Pago');
    }

    console.log('Preferência criada com sucesso:', {
      preferenceId: mpResponse.body.id,
      initPoint: mpResponse.body.init_point
    });

    // Criação do pedido no banco de dados
    const order = new Order({
      user: user.userId,
      items: mpItems.map(item => ({
        nome: item.title,
        tipo: item.description,
        imagem: item.picture_url,
        preco: item.unit_price,
        quantity: item.quantity
      })),
      deliveryData: {
        cep: deliveryData.cep,
        address: deliveryData.address,
        number: deliveryData.number,
        complement: deliveryData.complement || '',
        neighborhood: deliveryData.neighborhood,
        city: deliveryData.city,
        state: deliveryData.state
      },
      shippingOption: {
        Codigo: shippingOption.Codigo,
        Valor: shippingOption.Valor,
        PrazoEntrega: shippingOption.PrazoEntrega,
        nome: shippingOption.nome
      },
      mpPreferenceId: mpResponse.body.id,
      status: 'pending',
      total: orderTotal,
      externalReference: preference.external_reference
    });

    await order.save();
    console.log('Pedido salvo no banco de dados:', order._id);

    // Resposta para o frontend
    res.json({
      success: true,
      id: mpResponse.body.id,
      init_point: mpResponse.body.init_point,
      sandbox_init_point: mpResponse.body.sandbox_init_point,
      orderId: order._id
    });

  } catch (error) {
    console.error('Erro durante a criação do pagamento:', {
      error: error.message,
      stack: error.stack,
      responseData: error.response?.data,
      requestData: error.config?.data
    });

    res.status(500).json({
      error: 'Erro ao processar pagamento',
      details: process.env.NODE_ENV === 'development' ? {
        message: error.message,
        code: error.code,
        stack: error.stack
      } : undefined
    });
  }
});

/**
 * @route GET /api/payments/order-status/:preferenceId
 * @description Obtém o status de um pedido pelo ID da preferência
 * @access Private
 */
router.get('/order-status/:preferenceId', auth, async (req, res) => {
  try {
    const { preferenceId } = req.params;
    const userId = req.user.userId;

    if (!preferenceId) {
      return res.status(400).json({ error: 'ID da preferência é obrigatório' });
    }

    // Busca o pedido no banco de dados
    const order = await Order.findOne({
      mpPreferenceId: preferenceId,
      user: userId
    }).lean();

    if (!order) {
      return res.status(404).json({ 
        error: 'Pedido não encontrado',
        details: `Nenhum pedido encontrado para a preferência ${preferenceId}`
      });
    }

    // Se o pedido já foi aprovado, retorna direto
    if (order.status !== 'pending') {
      return res.json({
        status: order.status,
        orderDetails: order
      });
    }

    // Se ainda está pendente, verifica no Mercado Pago
    try {
      const payment = await mercadopago.payment.search({
        qs: { 'external_reference': order.externalReference }
      });

      if (payment.body.results.length > 0) {
        const latestPayment = payment.body.results[0];
        const newStatus = latestPayment.status;

        // Atualiza o status no banco de dados se mudou
        if (newStatus !== order.status) {
          await Order.updateOne(
            { _id: order._id },
            { 
              status: newStatus,
              mpPaymentId: latestPayment.id,
              $setOnInsert: { createdAt: new Date() }
            }
          );
          order.status = newStatus;
        }
      }
    } catch (mpError) {
      console.warn('Erro ao consultar Mercado Pago:', mpError.message);
    }

    res.json({
      status: order.status,
      orderDetails: order
    });

  } catch (error) {
    console.error('Erro ao buscar status do pedido:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar status do pedido',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route POST /api/payments/webhook
 * @description Webhook para notificações do Mercado Pago
 * @access Public
 */
router.post('/webhook', async (req, res) => {
  try {
    const { action, data, type } = req.body;

    if (type === 'payment' && data?.id) {
      console.log('Recebido webhook para pagamento:', data.id);
      
      const payment = await mercadopago.payment.get(data.id);
      const externalReference = payment.body.external_reference;
      
      if (!externalReference) {
        return res.status(400).send('Referência externa não encontrada');
      }

      // Atualiza o pedido no banco de dados
      await Order.findOneAndUpdate(
        { externalReference },
        {
          status: payment.body.status,
          mpPaymentId: payment.body.id,
          $set: {
            'metadata.paymentDetails': {
              status: payment.body.status,
              statusDetail: payment.body.status_detail,
              paymentMethod: payment.body.payment_method_id,
              paymentType: payment.body.payment_type_id,
              installments: payment.body.installments
            }
          }
        },
        { new: true }
      );

      console.log(`Pedido ${externalReference} atualizado para status ${payment.body.status}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).send('Erro ao processar notificação');
  }
});

module.exports = router;
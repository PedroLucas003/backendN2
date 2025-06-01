const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Order = require('../models/Order'); // Certifique-se que o caminho está correto
const User = require('../models/User'); // Importar User se for usar user.email para o payer
const mercadopago = require('mercadopago');

// Configuração do Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

router.post('/create-preference', auth, async (req, res) => {
  try {
    const { items, deliveryData } = req.body;
    const userPayload = req.user; // userPayload contém { userId: '...' } do middleware auth

    // Buscar o email do usuário para o payer do MercadoPago
    const user = await User.findById(userPayload.userId);
    if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Validações básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Carrinho vazio' });
    }
    // Validação de itens e preços
    for (const item of items) {
        if (typeof item.price !== 'number' || item.price <= 0 || typeof item.quantity !== 'number' || item.quantity <= 0) {
            return res.status(400).json({ error: `Item inválido no carrinho: ${item.nome || 'desconhecido'}. Preço e quantidade devem ser números positivos.` });
        }
    }

    if (!deliveryData?.cep || !deliveryData.address || !deliveryData.number || !deliveryData.neighborhood || !deliveryData.city || !deliveryData.state) {
      return res.status(400).json({ error: 'Dados de entrega incompletos' });
    }

    // Cálculos usando o preço de cada item
    const itemsTotal = items.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
    const shippingCost = 15.00; // Valor fixo de frete
    const orderTotal = itemsTotal + shippingCost;

    // Configuração da preferência
    const preference = {
      items: items.map((item, index) => ({
        id: item._id || `item-${index + 1}`, // Usar _id do produto se disponível
        title: item.nome ? String(item.nome).substring(0, 250) : 'Produto Sem Nome',
        unit_price: parseFloat(item.price), // Usa o preço do item individual
        quantity: parseInt(item.quantity, 10),
        description: item.tipo ? String(item.tipo).substring(0, 250) : 'Sem Descrição',
        picture_url: item.imagem || 'https://via.placeholder.com/100x150.png?text=Cerveja+Virada',
        // category_id: "MLB_CATEGORY_ID", // Opcional: categoria do produto no Mercado Livre
        // currency_id: "BRL", // Opcional: moeda (padrão BRL para Brasil)
      })),
      payer: {
        name: user.name || '', // Supondo que você tenha 'name' no modelo User
        surname: user.surname || '', // Supondo que você tenha 'surname' no modelo User
        email: user.email, // Email do usuário logado
        // phone: { area_code: "XX", number: "XXXXXXXXX" }, // Opcional
        address: { // Endereço de cobrança, pode ser diferente do de entrega
          zip_code: deliveryData.cep.replace(/\D/g, ''),
          street_name: String(deliveryData.address).substring(0, 100),
          street_number: parseInt(deliveryData.number) || undefined, // MP espera número ou undefined
        }
      },
      shipments: { // Informações de envio
        receiver_address: {
            zip_code: deliveryData.cep.replace(/\D/g, ''),
            street_name: String(deliveryData.address).substring(0, 250),
            street_number: parseInt(deliveryData.number) || undefined,
            // city_name: deliveryData.city, // Opcional
            // state_name: deliveryData.state, // Opcional
            // floor: "", // Opcional
            // apartment: deliveryData.complement || "", // Opcional
        },
        cost: parseFloat(shippingCost),
        mode: "not_specified", // ou 'custom' se você calcular via API dos Correios, etc.
      },
      back_urls: {
        success: `${process.env.FRONTEND_URL}/order-success`,
        failure: `${process.env.FRONTEND_URL}/checkout?status=failure`, // Melhor redirecionar para checkout com erro
        pending: `${process.env.FRONTEND_URL}/checkout?status=pending`, // Melhor redirecionar para checkout
      },
      auto_return: "approved", // Retorna automaticamente para 'success' se aprovado
      external_reference: `ORDER_${Date.now()}_${userPayload.userId}`, // Referência única para seu sistema
      notification_url: `${process.env.API_URL}/api/payments/webhook-mp`, // URL para receber notificações do MP
    };

    const mpResponse = await mercadopago.preferences.create(preference);

    // Salvar pedido no banco de dados
    const order = new Order({
      user: userPayload.userId,
      items: items.map(item => ({
        nome: item.nome,
        tipo: item.tipo,
        imagem: item.imagem,
        preco: parseFloat(item.price), // Usa o preço do item individual
        quantity: item.quantity
      })),
      deliveryData,
      shippingOption: {
        Codigo: 'FIXO',
        Valor: shippingCost.toFixed(2),
        PrazoEntrega: '5', // Exemplo, pode ser dinâmico
        nome: 'Frete Fixo'
      },
      mpPreferenceId: mpResponse.body.id,
      status: 'pending', // Status inicial do pedido
      total: parseFloat(orderTotal.toFixed(2)),
      externalReference: preference.external_reference
    });

    await order.save();

    res.json({
      id: mpResponse.body.id, // ID da preferência
      init_point: mpResponse.body.init_point, // URL de pagamento produção
      sandbox_init_point: mpResponse.body.sandbox_init_point, // URL de pagamento sandbox
    });

  } catch (error) {
    console.error('Erro no pagamento:', error.cause || error.message || error);
    // Tentar extrair mais detalhes do erro do MercadoPago se disponível
    const mpError = error.response?.data?.cause?.[0]?.description || error.response?.data?.message;
    res.status(500).json({
      error: 'Erro ao processar pagamento',
      details: mpError || (process.env.NODE_ENV === 'development' ? (error.message || error.toString()) : undefined)
    });
  }
});

// Rota auxiliar para verificar status (mantida como estava)
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
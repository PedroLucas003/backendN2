const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    nome: String,
    tipo: String,
    imagem: String,
    preco: Number,
    quantity: Number
  }],
  deliveryData: {
    cep: String,
    address: String,
    number: String,
    complement: String,
    neighborhood: String,
    city: String,
    state: String
  },
  shippingOption: {
    Codigo: String,
    Valor: String,
    PrazoEntrega: String,
    nome: String
  },
  mpPreferenceId: String,
  mpPaymentId: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'failure', 'processing', 'cancelled'],
    default: 'pending'
  },
  total: Number
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true // Adicionado índice para melhor performance
  },
  items: [{
    nome: {
      type: String,
      required: true,
      trim: true
    },
    tipo: {
      type: String,
      required: true,
      trim: true
    },
    imagem: {
      type: String,
      default: 'https://via.placeholder.com/100x150.png?text=Cerveja+Virada'
    },
    preco: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  deliveryData: {
    cep: {
      type: String,
      required: true,
      match: /^\d{5}-?\d{3}$/
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    number: {
      type: String,
      required: true,
      trim: true
    },
    complement: {
      type: String,
      default: ''
    },
    neighborhood: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      required: true,
      trim: true
    },
    state: {
      type: String,
      required: true,
      uppercase: true,
      minlength: 2,
      maxlength: 2
    }
  },
  shippingOption: {
    Codigo: {
      type: String,
      required: true
    },
    Valor: {
      type: String,
      required: true
    },
    PrazoEntrega: {
      type: String,
      required: true
    },
    nome: {
      type: String,
      required: true
    }
  },
  mpPreferenceId: {
    type: String,
    required: true,
    index: true
  },
  mpPaymentId: {
    type: String,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'failure', 'processing', 'cancelled'],
    default: 'pending',
    index: true
  },
  total: {
    type: Number,
    required: true,
    min: 0
  },
  externalReference: { // Adicionado campo para referência externa
    type: String,
    index: true
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      delete ret.__v;
      delete ret._id;
      return ret;
    }
  }
});

// Adicionando índice composto para consultas frequentes
orderSchema.index({ user: 1, status: 1 });
orderSchema.index({ mpPreferenceId: 1, status: 1 });

module.exports = mongoose.model('Order', orderSchema);
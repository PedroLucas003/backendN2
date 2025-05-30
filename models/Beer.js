const mongoose = require('mongoose');

const beerSchema = new mongoose.Schema({
  beerType: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  alcoholContent: {
    type: String,
    required: true
  },
  yearCreated: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  },
  price: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Beer', beerSchema);
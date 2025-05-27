const mongoose = require('mongoose');

const beerSchema = new mongoose.Schema({
  beerType: {
    type: String,
    required: true,
    enum: ['Pilsen', 'IPA', 'Stout', 'Weiss']
  },
  quantity: {
    type: Number,
    required: true,
    min: 0
  }
}, { timestamps: true });

module.exports = mongoose.model('Beer', beerSchema);
const mongoose = require('mongoose');
module.exports = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0 },
  person: { type: String, trim: true, default: '' },
}, { _id: false });

const mongoose = require('mongoose');

const priceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    unit: { type: String, required: true }, // e.g., "per minute", "per day", "per photo"
    sellingPrice: { type: Number, required: true }, // price shown to client
    costComponents: [require('./CostComponent')],
    costPrice: { type: Number, default: 0 }, // admin-only: actual cost
    category: {
      type: String,
      enum: ['video', 'photography', 'editing', 'equipment', 'travel', 'other'],
      default: 'other',
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PriceItem', priceItemSchema);


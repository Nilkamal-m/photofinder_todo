const mongoose = require('mongoose');
const { round } = require('../utils/costs');

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    items: [
      {
        priceItem: { type: mongoose.Schema.Types.ObjectId, ref: 'PriceItem', required: true },
        name: { type: String },
        unit: { type: String },
        quantity: { type: Number, required: true, default: 1 },
        sellingPrice: { type: Number, required: true },
        costPrice: { type: Number, default: 0 },
      },
    ],
    totalSellingPrice: { type: Number, default: 0 },
    totalCostPrice: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: false },
    shareToken: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// Auto-calculate totals
packageSchema.pre('save', function (next) {
  this.totalSellingPrice = round(this.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0));
  this.totalCostPrice = round(this.items.reduce((sum, item) => sum + item.costPrice * item.quantity, 0));
  this.profit = round(this.totalSellingPrice - this.totalCostPrice);
  next();
});

module.exports = mongoose.model('Package', packageSchema);


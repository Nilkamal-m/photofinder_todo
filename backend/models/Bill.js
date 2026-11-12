const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');
const { round } = require('../utils/costs');

const billSchema = new mongoose.Schema(
  {
    billNumber: { type: String, unique: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    package: { type: mongoose.Schema.Types.ObjectId, ref: 'Package' },
    items: [
      {
        name: { type: String, required: true },
        unit: { type: String },
        quantity: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        costComponents: [require('./CostComponent')],
        costPrice: { type: Number, default: 0 },
        lineTotal: { type: Number },
      },
    ],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    totalCost: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    advancePaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'cancelled'],
      default: 'draft',
    },
    // Agreement fields
    agreementText: { type: String },
    agreementTerms: [{ type: String }],
    clientSignature: { type: String },
    // Sharing
    shareToken: { type: String, unique: true },
    sharedWithPhone: { type: String }, // only this phone can view
    sharedAt: { type: Date },
    // Created by
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

billSchema.pre('save', function (next) {
  if (!this.billNumber) {
    this.billNumber = 'PF-' + Date.now().toString().slice(-6);
  }
  if (!this.shareToken) {
    this.shareToken = uuidv4();
  }
  // Calculate items line totals
  this.items = this.items.map((item) => ({
    ...item.toObject ? item.toObject() : item,
    lineTotal: round(item.sellingPrice * item.quantity),
  }));
  this.subtotal = round(this.items.reduce((sum, item) => sum + item.sellingPrice * item.quantity, 0));
  this.discount = round(Math.min(this.subtotal, Math.max(0,this.discount || 0)));
  this.advancePaid = round(Math.max(0,this.advancePaid || 0));
  this.totalAmount = round(this.subtotal - this.discount);
  this.totalCost = round(this.items.reduce((sum, item) => sum + (item.costPrice || 0) * item.quantity, 0));
  this.profit = round(this.totalAmount - this.totalCost);
  this.balanceDue = round(Math.max(0,this.totalAmount - this.advancePaid));
  next();
});

module.exports = mongoose.model('Bill', billSchema);


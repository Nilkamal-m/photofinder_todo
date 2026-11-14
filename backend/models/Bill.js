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
        priceItem: { type: mongoose.Schema.Types.ObjectId, ref:'PriceItem' },
        name: { type: String, required: true },
        unit: { type: String },
        quantity: { type: Number, required: true },
        sellingPrice: { type: Number, required: true },
        costComponents: [require('./CostComponent')],
        costPrice: { type: Number, default: 0 },
        assignedTo: {type:mongoose.Schema.Types.ObjectId,ref:'User'},
        deliveryStatus: {type:String,enum:['pending','delivered'],default:'pending'},
        deliveredAt: {type:Date},
        lineTotal: { type: Number },
      },
    ],
    subtotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
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
    this.billNumber = 'PF-' + Date.now().toString(36).toUpperCase() + '-' + uuidv4().slice(0,4).toUpperCase();
  }
  if (!this.shareToken) {
    this.shareToken = uuidv4();
  }
  // Calculate items line totals
  this.items = this.items.map((item) => ({
    ...item.toObject ? item.toObject() : item,
    lineTotal: round(item.sellingPrice * item.quantity),
  }));
  this.subtotal = round(this.items.reduce((sum, item) => sum + item.lineTotal, 0));
  this.discount = round(Math.min(this.subtotal, Math.max(0,this.discount || 0)));
  this.advancePaid = round(Math.max(0,this.advancePaid || 0));
  this.totalAmount = round(this.subtotal - this.discount);
  this.balanceDue = round(Math.max(0,this.totalAmount - this.advancePaid));
  if (this.status !== 'cancelled') {
    if (this.balanceDue === 0 && this.totalAmount > 0) this.status = 'paid';
    else if (this.status === 'paid') this.status = 'draft';
  }
  next();
});

module.exports = mongoose.model('Bill', billSchema);

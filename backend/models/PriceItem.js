const mongoose = require('mongoose');

const priceItemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
    unit: { type: String, required: true }, // e.g., "per minute", "per day", "per photo"
    sellingPrice: { type: Number, required: true }, // price shown to client
    costComponents: [require('./CostComponent')],
    costPrice: { type: Number, default: 0 }, // admin-only: actual cost
    category: { type:String, default:'Other', trim:true },
    serviceType: {type:mongoose.Schema.Types.ObjectId,ref:'ServiceType'},
    profitMode: {type:String,enum:['percent','fixed']},
    profitValue: {type:Number,min:0},
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PriceItem', priceItemSchema);


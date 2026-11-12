const mongoose = require('mongoose');

const blockedDateSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: true,
    },
    dateString: {
      type: String, // YYYY-MM-DD for fast, exact matching
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['booked', 'blocked', 'holiday', 'tentative'],
      default: 'blocked',
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Client',
    },
    bill: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
    },
    notes: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('BlockedDate', blockedDateSchema);


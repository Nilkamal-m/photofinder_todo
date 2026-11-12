const router = require('express').Router();
const mongoose = require('mongoose');
const Bill = require('../models/Bill');
const { protect, adminOnly } = require('../middleware/auth');
const { round } = require('../utils/costs');
const Payment = mongoose.model('TeamPayment', new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  person: { type: String, required: true, trim: true },
  amount: { type: Number, required: true, min: 0.01 },
}, { timestamps: true }));
router.use(protect, adminOnly);
router.get('/', async (req,res) => {
  try {
    const [bills, payments] = await Promise.all([Bill.find({ createdBy: req.user._id, status: { $ne: 'cancelled' } }), Payment.find({createdBy: req.user._id})]);
    const people = new Map();
    const entry = name => { const key = name.toLowerCase(); if (!people.has(key)) people.set(key, {person:name, earned:0, paid:0, jobs:[]}); return people.get(key); };
    for (const bill of bills) for (const item of bill.items) for (const part of item.costComponents || []) {
      if (!part.person) continue;
      const p = entry(part.person); const amount = round(part.amount * item.quantity);
      p.earned += amount; p.jobs.push({billNumber:bill.billNumber, service:item.name, cost:part.name, amount});
    }
    for (const payment of payments) entry(payment.person).paid += payment.amount;
    res.json([...people.values()].map(p => ({...p, earned:round(p.earned), paid:round(p.paid), balance:round(p.earned-p.paid)})));
  } catch(e) {res.status(500).json({message:e.message});}
});
router.post('/payments', async (req,res) => {
  const amount = Number(req.body.amount), person = (req.body.person || '').trim();
  if (!person || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({message:'Enter a person and a positive payment amount'});
  try { res.status(201).json(await Payment.create({person, amount:round(amount), createdBy:req.user._id})); }
  catch(e) {res.status(500).json({message:e.message});}
});
module.exports = router;

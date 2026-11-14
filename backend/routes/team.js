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
const User=require('../models/User');
const WalletPayment=require('../models/WalletPayment');
const {summarizeWallets}=require('../utils/wallets');
router.use(protect);
router.get('/users',async(req,res)=>{
  try {res.json((await User.find().select('_id name phone').sort({name:1})).map(user=>({_id:user._id,name:user.name,label:user.name+' · '+user.phone.slice(-4)})));}catch(e){res.status(500).json({message:e.message});}
});
router.get('/wallets',async(req,res)=>{
  try {
    const filter=req.user.role==='admin'?{}:{_id:req.user._id};
    const users=await User.find(filter).select('_id name phone').sort({name:1});
    const ids=users.map(user=>user._id);
    const [bills,payments]=await Promise.all([Bill.find({'items.assignedTo':{$in:ids},status:{$ne:'cancelled'}}),WalletPayment.find({user:{$in:ids}}).sort({createdAt:-1})]);
    res.json(summarizeWallets(users,bills,payments));
  }catch(e){res.status(500).json({message:e.message});}
});
router.post('/wallets/:userId/payments',adminOnly,async(req,res)=>{
  try {
    const amount=round(Number(req.body.amount));
    if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({message:'Enter a positive payment amount'});
    if(!await User.exists({_id:req.params.userId}))return res.status(400).json({message:'User not found'});
    res.status(201).json(await WalletPayment.create({user:req.params.userId,amount,note:req.body.note || '',createdBy:req.user._id}));
  }catch(e){res.status(400).json({message:e.message});}
});
router.put('/wallets/:userId/payments/:id',adminOnly,async(req,res)=>{
  try {
    const amount=round(Number(req.body.amount));if(!Number.isFinite(amount)||amount<=0)return res.status(400).json({message:'Enter a positive payment amount'});
    const payment=await WalletPayment.findOneAndUpdate({_id:req.params.id,user:req.params.userId},{amount,note:req.body.note || ''},{new:true,runValidators:true});
    if(!payment)return res.status(404).json({message:'Payment not found'});res.json(payment);
  }catch(e){res.status(400).json({message:e.message});}
});
router.delete('/wallets/:userId/payments/:id',adminOnly,async(req,res)=>{
  try {const payment=await WalletPayment.findOneAndDelete({_id:req.params.id,user:req.params.userId});if(!payment)return res.status(404).json({message:'Payment not found'});res.json({message:'Payment removed'});}catch(e){res.status(400).json({message:e.message});}
});
// Earlier name-based cost records remain available for existing clients.
router.use(adminOnly);

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
  const amount = round(Number(req.body.amount)), person = (req.body.person || '').trim();
  if (!person || !Number.isFinite(amount) || amount <= 0) return res.status(400).json({message:'Enter a person and a positive payment amount'});
  try { res.status(201).json(await Payment.create({person, amount:round(amount), createdBy:req.user._id})); }
  catch(e) {res.status(500).json({message:e.message});}
});
module.exports = router;

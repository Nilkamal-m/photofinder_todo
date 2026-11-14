const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const { snapshotItems, hideCosts } = require('../utils/costs');
const User=require('../models/User');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

async function assignedItems(items, existing=[]) {
  if(!Array.isArray(items)||!items.length)throw new Error('Add at least one service');
  for(const item of items){
    if(item.assignedTo && !await User.exists({_id:item.assignedTo}))throw new Error('Choose a registered studio user');
    const previous=existing.find(old=>(item._id && String(old._id)===String(item._id)) || old.name===item.name);
    if(previous?.deliveryStatus==='delivered' && Object.prototype.hasOwnProperty.call(item,'assignedTo') && String(previous.assignedTo || '')!==String(item.assignedTo || ''))throw new Error('Reopen delivery before changing the assigned user');
    if(previous?.deliveryStatus==='delivered' && (Number(item.quantity)!==previous.quantity || Number(item.sellingPrice)!==previous.sellingPrice))throw new Error('Reopen delivery before editing delivered service');
  }
  return snapshotItems(items,existing);
}

// Get all bills (for logged in user)
router.get('/', protect, async (req, res) => {
  try {
    const bills = await Bill.find({ createdBy: req.user._id })
      .populate('client')
      .sort({ createdAt: -1 });
    const result = bills.map((bill) => {
      const obj = bill.toObject();
    hideCosts(obj);
    if (obj.package) hideCosts(obj.package);
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

// Get single bill (for logged in user)
router.get('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('client')
      .populate('package');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    const obj = bill.toObject();
    hideCosts(obj);
    if (obj.package) hideCosts(obj.package);
    res.json(obj);
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

// Public shared bill — verify phone
router.get('/shared/:token', async (req, res) => {
  try {
    const { phone } = req.query;
    const bill = await Bill.findOne({ shareToken: req.params.token })
      .populate('client')
      .populate('package');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (!bill.sharedAt || !bill.sharedWithPhone) return res.status(403).json({message:'This invoice has not been shared'});
    // Check if phone matches (case-insensitive & trimmed)
    if (bill.sharedWithPhone) {
      const expected = (bill.sharedWithPhone || '').trim();
      const actual = (phone || '').trim();
      if (expected !== actual) {
        return res.status(403).json({
          message: 'Access denied. This bill is not shared with this phone number.',
        });
      }
    }
    const obj = bill.toObject();
    if (obj.package) hideCosts(obj.package);
    hideCosts(obj);
    obj.items.forEach(item=>{delete item.assignedTo;delete item.deliveryStatus;delete item.deliveredAt;});
    res.json(obj);
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

// Create bill
router.post('/', protect, async (req, res) => {
  try {
    const { client, items } = req.body;
    if (!client) {
      return res.status(400).json({ message: 'Client is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one service item is required' });
    }

    if (!await Client.exists({_id:client,createdBy:req.user._id})) return res.status(400).json({message:'Choose one of your clients'});
    const bill = new Bill({
      ...req.body,
      items: await assignedItems(items),
      createdBy: req.user._id,
    });
    await bill.save();
    await bill.populate('client');
    res.status(201).json(hideCosts(bill.toObject()));
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

// Update bill
router.put('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (req.body.client) {
      if (!await Client.exists({_id:req.body.client,createdBy:req.user._id})) return res.status(400).json({message:'Choose one of your clients'});
      bill.client = req.body.client;
    }
    if (req.body.items) bill.items = await assignedItems(req.body.items, bill.items);
    if (req.body.discount !== undefined) bill.discount = req.body.discount;
    if (req.body.advancePaid !== undefined) bill.advancePaid = req.body.advancePaid;
    if (req.body.status) bill.status = req.body.status;
    if (req.body.agreementText !== undefined) bill.agreementText = req.body.agreementText;
    if (req.body.agreementTerms) bill.agreementTerms = req.body.agreementTerms;
    if (req.body.clientSignature) bill.clientSignature = req.body.clientSignature;

    await bill.save();
    await bill.populate('client');
    res.json(hideCosts(bill.toObject()));
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

// Delivery is separate from whether the client has paid the invoice.
router.put('/:id/items/:itemId/delivery',protect,async(req,res)=>{
  try {
    if(!['pending','delivered'].includes(req.body.deliveryStatus))return res.status(400).json({message:'Choose pending or delivered'});
    const bill=await Bill.findOne({_id:req.params.id,createdBy:req.user._id});if(!bill)return res.status(404).json({message:'Bill not found'});
    if(bill.status==='cancelled')return res.status(400).json({message:'Reopen the bill before updating delivery'});
    const item=bill.items.id(req.params.itemId);if(!item)return res.status(404).json({message:'Service not found'});
    item.deliveryStatus=req.body.deliveryStatus;item.deliveredAt=req.body.deliveryStatus==='delivered'?(item.deliveredAt || new Date()):undefined;
    await bill.save();await bill.populate('client');res.json(hideCosts(bill.toObject()));
  }catch(e){res.status(400).json({message:e.message});}
});

// Share bill with a phone number
router.post('/:id/share', protect, async (req, res) => {
  try {
    const phone = (req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required to share' });
    }

    const bill = await Bill.findOne({_id:req.params.id,createdBy:req.user._id}).populate('client');
    if (!bill) return res.status(404).json({message:'Bill not found'});
    if (bill.status==='cancelled') return res.status(400).json({message:'Reopen this bill before sharing it'});
    bill.sharedWithPhone=phone;bill.sharedAt=new Date();
    if (bill.status==='draft') bill.status='sent';
    await bill.save();

    const baseUrl = (process.env.FRONTEND_URL || req.get('origin') || 'http://localhost:8085').replace(/\/+$/, '');
    const shareUrl = `${baseUrl}/?token=${encodeURIComponent(bill.shareToken)}`;
    res.json({ message: 'Bill shared successfully', shareToken: bill.shareToken, shareUrl, bill: hideCosts(bill.toObject()) });
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

// Delete bill
router.delete('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(err.name === 'ValidationError' || err.name === 'CastError' || ['Reopen delivery before editing delivered service','Choose a registered studio user','Reopen delivery before changing the assigned user','Add at least one service','Service quantity and rate must be valid'].includes(err.message) ? 400 : 500).json({ message: err.message });
  }
});

module.exports = router;

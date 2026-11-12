const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const { snapshotItems, hideCosts } = require('../utils/costs');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

// Get all bills (for logged in user)
router.get('/', protect, async (req, res) => {
  try {
    const bills = await Bill.find({ createdBy: req.user._id })
      .populate('client')
      .sort({ createdAt: -1 });
    const result = bills.map((bill) => {
      const obj = bill.toObject();
    if (obj.package) hideCosts(obj.package);
      if (req.user.role !== 'admin') {
        delete obj.profit;
        delete obj.totalCost;
        obj.items = obj.items?.map((i) => { delete i.costPrice; delete i.costComponents; return i; });
      }
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    if (obj.package) hideCosts(obj.package);
    if (req.user.role !== 'admin') {
      delete obj.profit;
      delete obj.totalCost;
      obj.items = obj.items?.map((i) => { delete i.costPrice; delete i.costComponents; return i; });
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
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
    // Always hide cost/profit from shared client view
    delete obj.profit;
    delete obj.totalCost;
    obj.items = obj.items?.map((i) => { delete i.costPrice; delete i.costComponents; return i; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
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

    const bill = new Bill({
      ...req.body,
      items: await snapshotItems(items),
      createdBy: req.user._id,
    });
    await bill.save();
    await bill.populate('client');
    res.status(201).json(req.user.role === 'admin' ? bill : hideCosts(bill.toObject()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update bill
router.put('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    if (req.body.client) bill.client = req.body.client;
    if (req.body.items) bill.items = await snapshotItems(req.body.items, bill.items);
    if (req.body.discount !== undefined) bill.discount = req.body.discount;
    if (req.body.advancePaid !== undefined) bill.advancePaid = req.body.advancePaid;
    if (req.body.status) bill.status = req.body.status;
    if (req.body.agreementText !== undefined) bill.agreementText = req.body.agreementText;
    if (req.body.agreementTerms) bill.agreementTerms = req.body.agreementTerms;
    if (req.body.clientSignature) bill.clientSignature = req.body.clientSignature;

    await bill.save(); // triggers pre('save') to recalculate items line totals, subtotal, totalAmount, balanceDue, profit!
    await bill.populate('client');
    res.json(req.user.role === 'admin' ? bill : hideCosts(bill.toObject()));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Share bill with a phone number
router.post('/:id/share', protect, async (req, res) => {
  try {
    const phone = (req.body.phone || '').trim();
    if (!phone) {
      return res.status(400).json({ message: 'Phone number is required to share' });
    }

    const bill = await Bill.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      { sharedWithPhone: phone, status: 'sent', sharedAt: new Date() },
      { new: true }
    ).populate('client');
    if (!bill) return res.status(404).json({ message: 'Bill not found' });

    const shareUrl = `http://localhost:8085/?token=${bill.shareToken}&phone=${phone}`;
    res.json({ message: 'Bill shared successfully', shareToken: bill.shareToken, shareUrl, bill: req.user.role === 'admin' ? bill : hideCosts(bill.toObject()) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete bill
router.delete('/:id', protect, async (req, res) => {
  try {
    const bill = await Bill.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!bill) return res.status(404).json({ message: 'Bill not found' });
    res.json({ message: 'Bill deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Client = require('../models/Client');
const Bill = require('../models/Bill');
const { protect } = require('../middleware/auth');

// Get all clients
router.get('/', protect, async (req, res) => {
  try {
    const clients = await Client.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(clients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single client
router.get('/:id', protect, async (req, res) => {
  try {
    const client = await Client.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create client
router.post('/', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Client name is required' });
    }
    if (!phone || !phone.trim()) {
      return res.status(400).json({ message: 'Client phone number is required' });
    }
    const client = await Client.create({
      ...req.body,
      name: name.trim(),
      phone: phone.trim(),
      createdBy: req.user._id,
    });
    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update client
router.put('/:id', protect, async (req, res) => {
  try {
    const updateData = Object.fromEntries(['name','phone','email','address','eventType','eventDate','eventVenue','notes'].filter(key => req.body[key] !== undefined).map(key => [key,req.body[key]]));
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.phone) updateData.phone = updateData.phone.trim();

    const client = await Client.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json(client);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete client
router.delete('/:id', protect, async (req, res) => {
  try {
    if (await Bill.exists({client:req.params.id,createdBy:req.user._id})) return res.status(400).json({message:'This client has saved bills. Keep their record to preserve the invoices.'});
    const client = await Client.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!client) return res.status(404).json({ message: 'Client not found' });
    res.json({ message: 'Client deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { normalizeCosts, round } = require('../utils/costs');
const PriceItem = require('../models/PriceItem');
const { protect, adminOnly } = require('../middleware/auth');

// Get all price items (any logged in user)
router.get('/', protect, async (req, res) => {
  try {
    const items = await PriceItem.find({ isActive: true }).sort({ category: 1, name: 1 });
    // Hide costPrice for non-admins
    const result = items.map((item) => {
      const obj = item.toObject();
      if (req.user.role !== 'admin') { delete obj.costPrice; delete obj.costComponents; }
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create price item (admin only) - Enforce unique name
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    if (req.body.costComponents !== undefined) {
      req.body.costComponents = normalizeCosts(req.body.costComponents);
      req.body.costPrice = round(req.body.costComponents.reduce((s,p) => s + p.amount, 0));
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    // Check unique (case-insensitive)
    const existing = await PriceItem.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isActive: true,
    });
    if (existing) {
      return res.status(400).json({ message: `Price item "${name}" already exists. Name must be unique.` });
    }

    const item = await PriceItem.create({
      ...req.body,
      name,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update price item (admin only) - Enforce unique name
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    if (req.body.costComponents !== undefined) {
      req.body.costComponents = normalizeCosts(req.body.costComponents);
      req.body.costPrice = round(req.body.costComponents.reduce((s,p) => s + p.amount, 0));
    }
    const name = (req.body.name || '').trim();
    if (name) {
      const existing = await PriceItem.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true,
      });
      if (existing) {
        return res.status(400).json({ message: `Price item "${name}" already exists. Name must be unique.` });
      }
    }

    const item = await PriceItem.findByIdAndUpdate(
      req.params.id,
      { ...req.body, ...(name ? { name } : {}) },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Price item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete price item (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await PriceItem.findByIdAndDelete(req.params.id);
    if (!item) return res.status(404).json({ message: 'Price item not found' });
    res.json({ message: 'Price item deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

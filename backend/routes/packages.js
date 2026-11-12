const express = require('express');
const router = express.Router();
const Package = require('../models/Package');
const { protect, adminOnly } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Get all packages
router.get('/', protect, async (req, res) => {
  try {
    const packages = await Package.find({ createdBy: req.user._id })
      .populate('items.priceItem')
      .sort({ createdAt: -1 });
    const result = packages.map((pkg) => {
      const obj = pkg.toObject();
      if (req.user.role !== 'admin') {
        delete obj.totalCostPrice;
        delete obj.profit;
        obj.items = obj.items.map((i) => { delete i.costPrice; if (i.priceItem) { delete i.priceItem.costPrice; delete i.priceItem.costComponents; } return i; });
      }
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single package
router.get('/:id', protect, async (req, res) => {
  try {
    const pkg = await Package.findOne({ _id: req.params.id, createdBy: req.user._id })
      .populate('items.priceItem');
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    const obj = pkg.toObject();
    if (req.user.role !== 'admin') {
      delete obj.totalCostPrice;
      delete obj.profit;
      obj.items = obj.items.map((i) => { delete i.costPrice; if (i.priceItem) { delete i.priceItem.costPrice; delete i.priceItem.costComponents; } return i; });
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single package (with public share token)
router.get('/share/:token', async (req, res) => {
  try {
    const pkg = await Package.findOne({ shareToken: req.params.token, isPublic: true })
      .populate('items.priceItem');
    if (!pkg) return res.status(404).json({ message: 'Package not found or not public' });
    const obj = pkg.toObject();
    delete obj.totalCostPrice;
    delete obj.profit;
    obj.items = obj.items.map((i) => { delete i.costPrice; if (i.priceItem) { delete i.priceItem.costPrice; delete i.priceItem.costComponents; } return i; });
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create package
router.post('/', protect, async (req, res) => {
  try {
    const { name, description, items, isPublic } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Package name is required' });
    }
    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'Please select at least one item for the package' });
    }

    const pkg = new Package({
      name: name.trim(),
      description,
      items,
      isPublic: isPublic !== undefined ? isPublic : false,
      createdBy: req.user._id,
      shareToken: uuidv4(),
    });
    await pkg.save();
    res.status(201).json(pkg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update package
router.put('/:id', protect, async (req, res) => {
  try {
    const pkg = await Package.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!pkg) return res.status(404).json({ message: 'Package not found' });

    if (req.body.name) pkg.name = req.body.name.trim();
    if (req.body.description !== undefined) pkg.description = req.body.description;
    if (req.body.items) pkg.items = req.body.items;
    if (req.body.isPublic !== undefined) pkg.isPublic = req.body.isPublic;

    await pkg.save(); // triggers pre('save') to recalculate totalSellingPrice, totalCostPrice, and profit!
    res.json(pkg);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete package
router.delete('/:id', protect, async (req, res) => {
  try {
    const pkg = await Package.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!pkg) return res.status(404).json({ message: 'Package not found' });
    res.json({ message: 'Package deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

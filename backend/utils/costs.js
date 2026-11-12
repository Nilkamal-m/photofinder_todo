const PriceItem = require('../models/PriceItem');
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
function normalizeCosts(parts) {
  if (!Array.isArray(parts)) throw new Error('Cost components must be a list');
  return parts.map(p => {
    const amount = Number(p.amount);
    if (!p.name?.trim() || !Number.isFinite(amount) || amount < 0) throw new Error('Each cost needs a name and a non-negative amount');
    return { name: p.name.trim(), amount: round(amount), person: (p.person || '').trim() };
  });
}
async function snapshotItems(items, existing = []) {
  return Promise.all(items.map(async item => {
    const old = existing.find(i => String(i._id) === String(item._id) || i.name === item.name);
    const source = old || (item.priceItem ? await PriceItem.findById(item.priceItem) : await PriceItem.findOne({ name: item.name, isActive: true }));
    const parts = source?.costComponents?.map(p => p.toObject ? p.toObject() : p) || [];
    const quantity = Number(item.quantity), sellingPrice = Number(item.sellingPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error('Service quantity and rate must be valid');
    return { name: item.name, unit: item.unit, quantity, sellingPrice, costComponents: parts,
      costPrice: parts.length ? round(parts.reduce((s,p) => s + p.amount, 0)) : (source?.costPrice || 0) };
  }));
}
function hideCosts(obj) {
  delete obj.profit; delete obj.totalCost; delete obj.totalCostPrice;
  obj.items?.forEach(i => { delete i.costPrice; delete i.costComponents; if (i.priceItem && typeof i.priceItem === 'object') { delete i.priceItem.costPrice; delete i.priceItem.costComponents; } });
  return obj;
}
module.exports = { round, normalizeCosts, snapshotItems, hideCosts };

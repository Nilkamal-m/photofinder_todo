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
    const old = existing.find(i => (item._id && String(i._id) === String(item._id)) || i.name === item.name);
    const source = old || (item.priceItem ? await PriceItem.findById(item.priceItem) : await PriceItem.findOne({ name: item.name, isActive: true }));
    const parts = source?.costComponents?.map(p => {const part=p.toObject ? p.toObject() : {...p};if(!old)delete part.person;return part;}) || [];
    const quantity = Number(item.quantity), sellingPrice = Number(item.sellingPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(sellingPrice) || sellingPrice < 0) throw new Error('Service quantity and rate must be valid');
    return { _id:old?._id, priceItem: source?.priceItem?._id || source?.priceItem || (old ? item.priceItem : source?._id), name: item.name, unit: item.unit, quantity, sellingPrice, costComponents: parts,
      assignedTo: Object.prototype.hasOwnProperty.call(item,'assignedTo') ? (item.assignedTo || undefined) : old?.assignedTo, deliveryStatus: old?.deliveryStatus || 'pending', deliveredAt:old?.deliveredAt,
      costPrice: parts.length ? round(parts.reduce((s,p) => s + p.amount, 0)) : (source?.costPrice || 0) };
  }));
}
function hideCosts(obj) {
  delete obj.profit; delete obj.totalCost; delete obj.totalCostPrice;
  obj.items?.forEach(i => { delete i.costPrice; delete i.costComponents; if (i.priceItem && typeof i.priceItem === 'object') { delete i.priceItem.costPrice; delete i.priceItem.costComponents; delete i.priceItem.profitMode; delete i.priceItem.profitValue; } });
  return obj;
}
module.exports = { round, normalizeCosts, snapshotItems, hideCosts };

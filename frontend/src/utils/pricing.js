// One calculation path for editable costs and service totals.
const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
function serviceCost(item) {
  return round(item.costComponents?.length
    ? item.costComponents.reduce((sum, part) => sum + number(part.amount), 0)
    : number(item.costPrice));
}
function totals(items, discount = 0, advance = 0) {
  const subtotal = round(items.reduce((sum,item) => sum + round(number(item.sellingPrice) * number(item.quantity ?? 1)),0));
  const cost = round(items.reduce((sum,item) => sum + round(serviceCost(item) * number(item.quantity ?? 1)),0));
  const reduction = round(Math.min(subtotal,Math.max(0,number(discount))));
  const total = round(subtotal - reduction);
  return {subtotal,cost,discount:reduction,total,profit:round(total-cost),balance:round(Math.max(0,total-round(Math.max(0,number(advance)))))};
}
module.exports = {round,serviceCost,totals};

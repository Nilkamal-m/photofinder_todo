const {normalizeCosts,round}=require('./costs');
function calculateService(input, previous = {}) {
  const components=normalizeCosts(input.costComponents ?? previous.costComponents ?? []);
  const mode=input.profitMode ?? previous.profitMode ?? 'fixed';
  if(!['fixed','percent'].includes(mode)) throw new Error('Choose fixed or percentage profit');
  const value=Number(input.profitValue ?? previous.profitValue ?? 0);
  if(!Number.isFinite(value)||value<0) throw new Error('Profit must be a non-negative number');
  const cost=round(components.reduce((sum,part)=>sum+part.amount,0));
  const profit=round(mode==='percent'?cost*value/100:value);
  return {costComponents:components.map(({name,amount})=>({name,amount})),costPrice:cost,profitMode:mode,profitValue:mode==='percent'?value:round(value),sellingPrice:round(cost+profit)};
}
module.exports={calculateService};

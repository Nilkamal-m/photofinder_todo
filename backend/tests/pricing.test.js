const {test} = require('node:test');
const assert = require('node:assert/strict');
const {serviceCost,totals} = require('../../frontend/src/utils/pricing');
test('adding, changing and removing expenses updates cost and profit',()=>{
 const service = {sellingPrice:'71',quantity:2,costComponents:[]};
 assert.equal(totals([service]).cost,0);
 service.costComponents.push({name:'Editing',amount:'20'});
 assert.deepEqual(totals([service]),{subtotal:142,cost:40,discount:0,total:142,profit:102,balance:142});
 service.costComponents.push({name:'Power',amount:'5.50'});
 assert.equal(totals([service]).cost,51);
 service.costComponents[0].amount='25';
 assert.equal(totals([service]).cost,61);
 service.costComponents=[];
 assert.equal(serviceCost(service),0);
});
test('decimal quantities, discounts, advances and rounding stay consistent',()=>{
 assert.deepEqual(totals([{sellingPrice:71,quantity:1.5,costPrice:30}],6.5,20),{subtotal:106.5,cost:45,discount:6.5,total:100,profit:55,balance:80});
 assert.equal(totals([{sellingPrice:10,quantity:1}],100,100).total,0);
 assert.equal(totals([{sellingPrice:10,quantity:1}],100,100).balance,0);
 assert.equal(totals([{sellingPrice:0.1,quantity:3}]).total,0.3);
});
test('rounded service lines add up to the displayed total',()=>{
 const calculation=totals([{sellingPrice:0.01,quantity:0.5},{sellingPrice:0.01,quantity:0.5}]);
 assert.equal(calculation.subtotal,0.02);
 const {calculateService}=require('../utils/servicePricing');
 const priced=calculateService({costComponents:[{name:'Cost',amount:10000}],profitMode:'percent',profitValue:0.005});
 assert.equal(priced.sellingPrice,10000.5);assert.equal(calculateService({},priced).sellingPrice,priced.sellingPrice);
});

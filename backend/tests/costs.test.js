const {test} = require('node:test');
const assert = require('node:assert/strict');
const {normalizeCosts,snapshotItems,hideCosts} = require('../utils/costs');
const Bill = require('../models/Bill');
test('cost components validate and round amounts',()=>{
 assert.deepEqual(normalizeCosts([{name:' Editing ',amount:12.345,person:' Sam '}]),[{name:'Editing',amount:12.35,person:'Sam'}]);
 assert.throws(()=>normalizeCosts([{name:'Power',amount:-2}]));
 assert.throws(()=>normalizeCosts([{name:'',amount:2}]));
});
test('editing a bill preserves historical costs and multiplies quantity',async()=>{
 const items = await snapshotItems([{name:'Video',quantity:3,sellingPrice:71,costPrice:1}], [{name:'Video',costComponents:[{name:'Editing',amount:20,person:'Sam'},{name:'Equipment',amount:10,person:''}],costPrice:30}]);
 const bill = new Bill({client:'507f1f77bcf86cd799439011',items,discount:3,advancePaid:10});
 await new Promise((resolve,reject)=>Bill.schema.s.hooks.execPre('save',bill,err=>err?reject(err):resolve()));
 assert.equal(bill.totalCost,90); assert.equal(bill.totalAmount,210); assert.equal(bill.profit,120); assert.equal(bill.balanceDue,200);
 assert.equal(bill.items[0].costComponents[0].person,'Sam');
});
test('client payloads exclude component amounts and assigned people',()=>{
 const result = hideCosts({profit:10,totalCost:20,items:[{costPrice:20,costComponents:[{person:'Sam'}],priceItem:{costPrice:20,costComponents:[]},sellingPrice:71}]});
 assert.equal(JSON.stringify(result).includes('Sam'),false); assert.equal(JSON.stringify(result).includes('costPrice'),false); assert.equal(result.items[0].sellingPrice,71);
});

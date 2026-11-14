const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
const jwt=require('jsonwebtoken');
let mongo,server,base,token,client,service,bill,worker,workerToken;
before(async()=>{
 process.env.JWT_SECRET='workflow-tests-only';
 mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
 const app=express();app.use(express.json());
 for(const route of ['auth','prices','clients','packages','bills','dates','team','enquiries'])app.use('/'+route,require('../routes/'+route));
 server=await new Promise(resolve=>{const s=app.listen(0,'127.0.0.1',()=>resolve(s));});base='http://127.0.0.1:'+server.address().port;
 const User=require('../models/User');const user=await User.create({name:'Test admin',phone:'admin',password:'test-password',role:'admin'});token=jwt.sign({id:user._id},process.env.JWT_SECRET);worker=await User.create({name:'Mira',phone:'studio-worker',password:'test-password',role:'user'});workerToken=jwt.sign({id:worker._id},process.env.JWT_SECRET);
});
after(async()=>{if(server)await new Promise(resolve=>server.close(resolve));await mongoose.disconnect();if(mongo)await mongo.stop();});
async function request(path,body,method=body?'POST':'GET',auth=token){
 const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json()};
}
test('service → package → bill uses catalog costs and private bill totals',async()=>{
 client=(await request('/clients',{name:'Test client',phone:'client'})).data;
 service=(await request('/prices',{name:'Film',unit:'per minute',sellingPrice:999,profitMode:'fixed',profitValue:46,costComponents:[{name:'Editing',amount:20,person:'Mira'},{name:'Power',amount:5}]})).data;
 assert.equal(service.costPrice,25);assert.equal(service.sellingPrice,71);
 const pkg=await request('/packages',{name:'Collection',isPublic:true,items:[{priceItem:service._id,name:'Film',unit:'per minute',quantity:10,sellingPrice:71,costPrice:999}]});assert.equal(pkg.status,201);assert.equal(pkg.data.totalCostPrice,250);
 const publicPackages=await request('/packages/public',null,'GET',null);assert.equal(publicPackages.data[0].totalSellingPrice,710);assert(!JSON.stringify(publicPackages.data).includes('costPrice'));
 const created=await request('/bills',{client:client._id,items:[{priceItem:service._id,name:'Film',quantity:10,sellingPrice:71,assignedTo:worker._id}],discount:10,advancePaid:200});assert.equal(created.status,201);bill=created.data;assert.equal(bill.totalAmount,700);assert.equal(bill.balanceDue,500);assert(!JSON.stringify(bill).includes('costComponents'));
});
test('bill revisions preserve costs and registered-user pending credits',async()=>{
 await request('/prices/'+service._id,{costComponents:[{name:'Editing',amount:50}]},'PUT');
 const updated=await request('/bills/'+bill._id,{items:[{name:'Film',quantity:12,sellingPrice:71}]},'PUT');assert.equal(updated.status,200);
 assert.equal((await require('../models/Bill').findById(bill._id)).items[0].costPrice,25);
 let wallet=(await request('/team/wallets')).data.find(w=>w.userId===String(worker._id));assert.equal(wallet.pending,852);assert.equal(wallet.balance,0);
 await request('/bills/'+bill._id,{status:'cancelled'},'PUT');wallet=(await request('/team/wallets')).data.find(w=>w.userId===String(worker._id));assert.equal(wallet.pending,0);
 assert.equal((await request('/bills/'+bill._id+'/share',{phone:'client'})).status,400);
 await request('/bills/'+bill._id,{status:'draft'},'PUT');assert.equal((await request('/team/wallets')).data.find(w=>w.userId===String(worker._id)).pending,852);
});
test('shared bills require sharing and the right phone; paid state survives sharing',async()=>{
 assert.equal((await request('/bills/shared/'+bill.shareToken+'?phone=client')).status,403);
 const current=(await request('/bills/'+bill._id)).data;
 const paid=await request('/bills/'+bill._id,{status:'paid',advancePaid:current.totalAmount},'PUT');assert.equal(paid.data.balanceDue,0);assert.equal((await request('/team/wallets',null,'GET',workerToken)).data[0].pending,852);
 const shared=await request('/bills/'+bill._id+'/share',{phone:'client'});assert.equal(shared.data.bill.status,'paid');assert(!shared.data.shareUrl.includes('phone='));
 assert.equal((await request('/bills/shared/'+bill.shareToken+'?phone=wrong',null,'GET',null)).status,403);
 const valid=await request('/bills/shared/'+bill.shareToken+'?phone=client',null,'GET',null);assert.equal(valid.status,200);assert(!JSON.stringify(valid.data).includes('Mira'));
 assert.equal((await request('/clients/'+client._id,null,'DELETE')).status,400);
});
test('calendar validates real dates and blocks duplicate entries',async()=>{
 assert.equal((await request('/dates/check?date=2026-02-30')).status,400);
 assert.equal((await request('/dates',{date:'2026-12-12',title:'Editing day'})).status,201);
 assert.equal((await request('/dates/check?date=2026-12-12')).data.isBlocked,true);
 assert.equal((await request('/dates',{date:'2026-12-12',title:'Duplicate'})).status,400);
 const dates=(await request('/dates')).data;await request('/dates/'+dates[0]._id,null,'DELETE');assert.equal((await request('/dates/check?date=2026-12-12')).data.isBlocked,false);
});
test('public enquiries reach the admin inbox and can be updated',async()=>{
 const enquiry=await request('/enquiries',{name:'Visitor',phone:'visitor',message:'December ceremony'},'POST',null);assert.equal(enquiry.status,201);
 const list=(await request('/enquiries')).data;assert.equal(list[0].status,'new');
 assert.equal((await request('/enquiries/'+list[0]._id,{status:'contacted'},'PUT')).data.status,'contacted');
 assert.equal((await request('/enquiries',null,'GET',null)).status,401);
});
test('removing the final service cost clears the stored total',async()=>{
 const result=await request('/prices/'+service._id,{costComponents:[]},'PUT');assert.equal(result.status,200);assert.equal(result.data.costPrice,0);
});
test('member accounts cannot read staff costs, payments or enquiries',async()=>{
 const User=require('../models/User');const member=await User.create({name:'Member',phone:'member',password:'test-password',role:'user'});const memberToken=jwt.sign({id:member._id},process.env.JWT_SECRET);
 assert.equal((await request('/team',null,'GET',memberToken)).status,403);
 assert.equal((await request('/enquiries',null,'GET',memberToken)).status,403);
 const prices=(await request('/prices',null,'GET',memberToken)).data;assert(!JSON.stringify(prices).includes('costPrice'));assert(!JSON.stringify(prices).includes('costComponents'));
 assert.equal((await request('/auth/me',null,'GET',jwt.sign({id:new mongoose.Types.ObjectId()},process.env.JWT_SECRET))).status,401);
});

test('delivery settles exactly once; reopening reverses it; user sees only own wallet',async()=>{
 const current=(await request('/bills/'+bill._id)).data;
 const path='/bills/'+bill._id+'/items/'+current.items[0]._id+'/delivery';
 assert.equal((await request(path,{deliveryStatus:'delivered'},'PUT')).status,200);
 await request(path,{deliveryStatus:'delivered'},'PUT');
 let wallets=(await request('/team/wallets',null,'GET',workerToken)).data;
 assert.equal(wallets.length,1);assert.equal(wallets[0].pending,0);assert.equal(wallets[0].settled,852);assert.equal(wallets[0].balance,852);
 assert.equal((await request(path,{deliveryStatus:'pending'},'PUT',workerToken)).status,404);
 const invalidAssignment=await request('/bills/'+bill._id,{items:[{name:'Film',quantity:12,sellingPrice:71,assignedTo:null}]},'PUT');assert.equal(invalidAssignment.status,400);
 await request(path,{deliveryStatus:'pending'},'PUT');wallets=(await request('/team/wallets',null,'GET',workerToken)).data;assert.equal(wallets[0].pending,852);assert.equal(wallets[0].balance,0);
});
test('reassignment, unassignment and draft deletion recalculate pending wallets',async()=>{
 const draft=(await request('/bills',{client:client._id,items:[{name:'Film',quantity:2,sellingPrice:71,assignedTo:worker._id}]})).data;
 const total=async()=> (await request('/team/wallets',null,'GET',workerToken)).data[0].pending;
 assert.equal(await total(),994);
 const second=await require('../models/User').findOne({phone:'member'});
 await request('/bills/'+draft._id,{items:[{name:'Film',quantity:2,sellingPrice:71,assignedTo:second._id}]},'PUT');assert.equal(await total(),852);assert.equal((await request('/team/wallets')).data.find(w=>w.userId===String(second._id)).pending,142);
 await request('/bills/'+draft._id,{items:[{name:'Film',quantity:2,sellingPrice:71,assignedTo:worker._id}]},'PUT');assert.equal(await total(),994);
 await request('/bills/'+draft._id,{items:[{name:'Film',quantity:2,sellingPrice:71,assignedTo:null}]},'PUT');assert.equal(await total(),852);
 await request('/bills/'+draft._id,{items:[{name:'Film',quantity:3,sellingPrice:71,assignedTo:worker._id}]},'PUT');assert.equal(await total(),1065);
 await request('/bills/'+draft._id,null,'DELETE');assert.equal(await total(),852);
});
test('wallet payments support create, edit and delete without touching pending credits',async()=>{
 const path='/team/wallets/'+worker._id+'/payments';
 const created=await request(path,{amount:50,note:'Paid in cash'});assert.equal(created.status,201);
 let wallet=(await request('/team/wallets',null,'GET',workerToken)).data[0];assert.equal(wallet.pending,852);assert.equal(wallet.paid,50);assert.equal(wallet.balance,-50);
 assert.equal((await request(path,{amount:10},'POST',workerToken)).status,403);
 await request(path+'/'+created.data._id,{amount:25,note:'Corrected'},'PUT');assert.equal((await request('/team/wallets',null,'GET',workerToken)).data[0].paid,25);
 await request(path+'/'+created.data._id,null,'DELETE');assert.equal((await request('/team/wallets',null,'GET',workerToken)).data[0].paid,0);
});
test('custom types persist and support rename/delete; service prices are server-calculated',async()=>{
 const type=(await request('/prices/types',{name:'Live streaming'})).data;
 const created=await request('/prices',{name:'Livestream',category:type.name,unit:'per hour',profitMode:'percent',profitValue:10,sellingPrice:1,costComponents:[{name:'Camera',amount:70},{name:'Power',amount:30}]});assert.equal(created.status,201);assert.equal(created.data.sellingPrice,110);
 assert((await request('/prices/types')).data.some(t=>t.name===type.name));
 await request('/prices/types/'+type._id,{name:'Streaming'},'PUT');assert.equal((await require('../models/PriceItem').findById(created.data._id)).category,'Streaming');
 const changed=await request('/prices/'+created.data._id,{costComponents:[{name:'Camera',amount:200}]},'PUT');assert.equal(changed.data.sellingPrice,220);
 await request('/prices/types/'+type._id,null,'DELETE');assert(!(await request('/prices/types')).data.some(t=>t._id===type._id));assert.equal((await require('../models/PriceItem').findById(created.data._id)).category,'Other');
 assert.equal((await request('/prices/'+created.data._id,{profitValue:-1},'PUT')).status,400);
});
test('new services default to expense totals and never save person assignments',async()=>{
 const result=await request('/prices',{name:'Expense only',category:'Editing',unit:'per hour',sellingPrice:999,costComponents:[{name:'Editing',amount:40,person:'Not an assignment'}]});assert.equal(result.status,201);assert.equal(result.data.sellingPrice,40);assert(!JSON.stringify(result.data).includes('Not an assignment'));
});
test('renamed or deleted predefined types are not recreated by listing types',async()=>{
 const types=(await request('/prices/types')).data;const type=types.find(t=>t.seedName==='video');
 const legacy=await require('../models/PriceItem').create({name:'Legacy video',category:'video',unit:'per minute',sellingPrice:71,costPrice:20});
 await request('/prices/types/'+type._id,{name:'Motion film'},'PUT');let all=(await request('/prices/types')).data;assert.equal(all.filter(t=>t.seedName==='video').length,1);assert.equal(all.find(t=>t.seedName==='video').name,'Motion film');assert.equal((await require('../models/PriceItem').findById(legacy._id)).category,'Motion film');
 await request('/prices/types/'+type._id,null,'DELETE');all=(await request('/prices/types')).data;assert(!all.some(t=>t.seedName==='video'));
});
test('delivery cannot be forged on create and wallet IDs remain private in shared invoices',async()=>{
 const draft=(await request('/bills',{client:client._id,items:[{name:'Film',quantity:1,sellingPrice:71,assignedTo:worker._id,deliveryStatus:'delivered'}]})).data;
 assert.equal(draft.items[0].deliveryStatus,'pending');
 await request('/bills/'+draft._id+'/share',{phone:'client'});
 const shared=(await request('/bills/shared/'+draft.shareToken+'?phone=client',null,'GET',null)).data;assert.equal(shared.items[0].assignedTo,undefined);assert.equal(shared.items[0].deliveryStatus,undefined);
 const delivery='/bills/'+draft._id+'/items/'+draft.items[0]._id+'/delivery';await request(delivery,{deliveryStatus:'delivered'},'PUT');
 assert.equal((await request('/bills/'+draft._id,{items:[{name:'Film',quantity:2,sellingPrice:71,assignedTo:worker._id}]},'PUT')).status,400);
 await request('/bills/'+draft._id,null,'DELETE');
});
test('deleted type labels can be used again without reviving deleted options',async()=>{
 const first=(await request('/prices/types',{name:'Temporary type'})).data;await request('/prices/types/'+first._id,null,'DELETE');
 const second=(await request('/prices/types',{name:'Another type'})).data;
 const renamed=await request('/prices/types/'+second._id,{name:'Temporary type'},'PUT');assert.equal(renamed.status,200);
 assert.equal((await request('/prices/types')).data.filter(t=>t.name==='Temporary type').length,1);
});

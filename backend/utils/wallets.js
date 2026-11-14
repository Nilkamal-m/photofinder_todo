const {round}=require('./costs');
function summarizeWallets(users,bills,payments) {
  return users.map(user=>{
    const jobs=[];
    for(const bill of bills){
      if(bill.status==='cancelled')continue;
      for(const item of bill.items){
        if(String(item.assignedTo)!==String(user._id))continue;
        jobs.push({createdBy:bill.createdBy,billId:bill._id,itemId:item._id,billNumber:bill.billNumber,service:item.name,quantity:item.quantity,amount:round(item.sellingPrice*item.quantity),deliveryStatus:item.deliveryStatus || 'pending',deliveredAt:item.deliveredAt});
      }
    }
    const records=payments.filter(payment=>String(payment.user)===String(user._id));
    const pending=round(jobs.filter(j=>j.deliveryStatus!=='delivered').reduce((s,j)=>s+j.amount,0));
    const settled=round(jobs.filter(j=>j.deliveryStatus==='delivered').reduce((s,j)=>s+j.amount,0));
    const paid=round(records.reduce((s,p)=>s+p.amount,0));
    return {userId:user._id,name:user.name,accountLabel:user.name+(user.phone?' · '+user.phone.slice(-4):''),pending,settled,paid,balance:round(settled-paid),jobs,payments:records};
  });
}
module.exports={summarizeWallets};

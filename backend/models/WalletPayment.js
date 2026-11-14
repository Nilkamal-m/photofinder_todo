const mongoose=require('mongoose');
module.exports=mongoose.model('WalletPayment',new mongoose.Schema({
  user:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
  amount:{type:Number,required:true,min:0.01},
  note:{type:String,trim:true,default:''},
  createdBy:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
},{timestamps:true}));

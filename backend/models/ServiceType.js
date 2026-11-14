const mongoose = require('mongoose');
module.exports = mongoose.model('ServiceType', new mongoose.Schema({
  name: {type:String,required:true,trim:true,maxlength:80},
  key: {type:String,required:true,unique:true},
  seedName:{type:String},
  isActive: {type:Boolean,default:true},
}, {timestamps:true}));

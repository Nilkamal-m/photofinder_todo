// Isolated browser review database. Never connects to the configured application database.
const express=require('express');
const mongoose=require('mongoose');
const {MongoMemoryServer}=require('mongodb-memory-server');
process.env.JWT_SECRET='isolated-preview-only';
process.env.ADMIN_SETUP_KEY='preview-only';
(async()=>{
 const mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
 const app=express();app.use(require('cors')());app.use(express.json());
 for(const route of ['auth','prices','clients','packages','bills','dates','team','enquiries']) app.use('/api/'+route,require('../routes/'+route));
 const User=require('../models/User');await User.create({name:'Alex Morgan',phone:'preview-admin',password:'preview-password',role:'admin'});
 const server=app.listen(3101,()=>console.log('Isolated preview API ready on 3101'));
 process.on('SIGTERM',async()=>{server.close();await mongoose.disconnect();await mongo.stop();process.exit();});
})();

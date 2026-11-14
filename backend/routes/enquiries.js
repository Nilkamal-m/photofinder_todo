const express = require('express');
const Enquiry = require('../models/Enquiry');

const router = express.Router();
const {protect,adminOnly} = require('../middleware/auth');
router.get('/',protect,adminOnly,async(req,res)=>{
  try {res.json(await Enquiry.find().sort({createdAt:-1}));} catch(err){res.status(500).json({message:err.message});}
});
router.put('/:id',protect,adminOnly,async(req,res)=>{
  if (!['new','contacted','closed'].includes(req.body.status)) return res.status(400).json({message:'Choose a valid enquiry status'});
  try {const enquiry=await Enquiry.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true,runValidators:true});if(!enquiry)return res.status(404).json({message:'Enquiry not found'});res.json(enquiry);}catch(err){res.status(400).json({message:err.message});}
});

router.post('/', async (req, res) => {
  try {
    const { name, phone, email, eventType, eventDate, message } = req.body;

    if (!name?.trim() || !phone?.trim()) {
      return res.status(400).json({ message: 'Name and phone are required' });
    }

    const enquiry = await Enquiry.create({
      name: name.trim(),
      phone: phone.trim(),
      email: email?.trim(),
      eventType: eventType?.trim(),
      eventDate: eventDate?.trim(),
      message: message?.trim(),
    });

    res.status(201).json({
      message: 'Thanks. We will be in touch shortly.',
      enquiryId: enquiry._id,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

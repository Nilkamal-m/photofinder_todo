const express = require('express');
const router = express.Router();
const { normalizeCosts, round } = require('../utils/costs');
const {calculateService}=require('../utils/servicePricing');
const ServiceType=require('../models/ServiceType');
const PriceItem = require('../models/PriceItem');
const { protect, adminOnly } = require('../middleware/auth');

const DEFAULT_TYPES=['Video','Photography','Editing','Equipment','Travel','Other'];
async function ensureTypes() {
  for(const name of DEFAULT_TYPES){
    const key=name.toLowerCase();
    if(await ServiceType.exists({seedName:key}))continue;
    await ServiceType.updateOne({key},{$setOnInsert:{name,key,isActive:true},$set:{seedName:key}},{upsert:true});
  }
}
router.get('/types',protect,async(req,res)=>{
  try {await ensureTypes();res.json(await ServiceType.find({isActive:true}).sort({name:1}));}catch(e){res.status(500).json({message:e.message});}
});
router.post('/types',protect,adminOnly,async(req,res)=>{
  try {const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Type name is required'});
    const type=await ServiceType.findOneAndUpdate({key:name.toLowerCase()},{$set:{name,isActive:true}},{upsert:true,new:true,runValidators:true});res.status(201).json(type);
  }catch(e){res.status(400).json({message:e.message});}
});
router.put('/types/:id',protect,adminOnly,async(req,res)=>{
  try {const name=String(req.body.name||'').trim();if(!name)return res.status(400).json({message:'Type name is required'});
    const archived=await ServiceType.findOne({key:name.toLowerCase(),isActive:false});
    if(archived)await ServiceType.updateOne({_id:archived._id},{key:'deleted:'+archived._id});
    const previous=await ServiceType.findById(req.params.id);
    const type=await ServiceType.findByIdAndUpdate(req.params.id,{name,key:name.toLowerCase()},{new:true,runValidators:true});
    if(!type)return res.status(404).json({message:'Type not found'});
    await PriceItem.updateMany({$or:[{serviceType:type._id},{serviceType:{$exists:false},category:{$in:[previous.name,previous.name.toLowerCase()]}}]},{category:type.name,serviceType:type._id});res.json(type);
  }catch(e){res.status(400).json({message:e.code===11000?'This type already exists':e.message});}
});
router.delete('/types/:id',protect,adminOnly,async(req,res)=>{
  try {const type=await ServiceType.findByIdAndUpdate(req.params.id,{isActive:false,key:'deleted:'+req.params.id},{new:true});if(!type)return res.status(404).json({message:'Type not found'});
    await PriceItem.updateMany({$or:[{serviceType:type._id},{serviceType:{$exists:false},category:{$in:[type.name,type.name.toLowerCase()]}}]},{$unset:{serviceType:1},$set:{category:'Other'}});res.json({message:'Type removed. Existing services moved to Other.'});
  }catch(e){res.status(400).json({message:e.message});}
});
async function prepareService(body,previous={}) {
  await ensureTypes();
  const result={...body};
  // Legacy records keep their saved rate until edited in the new expense-based form.
  if(!previous._id || body.profitMode!==undefined || previous.profitMode!==undefined) Object.assign(result,calculateService(body,previous));
  else if(body.costComponents!==undefined){result.costComponents=normalizeCosts(body.costComponents);result.costPrice=round(result.costComponents.reduce((s,p)=>s+p.amount,0));}
  const name=String(body.category ?? previous.category ?? 'Other').trim();
  const type=await ServiceType.findOneAndUpdate({key:name.toLowerCase()},{$setOnInsert:{name,key:name.toLowerCase()},$set:{isActive:true}},{new:true,upsert:true,runValidators:true});
  result.category=type.name;result.serviceType=type._id;return result;
}

// Get all price items (any logged in user)
router.get('/', protect, async (req, res) => {
  try {
    const items = await PriceItem.find({ isActive: true }).sort({ category: 1, name: 1 });
    // Hide costPrice for non-admins
    const result = items.map((item) => {
      const obj = item.toObject();
      if (req.user.role !== 'admin') { delete obj.costPrice; delete obj.costComponents; delete obj.profitMode; delete obj.profitValue; }
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Create price item (admin only) - Enforce unique name
router.post('/', protect, adminOnly, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).json({ message: 'Item name is required' });
    }

    // Check unique (case-insensitive)
    const existing = await PriceItem.findOne({
      name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
      isActive: true,
    });
    if (existing) {
      return res.status(400).json({ message: `Price item "${name}" already exists. Name must be unique.` });
    }

    const item = await PriceItem.create({
      ...await prepareService(req.body),
      name,
    });
    res.status(201).json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Update price item (admin only) - Enforce unique name
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const name = (req.body.name || '').trim();
    if (name) {
      const existing = await PriceItem.findOne({
        _id: { $ne: req.params.id },
        name: { $regex: new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        isActive: true,
      });
      if (existing) {
        return res.status(400).json({ message: `Price item "${name}" already exists. Name must be unique.` });
      }
    }

    const previous=await PriceItem.findById(req.params.id);
    if(!previous)return res.status(404).json({message:'Price item not found'});
    const item = await PriceItem.findByIdAndUpdate(
      req.params.id,
      { ...await prepareService(req.body,previous), ...(name ? { name } : {}) },
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ message: 'Price item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete price item (admin only)
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const item = await PriceItem.findByIdAndUpdate(req.params.id,{isActive:false},{new:true});
    if (!item) return res.status(404).json({ message: 'Price item not found' });
    res.json({ message: 'Price item deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;

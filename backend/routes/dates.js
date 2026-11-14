const express = require('express');
const router = express.Router();
const { validDate } = require('../utils/dates');
const BlockedDate = require('../models/BlockedDate');
const Client = require('../models/Client');
const { protect } = require('../middleware/auth');

// Helper to format date to YYYY-MM-DD
const toDateStr = (d) => {
  if (!d) return null;
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toISOString().split('T')[0];
};

// GET /api/dates - List all blocked dates + client booking dates
router.get('/', protect, async (req, res) => {
  try {
    // 1. Manually blocked dates
    const blocked = await BlockedDate.find({ createdBy: req.user._id })
      .populate('client')
      .populate('bill')
      .sort({ date: 1 });

    // 2. Dates from clients with an eventDate
    const clientsWithDates = await Client.find({
      createdBy: req.user._id,
      eventDate: { $exists: true, $ne: null },
    }).sort({ eventDate: 1 });

    // Combine into unified calendar entries
    const existingDateStrings = new Set(blocked.map((b) => b.dateString));

    const clientBookings = clientsWithDates
      .map((c) => {
        const dStr = toDateStr(c.eventDate);
        if (!dStr || existingDateStrings.has(dStr)) return null;
        return {
          _id: 'client-' + c._id,
          date: c.eventDate,
          dateString: dStr,
          title: `${c.name} (${c.eventType || 'Event'})`,
          type: 'booked',
          client: c,
          notes: c.eventVenue ? `Venue: ${c.eventVenue}` : '',
          isClientAutoBooking: true,
        };
      })
      .filter(Boolean);

    const combined = [...blocked, ...clientBookings].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json(combined);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/dates/check?date=YYYY-MM-DD - Check availability
router.get('/check', protect, async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date query param is required (YYYY-MM-DD)' });
    }

    const dateStr = date.trim();
    if (!validDate(dateStr)) return res.status(400).json({message:'Enter a valid date in YYYY-MM-DD format'});

    // Check manual blocked dates
    const blockedEntry = await BlockedDate.findOne({
      createdBy: req.user._id,
      dateString: dateStr,
    }).populate('client');

    if (blockedEntry) {
      return res.json({
        date: dateStr,
        isBlocked: true,
        status: blockedEntry.type,
        title: blockedEntry.title,
        notes: blockedEntry.notes,
        client: blockedEntry.client,
        message: `Date is ${blockedEntry.type}: ${blockedEntry.title}`,
      });
    }

    // Check client event dates (range matching full day)
    const targetDate = new Date(dateStr);
    const startOfDay = new Date(targetDate.setUTCHours(0, 0, 0, 0));
    const endOfDay = new Date(targetDate.setUTCHours(23, 59, 59, 999));

    const clientMatch = await Client.findOne({
      createdBy: req.user._id,
      eventDate: { $gte: startOfDay, $lte: endOfDay },
    });

    if (clientMatch) {
      return res.json({
        date: dateStr,
        isBlocked: true,
        status: 'booked',
        title: `Booked for ${clientMatch.name} (${clientMatch.eventType || 'Event'})`,
        client: clientMatch,
        notes: clientMatch.eventVenue ? `Venue: ${clientMatch.eventVenue}` : '',
        message: `Date is already booked by ${clientMatch.name} for ${clientMatch.eventType || 'an event'}`,
      });
    }

    // Date is free!
    res.json({
      date: dateStr,
      isBlocked: false,
      status: 'available',
      message: 'Date is available for booking! 🟢',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/dates - Manually block a date
router.post('/', protect, async (req, res) => {
  try {
    const { date, title, type, notes, client, bill } = req.body;
    if (!date) return res.status(400).json({ message: 'Date is required' });
    if (!title || !title.trim()) return res.status(400).json({ message: 'Title / Reason is required' });

    if (!validDate(date)) return res.status(400).json({message:'Enter a valid date in YYYY-MM-DD format'});
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ message: 'Invalid date format' });
    }

    const dateString = toDateStr(dateObj);

    // Check if already blocked
    const existing = await BlockedDate.findOne({
      createdBy: req.user._id,
      dateString,
    });
    if (existing) {
      return res.status(400).json({ message: `Date ${dateString} is already blocked: "${existing.title}"` });
    }

    const newBlocked = await BlockedDate.create({
      date: dateObj,
      dateString,
      title: title.trim(),
      type: type || 'blocked',
      notes: notes ? notes.trim() : '',
      client,
      bill,
      createdBy: req.user._id,
    });

    res.status(201).json(newBlocked);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT /api/dates/:id - Update blocked date
router.put('/:id', protect, async (req, res) => {
  try {
    const entry = await BlockedDate.findOne({ _id: req.params.id, createdBy: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Date entry not found' });

    if (req.body.title) entry.title = req.body.title.trim();
    if (req.body.type) entry.type = req.body.type;
    if (req.body.notes !== undefined) entry.notes = req.body.notes.trim();
    if (req.body.date) {
      if (!validDate(req.body.date)) return res.status(400).json({message:'Enter a valid date in YYYY-MM-DD format'});
      if (await BlockedDate.exists({_id:{$ne:entry._id},createdBy:req.user._id,dateString:req.body.date})) return res.status(400).json({message:'This date already has an entry'});
      const dObj = new Date(req.body.date);
      if (!isNaN(dObj.getTime())) {
        entry.date = dObj;
        entry.dateString = toDateStr(dObj);
      }
    }

    await entry.save();
    res.json(entry);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/dates/:id - Unblock date
router.delete('/:id', protect, async (req, res) => {
  try {
    const entry = await BlockedDate.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
    if (!entry) return res.status(404).json({ message: 'Date entry not found' });
    res.json({ message: 'Date unblocked successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;


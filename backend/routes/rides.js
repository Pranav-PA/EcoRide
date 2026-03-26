const express = require('express');
const {
  getAllRides,
  searchRides,
  getUserRides,
  getUserBookings,
  bookRide,
  acceptBooking,
  rejectBooking,
  completeRide,
  deleteRide,
  addReview,
  cancelBooking
} = require('../controllers/rideController');
const { auth, adminAuth } = require('../middleware/auth');
const upload = require('../middleware/upload'); // ✅ multer instance
const Ride = require('../models/Ride');

const router = express.Router();

// Admin: Get all rides
router.get('/', adminAuth, getAllRides);

// User: Search rides
router.get('/search', auth, searchRides);

// ✅ Create ride (with image upload)
router.post('/', auth, upload.single('vehiclePhoto'), async (req, res) => {
  try {
    const {
      from,
      to,
      departureDate,
      departureTime,
      availableSeats,
      pricePerSeat,
      description,
      vehicleNumber,
      vehicleModel,
    } = req.body;

    if (!from || !to || !departureDate || !departureTime || !availableSeats || !pricePerSeat || !vehicleNumber || !vehicleModel) {
      return res.status(400).json({
        message: "All required fields must be filled, including vehicle model and number",
      });
    }

    const vehiclePhoto = req.file ? `/uploads/${req.file.filename}` : '';

    const ride = new Ride({
      driver: req.user.id,
      from,
      to,
      departureDate,
      departureTime,
      availableSeats,
      pricePerSeat,
      description,
      vehicleNumber,
      vehicleModel,
      vehiclePhoto,
    });

    await ride.save();
    res.status(201).json({ message: 'Ride created successfully', ride });
  } catch (error) {
    console.error('Error creating ride:', error);
    res.status(500).json({ message: 'Server error creating ride' });
  }
});

// Other routes
router.get('/my-rides', auth, getUserRides);
router.get('/my-bookings', auth, getUserBookings);
router.post('/:id/book', auth, bookRide);
router.post('/:id/accept', auth, acceptBooking);
router.post('/:id/reject', auth, rejectBooking);
router.post('/:id/complete', auth, completeRide);
router.delete('/:id', auth, deleteRide);
router.post('/:id/review', auth, addReview);
router.post('/:id/cancel', auth, cancelBooking);

module.exports = router;
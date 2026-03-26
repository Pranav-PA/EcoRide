const Ride = require('../models/Ride');
const Notification = require('../models/Notification');
const User = require('../models/User');
const path = require('path');


const getAllRides = async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate('driver', 'name email phone')
      .populate('passengers.user', 'name email phone')
      .populate('reviews.user', 'name')
      .select('from to departureDate departureTime availableSeats pricePerSeat description vehicleNumber vehicleModel vehiclePhoto averageRating reviews status createdAt passengers driver')
      .sort({ createdAt: -1 });

    res.json(rides);
  } catch (err) {
    console.error('Error fetching rides:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper function to calculate distance using Google Maps Distance Matrix API
const fetch = require("node-fetch");

// 🗺️ Calculate route distance using OpenStreetMap’s free OSRM API
const calculateDistance = async (origin, destination) => {
  try {
    // Get coordinates for both locations
    const [originData, destData] = await Promise.all([
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(origin)}`).then(res => res.json()),
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destination)}`).then(res => res.json())
    ]);

    if (!originData[0] || !destData[0]) return null;

    const originCoords = [originData[0].lon, originData[0].lat];
    const destCoords = [destData[0].lon, destData[0].lat];

    // Use OSRM to calculate realistic driving distance (not straight line)
    const routeRes = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${originCoords.join(',')};${destCoords.join(',')}?overview=false`
    );
    const routeJson = await routeRes.json();

    if (!routeJson.routes || routeJson.routes.length === 0) return null;
    const distanceKm = routeJson.routes[0].distance / 1000;
    return distanceKm;
  } catch (err) {
    console.error("Error in calculateDistance:", err);
    return null;
  }
};

const searchRides = async (req, res) => {
  try {
    const { from, to, date, minPrice, maxPrice, minSeats } = req.query;
    let query = { status: "active" };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (date) {
      const searchDate = new Date(date);
      const nextDay = new Date(searchDate);
      nextDay.setDate(searchDate.getDate() + 1);
      query.departureDate = { $gte: searchDate, $lt: nextDay };
    } else {
      query.departureDate = { $gte: today };
    }

    if (minPrice || maxPrice) {
      query.pricePerSeat = {};
      if (minPrice) query.pricePerSeat.$gte = parseFloat(minPrice);
      if (maxPrice) query.pricePerSeat.$lte = parseFloat(maxPrice);
    }

    let exactMatches = [];
    let nearbyMatches = [];

    if (from && to) {
      const exactQuery = {
        ...query,
        from: { $regex: from, $options: "i" },
        to: { $regex: to, $options: "i" },
      };

      if (minSeats) {
        exactQuery.availableSeats = { $gte: parseInt(minSeats) };
      }

      // 🔹 Find exact matches
      exactMatches = await Ride.find(exactQuery)
        .populate("driver", "name email phone")
        .select(
          "from to departureDate departureTime availableSeats pricePerSeat vehicleNumber vehicleModel vehiclePhoto passengers reviews"
        )
        .sort({ departureDate: 1, departureTime: 1 });

      exactMatches = exactMatches
        .map((ride) => {
          const acceptedSeats = ride.passengers
            .filter((p) => p.status === "accepted")
            .reduce((sum, p) => sum + p.bookedSeats, 0);
          const rideObj = ride.toObject();
          rideObj.actualAvailableSeats = ride.availableSeats - acceptedSeats;
          rideObj.isExactMatch = true;
          return rideObj;
        })
        .filter(
          (ride) => !minSeats || ride.actualAvailableSeats >= parseInt(minSeats)
        );

      // 🔹 Check all active rides for nearby route matches
      const allRides = await Ride.find(query)
        .populate("driver", "name email phone")
        .select(
          "from to departureDate departureTime availableSeats pricePerSeat vehicleNumber vehicleModel vehiclePhoto passengers reviews"
        )
        .sort({ departureDate: 1, departureTime: 1 });

          for (const ride of allRides) {
      const isExact = exactMatches.some(
        (em) => em._id.toString() === ride._id.toString()
      );
      if (isExact) continue;

      const fromDistance = await calculateDistance(from, ride.from);
      const toDistance = await calculateDistance(to, ride.to);

      // ✅ Broader logic for nearby route matching
      if (
        fromDistance !== null &&
        toDistance !== null &&
        (
          (fromDistance <= 80 && toDistance <= 80) || // near both ends
          (fromDistance <= 80 && toDistance >= fromDistance) // directionally correct
        )
      ) {
        const acceptedSeats = ride.passengers
          .filter((p) => p.status === "accepted")
          .reduce((sum, p) => sum + p.bookedSeats, 0);

        const rideObj = ride.toObject();
        rideObj.actualAvailableSeats = ride.availableSeats - acceptedSeats;

        if (!minSeats || rideObj.actualAvailableSeats >= parseInt(minSeats)) {
          rideObj.fromDistance = fromDistance;
          rideObj.toDistance = toDistance;
          rideObj.isNearbyMatch = true;
          nearbyMatches.push(rideObj);
        }
      }
    }
    } else {
      // No search input → show all available rides
      const rides = await Ride.find(query)
        .populate("driver", "name email phone")
        .select(
          "from to departureDate departureTime availableSeats pricePerSeat vehicleNumber vehicleModel vehiclePhoto passengers reviews"
        )
        .sort({ departureDate: 1, departureTime: 1 });

      exactMatches = rides
        .map((ride) => {
          const acceptedSeats = ride.passengers
            .filter((p) => p.status === "accepted")
            .reduce((sum, p) => sum + p.bookedSeats, 0);
          const rideObj = ride.toObject();
          rideObj.actualAvailableSeats = ride.availableSeats - acceptedSeats;
          rideObj.isExactMatch = true;
          return rideObj;
        })
        .filter(
          (ride) => !minSeats || ride.actualAvailableSeats >= parseInt(minSeats)
        );
    }

    res.json({ exactMatches, nearbyMatches });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ message: "Server error" });
  }
};

const createRide = async (req, res) => {
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
            vehicleModel
        } = req.body;

        // Validate required fields
        if (!from || !to || !departureDate || !departureTime || !availableSeats || !pricePerSeat || !vehicleNumber || !vehicleModel) {
            return res.status(400).json({ message: 'All required fields must be filled, including vehicle model and number' });
        }

        // Normalize vehicle number (uppercase & no spaces)
        const cleanVehicleNumber = vehicleNumber.toUpperCase().replace(/\s+/g, '');
        const vehicleRegex = /^[A-Z]{2}\d{2}[A-Z]{2}\d{4}$/;
        if (!vehicleRegex.test(cleanVehicleNumber)) {
            return res.status(400).json({ message: 'Invalid vehicle number format (e.g., KA09DX1234)' });
        }

        // Handle uploaded photo (if any)
        let vehiclePhotoPath = '';
        if (req.file) {
            vehiclePhotoPath = `/uploads/${req.file.filename}`;
        }

        // Create the ride
        const newRide = new Ride({
            driver: req.user.id,
            from,
            to,
            departureDate,
            departureTime,
            availableSeats,
            pricePerSeat,
            description,
            vehicleNumber: cleanVehicleNumber,
            vehicleModel,
            vehiclePhoto: vehiclePhotoPath
        });

        await newRide.save();
        res.status(201).json(newRide);
    } catch (err) {
        console.error('❌ Ride creation error:', err);
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

const getUserRides = async (req, res) => {
  try {
    // Use req.user.id (string) as set by auth middleware
    const rides = await Ride.find({ driver: req.user.id })
      .populate('driver', 'name email phone')
      .populate('passengers.user', 'name email phone')
      .populate('reviews.user', 'name email')
      .sort({ createdAt: -1 });

    // Ensure reviews.user is populated (defensive)
    const populated = await Ride.populate(rides, { path: 'reviews.user', select: 'name email' });

    const formattedRides = populated.map((ride) => ({
  _id: ride._id,
  from: ride.from,
  to: ride.to,
  departureDate: ride.departureDate,
  departureTime: ride.departureTime,
  availableSeats: ride.availableSeats,
  pricePerSeat: ride.pricePerSeat,
  vehicleNumber: ride.vehicleNumber || 'N/A',
  vehicleModel: ride.vehicleModel || 'N/A',
  vehiclePhoto: ride.vehiclePhoto || '',
  status: ride.status,
  createdAt: ride.createdAt,
  driver: ride.driver ? {
    _id: ride.driver._id,
    name: ride.driver.name,
    email: ride.driver.email,
    phone: ride.driver.phone
  } : null,
  passengers: ride.passengers.map(p => ({
    user: p.user ? {
      _id: p.user._id,
      name: p.user.name,
      email: p.user.email,
      phone: p.user.phone
    } : null,
    bookedSeats: p.bookedSeats,
    status: p.status,
    bookedAt: p.bookedAt
  })),
  reviews: (ride.reviews || []).map(r => ({
    user: r.user ? { _id: r.user._id, name: r.user.name, email: r.user.email } : null,
    rating: r.rating,
    comment: r.comment || '',
    createdAt: r.createdAt
  }))
}));

    res.json(formattedRides);
  } catch (err) {
    console.error('Error in getUserRides:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
};

const getUserBookings = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: 'Unauthorized: missing user data' });
    }

    const rides = await Ride.find({ 'passengers.user': req.user.id })
      .populate('driver', 'name email phone')
      .populate('passengers.user', 'name email phone')
      .populate('reviews.user', 'name email')
      .sort({ departureDate: 1 });

    const ridesWithStatus = rides.map((ride) => {
      const rideObj = ride.toObject();

      // ✅ Always treat passengers array safely
      const passengers = Array.isArray(ride.passengers) ? ride.passengers : [];

      // ✅ Find current user booking safely
      const userBooking = passengers.find((p) => {
        if (!p.user) return false;
        const userId =
          typeof p.user === 'object'
            ? p.user._id?.toString()
            : p.user?.toString();
        return userId === req.user.id;
      });

      // ✅ Clean up null reviews
      const reviews = (ride.reviews || []).filter((r) => r.user && r.user._id);

      // ✅ Attach driver info safely
      rideObj.driverInfo = {
        _id: ride.driver?._id?.toString() || '',
        name: ride.driver?.name || 'N/A',
        email: ride.driver?.email || 'N/A',
        phone: ride.driver?.phone || 'N/A',
        vehicleNumber: ride.vehicleNumber || 'N/A',
        vehicleModel: ride.vehicleModel || 'N/A',
        vehiclePhoto: ride.vehiclePhoto || '',
      };

      // ✅ Booking info
      rideObj.userBookingStatus = userBooking?.status || 'pending';
      rideObj.userBookedSeats = userBooking?.bookedSeats || 0;
      rideObj.reviews = reviews;

      return rideObj;
    });

    res.json(ridesWithStatus);
  } catch (err) {
    console.error('💥 Error in getUserBookings:', err);
    res.status(500).json({ message: 'Server error while loading bookings' });
  }
};

const bookRide = async (req, res) => {
    try {
        const { seats = 1 } = req.body;
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        if (ride.driver.toString() === req.user.id) {
            return res.status(400).json({ message: 'Cannot book your own ride' });
        }

        // Calculate currently accepted seats
        const acceptedSeats = ride.passengers
            .filter(p => p.status === 'accepted')
            .reduce((sum, p) => sum + p.bookedSeats, 0);
        
        const actualAvailable = ride.availableSeats - acceptedSeats;

        if (actualAvailable < seats) {
            return res.status(400).json({ message: 'Not enough available seats' });
        }

        // Check if user already has a pending or accepted booking
        const existingBooking = ride.passengers.find(
            p => p.user.toString() === req.user.id && ['pending', 'accepted'].includes(p.status)
        );
        if (existingBooking) {
            return res.status(400).json({ message: 'You already have a booking request for this ride' });
        }

        // Add booking with pending status (don't reduce available seats yet)
        ride.passengers.push({
            user: req.user.id,
            bookedSeats: seats,
            status: 'pending'
        });

        await ride.save();
        await ride.populate('driver', 'name email phone');
        await ride.populate('passengers.user', 'name email phone');

        // Create notification for driver
        const requester = await User.findById(req.user.id);
        await Notification.create({
            user: ride.driver,
            type: 'booking_request',
            message: `${requester.name} requested to book ${seats} seat(s) for your ride from ${ride.from} to ${ride.to}`,
            ride: ride._id,
            requester: req.user.id
        });

        res.json(ride);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const acceptBooking = async (req, res) => {
  try {
    const { passengerId } = req.body;
    const rideId = req.params.id;

    // Step 1️⃣ Fetch the ride
    const ride = await Ride.findById(rideId)
      .populate("passengers.user", "_id name email")
      .populate("driver", "_id name email");

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Step 2️⃣ Find the pending passenger
    const passenger = ride.passengers.find((p) => {
      const subdocId = p._id?.toString();
      const userId = p.user?._id?.toString() || p.user?.toString();
      return (subdocId === passengerId || userId === passengerId) && p.status === "pending";
    });

    if (!passenger) {
      return res.status(404).json({ message: "Pending booking not found" });
    }

    // Step 3️⃣ Count currently accepted seats
    const acceptedSeats = ride.passengers
      .filter((p) => p.status === "accepted")
      .reduce((sum, p) => sum + (p.bookedSeats || 1), 0);

    const seatsRemaining = ride.availableSeats - acceptedSeats;
    const requestedSeats = passenger.bookedSeats || 1;

    if (seatsRemaining < requestedSeats) {
      return res.status(400).json({ message: "Not enough seats available." });
    }

    // Step 4️⃣ Atomic update — ensures no two accepts happen at once
    const result = await Ride.findOneAndUpdate(
      {
        _id: rideId,
        // Only proceed if there are still enough seats
        $expr: {
          $gte: [
            { $subtract: ["$availableSeats", {
              $sum: {
                $map: {
                  input: "$passengers",
                  as: "p",
                  in: {
                    $cond: [{ $eq: ["$$p.status", "accepted"] }, "$$p.bookedSeats", 0]
                  }
                }
              }
            }] },
            requestedSeats
          ]
        },
        "passengers._id": passenger._id,
        "passengers.status": "pending"
      },
      {
        $set: {
          "passengers.$.status": "accepted"
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(400).json({ message: "Ride is already full or booking no longer pending." });
    }

    // Step 5️⃣ Create notification
    await Notification.create({
      user: passenger.user?._id || passenger.user,
      type: "booking_accepted",
      message: `Your booking for ${ride.from} → ${ride.to} was accepted by ${ride.driver?.name || "the driver"}.`,
    });

    return res.json({ message: "Booking accepted successfully!" });
  } catch (error) {
    console.error("💥 Accept booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const rejectBooking = async (req, res) => {
  try {
    const { passengerId } = req.body;
    console.log("🚫 RejectBooking Request:", { rideId: req.params.id, passengerId });

    const ride = await Ride.findById(req.params.id)
      .populate("passengers.user", "_id name email")
      .populate("driver", "_id name email");

    if (!ride) return res.status(404).json({ message: "Ride not found" });

    const passenger = ride.passengers.find((p) => {
      const subdocId = p._id?.toString();
      const userId = p.user?._id?.toString() || p.user?.toString();
      return (subdocId === passengerId || userId === passengerId) && p.status === "pending";
    });

    if (!passenger) {
      console.log("❌ Could not match any passenger for:", passengerId);
      return res.status(404).json({ message: "Pending booking not found" });
    }

    // ✅ Update booking status
    passenger.status = "rejected";
    await ride.save();

    console.log("🚫 Booking rejected successfully for:", passengerId);

    // ✅ Create notification for passenger
    await Notification.create({
      user: passenger.user?._id || passenger.user,
      type: "booking_rejected",
      message: `Your booking for ${ride.from} → ${ride.to} was rejected by ${ride.driver?.name || "the driver"}.`,
    });

    return res.json({ message: "Booking rejected successfully!" });
  } catch (error) {
    console.error("💥 Reject booking error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const completeRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check if requester is the driver
        if (ride.driver.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Only the driver can complete the ride' });
        }

        if (ride.status === 'completed') {
            return res.status(400).json({ message: 'Ride is already completed' });
        }

        ride.status = 'completed';
        await ride.save();
        await ride.populate('driver', 'name email phone');
        await ride.populate('passengers.user', 'name email phone');

        // Create notifications for all accepted passengers
        const acceptedPassengers = ride.passengers.filter(p => p.status === 'accepted');
        for (const passenger of acceptedPassengers) {
            await Notification.create({
                user: passenger.user,
                type: 'ride_completed',
                message: `The ride from ${ride.from} to ${ride.to} has been marked as completed. You can now leave a review!`,
                ride: ride._id
            });
        }

        res.json(ride);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const deleteRide = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Check if user is the driver or admin
        if (ride.driver.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Ride.findByIdAndDelete(req.params.id);
        res.json({ message: 'Ride deleted successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};

const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;

    const ride = await Ride.findById(req.params.id)
      .populate('driver', 'name')
      .populate('reviews.user', 'name email');

    if (!ride) return res.status(404).json({ message: "Ride not found" });
    if (ride.status !== "completed") return res.status(400).json({ message: "You can only review completed rides" });

    const currentUserId = req.user.id; // from auth middleware

    // Only accepted passengers can review
    const wasPassenger = ride.passengers.some(
      (p) => p.user && p.user.toString() === currentUserId && p.status === "accepted"
    );
    if (!wasPassenger) return res.status(403).json({ message: "Only accepted passengers can review this ride" });

    // Prevent duplicate review
    const existingReview = ride.reviews.find(
      (r) => r.user && r.user.toString() === currentUserId
    );
    if (existingReview) return res.status(400).json({ message: "You already reviewed this ride" });

    // Push review (store ObjectId)
    ride.reviews.push({
      user: currentUserId,
      rating,
      comment,
      createdAt: new Date()
    });

    // Recompute average rating
    const totalRating = ride.reviews.reduce((sum, r) => sum + r.rating, 0);
    ride.averageRating = totalRating / ride.reviews.length;

    await ride.save();

    // Re-fetch populated reviews
    const updatedRide = await Ride.findById(ride._id).populate('reviews.user', 'name email');

    // Create notification for driver
    await Notification.create({
      user: ride.driver._id,
      requester: currentUserId,
      ride: ride._id,
      type: "review",
      message: `⭐ ${req.user.name || ''} gave you a ${rating}-star review for your ride from ${ride.from} to ${ride.to}.`,
      isRead: false
    });

    // Return populated reviews (with user object)
    res.json({
      message: "Review submitted successfully!",
      reviews: (updatedRide.reviews || []).map(r => ({
        user: r.user ? { _id: r.user._id, name: r.user.name, email: r.user.email } : null,
        rating: r.rating,
        comment: r.comment,
        createdAt: r.createdAt
      }))
    });
  } catch (error) {
    console.error("❌ Error adding review:", error);
    res.status(500).json({ message: "Server error" });
  }
};

const cancelBooking = async (req, res) => {
    try {
        const ride = await Ride.findById(req.params.id);

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        const bookingIndex = ride.passengers.findIndex(p => p.user.toString() === req.user.id);
        if (bookingIndex === -1) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        ride.passengers.splice(bookingIndex, 1);

        await ride.save();
        await ride.populate('driver', 'name email phone');
        await ride.populate('passengers.user', 'name email phone');
        await ride.populate('reviews.user', 'name');
        
        res.json({ message: 'Booking cancelled successfully', ride });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ message: 'Server error' });
    }
};


module.exports = {
    getAllRides,
    searchRides,
    createRide,
    getUserRides,
    getUserBookings,
    bookRide,
    acceptBooking,
    rejectBooking,
    completeRide,
    deleteRide,
    addReview,
    cancelBooking
};

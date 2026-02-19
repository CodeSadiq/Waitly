
import Review from "../models/Review.js";
import Place from "../models/Place.js";
import User from "../models/User.js";

/* =====================================================
   ADD REVIEW
   POST /api/reviews/:placeId
   Body: { rating, comment }
   ===================================================== */
export const addReview = async (req, res) => {
    try {
        console.log("ADD REVIEW REQ:", req.body, req.params, req.user?._id);
        const { placeId } = req.params;
        const { rating, comment } = req.body;

        // Fix: Use _id from req.user
        const userId = req.user._id;

        if (!userId) {
            return res.status(401).json({ message: "User not authenticated (ID missing)" });
        }

        // Validate Input
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: "Rating must be between 1 and 5" });
        }

        const place = await Place.findById(placeId);
        if (!place) return res.status(404).json({ message: "Place not found" });

        // Ensure User Info
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Check for existing review
        const existingReview = await Review.findOne({ placeId, userId });
        if (existingReview) {
            console.log("Review exists for user:", userId, "place:", placeId);
            return res.status(400).json({ message: "You have already reviewed this place" });
        }

        // Create Review
        const newReview = await Review.create({
            placeId,
            userId,
            username: user.username || "Anonymous",
            rating,
            comment
        });

        // Update Place Stats (Aggregate)
        // Fetch all ratings to calculate accurate average
        const result = await Review.aggregate([
            { $match: { placeId: place._id } },
            {
                $group: {
                    _id: "$placeId",
                    avgRating: { $avg: "$rating" },
                    count: { $sum: 1 }
                }
            }
        ]);

        if (result.length > 0) {
            place.rating = parseFloat(result[0].avgRating.toFixed(1));
            place.reviewCount = result[0].count;
            await place.save();
        }

        res.status(201).json({ success: true, review: newReview, placeStats: { rating: place.rating, reviewCount: place.reviewCount } });
    } catch (err) {
        console.error("ADD REVIEW ERROR:", err);
        res.status(500).json({ message: "Failed to add review", error: err.message });
    }
};

/* =====================================================
   GET REVIEWS
   GET /api/reviews/:placeId
   ===================================================== */
export const getReviews = async (req, res) => {
    try {
        const { placeId } = req.params;
        const reviews = await Review.find({ placeId }).sort({ createdAt: -1 }).limit(10); // Limit to latest 10 for now
        res.json(reviews);
    } catch (err) {
        console.error("GET REVIEWS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
};


import mongoose from "mongoose";

const ReviewSchema = new mongoose.Schema(
    {
        placeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Place",
            required: true
        },
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        username: { type: String, required: true }, // Cache username for display
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5
        },
        comment: {
            type: String,
            trim: true,
            maxlength: 500
        }
    },
    { timestamps: true }
);

// Compound index to ensure one review per user per place
ReviewSchema.index({ placeId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Review", ReviewSchema);

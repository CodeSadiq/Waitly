import mongoose from "mongoose";

const ServiceCategorySchema = new mongoose.Schema(
  {
    categoryId: { type: String, required: true }, // e.g., "general", "premium", "express"
    name: { type: String, required: true },
    staffAvgTime: { type: Number, default: 5 }, // Baseline set by staff
    systemAvgTime: { type: Number, default: 5 }, // Learned from real data
    finalAvgTime: { type: Number, default: 5 }, // Hybrid calculation
    stats: {
      totalServiced: { type: Number, default: 0 },
      totalTime: { type: Number, default: 0 }
    }
  },
  { _id: false }
);

const CounterSchema = new mongoose.Schema(
  {
    name: String,
    // Removed old normalWait (user reporting)

    // New Service Categories
    services: {
      type: [ServiceCategorySchema],
      default: []
    },

    queueWait: {
      enabled: { type: Boolean, default: false },
      // These are now aggregate or fallback metrics
      avgTime: { type: Number, default: 0 },
      peopleAhead: { type: Number, default: 0 },
      activeTokens: { type: Number, default: 0 }
    },

    // Operational Hours
    openingTime: { type: String, default: "09:00" }, // HH:MM
    closingTime: { type: String, default: "17:00" }, // HH:MM
    lunchStart: { type: String, default: "13:00" },  // HH:MM
    lunchEnd: { type: String, default: "14:00" },    // HH:MM
    isClosed: { type: Boolean, default: false }
  },
  { _id: false }
);

const PlaceSchema = new mongoose.Schema(
  {
    externalPlaceId: {
      type: String,
      unique: true,
      required: true
    },

    name: String,
    category: String,
    address: String,

    location: {
      lat: Number,
      lng: Number
    },

    counters: [CounterSchema],

    analytics: {
      crowdLevel: {
        type: String,
        enum: ["Low", "Moderate", "High", "Critical", "Unknown"],
        default: "Unknown"
      },
      currentCapacity: { type: Number, default: 0 }, // Active tokens
      maxDailyCapacity: { type: Number, default: 100 }, // Estimated
      bestTimeToVisit: { type: String, default: "" },
      peakHours: { type: [String], default: [] }
    },

    metadata: {
      source: String
    }
  },
  { timestamps: true }
);

export default mongoose.model("Place", PlaceSchema);

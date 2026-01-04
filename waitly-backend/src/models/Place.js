import mongoose from "mongoose";

const CounterSchema = new mongoose.Schema(
  {
    name: String,
    normalWait: {
      avgTime: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: null },
      reportsCount: { type: Number, default: 0 }
    },
    queueWait: {
      enabled: { type: Boolean, default: false },
      avgTime: { type: Number, default: 0 },
      peopleAhead: { type: Number, default: 0 },
      activeTokens: { type: Number, default: 0 }
    }
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
      crowdLevel: { type: String, default: "Unknown" },
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

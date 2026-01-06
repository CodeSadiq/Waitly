import mongoose from "mongoose";

/* ================= COUNTER SUB-SCHEMA ================= */
const CounterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },

    normalWait: {
      avgTime: {
        type: Number,
        default: 0,
        min: 0
      },
      lastUpdated: {
        type: Date,
        default: null
      },
      reportsCount: {
        type: Number,
        default: 0,
        min: 0
      }
    },

    queueWait: {
      enabled: {
        type: Boolean,
        default: false
      },
      avgTime: {
        type: Number,
        default: 0,
        min: 0
      },
      peopleAhead: {
        type: Number,
        default: 0,
        min: 0
      },
      activeTokens: {
        type: Number,
        default: 0,
        min: 0
      }
    }
  },
  {
    _id: false
  }
);

/* ================= PENDING PLACE SCHEMA ================= */
const PendingPlaceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  category: {
    type: String,
    trim: true
  },

  address: {
    type: String,
    default: "",
    trim: true
  },

  location: {
    lat: {
      type: Number,
      required: true
    },
    lng: {
      type: Number,
      required: true
    }
  },

  counters: {
    type: [CounterSchema],
    required: true,
    validate: {
      validator: (v) => Array.isArray(v) && v.length > 0,
      message: "At least one counter is required"
    }
  },

  source: {
    type: String,
    required: true,
    enum: ["osm", "google", "user-map", "business", "admin"]
  },

  submittedBy: {
    type: String,
    default: null
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

/* ================= INDEXES (OPTIONAL BUT RECOMMENDED) ================= */
PendingPlaceSchema.index({ "location.lat": 1, "location.lng": 1 });
PendingPlaceSchema.index({ category: 1 });
PendingPlaceSchema.index({ createdAt: -1 });

export default mongoose.model("PendingPlace", PendingPlaceSchema);

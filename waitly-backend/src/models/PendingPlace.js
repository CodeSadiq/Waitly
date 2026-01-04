import mongoose from "mongoose";

const PendingPlaceSchema = new mongoose.Schema({
  name: String,
  category: String,
  address: String,

  location: {
    lat: Number,
    lng: Number
  },

  source: {
    type: String, // osm | google | user | business | admin
    required: true
  },

  submittedBy: String, // userId / businessId / admin

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("PendingPlace", PendingPlaceSchema);

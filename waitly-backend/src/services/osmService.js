import axios from "axios";
import Place from "../models/Place.js";

export const syncPlacesFromOSM = async (lat, lng) => {
  const categories = [
    "bank",
    "hospital",
    "university",
    "examination center",
    "government office",
    "public service office",
    "diagnostic lab",
    "imaging center",
    "passport office",
    "documentation center",
    "restaurant",
    "cafe",
    "court",
    "legal office",
    "rto",
    "vehicle service center",
  ];

  for (const category of categories) {
    const { data } = await axios.get(
      "https://nominatim.openstreetmap.org/search",
      {
        params: {
          q: category,
          format: "json",
          lat,
          lon: lng,
          limit: 10,
        },
        headers: {
          "User-Agent": "WAITLY (college-project)",
        },
      }
    );

    for (const place of data) {
      const exists = await Place.findOne({ osmId: place.osm_id });
      if (exists) continue;

      await Place.create({
        osmId: place.osm_id,
        name: place.display_name.split(",")[0],
        category,
        address: place.display_name,
        location: {
          lat: Number(place.lat),
          lng: Number(place.lon),
        },

        counters: getDefaultCounters(category),
        rating: 0,
        source: "osm",
        queueEnabled: false,
        totalActiveUsers: 0,
      });
    }
  }
};

const getDefaultCounters = (category) => {
  if (category.includes("bank"))
    return [{ name: "cash" }, { name: "account" }, { name: "loan" }];

  if (category.includes("hospital"))
    return [{ name: "registration" }, { name: "doctor" }];

  if (category.includes("university"))
    return [{ name: "admission" }, { name: "administration" }];

  return [{ name: "general" }];
};

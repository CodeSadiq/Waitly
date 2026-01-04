export function buildPlace({
  externalPlaceId,
  name,
  category,
  address,
  lat,
  lng,
  source = "admin"
}) {
  return {
    externalPlaceId,
    name,
    category,
    address,
    location: { lat, lng },

    counters: [
      {
        name: "General",
        normalWait: {
          avgTime: 0,
          lastUpdated: null,
          reportsCount: 0
        },
        queueWait: {
          enabled: false,
          avgTime: 0,
          peopleAhead: 0,
          activeTokens: 0
        }
      }
    ],

    analytics: {
      crowdLevel: "Unknown",
      bestTimeToVisit: "",
      peakHours: []
    },

    metadata: {
      source,
      createdAt: new Date()
    }
  };
}

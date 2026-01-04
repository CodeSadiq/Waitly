// services/placeFetchService.js
export async function fetchPlacesFromOSM({ category, lat, lng, radius = 3000 }) {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="${category}"](around:${radius},${lat},${lng});
  way["amenity"="${category}"](around:${radius},${lat},${lng});
  relation["amenity"="${category}"](around:${radius},${lat},${lng});
);
out center tags;
`;

  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "text/plain",
      "User-Agent": "WAITLY-Admin/1.0"
    },
    body: query
  });

  const data = await res.json();

  if (!Array.isArray(data.elements)) return [];

  return data.elements.map(p => ({
    name: p.tags?.name || "Unnamed Place",
    category,
    address:
      p.tags?.["addr:full"] ||
      p.tags?.["addr:street"] ||
      "",
    location: {
      lat: p.lat || p.center?.lat,
      lng: p.lon || p.center?.lon
    },
    source: "osm"
  }));
}

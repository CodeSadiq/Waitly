import Place from "../models/Place.js";

export const updateWaitTime = async (req, res) => {
  try {
    const { placeId, counter, waitTime } = req.body;

    if (!placeId || !counter || !waitTime) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const place = await Place.findById(placeId);
    if (!place) {
      return res.status(404).json({ message: "Place not found" });
    }

    const targetCounter = place.counters.find(
      (c) => c.name.toLowerCase() === counter.toLowerCase()
    );

    if (!targetCounter) {
      return res.status(404).json({ message: "Counter not found" });
    }

    const oldAvg = targetCounter.normalWait.avgTime;
    const oldCount = targetCounter.normalWait.reportsCount;

    const newCount = oldCount + 1;
    const newAvg =
      (oldAvg * oldCount + Number(waitTime)) / newCount;

    targetCounter.normalWait.avgTime = Math.round(newAvg);
    targetCounter.normalWait.reportsCount = newCount;
    targetCounter.normalWait.lastUpdated = new Date();

    await place.save();

    res.json({ success: true });
  } catch (err) {
    console.error("WAIT UPDATE ERROR:", err);
    res.status(500).json({ error: "Failed to update wait time" });
  }
};

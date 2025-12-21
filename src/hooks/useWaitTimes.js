import { useMemo } from "react";

/*
  Each entry format:
  {
    section: "cash",
    wait: 30,              // in minutes
    createdAt: ISO string  // timestamp
  }
*/

export default function useWaitTimes(entries = []) {
  return useMemo(() => {
    const now = Date.now();
    const sectionMap = {};

    entries.forEach(entry => {
      const ageInMinutes =
        (now - new Date(entry.createdAt).getTime()) / 60000;

      // Time decay: newer data has more weight
      const weight = Math.max(1, 60 - ageInMinutes);

      if (!sectionMap[entry.section]) {
        sectionMap[entry.section] = { total: 0, weight: 0 };
      }

      sectionMap[entry.section].total += entry.wait * weight;
      sectionMap[entry.section].weight += weight;
    });

    return Object.keys(sectionMap).map(section => ({
      section,
      wait: Math.round(
        sectionMap[section].total / sectionMap[section].weight
      )
    }));
  }, [entries]);
}


import { useEffect, useState } from "react";
import {
  hasGivenFeedback,
  canShowPopup,
} from "../utils/waitStorage";

export default function useAutoWaitPrompt(place) {
  const [showPrompt, setShowPrompt] = useState(false);

//   useEffect(() => {
//     if (!place) return;

//     // ⏱ Delay before first popup (user stays on site)
//     const stayTimer = setTimeout(() => {
//       if (
//         !hasGivenFeedback(place.id) &&
//         canShowPopup(place.id)
//       ) {
//         setShowPrompt(true);
//       }
//     }, 2 * 60 * 1000); // 2 minutes

//     return () => clearTimeout(stayTimer);
//   }, [place]);

useEffect(() => {
  if (!place) return;

  console.log("AutoWaitPrompt started for:", place.name);

  const stayTimer = setTimeout(() => {
    console.log("Timer finished, checking conditions...");
    if (
      !hasGivenFeedback(place.id) &&
      canShowPopup(place.id)
    ) {
      console.log("Showing popup now");
      setShowPrompt(true);
    }
  }, 20* 1000);

  return () => clearTimeout(stayTimer);
}, [place]);


  return {
    showPrompt,
    closePrompt: () => setShowPrompt(false),
  };
}

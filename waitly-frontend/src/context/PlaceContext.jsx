import { createContext, useContext, useState } from "react";

const PlaceContext = createContext(null);

export const PlaceProvider = ({ children }) => {
  const [selectedPlace, setSelectedPlace] = useState(null);

  // user-submitted wait time entries
  const [waitEntries, setWaitEntries] = useState([]);

  return (
    <PlaceContext.Provider
      value={{
        selectedPlace,
        setSelectedPlace,
        waitEntries,
        setWaitEntries
      }}
    >
      {children}
    </PlaceContext.Provider>
  );
};

export const usePlace = () => {
  const context = useContext(PlaceContext);
  if (!context) {
    throw new Error("usePlace must be used inside PlaceProvider");
  }
  return context;
};

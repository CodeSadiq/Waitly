import { createContext, useContext, useState } from "react";

const QueueContext = createContext(null);

export const QueueProvider = ({ children }) => {
  const [token, setToken] = useState(null);

  return (
    <QueueContext.Provider value={{ token, setToken }}>
      {children}
    </QueueContext.Provider>
  );
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error("useQueue must be used inside QueueProvider");
  }
  return context;
};

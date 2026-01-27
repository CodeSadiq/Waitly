import { io } from "socket.io-client";

const socket = io(import.meta.env.VITE_API_BASE || "http://localhost:5000");

export default socket;

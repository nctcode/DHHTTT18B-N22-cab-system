import { io } from "socket.io-client";

window.debugSocket = (token, rideId) => {
    console.log("🛠 Starting Socket Debugger...");
    const url = "http://localhost:3000";
    const socket = io(url, { auth: { token } });

    socket.on("connect", () => {
        console.log("✅ Custom Debug Socket Connected:", socket.id);
        console.log("📡 Joining Ride:", rideId);
        socket.emit("join:ride", rideId);
    });

    socket.onAny((event, ...args) => {
        console.log(`📥 [Debug Receiver] Event: ${event}`, args);
    });

    socket.on("connect_error", (err) => {
        console.error("❌ Connection Error:", err.message);
    });

    return socket;
};
console.log("Debug script loaded. Run `window.debugSocket('TOKEN', 'RIDE_ID')` to test.");

import io from "socket.io-client";

const SOCKET_URL = "https://noytindia.com:4443"
// Create socket instance with better configuration
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"], // Fallback to polling if websocket fails
  autoConnect: false, // prevent auto connect on import
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Track connection status
let isConnected = false;

// ✅ Function to check socket connection status
export const isSocketConnected = () => {
  return socket.connected && isConnected;
};

// ✅ Function to connect socket if not connected
export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log("🔄 Connecting socket...");
  }
  return socket;
};

// ✅ Function to disconnect socket
export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    isConnected = false;
    console.log("❌ Socket disconnected manually");
  }
};

// ✅ Function to get socket instance (for emit/listen)
export const getSocket = () => socket;

// ✅ Function to setup socket event listeners with callbacks
export const setupSocketListeners = (callbacks = {}) => {
  const {
    onConnect,
    onDisconnect,
    onAlert,
    onConnectError,
    onReconnectAttempt
  } = callbacks;

  // Remove all existing listeners first to avoid duplicates
  socket.off('connect');
  socket.off('disconnect');
  socket.off('newAlert');
  socket.off('alertUpdate');
  socket.off('connect_error');
  socket.off('reconnect_attempt');

  // Setup connection events
  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    isConnected = true;
    onConnect && onConnect();
  });

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason);
    isConnected = false;
    onDisconnect && onDisconnect(reason);
  });

  socket.on('connect_error', (error) => {
    console.log('❌ Socket connection error:', error);
    isConnected = false;
    onConnectError && onConnectError(error);
  });

  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`🔄 Socket reconnection attempt: ${attemptNumber}`);
    onReconnectAttempt && onReconnectAttempt(attemptNumber);
  });

  // Setup alert events
  if (onAlert) {
    socket.on('newAlert', onAlert);
    socket.on('alertUpdate', onAlert);
  }
};

// ✅ Function to cleanup socket listeners
export const cleanupSocketListeners = () => {
  socket.off('connect');
  socket.off('disconnect');
  socket.off('newAlert');
  socket.off('alertUpdate');
  socket.off('connect_error');
  socket.off('reconnect_attempt');
};

// ✅ Function to manually reconnect
export const reconnectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log("🔄 Manual socket reconnection initiated...");
  }
};
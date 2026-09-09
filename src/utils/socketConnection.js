import io from 'socket.io-client';
import { SERVER } from '../config/appConfig';

export const SOCKET_EVENTS = {
  PACKET: 'packet',
  ALERT: 'alert',
  OPEN_ALERT: 'open_alert',
  COMPARISON_LOG: 'comparison_log',
};

const SOCKET_URL = SERVER.socketUrl;

const socket = io(SOCKET_URL, {
  transports: ['websocket', 'polling'],
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 10000,
  timeout: 20000,
  forceNew: false,
});

let isConnected = false;
let activeCallbacks = {};

export const isSocketConnected = () => socket.connected && isConnected;

export const connectSocket = () => {
  if (!socket.connected) {
    socket.connect();
    console.log('🔄 Connecting socket...');
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket.connected) {
    socket.disconnect();
    isConnected = false;
    console.log('❌ Socket disconnected manually');
  }
};

export const getSocket = () => socket;

function bindCoreHandlers() {
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.io.off('reconnect');
  socket.io.off('reconnect_attempt');

  socket.on('connect', () => {
    console.log('✅ Socket connected:', socket.id);
    isConnected = true;
    activeCallbacks.onConnect?.();
  });

  socket.on('disconnect', reason => {
    console.log('❌ Socket disconnected:', reason);
    isConnected = false;
    activeCallbacks.onDisconnect?.(reason);
  });

  socket.on('connect_error', error => {
    console.log('❌ Socket connection error:', error?.message || error);
    isConnected = false;
    activeCallbacks.onConnectError?.(error);
  });

  // Manager-level reconnect (socket.io v4) — re-hydrate after a real reconnect
  socket.io.on('reconnect_attempt', attemptNumber => {
    console.log(`🔄 Socket reconnection attempt: ${attemptNumber}`);
    activeCallbacks.onReconnectAttempt?.(attemptNumber);
  });

  socket.io.on('reconnect', attemptNumber => {
    console.log(`✅ Socket reconnected after ${attemptNumber} attempt(s)`);
    isConnected = true;
    activeCallbacks.onConnect?.();
    activeCallbacks.onReconnectSync?.();
  });
}

function bindDomainHandlers() {
  socket.off(SOCKET_EVENTS.PACKET);
  socket.off(SOCKET_EVENTS.ALERT);
  socket.off(SOCKET_EVENTS.OPEN_ALERT);
  socket.off(SOCKET_EVENTS.COMPARISON_LOG);
  socket.off('newAlert');
  socket.off('alertUpdate');

  if (activeCallbacks.onOpenAlert) {
    socket.on(SOCKET_EVENTS.OPEN_ALERT, activeCallbacks.onOpenAlert);
  }
  if (activeCallbacks.onAlert) {
    socket.on(SOCKET_EVENTS.ALERT, activeCallbacks.onAlert);
  }
  if (activeCallbacks.onPacket) {
    socket.on(SOCKET_EVENTS.PACKET, activeCallbacks.onPacket);
  }
  if (activeCallbacks.onComparisonLog) {
    socket.on(SOCKET_EVENTS.COMPARISON_LOG, activeCallbacks.onComparisonLog);
  }
}

/**
 * Register live event handlers. Safe to call repeatedly — replaces prior handlers.
 * Pass onReconnectSync to re-hydrate from API after connect/reconnect.
 */
export const setupSocketListeners = (callbacks = {}) => {
  activeCallbacks = callbacks || {};
  bindCoreHandlers();
  bindDomainHandlers();
};

export const cleanupSocketListeners = () => {
  activeCallbacks = {};
  socket.off('connect');
  socket.off('disconnect');
  socket.off('connect_error');
  socket.io.off('reconnect');
  socket.io.off('reconnect_attempt');
  socket.off(SOCKET_EVENTS.PACKET);
  socket.off(SOCKET_EVENTS.ALERT);
  socket.off(SOCKET_EVENTS.OPEN_ALERT);
  socket.off(SOCKET_EVENTS.COMPARISON_LOG);
  socket.off('newAlert');
  socket.off('alertUpdate');
};

/** Ensure socket is connected; force cycle if already connected but stale. */
export const ensureSocketConnected = ({ force = false } = {}) => {
  if (force && socket.connected) {
    socket.disconnect();
  }
  if (!socket.connected) {
    socket.connect();
    console.log(force ? '🔄 Forced socket reconnect...' : '🔄 Ensuring socket connect...');
  }
  return socket;
};

export const reconnectSocket = () => ensureSocketConnected({ force: true });

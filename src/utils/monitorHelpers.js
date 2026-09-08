/** Shared monitor helpers — API hydrate + live socket merges */

export const CLIENT_PACKET_LIMIT = 100;
export const CLIENT_LIST_LIMIT = 150;

/** Canonical comparison result for open-alert history. */
export const OPEN_ALERT_RESULT = 'OPEN ALERT TRIGGERED';

/** IST offset from UTC in milliseconds (UTC+05:30). */
export const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

export const ADMIN_SECTIONS = [
  { id: 'openAlerts', label: 'Open Alerts' },
  { id: 'events', label: 'Events' },
  { id: 'packets', label: 'Packets' },
  { id: 'comparisonLogs', label: 'Comparisons' },
  { id: 'status', label: 'Status' },
];

export const CLIENT_SECTIONS = [
  { id: 'openAlerts', label: 'Open Alerts' },
  { id: 'events', label: 'Events' },
  { id: 'packets', label: 'Packets' },
  { id: 'status', label: 'Status' },
];

/** @deprecated use ADMIN_SECTIONS / CLIENT_SECTIONS */
export const SECTIONS = ADMIN_SECTIONS;

/** Current / given calendar date in Asia/Kolkata as YYYY-MM-DD. */
export function getIstDateString(date = new Date()) {
  const istMs = date.getTime() + IST_OFFSET_MS;
  const ist = new Date(istMs);
  const y = ist.getUTCFullYear();
  const m = String(ist.getUTCMonth() + 1).padStart(2, '0');
  const d = String(ist.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** @deprecated use getIstDateString — kept for existing imports */
export function formatDateToAPI(date) {
  return getIstDateString(date instanceof Date ? date : new Date(date));
}

export function formatDateForDisplay(dateString) {
  // Interpret YYYY-MM-DD as an IST calendar day for display
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ''))) {
    const [y, m, d] = String(dateString).split('-').map(Number);
    const utc = new Date(Date.UTC(y, m - 1, d, 0, 0, 0) - IST_OFFSET_MS);
    return utc.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatTime(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** "2h 5m" / "3m 20s" / "45s" — bottom open durations */
export function formatDurationSeconds(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const total = Math.max(0, Math.round(Number(value)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/** HH:MM:SS in IST — used for comparison log timestamps */
export function formatTimeWithSeconds(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatAngle(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(2);
}

export function itemId(item) {
  return (
    item?._id ||
    item?.id ||
    `${item?.vrn || 'x'}-${item?.timestamp || item?.gatewayTime || Date.now()}`
  );
}

/** Compare using Asia/Kolkata calendar date, matching backend IST filters. */
export function matchesDateFilter(timestamp, selectedDate) {
  if (!selectedDate) return true;
  if (!timestamp) return false;
  const ts = new Date(timestamp);
  if (Number.isNaN(ts.getTime())) return false;
  return getIstDateString(ts) === selectedDate;
}

export function matchesVrnFilter(vrn, appliedVrn) {
  if (!appliedVrn) return true;
  return String(vrn || '')
    .toUpperCase()
    .includes(String(appliedVrn).toUpperCase());
}

export function transformOpenAlert(alert) {
  return {
    id: itemId(alert),
    message: alert.message,
    vrn: alert.vrn,
    movableLabel: alert.movableLabel,
    fixedLabel: alert.fixedLabel,
    time: formatTime(alert.timestamp),
    timestamp: alert.timestamp,
    speed: alert?.gps?.speed ?? null,
    lat: alert?.gps?.lat ?? null,
    lng: alert?.gps?.long ?? null,
    address: alert?.gps?.address || 'Location unavailable',
    geofence: alert?.gps?.geofence ?? null,
    amulZ: alert.amulZ,
    amulX: alert.amulX,
    amulFixedZ: alert.amulFixedZ,
    amulFixedX: alert.amulFixedX,
    recentAlertCount: alert.recentAlertCount,
    sensorZone: alert.sensorZone === 'bottom' ? 'bottom' : 'top',
    bottomLabel: alert.bottomLabel || null,
    bottomOpenSince: alert.bottomOpenSince || null,
    bottomOpenSinceText: alert.bottomOpenSince
      ? formatTime(alert.bottomOpenSince)
      : null,
    bottomOpenSeconds: alert.bottomOpenSeconds ?? null,
    bottomClosedAt: alert.bottomClosedAt || null,
    bottomClosedAtText: alert.bottomClosedAt
      ? formatTime(alert.bottomClosedAt)
      : null,
    magnet: alert.magnet || null,
    rawData: alert,
  };
}

/** Hide only vanished rows — Events stay visible even when an Open Alert exists */
export function isVisibleEvent(alert) {
  if (!alert) return false;
  if (alert.vanished || alert.outcome === 'vanished') return false;
  return true;
}

export function transformAlert(alert) {
  return {
    id: itemId(alert),
    message: alert.message,
    vrn: alert.vrn,
    movableLabel: alert.movableLabel,
    fixedLabel: alert.fixedLabel,
    time: formatTime(alert.timestamp),
    timestamp: alert.timestamp,
    speed: alert?.gps?.speed ?? null,
    lat: alert?.gps?.lat ?? null,
    lng: alert?.gps?.long ?? null,
    address: alert?.gps?.address || null,
    geofence: alert?.gps?.geofence ?? null,
    amulZ: alert.amulZ,
    amulX: alert.amulX,
    amulFixedZ: alert.amulFixedZ,
    amulFixedX: alert.amulFixedX,
    sensorZone: alert.sensorZone === 'bottom' ? 'bottom' : 'top',
    bottomLabel: alert.bottomLabel || null,
    bottomOpenSince: alert.bottomOpenSince || null,
    bottomOpenSinceText: alert.bottomOpenSince
      ? formatTime(alert.bottomOpenSince)
      : null,
    bottomOpenSeconds: alert.bottomOpenSeconds ?? null,
    bottomClosedAt: alert.bottomClosedAt || null,
    bottomClosedAtText: alert.bottomClosedAt
      ? formatTime(alert.bottomClosedAt)
      : null,
    magnet: alert.magnet || null,
    outcome: alert.outcome,
    status: alert.status,
    vanished: Boolean(alert.vanished),
    linkedOpenAlertId: alert.linkedOpenAlertId || null,
    angleTriggerTime: alert.angleTriggerTime || null,
    rawData: alert,
  };
}

export function transformComparisonLog(log) {
  return {
    id: itemId(log),
    vrn: log.vrn,
    movableLabel: log.movableLabel,
    fixedLabel: log.fixedLabel,
    time: formatTimeWithSeconds(
      log.createdAt || log.movableTime || log.timestamp,
    ),
    movableTime: log.movableTime || null,
    fixedTime: log.fixedTime || null,
    angleTriggerTime: log.angleTriggerTime || null,
    gpsTimestamp: log.gpsTimestamp || null,
    gpsTimestampRaw: log.gpsTimestampRaw || null,
    gpsSpeed: log.gpsSpeed ?? null,
    gpsLat: log.gpsLat ?? null,
    gpsLong: log.gpsLong ?? null,
    gpsAddress: log.gpsAddress || null,
    gpsSource: log.gpsSource || null,
    message: log.message,
    result: log.result || '—',
    geofence: log.geofence ?? null,
    amulZ: log.amulZ,
    amulX: log.amulX,
    fixedZ: log.fixedZ,
    fixedX: log.fixedX,
    isAlert: log.result === OPEN_ALERT_RESULT,
    rawData: log,
  };
}

export function transformPacket(packet) {
  return {
    id: itemId(packet),
    vrn: packet.vrn,
    deviceRole: packet.deviceRole,
    deviceName: packet.deviceName,
    time: formatTime(packet.gatewayTime || packet.createdAt),
    angleX: packet.angle_x,
    angleY: packet.angle_y,
    angleZ: packet.angle_z,
    battery: packet.battery,
    gatewayTime: packet.gatewayTime,
    createdAt: packet.createdAt,
    rawData: packet,
  };
}

/**
 * Prepend item; dedupe by id only (matches web/API semantics).
 */
export function prependUnique(list, item, { limit } = {}) {
  let next = list.filter(a => a.id !== item.id);
  next = [item, ...next];
  if (limit != null) next = next.slice(0, limit);
  return next;
}

export function emptySummary() {
  return {
    securityAlerts: 0,
    events: 0,
    openAlerts: 0,
    comparisonLogs: 0,
    openAlertComparisonLogs: 0,
    activeVehicles: 0,
    packets: 0,
  };
}

const SENSOR_FAULT_MS = 10 * 60 * 1000;

/** Derive normal/faulty from last packet timestamp (10-minute rule). */
export function deriveSensorStatus(lastSeenIso, nowMs = Date.now()) {
  if (!lastSeenIso) {
    return { status: 'faulty', label: 'Faulty' };
  }
  const t = new Date(lastSeenIso).getTime();
  if (!Number.isFinite(t)) {
    return { status: 'faulty', label: 'Faulty' };
  }
  if (nowMs - t > SENSOR_FAULT_MS) {
    return { status: 'faulty', label: 'Faulty' };
  }
  return { status: 'normal', label: 'Normal' };
}

/** Human-readable location for client Event tab (no coordinates). */
export function formatEventLocation(alert) {
  const addr = alert?.address;
  if (addr && addr !== 'Location unavailable') {
    return addr;
  }
  return 'Location unavailable';
}

/** Count movable + fixed sensors by health status. */
export function countSensorHealth(vehicles = []) {
  let normal = 0;
  let faulty = 0;
  for (const v of vehicles) {
    if (v.movable?.status === 'normal') normal += 1;
    else faulty += 1;
    if (v.fixed?.status === 'normal') normal += 1;
    else faulty += 1;
    if (v.bottom) {
      if (v.bottom.status === 'normal') normal += 1;
      else faulty += 1;
    }
  }
  return { normal, faulty };
}

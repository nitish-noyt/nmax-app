import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  getOpenAlerts,
  getAlerts,
  getComparisonLogs,
  getLatestPackets,
  getMonitorSummary,
  getSensorStatus,
} from '../api/APIFunction';
import {
  connectSocket,
  setupSocketListeners,
  cleanupSocketListeners,
  ensureSocketConnected,
  reconnectSocket,
  isSocketConnected,
} from '../utils/socketConnection';
import {
  CLIENT_PACKET_LIMIT,
  CLIENT_LIST_LIMIT,
  OPEN_ALERT_RESULT,
  transformOpenAlert,
  transformAlert,
  transformComparisonLog,
  transformPacket,
  matchesDateFilter,
  matchesVrnFilter,
  prependUnique,
  emptySummary,
  deriveSensorStatus,
  isVisibleEvent,
} from '../utils/monitorHelpers';
import { IS_CLIENT, LIVE_POLL_INTERVAL_MS } from '../config/appConfig';

const FAULT_MS = 10 * 60 * 1000;

function applyPacketToSensorStatus(prev, incoming) {
  if (!incoming?.vrn || !incoming?.deviceRole) return prev;
  const role = incoming.deviceRole;
  if (role !== 'movable' && role !== 'fixed' && role !== 'bottom') return prev;

  const ts = incoming.gatewayTime || incoming.createdAt;
  if (!ts) return prev;

  const vehicles = [...(prev?.vehicles || [])];
  const idx = vehicles.findIndex(v => v.vrn === incoming.vrn);
  // The server's status response is the source of truth for which sensors
  // a tanker is fitted with — a stray packet must not invent a vehicle or
  // a zone (that painted phantom "Faulty" rows for bottom-only tankers).
  if (idx < 0) return prev;
  const v = { ...vehicles[idx] };
  if (!v[role]) return prev;

  const lastSeen = new Date(ts).toISOString();
  const faultMs = (prev?.thresholdMinutes ?? FAULT_MS / 60000) * 60000;
  const entry = deriveSensorStatus(lastSeen, Date.now(), faultMs);
  // Keep activeFault and the rest — a packet only proves freshness
  v[role] = { ...v[role], status: entry.status, lastSeen };
  vehicles[idx] = v;

  return { ...prev, vehicles };
}

/**
 * Production live monitor data hook:
 * - API hydrate on date/VRN change (source of truth)
 * - Socket push for current IST date only
 * - AppState foreground resume → reconnect + sync
 * - Periodic API reconciliation while foregrounded
 */
/** Newest first, so a merged top+bottom list reads like one timeline */
function mergeByTime(a, b) {
  return [...(a || []), ...(b || [])].sort(
    (x, y) => new Date(y.timestamp || 0) - new Date(x.timestamp || 0),
  );
}

/** Caps each sensor zone separately, so top rows can never crowd out bottom */
function capPerZone(rows, limit) {
  const seen = { top: 0, bottom: 0 };
  const kept = [];
  for (const row of rows || []) {
    const zone = row?.sensorZone === 'bottom' ? 'bottom' : 'top';
    if (seen[zone] >= limit) continue;
    seen[zone] += 1;
    kept.push(row);
  }
  return kept;
}

export function useMonitorLive({ selectedDate, appliedVrn }) {
  const [openAlerts, setOpenAlerts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [packets, setPackets] = useState([]);
  const [comparisonLogs, setComparisonLogs] = useState([]);
  const [sensorStatus, setSensorStatus] = useState({
    thresholdMinutes: 10,
    vehicles: [],
  });
  const [summary, setSummary] = useState(emptySummary());
  const [loading, setLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [lastSyncAt, setLastSyncAt] = useState(null);

  const selectedDateRef = useRef(selectedDate);
  const appliedVrnRef = useRef(appliedVrn);
  const appStateRef = useRef(AppState.currentState);
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  useEffect(() => {
    appliedVrnRef.current = appliedVrn;
  }, [appliedVrn]);

  const bumpSummary = useCallback((key, delta = 1) => {
    setSummary(prev => ({
      ...prev,
      [key]: Math.max(0, Number(prev[key] || 0) + delta),
    }));
  }, []);

  const fetchMonitorData = useCallback(async ({ silent = false } = {}) => {
    const dateString = selectedDateRef.current;
    const vrn = appliedVrnRef.current || null;
    if (!dateString) return;
    if (syncInFlightRef.current) return;

    syncInFlightRef.current = true;
    if (!silent) setLoading(true);

    try {
      const statusPromise = getSensorStatus(vrn);

      if (IS_CLIENT) {
        const results = await Promise.allSettled([
          Promise.all([
            getOpenAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'top'),
            getOpenAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'bottom'),
          ]).then(([t, b]) => ({ data: mergeByTime(t?.data, b?.data) })),
          Promise.all([
            getAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'top'),
            getAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'bottom'),
          ]).then(([t, b]) => ({ data: mergeByTime(t?.data, b?.data) })),
          getLatestPackets(
            vrn || undefined,
            undefined,
            CLIENT_PACKET_LIMIT,
            dateString,
          ),
          getMonitorSummary(dateString, vrn),
          statusPromise,
        ]);
        const [openRes, alertRes, packetRes, summaryRes, statusRes] =
          results.map(r => (r.status === 'fulfilled' ? r.value : null));

        if (Array.isArray(openRes?.data)) {
          setOpenAlerts(
            capPerZone(openRes.data, CLIENT_LIST_LIMIT).map(transformOpenAlert),
          );
        }
        if (Array.isArray(alertRes?.data)) {
          setAlerts(
            capPerZone(
              alertRes.data.filter(isVisibleEvent),
              CLIENT_LIST_LIMIT,
            ).map(transformAlert),
          );
        }
        if (Array.isArray(packetRes?.data)) {
          setPackets(
            packetRes.data
              .slice(0, CLIENT_PACKET_LIMIT)
              .map(transformPacket),
          );
        }
        if (summaryRes?.data) {
          setSummary({ ...emptySummary(), ...summaryRes.data });
        }
        if (statusRes?.data) {
          setSensorStatus(statusRes.data);
        }
      } else {
        const results = await Promise.allSettled([
          Promise.all([
            getOpenAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'top'),
            getOpenAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'bottom'),
          ]).then(([t, b]) => ({ data: mergeByTime(t?.data, b?.data) })),
          Promise.all([
            getAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'top'),
            getAlerts(dateString, vrn, CLIENT_LIST_LIMIT, 'bottom'),
          ]).then(([t, b]) => ({ data: mergeByTime(t?.data, b?.data) })),
          getLatestPackets(
            vrn || undefined,
            undefined,
            CLIENT_PACKET_LIMIT,
            dateString,
          ),
          getComparisonLogs(dateString, vrn, CLIENT_LIST_LIMIT, true),
          getMonitorSummary(dateString, vrn),
          statusPromise,
        ]);

        const [openRes, alertRes, packetRes, logRes, summaryRes, statusRes] =
          results.map(r => (r.status === 'fulfilled' ? r.value : null));

        if (Array.isArray(openRes?.data)) {
          setOpenAlerts(
            capPerZone(openRes.data, CLIENT_LIST_LIMIT).map(transformOpenAlert),
          );
        }
        if (Array.isArray(alertRes?.data)) {
          setAlerts(
            capPerZone(
              alertRes.data.filter(isVisibleEvent),
              CLIENT_LIST_LIMIT,
            ).map(transformAlert),
          );
        }
        if (Array.isArray(packetRes?.data)) {
          setPackets(
            packetRes.data
              .slice(0, CLIENT_PACKET_LIMIT)
              .map(transformPacket),
          );
        }
        if (Array.isArray(logRes?.data)) {
          setComparisonLogs(
            logRes.data
              .slice(0, CLIENT_LIST_LIMIT)
              .map(transformComparisonLog),
          );
        }
        if (summaryRes?.data) {
          setSummary({ ...emptySummary(), ...summaryRes.data });
        }
        if (statusRes?.data) {
          setSensorStatus(statusRes.data);
        }
      }

      setLastSyncAt(new Date().toISOString());
    } catch (err) {
      console.log('Monitor sync failed', err?.message || err);
    } finally {
      syncInFlightRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  const handleLiveOpenAlert = useCallback(
    incoming => {
      if (!incoming) return;
      if (!matchesDateFilter(incoming.timestamp, selectedDateRef.current)) {
        return;
      }
      if (!matchesVrnFilter(incoming.vrn, appliedVrnRef.current)) return;
      const item = transformOpenAlert(incoming);
      setOpenAlerts(prev => {
        const exists = prev.some(a => a.id === item.id);
        if (!exists) bumpSummary('openAlerts', 1);
        // Per-zone cap: one busy top day must not evict the bottom rows
        return capPerZone(prependUnique(prev, item), CLIENT_LIST_LIMIT);
      });
    },
    [bumpSummary],
  );

  const handleLiveAlert = useCallback(
    incoming => {
      if (!incoming) return;
      if (!isVisibleEvent(incoming)) {
        // Vanished — remove from Events tab if present
        const id = String(incoming._id || incoming.id || '');
        if (id) {
          setAlerts(prev => {
            const existed = prev.some(a => a.id === id || a.id === String(id));
            if (existed) bumpSummary('securityAlerts', -1);
            return prev.filter(a => a.id !== id && a.id !== String(id));
          });
        }
        return;
      }
      if (!matchesDateFilter(incoming.timestamp, selectedDateRef.current)) {
        return;
      }
      if (!matchesVrnFilter(incoming.vrn, appliedVrnRef.current)) return;
      const item = transformAlert(incoming);
      setAlerts(prev => {
        const exists = prev.some(a => a.id === item.id);
        if (!exists) bumpSummary('securityAlerts', 1);
        return capPerZone(prependUnique(prev, item), CLIENT_LIST_LIMIT);
      });
    },
    [bumpSummary],
  );

  const handleLivePacket = useCallback(incoming => {
    if (!incoming) return;
    if (!matchesVrnFilter(incoming.vrn, appliedVrnRef.current)) return;

    setSensorStatus(prev => applyPacketToSensorStatus(prev, incoming));

    const ts = incoming.createdAt || incoming.gatewayTime;
    if (!matchesDateFilter(ts, selectedDateRef.current)) return;
    const item = transformPacket(incoming);
    setPackets(prev => {
      const exists = prev.some(a => a.id === item.id);
      if (!exists) bumpSummary('packets', 1);
      return prependUnique(prev, item, { limit: CLIENT_PACKET_LIMIT });
    });
  }, [bumpSummary]);

  const handleLiveComparisonLog = useCallback(
    incoming => {
      if (IS_CLIENT || !incoming) return;
      if (incoming.vanished || incoming.result === 'VANISHED') return;
      if (
        incoming.result !== OPEN_ALERT_RESULT &&
        incoming.logKind !== 'open_alert'
      ) {
        return;
      }
      const ts =
        incoming.createdAt || incoming.movableTime || incoming.timestamp;
      if (!matchesDateFilter(ts, selectedDateRef.current)) return;
      if (!matchesVrnFilter(incoming.vrn, appliedVrnRef.current)) return;
      const item = transformComparisonLog(incoming);
      setComparisonLogs(prev => {
        const exists = prev.some(a => a.id === item.id);
        if (!exists) {
          bumpSummary('openAlertComparisonLogs', 1);
        }
        return prependUnique(prev, item, { limit: CLIENT_LIST_LIMIT });
      });
    },
    [bumpSummary],
  );

  // Re-evaluate fault status every minute (recovery without new packets)
  useEffect(() => {
    const id = setInterval(() => {
      setSensorStatus(prev => {
        if (!prev?.vehicles?.length) return prev;
        const nowMs = Date.now();
        const faultMs = (prev.thresholdMinutes ?? FAULT_MS / 60000) * 60000;
        // Unfitted zones arrive as null and must stay null — spreading
        // null fabricated phantom "Faulty" sensors on bottom-only tankers
        const rederive = sensor =>
          sensor
            ? {
                ...sensor,
                status: deriveSensorStatus(sensor.lastSeen, nowMs, faultMs)
                  .status,
              }
            : sensor ?? null;
        return {
          ...prev,
          vehicles: prev.vehicles.map(v => ({
            ...v,
            movable: rederive(v.movable),
            fixed: rederive(v.fixed),
            bottom: rederive(v.bottom),
          })),
        };
      });
    }, 60000);
    return () => clearInterval(id);
  }, []);

  // Socket lifecycle
  useEffect(() => {
    setupSocketListeners({
      onConnect: () => setSocketStatus('connected'),
      onDisconnect: () => setSocketStatus('disconnected'),
      onConnectError: () => setSocketStatus('disconnected'),
      onReconnectSync: () => fetchMonitorData({ silent: true }),
      onOpenAlert: handleLiveOpenAlert,
      onAlert: handleLiveAlert,
      onPacket: handleLivePacket,
      onComparisonLog: IS_CLIENT ? undefined : handleLiveComparisonLog,
    });

    connectSocket();

    return () => cleanupSocketListeners();
  }, [
    fetchMonitorData,
    handleLiveOpenAlert,
    handleLiveAlert,
    handleLivePacket,
    handleLiveComparisonLog,
  ]);

  // API hydrate when filters change
  useEffect(() => {
    if (selectedDate) {
      fetchMonitorData({ silent: false });
    }
  }, [selectedDate, appliedVrn, fetchMonitorData]);

  // Foreground resume → reconnect + silent sync
  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;

      if (
        (prev === 'background' || prev === 'inactive') &&
        nextState === 'active'
      ) {
        ensureSocketConnected({ force: !isSocketConnected() });
        fetchMonitorData({ silent: true });
      }
    });

    return () => sub.remove();
  }, [fetchMonitorData]);

  // Foreground polling safety net
  useEffect(() => {
    const id = setInterval(() => {
      if (appStateRef.current !== 'active') return;
      if (!selectedDateRef.current) return;
      fetchMonitorData({ silent: true });
      if (!isSocketConnected()) {
        ensureSocketConnected();
      }
    }, LIVE_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [fetchMonitorData]);

  return {
    openAlerts,
    alerts,
    packets,
    comparisonLogs,
    sensorStatus,
    summary,
    loading,
    socketStatus,
    lastSyncAt,
    refresh: () => fetchMonitorData({ silent: false }),
    reconnectSocket,
  };
}

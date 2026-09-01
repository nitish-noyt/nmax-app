import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutAnimation, Platform, UIManager } from 'react-native';
import { Truck, Radio, ChevronDown, ChevronUp, MapPin, Clock } from 'lucide-react-native';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

function formatWhen(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function locationText(loc) {
  if (!loc) return 'Location unavailable';
  if (loc.address) return loc.address;
  if (loc.lat != null && loc.long != null) {
    return `${Number(loc.lat).toFixed(5)}, ${Number(loc.long).toFixed(5)}`;
  }
  return 'Location unavailable';
}

function FaultLogRow({ log }) {
  const isActive = log.status === 'active';
  return (
    <View style={[styles.faultRow, isActive && styles.faultRowActive]}>
      <View style={styles.faultHeader}>
        <Text style={styles.faultRole}>
          {(log.deviceRole || 'sensor').toUpperCase()}
          {log.label ? ` · ${log.label}` : ''}
        </Text>
        <View
          style={[
            styles.miniPill,
            isActive ? styles.miniPillFault : styles.miniPillOk,
          ]}
        >
          <Text
            style={[
              styles.miniPillText,
              isActive ? styles.miniPillTextFault : styles.miniPillTextOk,
            ]}
          >
            {isActive ? 'Ongoing' : 'Restored'}
          </Text>
        </View>
      </View>

      <View style={styles.faultLine}>
        <Clock size={12} color="#64748b" />
        <Text style={styles.faultLineText}>
          Started: {formatWhen(log.faultStartedAt)}
        </Text>
      </View>
      <View style={styles.faultLine}>
        <MapPin size={12} color="#2563eb" />
        <Text style={styles.faultLineText}>
          At start: {locationText(log.faultStartLocation)}
        </Text>
      </View>

      {log.restoredAt ? (
        <>
          <View style={styles.faultLine}>
            <Clock size={12} color="#16a34a" />
            <Text style={styles.faultLineText}>
              Restored: {formatWhen(log.restoredAt)}
            </Text>
          </View>
          <View style={styles.faultLine}>
            <MapPin size={12} color="#16a34a" />
            <Text style={styles.faultLineText}>
              At restore: {locationText(log.restoreLocation)}
            </Text>
          </View>
        </>
      ) : (
        <Text style={styles.faultHint}>Still faulty — waiting for packets</Text>
      )}
    </View>
  );
}

function SensorRow({ label, sensor }) {
  const isNormal = sensor?.status === 'normal';
  return (
    <View style={styles.sensorRow}>
      <View style={styles.sensorLeft}>
        <Radio size={14} color={isNormal ? '#16a34a' : '#dc2626'} />
        <Text style={styles.sensorLabel}>{label}</Text>
      </View>
      <View
        style={[
          styles.statusPill,
          isNormal ? styles.statusNormal : styles.statusFaulty,
        ]}
      >
        <Text
          style={[
            styles.statusText,
            isNormal ? styles.statusTextNormal : styles.statusTextFaulty,
          ]}
        >
          {isNormal ? 'Normal' : 'Faulty'}
        </Text>
      </View>
    </View>
  );
}

function VehicleStatusCard({ vehicle, showMovable, showFixed }) {
  const [open, setOpen] = useState(false);
  const history = vehicle.faultHistory || [];
  const activeLogs = [];
  if (vehicle.movable?.activeFault) activeLogs.push(vehicle.movable.activeFault);
  if (vehicle.fixed?.activeFault) activeLogs.push(vehicle.fixed.activeFault);

  const logs = [
    ...activeLogs,
    ...history.filter(
      h => !activeLogs.some(a => String(a._id) === String(h._id)),
    ),
  ].slice(0, 12);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(v => !v);
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity onPress={toggle} activeOpacity={0.85}>
        <View style={styles.cardHeader}>
          <View style={styles.truckIconBox}>
            <Truck size={18} color="#fff" />
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.vrn}>{vehicle.vrn}</Text>
            {(vehicle.movableLabel || vehicle.fixedLabel) && (
              <Text style={styles.subtitle}>
                {[vehicle.movableLabel, vehicle.fixedLabel]
                  .filter(Boolean)
                  .join(' / ')}
              </Text>
            )}
            <Text style={styles.tapHint}>
              {open ? 'Hide fault history' : 'Tap for fault start / restore log'}
            </Text>
          </View>
          {open ? (
            <ChevronUp size={18} color="#64748b" />
          ) : (
            <ChevronDown size={18} color="#64748b" />
          )}
        </View>
      </TouchableOpacity>

      {showMovable ? (
        <SensorRow label="Movable Sensor" sensor={vehicle.movable} />
      ) : null}
      {showFixed ? (
        <SensorRow label="Fixed Sensor" sensor={vehicle.fixed} />
      ) : null}

      {open ? (
        <View style={styles.historyWrap}>
          <Text style={styles.historyTitle}>Fault timeline</Text>
          {!logs.length ? (
            <Text style={styles.faultHint}>
              No fault history recorded for this vehicle yet.
            </Text>
          ) : (
            logs.map(log => (
              <FaultLogRow key={String(log._id)} log={log} />
            ))
          )}
        </View>
      ) : null}
    </View>
  );
}

export function StatusSection({
  vehicles = [],
  loading = false,
  filter = 'all',
}) {
  const filtered = vehicles
    .map(vehicle => {
      const showMovable = filter === 'all' || vehicle.movable?.status === filter;
      const showFixed = filter === 'all' || vehicle.fixed?.status === filter;
      if (!showMovable && !showFixed) return null;
      return { vehicle, showMovable, showFixed };
    })
    .filter(Boolean);

  if (loading && !vehicles.length) {
    return <Text style={styles.emptyText}>Loading…</Text>;
  }

  if (!vehicles.length) {
    return <Text style={styles.emptyText}>No vehicles to show.</Text>;
  }

  if (!filtered.length) {
    return (
      <Text style={styles.emptyText}>
        No {filter === 'normal' ? 'normal' : 'faulty'} sensors match this filter.
      </Text>
    );
  }

  return (
    <View style={styles.wrap}>
      {filtered.map(({ vehicle, showMovable, showFixed }) => (
        <VehicleStatusCard
          key={vehicle.vrn}
          vehicle={vehicle}
          showMovable={showMovable}
          showFixed={showFixed}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 24,
    fontSize: 14,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    gap: 10,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  truckIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1 },
  vrn: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },
  tapHint: { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  sensorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  sensorLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sensorLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusNormal: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusFaulty: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusText: { fontSize: 11, fontWeight: '700' },
  statusTextNormal: { color: '#16a34a' },
  statusTextFaulty: { color: '#dc2626' },
  historyWrap: {
    marginTop: 4,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
  historyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 2,
  },
  faultRow: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    gap: 6,
  },
  faultRowActive: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  faultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  faultRole: { fontSize: 12, fontWeight: '700', color: '#334155' },
  faultLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  faultLineText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 17 },
  faultHint: { fontSize: 12, color: '#94a3b8', fontStyle: 'italic' },
  miniPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  miniPillFault: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  miniPillOk: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  miniPillText: { fontSize: 10, fontWeight: '700' },
  miniPillTextFault: { color: '#dc2626' },
  miniPillTextOk: { color: '#16a34a' },
});

export default StatusSection;

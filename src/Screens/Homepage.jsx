import React, { useState, useEffect } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
import {
  Calendar,
  MapPin,
  Gauge,
  Navigation,
  Search,
  X,
  Truck,
  Clock,
  AlertTriangle,
  Radio,
  ShieldAlert,
  GitCompare,
  Activity,
  Zap,
  ArrowUpFromLine,
  ArrowDownToLine,
} from 'lucide-react-native';

import logo from '../assets/images/nmax-logo.png';
import StatusSection from '../Component/StatusSection';
import {
  IS_CLIENT,
  APP_DISPLAY_NAME,
  APP_VERSION,
} from '../config/appConfig';
import { useMonitorLive } from '../hooks/useMonitorLive';
import {
  ADMIN_SECTIONS,
  CLIENT_SECTIONS,
  getIstDateString,
  formatDateForDisplay,
  formatAngle,
  formatTimeWithSeconds,
  formatEventLocation,
  countSensorHealth,
  formatDurationSeconds,
  uniqueById,
} from '../utils/monitorHelpers';

const Homepage = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [activeSection, setActiveSection] = useState('openTop');
  const [statusFilter, setStatusFilter] = useState('all');
  const [vrnSearch, setVrnSearch] = useState('');
  const [appliedVrn, setAppliedVrn] = useState('');

  const sections = IS_CLIENT ? CLIENT_SECTIONS : ADMIN_SECTIONS;
  const hideSpeed = IS_CLIENT;

  const {
    openAlerts,
    alerts,
    packets,
    comparisonLogs,
    sensorStatus,
    summary,
    loading,
    socketStatus,
    refresh,
    reconnectSocket,
  } = useMonitorLive({ selectedDate, appliedVrn });

  useEffect(() => {
    setSelectedDate(getIstDateString(new Date()));
  }, []);

  useEffect(() => {
    if (activeSection !== 'status') {
      setStatusFilter('all');
    }
  }, [activeSection]);

  const sensorHealth = countSensorHealth(sensorStatus?.vehicles || []);

  /* ---------------- Handlers ---------------- */

  const handleDateConfirm = date => {
    setSelectedDate(getIstDateString(date));
    setDatePickerVisible(false);
  };

  const handleVrnSearch = () => setAppliedVrn(vrnSearch.trim());

  const handleClearVrn = () => {
    setVrnSearch('');
    setAppliedVrn('');
  };

  const openInGoogleMaps = (lat, lng, label = 'Location') => {
    if (lat == null || lng == null) {
      Alert.alert('Error', 'Location coordinates not available');
      return;
    }

    const scheme = Platform.select({
      ios: 'maps://0,0?q=',
      android: 'geo:0,0?q=',
    });
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`,
    });

    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      );
    });
  };

  const handleGoToMap = item => {
    if (item.lat != null && item.lng != null) {
      openInGoogleMaps(item.lat, item.lng, 'Alert Location');
    } else {
      Alert.alert('Error', 'Location coordinates not available for this alert');
    }
  };

  const handleDetailsPress = item => {
    const isBottom = item.sensorZone === 'bottom';
    Alert.alert(
      item.vrn || 'Alert Details',
      [
        isBottom && `Type: Bottom sensor`,
        item.message && `Message: ${item.message}`,
        isBottom &&
          item.bottomOpenSinceText &&
          `Open since: ${item.bottomOpenSinceText}`,
        isBottom &&
          item.bottomOpenSeconds != null &&
          `${item.bottomClosedAt ? 'Was open for' : 'Open for'}: ${formatDurationSeconds(item.bottomOpenSeconds)}`,
        isBottom &&
          item.bottomClosedAtText &&
          `Closed at: ${item.bottomClosedAtText}`,
        isBottom &&
          item.magnet?.temperature != null &&
          `Temperature: ${item.magnet.temperature}°C`,
        isBottom &&
          item.magnet?.humidity != null &&
          `Humidity: ${item.magnet.humidity}%`,
        isBottom &&
          item.magnet?.status != null &&
          `Sensor: ${item.bottomClosedAt ? 'Closed' : 'Open'}`,
        item.geofence && `Geofence: ${item.geofence === 'no' ? 'No' : 'Yes'}`,
        !hideSpeed && item.speed != null && `Speed: ${item.speed} km/h`,
        item.lat != null &&
          item.lng != null &&
          `Location: ${item.lat}, ${item.lng}`,
        item.address && `Address: ${item.address}`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  };

  const handleEventDetailsPress = item => {
    Alert.alert(
      item.vrn || 'Event Details',
      [
        `Location: ${formatEventLocation(item)}`,
        'Geofence: Yes',
        !hideSpeed && item.speed != null && `Speed: ${item.speed} km/h`,
      ]
        .filter(Boolean)
        .join('\n'),
    );
  };

  const applyStatusFilter = kind => {
    setActiveSection('status');
    setStatusFilter(prev => (prev === kind ? 'all' : kind));
  };

  // Header counts are the day totals for the selected date (from
  // /monitor/summary), not the length of the capped list below them.
  // Lists load only the latest 100-150 rows; the totals keep counting.
  const dayTotal = (summaryValue, listLength) => {
    const n = Number(summaryValue);
    return Number.isFinite(n) && n > 0 ? n : listLength;
  };

  const zoneOf = item => (item.sensorZone === 'bottom' ? 'bottom' : 'top');
  const inZone = (list, zone) =>
    uniqueById(list.filter(i => zoneOf(i) === zone));

  const activeMeta = sections.find(s => s.id === activeSection) || {};

  const sectionCounts = {
    openTop: dayTotal(summary?.topOpenAlerts, inZone(openAlerts, 'top').length),
    openBottom: dayTotal(
      summary?.bottomOpenAlerts,
      inZone(openAlerts, 'bottom').length,
    ),
    eventsTop: dayTotal(summary?.topEvents, inZone(alerts, 'top').length),
    eventsBottom: dayTotal(summary?.bottomEvents, inZone(alerts, 'bottom').length),
    packets: dayTotal(summary?.packets, packets.length),
    comparisonLogs: comparisonLogs.length,
    status: sensorHealth.normal + sensorHealth.faulty,
  };

  /* ---------------- Render lists ---------------- */

  const renderList = () => {
    const emptyHint = loading ? 'Loading…' : null;

    const zoneWord = activeMeta.zone === 'bottom' ? 'bottom' : 'top';

    if (activeMeta.kind === 'openAlerts') {
      const zoned = inZone(openAlerts, zoneWord);
      if (!zoned.length) {
        return (
          <Text style={styles.emptyText}>
            {emptyHint ||
              `No ${zoneWord} open alerts${appliedVrn ? ` for VRN ${appliedVrn}` : ''}`}
          </Text>
        );
      }
      return zoned.map((alert, index) => (
        <OpenAlertCard
          key={alert.id}
          alert={alert}
          index={index}
          hideSpeed={hideSpeed}
          onPress={handleDetailsPress}
          onGoToMap={handleGoToMap}
        />
      ));
    }

    if (activeMeta.kind === 'events') {
      const zoned = inZone(alerts, zoneWord);
      if (!zoned.length) {
        return (
          <Text style={styles.emptyText}>
            {emptyHint ||
              `No ${zoneWord} events${appliedVrn ? ` for VRN ${appliedVrn}` : ''}`}
          </Text>
        );
      }
      // Bottom events carry their own open/close detail, so they use the
      // full details sheet rather than the top-only geofence summary
      const useEventSheet = zoneWord === 'top';
      return zoned.map((alert, index) => (
        <EventCard
          key={alert.id}
          alert={alert}
          index={index}
          eventMode
          hideSpeed={hideSpeed}
          onPress={useEventSheet ? handleEventDetailsPress : handleDetailsPress}
        />
      ));
    }

    if (activeSection === 'packets') {
      if (!packets.length) {
        return (
          <Text style={styles.emptyText}>
            {emptyHint ||
              `No packets found${appliedVrn ? ` for VRN ${appliedVrn}` : ''}`}
          </Text>
        );
      }
      return packets.map((packet, index) => (
        <PacketCard key={packet.id} packet={packet} index={index} />
      ));
    }

    if (activeSection === 'status') {
      return (
        <StatusSection
          vehicles={sensorStatus?.vehicles || []}
          loading={loading}
          filter={statusFilter}
        />
      );
    }

    if (!comparisonLogs.length) {
      return (
        <Text style={styles.emptyText}>
          {emptyHint ||
            `No comparison logs found${appliedVrn ? ` for VRN ${appliedVrn}` : ''}`}
        </Text>
      );
    }
    return comparisonLogs.map((log, index) => (
      <ComparisonCard key={log.id} log={log} index={index} />
    ));
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={{ alignItems: 'center' }}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.companyText}>
              nmax Digital Business Transformation
            </Text>
            <Text style={styles.title}>ATCS · {APP_DISPLAY_NAME}</Text>
            <Text style={styles.versionText}>v{APP_VERSION}</Text>
          </View>

          <TouchableOpacity
            style={[
              styles.socketBadge,
              socketStatus === 'connected'
                ? styles.connected
                : styles.disconnected,
            ]}
            onPress={reconnectSocket}
          >
            {socketStatus === 'connected' && <View style={styles.liveDot} />}
            <Text style={styles.socketText}>
              {socketStatus === 'connected' ? 'Live' : 'Offline'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.dateSection}>
            <TouchableOpacity
              style={styles.dateRow}
              onPress={() => setDatePickerVisible(true)}
            >
              <Calendar size={16} color="#2563eb" />
              <Text style={styles.dateText}>
                {selectedDate
                  ? formatDateForDisplay(selectedDate)
                  : 'Select Date'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.refreshChip} onPress={refresh}>
              <Text style={styles.refreshChipText}>
                {loading ? 'Syncing…' : 'Refresh'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Stats / section switcher */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
            {sections.map(section => {
              const active = activeSection === section.id;
              const isBottom = section.zone === 'bottom';
              const accent = isBottom ? '#7c3aed' : '#2563eb';
              const iconColor = active ? accent : '#64748b';
              let Icon = AlertTriangle;
              if (section.kind === 'openAlerts') Icon = ShieldAlert;
              if (section.kind === 'events') Icon = Zap;
              if (section.id === 'packets') Icon = Radio;
              if (section.id === 'comparisonLogs') Icon = GitCompare;
              if (section.id === 'status') Icon = Activity;

              return (
                <TouchableOpacity
                  key={section.id}
                  style={[
                    styles.statCard,
                    active &&
                      (isBottom
                        ? styles.statCardActiveBottom
                        : styles.statCardActive),
                  ]}
                  onPress={() => setActiveSection(section.id)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.statIconBox,
                      active
                        ? isBottom
                          ? styles.statIconActiveBottom
                          : styles.statIconActive
                        : styles.statIconMuted,
                    ]}
                  >
                    <Icon size={16} color={iconColor} />
                  </View>
                  <View>
                    {section.zone ? (
                      <ZoneTag zone={section.zone} active={active} />
                    ) : null}
                    <Text
                      style={[
                        styles.statLabel,
                        active && (isBottom
                          ? styles.statLabelActiveBottom
                          : styles.statLabelActive),
                      ]}
                    >
                      {section.label}
                    </Text>
                    {section.id === 'status' ? (
                      <View style={styles.statusCountRow}>
                        <TouchableOpacity
                          onPress={() => applyStatusFilter('normal')}
                          style={[
                            styles.statusCountChip,
                            styles.statusCountChipNormal,
                            statusFilter === 'normal' &&
                              styles.statusCountChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusCountText,
                              styles.statusCountTextNormal,
                            ]}
                          >
                            {sensorHealth.normal} Normal
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => applyStatusFilter('faulty')}
                          style={[
                            styles.statusCountChip,
                            styles.statusCountChipFaulty,
                            statusFilter === 'faulty' &&
                              styles.statusCountChipActive,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusCountText,
                              styles.statusCountTextFaulty,
                            ]}
                          >
                            {sensorHealth.faulty} Faulty
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <Text style={styles.statValue}>
                        {sectionCounts[section.id]}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.searchCard}>
            <View style={styles.searchInputWrapper}>
              <Search size={18} color="#94a3b8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search VRN, labels, gateway..."
                placeholderTextColor="#94a3b8"
                value={vrnSearch}
                onChangeText={setVrnSearch}
                autoCapitalize="characters"
                returnKeyType="search"
                onSubmitEditing={handleVrnSearch}
              />
              {vrnSearch.length > 0 && (
                <TouchableOpacity
                  onPress={handleClearVrn}
                  style={styles.clearButton}
                >
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleVrnSearch}
            >
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
            {appliedVrn ? (
              <View style={styles.appliedVrnRow}>
                <View style={styles.vrnChip}>
                  <Truck size={12} color="#2563eb" />
                  <Text style={styles.vrnChipText}>{appliedVrn}</Text>
                </View>
                <TouchableOpacity onPress={handleClearVrn}>
                  <Text style={styles.showAllText}>Show all vehicles</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {renderList()}
        </ScrollView>

        <DatePicker
          modal
          open={datePickerVisible}
          date={selectedDate ? new Date(selectedDate) : new Date()}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={() => setDatePickerVisible(false)}
          maximumDate={new Date()}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

/* ===================== Cards ===================== */

const AngleChips = ({ movableZ, movableX, fixedZ, fixedX, alertStyle, detailed }) => (
  <View style={styles.angleRow}>
    <View
      style={[
        styles.angleChip,
        detailed && styles.angleChipMovable,
        alertStyle && styles.angleChipAlert,
      ]}
    >
      <Text style={styles.angleChipText}>
        {detailed ? 'Movable sensor' : 'Movable'} Z{' '}
        <Text style={[styles.angleStrong, detailed && styles.valTimeMovable]}>
          {formatAngle(movableZ)}°
        </Text>
        {' · '}X{' '}
        <Text style={[styles.angleStrong, detailed && styles.valTimeMovable]}>
          {formatAngle(movableX)}°
        </Text>
      </Text>
    </View>
    <View
      style={[
        styles.angleChip,
        detailed && styles.angleChipFixed,
        alertStyle && styles.angleChipAlert,
      ]}
    >
      <Text style={styles.angleChipText}>
        {detailed ? 'Fixed sensor' : 'Fixed'} Z{' '}
        <Text style={[styles.angleStrong, detailed && styles.valTimeTrigger]}>
          {formatAngle(fixedZ)}°
        </Text>
        {fixedX != null ? (
          <>
            {' · '}X{' '}
            <Text style={[styles.angleStrong, detailed && styles.valTimeTrigger]}>
              {formatAngle(fixedX)}°
            </Text>
          </>
        ) : null}
      </Text>
    </View>
  </View>
);

/** TOP / BOTTOM tag on a section card, with the direction arrow */
const ZoneTag = ({ zone, active }) => {
  const isBottom = zone === 'bottom';
  const Arrow = isBottom ? ArrowDownToLine : ArrowUpFromLine;
  const color = active ? (isBottom ? '#7c3aed' : '#2563eb') : '#94a3b8';
  return (
    <View style={styles.zoneTagRow}>
      <Arrow size={10} color={color} />
      <Text style={[styles.zoneTagText, { color }]}>
        {isBottom ? 'BOTTOM' : 'TOP'}
      </Text>
    </View>
  );
};

const ZonePill = ({ zone }) => (
  <View
    style={[
      styles.zonePill,
      zone === 'bottom' ? styles.zonePillBottom : styles.zonePillTop,
    ]}
  >
    <Text
      style={[
        styles.zonePillText,
        zone === 'bottom' ? styles.zonePillTextBottom : styles.zonePillTextTop,
      ]}
    >
      {zone === 'bottom' ? 'BOTTOM' : 'TOP'}
    </Text>
  </View>
);

/** Open-since / duration / climate strip for bottom-sensor records */
const BottomOpenPanel = ({ alert }) => {
  const stillOpen = !alert.bottomClosedAt;
  return (
    <View
      style={[
        styles.bottomPanel,
        stillOpen ? styles.bottomPanelOpen : styles.bottomPanelClosed,
      ]}
    >
      <View style={styles.bottomPanelRow}>
        <Text
          style={[
            styles.bottomStateText,
            stillOpen ? styles.bottomStateOpen : styles.bottomStateClosed,
          ]}
        >
          {stillOpen ? 'STILL OPEN' : 'CLOSED'}
        </Text>
        {alert.bottomOpenSinceText ? (
          <Text style={styles.bottomMetaText}>
            since <Text style={styles.bottomMetaStrong}>{alert.bottomOpenSinceText}</Text>
          </Text>
        ) : null}
        <Text style={styles.bottomMetaText}>
          {stillOpen ? 'open for ' : 'was open '}
          <Text
            style={[
              styles.bottomMetaStrong,
              stillOpen && styles.bottomStateOpen,
            ]}
          >
            {formatDurationSeconds(alert.bottomOpenSeconds)}
          </Text>
        </Text>
        {alert.bottomClosedAtText ? (
          <Text style={styles.bottomMetaText}>
            closed <Text style={styles.bottomMetaStrong}>{alert.bottomClosedAtText}</Text>
          </Text>
        ) : null}
      </View>
      {alert.magnet ? (
        <View style={styles.bottomPanelRow}>
          {alert.magnet.temperature != null ? (
            <Text style={styles.bottomMetaText}>
              Temp <Text style={styles.bottomMetaStrong}>{alert.magnet.temperature}°C</Text>
            </Text>
          ) : null}
          {alert.magnet.humidity != null ? (
            <Text style={styles.bottomMetaText}>
              Humidity <Text style={styles.bottomMetaStrong}>{alert.magnet.humidity}%</Text>
            </Text>
          ) : null}
          {alert.magnet.status != null ? (
            <Text style={styles.bottomMetaText}>
              Sensor{' '}
              <Text
                style={[
                  styles.bottomMetaStrong,
                  stillOpen && styles.bottomStateOpen,
                ]}
              >
                {stillOpen ? 'Open' : 'Closed'}
              </Text>
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const OpenAlertCard = ({ alert, index, hideSpeed = false, onPress, onGoToMap }) => {
  const labelText = [alert.movableLabel, alert.fixedLabel]
    .filter(Boolean)
    .join(' / ');

  return (
    <TouchableOpacity
      style={styles.cardWrapper}
      onPress={() => onPress(alert)}
      activeOpacity={0.9}
    >
      <View style={[styles.card, styles.cardOpenBorder]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={styles.truckIconBox}>
              <Truck size={20} color="#fff" />
            </View>
            <View style={styles.cardHeaderInfo}>
              <View style={styles.cardHeaderTopRow}>
                {alert.vrn ? (
                  <View style={styles.vrnPill}>
                    <Truck size={11} color="#2563eb" />
                    <Text style={styles.vrnPillText}>{alert.vrn}</Text>
                  </View>
                ) : null}
                <Text style={styles.cardIndex}>#{index + 1}</Text>
              </View>
              {labelText ? (
                <Text style={styles.labelSubtitle}>{labelText}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.cardHeaderRight}>
            <View style={styles.openAlertPill}>
              <Text style={styles.openAlertPillText}>
                {alert.sensorZone === 'bottom'
                  ? 'Bottom Open Alert'
                  : 'Top Open Alert'}
              </Text>
            </View>
            <ZonePill zone={alert.sensorZone} />
            <View style={styles.timeBadge}>
              <Clock size={11} color="#64748b" />
              <Text style={styles.timeText}>{alert.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {alert.sensorZone === 'bottom' ? (
          <BottomOpenPanel alert={alert} />
        ) : null}

        <View style={styles.panelRow}>
          {!hideSpeed ? (
            <View style={styles.panel}>
              <View style={styles.panelHeader}>
                <Gauge size={14} color="#ea580c" />
                <Text style={styles.panelTitle}>Speed</Text>
              </View>
              <Text style={styles.panelValue}>
                {alert.speed != null ? `${alert.speed} km/h` : '—'}
              </Text>
            </View>
          ) : null}
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <MapPin size={14} color="#2563eb" />
              <Text style={styles.panelTitle}>Coordinates</Text>
            </View>
            <Text style={styles.panelValue} numberOfLines={1}>
              {alert.lat != null && alert.lng != null
                ? `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}`
                : '—'}
            </Text>
          </View>
        </View>

        <View style={styles.addressPanel}>
          <View style={styles.panelHeader}>
            <Navigation size={14} color="#2563eb" />
            <Text style={styles.panelTitle}>Location</Text>
          </View>
          <Text style={styles.addressText}>{alert.address}</Text>
        </View>

        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => onGoToMap(alert)}
          activeOpacity={0.85}
        >
          <MapPin color="#fff" size={16} />
          <Text style={styles.mapButtonText}>Go to Map</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const EventCard = ({ alert, index, onPress, eventMode = false, hideSpeed = false }) => (
  <TouchableOpacity
    style={styles.cardWrapper}
    onPress={() => onPress(alert)}
    activeOpacity={0.9}
  >
    <View style={[styles.card, styles.cardAlertBorder]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.truckIconBox, styles.iconAlert]}>
            <ShieldAlert size={20} color="#fff" />
          </View>
          <View style={styles.cardHeaderInfo}>
            <View style={styles.cardHeaderTopRow}>
              {alert.vrn ? (
                <View style={styles.vrnPill}>
                  <Text style={styles.vrnPillText}>{alert.vrn}</Text>
                </View>
              ) : null}
              <Text style={styles.cardIndex}>#{index + 1}</Text>
            </View>
            <View style={styles.cardHeaderTopRow}>
              <Text style={styles.labelSubtitle}>
                {alert.sensorZone === 'bottom' ? 'Bottom Event' : 'Top Event'}
              </Text>
              <ZonePill zone={alert.sensorZone} />
            </View>
          </View>
        </View>
        <View style={styles.timeBadge}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.timeText}>{alert.time}</Text>
        </View>
      </View>
      {alert.sensorZone === 'bottom' ? <BottomOpenPanel alert={alert} /> : null}
      {!eventMode && alert.message ? (
        <Text style={styles.messageText}>{alert.message}</Text>
      ) : null}
      {!eventMode && alert.sensorZone !== 'bottom' ? (
        <AngleChips
          movableZ={alert.amulZ}
          movableX={alert.amulX}
          fixedZ={alert.amulFixedZ}
          fixedX={alert.amulFixedX}
          alertStyle
        />
      ) : null}
      {eventMode ? (
        <View style={styles.eventMetaRow}>
          <View style={styles.eventMetaItem}>
            <MapPin size={12} color="#2563eb" />
            <Text style={styles.eventMetaText} numberOfLines={3}>
              {formatEventLocation(alert)}
            </Text>
          </View>
          <View style={styles.geofencePill}>
            <Text style={styles.geofencePillText}>
              Geofence: {alert.geofence === 'no' ? 'No' : 'Yes'}
            </Text>
          </View>
          {!hideSpeed && alert.speed != null ? (
            <View style={styles.speedPill}>
              <Gauge size={11} color="#ea580c" />
              <Text style={styles.speedPillText}>{alert.speed} km/h</Text>
            </View>
          ) : null}
        </View>
      ) : alert.address ? (
        <Text style={styles.metaLine}>{alert.address}</Text>
      ) : null}
    </View>
  </TouchableOpacity>
);

const PacketCard = ({ packet, index }) => (
  <View style={styles.cardWrapper}>
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.truckIconBox, styles.iconPacket]}>
            <Radio size={18} color="#fff" />
          </View>
          <View style={styles.cardHeaderInfo}>
            <View style={styles.cardHeaderTopRow}>
              {packet.vrn ? (
                <View style={styles.vrnPill}>
                  <Text style={styles.vrnPillText}>{packet.vrn}</Text>
                </View>
              ) : null}
              {packet.deviceRole ? (
                <View style={styles.rolePill}>
                  <Text style={styles.rolePillText}>{packet.deviceRole}</Text>
                </View>
              ) : null}
              <Text style={styles.cardIndex}>#{index + 1}</Text>
            </View>
            {packet.deviceName ? (
              <Text style={styles.labelSubtitle}>{packet.deviceName}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.timeBadge}>
          <Clock size={11} color="#64748b" />
          <Text style={styles.timeText}>{packet.time}</Text>
        </View>
      </View>
      <View style={styles.angleRow}>
        <View style={styles.angleChip}>
          <Text style={styles.angleChipText}>
            Z <Text style={styles.angleStrong}>{formatAngle(packet.angleZ)}</Text>
            {' · '}X{' '}
            <Text style={styles.angleStrong}>{formatAngle(packet.angleX)}</Text>
            {' · '}Y{' '}
            <Text style={styles.angleStrong}>{formatAngle(packet.angleY)}</Text>
          </Text>
        </View>
        {packet.battery != null ? (
          <View style={styles.angleChip}>
            <Text style={styles.angleChipText}>
              Battery{' '}
              <Text style={styles.angleStrong}>{packet.battery}%</Text>
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  </View>
);

const LogSectionTitle = ({ title }) => (
  <Text style={styles.logSectionTitle}>{title}</Text>
);

const LogField = ({ label, value, valueStyle }) =>
  value ? (
    <Text style={styles.logFieldLine}>
      <Text style={styles.logFieldLabel}>{label}: </Text>
      <Text style={[styles.logFieldValue, valueStyle]}>{value}</Text>
    </Text>
  ) : null;

const ComparisonCard = ({ log, index }) => {
  const geofenceStyle =
    String(log.geofence || '').toLowerCase() === 'yes'
      ? styles.valGeofenceYes
      : String(log.geofence || '').toLowerCase() === 'no'
        ? styles.valGeofenceNo
        : null;

  return (
    <View style={styles.cardWrapper}>
      <View
        style={[styles.card, log.isAlert ? styles.cardAlertBorder : null]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View
              style={[
                styles.truckIconBox,
                log.isAlert ? styles.iconAlert : styles.iconCompare,
              ]}
            >
              <GitCompare size={18} color="#fff" />
            </View>
            <View style={styles.cardHeaderInfo}>
              <View style={styles.cardHeaderTopRow}>
                {log.vrn ? (
                  <View style={styles.vrnPill}>
                    <Text style={styles.vrnPillText}>{log.vrn}</Text>
                  </View>
                ) : null}
                <View
                  style={[
                    styles.resultPill,
                    log.isAlert ? styles.resultPillAlert : styles.resultPillOk,
                  ]}
                >
                  <Text
                    style={[
                      styles.resultPillText,
                      log.isAlert && styles.resultPillTextAlert,
                    ]}
                    numberOfLines={2}
                  >
                    {log.isAlert ? 'Open Alert Triggered' : log.result}
                  </Text>
                </View>
                <Text style={styles.cardIndex}>#{index + 1}</Text>
              </View>
            </View>
          </View>
          <View style={styles.timeBadge}>
            <Clock size={11} color="#64748b" />
            <Text style={styles.timeLabel}>Event time</Text>
            <Text style={[styles.timeText, styles.valTimeEvent]}>{log.time}</Text>
          </View>
        </View>

        <View style={styles.logSectionBox}>
          <LogSectionTitle title="TIMING" />
          <LogField
            label="Movable sensor packet"
            value={formatTimeWithSeconds(log.movableTime)}
            valueStyle={styles.valTimeMovable}
          />
          <LogField
            label="Fixed sensor packet"
            value={formatTimeWithSeconds(log.fixedTime)}
            valueStyle={styles.valTimeFixed}
          />
          <LogField
            label="Angle trigger time"
            value={formatTimeWithSeconds(log.angleTriggerTime)}
            valueStyle={styles.valTimeTrigger}
          />
          <LogField
            label="Amul GPS time"
            value={formatTimeWithSeconds(log.gpsTimestamp)}
            valueStyle={styles.valTimeGps}
          />
          <LogField
            label="Amul raw timestamp"
            value={log.gpsTimestampRaw}
            valueStyle={styles.valRaw}
          />
        </View>

        <View style={styles.logSectionBox}>
          <LogSectionTitle title="LOCATION & GPS" />
          <LogField
            label="Vehicle speed"
            value={log.gpsSpeed != null ? String(log.gpsSpeed) : null}
            valueStyle={styles.valSpeed}
          />
          <LogField
            label="Geofence status"
            value={log.geofence != null ? String(log.geofence) : null}
            valueStyle={geofenceStyle}
          />
          <LogField label="GPS source" value={log.gpsSource} valueStyle={styles.valSource} />
          {log.gpsLat != null && log.gpsLong != null ? (
            <LogField
              label="GPS coordinates"
              value={`${Number(log.gpsLat).toFixed(5)}, ${Number(log.gpsLong).toFixed(5)}`}
              valueStyle={styles.valCoords}
            />
          ) : null}
          {log.gpsAddress ? (
            <LogField
              label="GPS address"
              value={log.gpsAddress}
              valueStyle={styles.valAddress}
            />
          ) : null}
        </View>

        <View style={styles.logSectionBox}>
          <LogSectionTitle title="SENSOR ANGLES" />
          <AngleChips
            movableZ={log.amulZ}
            movableX={log.amulX}
            fixedZ={log.fixedZ}
            fixedX={log.fixedX}
            alertStyle={log.isAlert}
            detailed
          />
        </View>

        {log.message ? (
          <Text style={styles.metaLine} numberOfLines={2}>
            <Text style={styles.logFieldLabel}>Summary: </Text>
            <Text style={log.isAlert ? styles.valAlert : styles.valSummary}>
              {log.message}
            </Text>
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  zoneTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginBottom: 1,
  },
  zoneTagText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  zonePill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
  },
  zonePillTop: {
    backgroundColor: '#e0f2fe',
    borderColor: '#bae6fd',
  },
  zonePillBottom: {
    backgroundColor: '#ede9fe',
    borderColor: '#ddd6fe',
  },
  zonePillText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  zonePillTextTop: {
    color: '#0369a1',
  },
  zonePillTextBottom: {
    color: '#6d28d9',
  },
  bottomPanel: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  bottomPanelOpen: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  bottomPanelClosed: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  bottomPanelRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    columnGap: 12,
    rowGap: 4,
  },
  bottomStateText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  bottomStateOpen: {
    color: '#dc2626',
  },
  bottomStateClosed: {
    color: '#16a34a',
  },
  bottomMetaText: {
    fontSize: 12,
    color: '#64748b',
  },
  bottomMetaStrong: {
    color: '#0f172a',
    fontWeight: '700',
  },
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  scrollContent: { padding: 16, paddingBottom: 24 },
  header: {
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    position: 'relative',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  logo: { width: 64, height: 64 },
  companyText: { fontSize: 11, color: '#64748b' },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
    color: '#0f172a',
  },
  versionText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  socketBadge: {
    position: 'absolute',
    right: 16,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  connected: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  disconnected: { backgroundColor: '#fef2f2', borderColor: '#fecaca' },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },
  socketText: { fontWeight: '600', fontSize: 11, color: '#334155' },
  dateSection: {
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  refreshChip: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  refreshChipText: {
    color: '#2563eb',
    fontWeight: '600',
    fontSize: 12,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignSelf: 'flex-start',
  },
  dateText: { fontWeight: '600', color: '#2563eb', fontSize: 13 },
  statsRow: { gap: 10, marginBottom: 12, paddingRight: 8 },
  statCard: {
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statCardActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  statCardActiveBottom: {
    borderColor: '#c4b5fd',
    backgroundColor: '#f5f3ff',
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIconMuted: { backgroundColor: '#f1f5f9' },
  statIconActive: { backgroundColor: '#dbeafe' },
  statIconActiveBottom: { backgroundColor: '#ede9fe' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  statLabelActive: { color: '#2563eb' },
  statLabelActiveBottom: { color: '#7c3aed' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  statusCountRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  statusCountChip: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  statusCountChipNormal: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statusCountChipFaulty: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusCountChipActive: {
    borderWidth: 2,
  },
  statusCountText: { fontSize: 11, fontWeight: '700' },
  statusCountTextNormal: { color: '#16a34a' },
  statusCountTextFaulty: { color: '#dc2626' },
  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  clearButton: { padding: 4 },
  searchButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  searchButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  appliedVrnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  vrnChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  vrnChipText: { fontSize: 13, fontWeight: '600', color: '#2563eb' },
  showAllText: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  sectionHint: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 10,
    lineHeight: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 24,
    fontSize: 14,
  },
  cardWrapper: { marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardOpenBorder: { borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  cardAlertBorder: { borderLeftWidth: 3, borderLeftColor: '#ef4444' },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  truckIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconAlert: { backgroundColor: '#dc2626' },
  iconPacket: { backgroundColor: '#0d9488' },
  iconCompare: { backgroundColor: '#64748b' },
  cardHeaderInfo: { flex: 1, gap: 3 },
  cardHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  vrnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  vrnPillText: { fontSize: 13, fontWeight: '700', color: '#2563eb' },
  rolePill: {
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0f766e',
    textTransform: 'uppercase',
  },
  cardIndex: { fontSize: 12, color: '#94a3b8', fontWeight: '500' },
  labelSubtitle: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  compareTimes: { gap: 2, marginBottom: 6 },
  compareTimeLine: { fontSize: 11, color: '#64748b' },
  logSectionBox: {
    marginTop: 8,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  logSectionTitle: {
    fontSize: 9,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  logFieldLine: { fontSize: 11, lineHeight: 17, marginBottom: 2 },
  logFieldLabel: { color: '#64748b', fontWeight: '500' },
  logFieldValue: { fontWeight: '800' },
  valTimeEvent: { color: '#1d4ed8' },
  valTimeMovable: { color: '#0369a1' },
  valTimeFixed: { color: '#4338ca' },
  valTimeTrigger: { color: '#6d28d9' },
  valTimeGps: { color: '#0e7490' },
  valRaw: { color: '#334155' },
  valSpeed: { color: '#b45309' },
  valGeofenceYes: { color: '#15803d' },
  valGeofenceNo: { color: '#dc2626' },
  valSource: { color: '#334155' },
  valCoords: { color: '#0f172a' },
  valAddress: { color: '#1e293b' },
  valAlert: { color: '#dc2626', fontWeight: '700' },
  valSummary: { color: '#334155', fontWeight: '600' },
  timeLabel: { fontSize: 9, color: '#94a3b8', marginTop: 2 },
  cardHeaderRight: { alignItems: 'flex-end', gap: 6 },
  openAlertPill: {
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  openAlertPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#ea580c',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  resultPill: {
    maxWidth: 140,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
  },
  resultPillOk: {
    backgroundColor: '#f8fafc',
    borderColor: '#e2e8f0',
  },
  resultPillAlert: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  resultPillText: { fontSize: 10, fontWeight: '700', color: '#475569' },
  resultPillTextAlert: { color: '#dc2626' },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },
  panelRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  panel: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 6,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  panelTitle: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  panelValue: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
  addressPanel: {
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  addressText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
    lineHeight: 18,
  },
  mapButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  mapButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  messageText: {
    marginTop: 10,
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  metaLine: {
    marginTop: 8,
    fontSize: 12,
    color: '#64748b',
    lineHeight: 16,
  },
  angleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  angleChip: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  angleChipAlert: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  angleChipMovable: {
    backgroundColor: '#f0f9ff',
    borderColor: '#bae6fd',
  },
  angleChipFixed: {
    backgroundColor: '#f5f3ff',
    borderColor: '#ddd6fe',
  },
  angleChipText: { fontSize: 11, color: '#64748b' },
  angleStrong: { color: '#0f172a', fontWeight: '700' },
  eventMetaRow: { marginTop: 10, gap: 8 },
  eventMetaItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
  },
  eventMetaText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 16 },
  geofencePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  speedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff7ed',
    borderWidth: 1,
    borderColor: '#fed7aa',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  speedPillText: { fontSize: 11, fontWeight: '700', color: '#b45309' },
  geofencePillText: { fontSize: 11, fontWeight: '700', color: '#16a34a' },
});

export default Homepage;

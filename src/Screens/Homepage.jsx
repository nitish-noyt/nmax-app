import React, { useState, useEffect, useCallback } from 'react';
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
import { Calendar, MapPin, Gauge, Navigation, Search, X, Truck, Clock, AlertTriangle } from 'lucide-react-native';

import logo from '../assets/images/nmax-logo.png';
import { getDefaultOpenAlert, getSelectedOpenAlert } from '../api/APIFunction';

import {
  connectSocket,
  isSocketConnected,
  setupSocketListeners,
  cleanupSocketListeners,
  reconnectSocket,
} from '../utils/socketConnection';

const Homepage = () => {
  const [selectedDate, setSelectedDate] = useState('');
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [openAlerts, setOpenAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [socketStatus, setSocketStatus] = useState('disconnected');
  const [vrnSearch, setVrnSearch] = useState('');
  const [appliedVrn, setAppliedVrn] = useState('');

  /* ---------------- Date Helpers ---------------- */

  console.log("openAlerts",openAlerts)
  const formatDateToAPI = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  /* ---------------- API ---------------- */

  const transformOpenAlertData = alertData => {
    return alertData.map(alert => ({
      id: alert._id,
      message: alert.message,
      vrn: alert.vrn,
      movableLabel: alert.movableLabel,
      fixedLabel: alert.fixedLabel,
      time: formatTime(alert.timestamp),
      speed: alert?.gps?.speed ?? 0,
      lat: alert?.gps?.lat,
      lng: alert?.gps?.long,
      address: alert?.address || 'HX2C+9VH Anand, Gujarat, India',
      rawData: alert,
    }));
  };

  const fetchOpenAlerts = async (dateString = null, vrn = null) => {
    try {
      setLoading(true);
      let response;

      if (dateString) {
        response = await getSelectedOpenAlert(dateString, vrn);
      } else {
        response = await getDefaultOpenAlert(vrn);
      }

      if (response?.success && Array.isArray(response.data)) {
        setOpenAlerts(transformOpenAlertData(response.data));
      } else {
        setOpenAlerts([]);
      }
    } catch (error) {
      console.log('Error fetching alerts:', error);
      setOpenAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- Socket ---------------- */

  const handleNewAlert = useCallback(() => {
    fetchOpenAlerts(selectedDate || null, appliedVrn || null);
  }, [selectedDate, appliedVrn]);

  useEffect(() => {
    const callbacks = {
      onConnect: () => setSocketStatus('connected'),
      onDisconnect: () => setSocketStatus('disconnected'),
      onConnectError: () => setSocketStatus('disconnected'),
      onAlert: handleNewAlert,
    };

    setupSocketListeners(callbacks);

    if (!isSocketConnected()) {
      connectSocket();
    }

    return () => cleanupSocketListeners();
  }, [handleNewAlert]);

  /* ---------------- Initial Load ---------------- */

  useEffect(() => {
    const today = formatDateToAPI(new Date());
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      fetchOpenAlerts(selectedDate, appliedVrn || null);
    }
  }, [selectedDate, appliedVrn]);

  /* ---------------- Handlers ---------------- */

  const handleDateConfirm = date => {
    const dateString = formatDateToAPI(date);
    setSelectedDate(dateString);
    setDatePickerVisible(false);
  };

  const handleVrnSearch = () => {
    setAppliedVrn(vrnSearch.trim());
  };

  const handleClearVrn = () => {
    setVrnSearch('');
    setAppliedVrn('');
  };

  const handleDetailsPress = alert => {
    Alert.alert(
      'Alert Details',
      `Message: ${alert.message}
Speed: ${alert.speed} km/h
Location: ${alert.rawData.gps.lat}, ${alert.rawData.gps.long}
Address: ${alert.address}`,
    );
  };

  // Google Maps redirection function
  const openInGoogleMaps = (lat, lng, label = 'Location') => {
    if (!lat || !lng) {
      Alert.alert('Error', 'Location coordinates not available');
      return;
    }

    const scheme = Platform.select({
      ios: 'maps://0,0?q=',
      android: 'geo:0,0?q='
    });
    
    const latLng = `${lat},${lng}`;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });

    Linking.openURL(url).catch(() => {
      // Fallback to Google Maps web URL
      const webUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
      Linking.openURL(webUrl);
    });
  };

  const handleGoToMap = alert => {
    if (alert.lat && alert.lng) {
      openInGoogleMaps(alert.lat, alert.lng, 'Alert Location');
    } else {
      Alert.alert('Error', 'Location coordinates not available for this alert');
    }
  };

  /* ========================================================= */

  const renderOpenAlerts = () => (
    <>
      {/* DATE */}
      <View style={styles.dateSection}>
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => setDatePickerVisible(true)}
        >
          <Calendar size={16} color="#2563eb" />
          <Text style={styles.dateText}>
            {selectedDate ? formatDateForDisplay(selectedDate) : 'Select Date'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* STATS */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIconBox, styles.statIconOrange]}>
            <AlertTriangle size={16} color="#ea580c" />
          </View>
          <View>
            <Text style={styles.statLabel}>Open Alerts</Text>
            <Text style={styles.statValue}>{openAlerts.length}</Text>
          </View>
        </View>
      </View>

      {/* VRN SEARCH */}
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
            <TouchableOpacity onPress={handleClearVrn} style={styles.clearButton}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.searchButton} onPress={handleVrnSearch}>
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

      {/* ALERT LIST */}
      {loading ? (
        <Text style={styles.emptyText}>Loading alerts...</Text>
      ) : openAlerts.length > 0 ? (
        openAlerts.map((alert, index) => (
          <AlertCard
            key={alert.id}
            alert={alert}
            index={index}
            onPress={handleDetailsPress}
            onGoToMap={handleGoToMap}
          />
        ))
      ) : (
        <Text style={styles.emptyText}>
          No open alerts found{appliedVrn ? ` for VRN ${appliedVrn}` : ''}
        </Text>
      )}
    </>
  );

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ alignItems: 'center' }}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.companyText}>
              nmax Digital Business Transformation
            </Text>
            <Text style={styles.title}>ATCS</Text>
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
              {socketStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {renderOpenAlerts()}
        </ScrollView>

        {/* DATE PICKER */}
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

/* ========================================================= */
/* ================= ALERT CARD COMPONENT ================== */
/* ========================================================= */

const AlertCard = ({ alert, index, onPress, onGoToMap }) => {
  const labelText = [alert.movableLabel, alert.fixedLabel]
    .filter(Boolean)
    .join(' / ');

  return (
    <View style={styles.cardWrapper}>
      <View style={styles.card}>
        {/* Header — matches web fleet card */}
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
              <Text style={styles.openAlertPillText}>Open Alert</Text>
            </View>
            <View style={styles.timeBadge}>
              <Clock size={11} color="#64748b" />
              <Text style={styles.timeText}>{alert.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardDivider} />

        {/* Speed & Coordinates — web-style split panels */}
        <View style={styles.panelRow}>
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Gauge size={14} color="#ea580c" />
              <Text style={styles.panelTitle}>Speed</Text>
            </View>
            <Text style={styles.panelValue}>{alert.speed} km/h</Text>
          </View>

          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <MapPin size={14} color="#2563eb" />
              <Text style={styles.panelTitle}>Coordinates</Text>
            </View>
            <Text style={styles.panelValue} numberOfLines={1}>
              {alert.lat?.toFixed(4) || '22.5529'}, {alert.lng?.toFixed(4) || '72.9729'}
            </Text>
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressPanel}>
          <View style={styles.panelHeader}>
            <Navigation size={14} color="#2563eb" />
            <Text style={styles.panelTitle}>Location</Text>
          </View>
          <Text style={styles.addressText}>{alert.address}</Text>
        </View>

        {/* Map Button */}
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => onGoToMap(alert)}
          activeOpacity={0.85}
        >
          <MapPin color="#fff" size={16} />
          <Text style={styles.mapButtonText}>Go to Map</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },

  scrollContent: {
    padding: 16,
    paddingBottom: 24,
  },

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

  companyText: {
    fontSize: 11,
    color: '#64748b',
  },

  title: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    color: '#0f172a',
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

  connected: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },

  disconnected: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },

  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22c55e',
  },

  socketText: {
    fontWeight: '600',
    fontSize: 11,
    color: '#334155',
  },

  dateSection: {
    marginBottom: 12,
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

  dateText: {
    fontWeight: '600',
    color: '#2563eb',
    fontSize: 13,
  },

  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },

  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statIconOrange: {
    backgroundColor: '#fff7ed',
  },

  statLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },

  searchCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    marginBottom: 16,
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

  clearButton: {
    padding: 4,
  },

  searchButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },

  searchButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },

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

  vrnChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563eb',
  },

  showAllText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },

  emptyText: {
    textAlign: 'center',
    color: '#94a3b8',
    marginTop: 24,
    fontSize: 14,
  },

  cardWrapper: {
    marginBottom: 12,
  },

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

  cardHeaderInfo: {
    flex: 1,
    gap: 3,
  },

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

  vrnPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2563eb',
  },

  cardIndex: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '500',
  },

  labelSubtitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },

  cardHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
  },

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

  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  timeText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },

  cardDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginVertical: 12,
  },

  panelRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },

  panel: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    gap: 6,
  },

  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  panelTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },

  panelValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },

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

  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Homepage;
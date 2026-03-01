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
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
import { Calendar, MapPin, Gauge, Navigation } from 'lucide-react-native';

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
  const [activeTab, setActiveTab] = useState('openAlerts'); // 'openAlerts' or 'location'

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
      time: formatTime(alert.timestamp),
      speed: alert?.gps?.speed ?? 0,
      lat: alert?.gps?.lat,
      lng: alert?.gps?.long,
      address: alert?.address || 'HX2C+9VH Anand, Gujarat, India',
      rawData: alert,
    }));
  };

  const fetchOpenAlerts = async (dateString = null) => {
    try {
      setLoading(true);
      let response;

      if (dateString) {
        response = await getSelectedOpenAlert(dateString);
      } else {
        response = await getDefaultOpenAlert();
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
    if (activeTab === 'openAlerts') {
      fetchOpenAlerts(selectedDate || null);
    }
  }, [selectedDate, activeTab]);

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
    if (selectedDate && activeTab === 'openAlerts') {
      fetchOpenAlerts(selectedDate);
    }
  }, [selectedDate, activeTab]);

  /* ---------------- Handlers ---------------- */

  const handleDateConfirm = date => {
    const dateString = formatDateToAPI(date);
    setSelectedDate(dateString);
    setDatePickerVisible(false);
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
          <Text style={styles.dateText}>
            {selectedDate ? formatDateForDisplay(selectedDate) : 'Select Date'}
          </Text>
          <Calendar size={18} color="#2563eb" />
        </TouchableOpacity>

        <Text style={styles.alertCount}>
          {openAlerts.length} open alert{openAlerts.length !== 1 ? 's' : ''}{' '}
          found
        </Text>
      </View>

      {/* ALERT LIST */}
      {loading ? (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          Loading alerts...
        </Text>
      ) : openAlerts.length > 0 ? (
        openAlerts.map(alert => (
          <AlertCard
            key={alert.id}
            alert={alert}
            onPress={handleDetailsPress}
            onGoToMap={handleGoToMap}
          />
        ))
      ) : (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
          No open alerts found
        </Text>
      )}
    </>
  );

  /* ========================================================= */
  /* ================= LOCATION CARD COMPONENT =============== */
  /* ========================================================= */

  const LocationCard = ({ location, onOpenMap , data }) => {
    return (
      <View style={styles.cardWrapper}>
        <View style={styles.locationLeftBorder} />

        <View style={styles.card}>
          {/* TIME */}
          <View style={styles.locationHeader}>
            <Navigation size={16} color="#2563eb" />
            <Text style={styles.locationTime}>{location.time}</Text>
          </View>

          {/* LAT / LNG */}
          <View style={styles.latLngRow}>
            <View style={styles.latLngItem}>
              <Text style={styles.latLngLabel}>LATITUDE</Text>
              <Text style={styles.latLngValue}>{data.rawData.gps.lat}</Text>
            </View>

            <View style={styles.latLngItem}>
              <Text style={styles.latLngLabel}>LONGITUDE</Text>
              <Text style={styles.latLngValue}>{data.rawData.gps.long}</Text>
            </View>
          </View>

          {/* SPEED */}
          <View style={styles.speedRow}>
            <Text style={styles.latLngLabel}>SPEED</Text>
            <Text style={styles.speedValue}>{location.speed} km/h</Text>
          </View>

          {/* ADDRESS */}
          <View style={styles.addressRow}>
            <MapPin size={16} color="#2563eb" />
            <Text style={styles.addressText}>{location.address}</Text>
          </View>

          {/* BUTTON */}
          <TouchableOpacity
            style={styles.openMapButton}
            onPress={() => onOpenMap(location)}
          >
            <Navigation size={16} color="#fff" />
            <Text style={styles.openMapText}>Open in Maps</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderLocation = () => {
    if (loading) {
      return (
        <Text style={{ textAlign: 'center', marginTop: 20 }}>
          Loading location...
        </Text>
      );
    }

    if (openAlerts.length === 0) {
      return (
        <Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>
          No location data found
        </Text>
      );
    }

    return (
      <>
        {/* DATE SAME AS SCREENSHOT */}
        <View style={styles.dateSection}>
          <Text style={styles.dateText}>
            {selectedDate ? formatDateForDisplay(selectedDate) : 'Select Date'}
          </Text>
        </View>

        {openAlerts.map(location => (
          <LocationCard
            key={location.id}
            location={location}
            onOpenMap={handleGoToMap}
            data={location}
          />
        ))}
      </>
    );
  };

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
            <Text style={styles.socketText}>
              {socketStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* TABS - Only Open Alerts and Location */}
        <View style={styles.tabs}>
          <TouchableOpacity onPress={() => setActiveTab('openAlerts')}>
            <Text
              style={
                activeTab === 'openAlerts'
                  ? styles.activeTab
                  : styles.inactiveTab
              }
            >
              Open Alerts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setActiveTab('location')}>
            <Text
              style={
                activeTab === 'location' ? styles.activeTab : styles.inactiveTab
              }
            >
              Location
            </Text>
          </TouchableOpacity>
        </View>

        {/* CONTENT */}
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {activeTab === 'openAlerts' ? renderOpenAlerts() : renderLocation()}
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

const AlertCard = ({ alert, onPress, onGoToMap }) => {
  return (
    <View style={styles.cardWrapper}>
      <View style={styles.leftBorder} />

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.alertRow}>
            <View style={styles.orangeDot} />
            <Text style={styles.alertTitle}>Alert:</Text>
          </View>
          <Text style={styles.timeText}>{alert.time}</Text>
        </View>

        <Text style={styles.message}>OpenAlert</Text>

        <View style={styles.infoRow}>
          <View style={[styles.infoItem, styles.speedItem]}>
            <View style={styles.iconLabelContainer}>
              <View style={styles.iconBackground}>
                <Gauge size={14} color="#2563eb" />
              </View>
              <Text style={styles.infoLabel}>Speed</Text>
            </View>
            <Text style={styles.infoValue}>{alert.speed} km/h</Text>
          </View>

          <View style={[styles.infoItem, styles.locationItem]}>
            <View style={styles.iconLabelContainer}>
              <View style={styles.iconBackground}>
                <MapPin size={14} color="#2563eb" />
              </View>
              <Text style={styles.infoLabel}>Location</Text>
            </View>
            <Text style={styles.infoValue}>
              {alert.lat?.toFixed(4) || '22.5529'},{' '}
              {alert.lng?.toFixed(4) || '72.9729'}
            </Text>
          </View>
        </View>

        <View style={styles.addressContainer}>
          <Navigation size={16} color="#2563eb" style={styles.addressIcon} />
          <Text style={styles.addressText}>{alert.address}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.mapButton}
            onPress={() => onGoToMap(alert)}
          >
            <MapPin color={'white'} size={18} />
            <Text style={styles.mapButtonText}>Go to Map</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },

  header: {
    alignItems: 'center',
    paddingVertical: 20,
    position: 'relative',
  },

  logo: { width: 80, height: 80 },

  companyText: {
    fontSize: 12,
    color: '#555',
  },

  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 4,
  },

  socketBadge: {
    position: 'absolute',
    right: 20,
    top: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  connected: { backgroundColor: '#16a34a' },
  disconnected: { backgroundColor: '#ef4444' },

  socketText: { color: '#fff', fontWeight: '600', fontSize: 12 },

  tabs: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 8,
    paddingHorizontal: 20,
  },

  activeTab: {
    fontWeight: '700',
    color: '#2563eb',
    borderBottomWidth: 2,
    borderColor: '#2563eb',
    paddingBottom: 4,
    fontSize: 16,
  },

  inactiveTab: {
    color: '#888',
    fontSize: 16,
  },

  dateSection: {
    alignItems: 'center',
    paddingVertical: 16,
    // backgroundColor:"red"
  },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  dateText: {
    fontWeight: '600',
    color: '#2563eb',
  },

  alertCount: {
    marginTop: 4,
    color: '#666',
  },

  cardWrapper: {
    flexDirection: 'row',
    marginBottom: 16,
  },

  leftBorder: {
    width: 4,
    backgroundColor: '#f97316',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },

  card: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  orangeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f97316',
    marginRight: 6,
  },

  alertTitle: {
    fontWeight: '600',
    color: '#f97316',
  },

  timeText: { fontSize: 12, color: '#666' },

  message: { marginVertical: 10, color: '#333' },

  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },

  infoItem: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },

  speedItem: {
    backgroundColor: '#3d3f4b0e',
  },

  locationItem: {
    backgroundColor: '#3d3f4b0e',
  },

  iconLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },

  iconBackground: {
    backgroundColor: '#bae7ff27',
    padding: 4,
    borderRadius: 6,
  },

  infoLabel: {
    fontSize: 12,
    color: '#444',
    fontWeight: '500',
  },

  infoValue: {
    fontWeight: '600',
    fontSize: 14,
    color: '#333',
    marginLeft: 28,
  },

  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#adbfe83f',
    borderLeftWidth: 3,
    borderRadius: 10,
    borderColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginBottom: 12,
    gap: 8,
  },

  addressIcon: {
    marginTop: 2,
  },

  addressText: {
    fontSize: 12,
    color: '#444',
    flex: 1,
    fontWeight: '500',
  },

  buttonContainer: {
    alignItems: 'flex-end',
  },

  mapButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    width: 120,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },

  mapButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  /* LOCATION CARD STYLES */

  locationLeftBorder: {
    width: 4,
    backgroundColor: '#2563eb',
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
  },

  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },

  locationTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

  latLngRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },

  latLngItem: {
    flex: 1,
  },

  latLngLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
    fontWeight: '500',
  },

  latLngValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
  },

  speedRow: {
    marginBottom: 12,
  },

  speedValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginTop: 4,
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 16,
  },

  openMapButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },

  openMapText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default Homepage;
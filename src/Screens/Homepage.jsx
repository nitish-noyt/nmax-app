import {
  Image,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import DatePicker from 'react-native-date-picker';
import logo from '../assets/images/nmax-logo.png';
import textLogo from '../assets/images/nmax-text-logo.png';
import { Calendar, Wifi, WifiOff } from 'lucide-react-native';
import {
  getAllAlerts,
  getDefaultOpenAlert,
  getSelectedOpenAlert,
} from '../api/APIFunction';
import AlertCard from '../Component/AlertCard';
import {
  connectSocket,
  disconnectSocket,
  isSocketConnected,
  getSocket,
  setupSocketListeners,
  cleanupSocketListeners,
  reconnectSocket,
} from '../utils/socketConnection';

const Homepage = () => {
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [todayAlerts, setTodayAlerts] = useState([]);
  const [openAlerts, setOpenAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts'); // 'alerts' or 'openAlerts'
  const [socketStatus, setSocketStatus] = useState('disconnected'); // 'connected' or 'disconnected'

  // Format date to YYYY-MM-DD
  const formatDateToAPI = date => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Convert string date back to Date object
  const stringToDate = dateString => {
    if (!dateString) return new Date();
    return new Date(dateString);
  };

  // Format date for display
  const formatDateForDisplay = dateString => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format timestamp to readable time
  const formatTime = timestamp => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Extract title from message
  const getAlertTitle = message => {
    const match = message.match(/Alert: (.*?)</);
    return match ? match[1].trim() : 'Alert';
  };

  // Extract only "ALERT TRIGGERED" from the message
  const extractAlertStatus = (message) => {
    if (message.includes('—')) {
      return message.split('—')[1].trim(); // Returns "ALERT TRIGGERED"
    }
    return message.includes('ALERT TRIGGERED') ? 'ALERT TRIGGERED' : message;
  };

  // Transform API data to alert format for Alerts tab (orange)
  const transformTodayAlertData = alertData => {
    return alertData.map(alert => ({
      id: alert._id,
      title: getAlertTitle(alert.message),
      message: extractAlertStatus(alert.message), // Only show "ALERT TRIGGERED"
      time: formatTime(alert.timestamp),
      acknowledged: false,
      rawData: alert,
      status: 'alert', 
    }));
  };

  // Transform API data to alert format for Open Alerts tab (red)
  const transformOpenAlertData = alertData => {
    return alertData.map(alert => ({
      id: alert._id,
      title: getAlertTitle(alert.message),
      message: extractAlertStatus(alert.message), // Only show "ALERT TRIGGERED"
      time: formatTime(alert.timestamp),
      acknowledged: false,
      rawData: alert,
      status: 'open', // Red color for open alerts
    }));
  };

  // ✅ Fetch alerts for Alerts tab (today's alerts) using getAllAlerts
  const fetchTodaysAlerts = async () => {
    try {
      setLoading(true);
      const todayString = formatDateToAPI(new Date());
      console.log("Fetching today's alerts for date:", todayString);

      const response = await getAllAlerts(todayString);
      console.log("Today's Alerts API Response:", response);

      if (response && response.success && Array.isArray(response.data)) {
        const transformedAlerts = transformTodayAlertData(response.data);
        setTodayAlerts(transformedAlerts);
      } else {
        setTodayAlerts([]);
      }
    } catch (error) {
      console.log("Error fetching today's alerts:", error);
      setTodayAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch open alerts - use getDefaultOpenAlert for first time, getSelectedOpenAlert for date changes
  const fetchOpenAlerts = async (dateString = null) => {
    try {
      setLoading(true);
      let response;

      if (dateString) {
        // ✅ Use getSelectedOpenAlert when user selects a date
        console.log('Fetching selected open alerts for date:', dateString);
        response = await getSelectedOpenAlert(dateString);
      } else {
        // ✅ Use getDefaultOpenAlert when user first opens the app
        console.log('Fetching default open alerts');
        response = await getDefaultOpenAlert();
      }

      console.log('Open Alerts API Response:', response);

      if (response && response.success && Array.isArray(response.data)) {
        const transformedAlerts = transformOpenAlertData(response.data);
        setOpenAlerts(transformedAlerts);
      } else {
        setOpenAlerts([]);
      }
    } catch (error) {
      console.log('Error fetching open alerts:', error);
      setOpenAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle new alert from socket
  const handleNewAlert = useCallback((alertData) => {
    console.log('📢 New alert received via socket:', alertData);
    // Refresh alerts based on current tab
    if (activeTab === 'alerts') {
      fetchTodaysAlerts();
    } else {
      fetchOpenAlerts(selectedDate || null);
    }
  }, [activeTab, selectedDate]);

  // Handle socket connection events
  const handleSocketConnect = useCallback(() => {
    console.log('✅ Socket connected in component');
    setSocketStatus('connected');
  }, []);

  const handleSocketDisconnect = useCallback((reason) => {
    console.log('❌ Socket disconnected in component:', reason);
    setSocketStatus('disconnected');
  }, []);

  const handleSocketError = useCallback((error) => {
    console.log('❌ Socket error in component:', error);
    setSocketStatus('disconnected');
  }, []);

  // Socket connection management
  useEffect(() => {
    console.log('🔄 Setting up socket connection...');
    
    const callbacks = {
      onConnect: handleSocketConnect,
      onDisconnect: handleSocketDisconnect,
      onConnectError: handleSocketError,
      onAlert: handleNewAlert,
      onReconnectAttempt: (attempt) => {
        console.log(`🔄 Reconnection attempt ${attempt}`);
      }
    };

    // Setup socket listeners
    setupSocketListeners(callbacks);
    
    // Connect socket if not connected
    if (!isSocketConnected()) {
      connectSocket();
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up socket listeners');
      cleanupSocketListeners();
      // Note: We don't disconnect the socket to maintain connection across components
    };
  }, [handleSocketConnect, handleSocketDisconnect, handleSocketError, handleNewAlert]);

  // Re-fetch data when tab changes or selectedDate changes
  useEffect(() => {
    if (activeTab === 'alerts') {
      fetchTodaysAlerts();
    } else {
      fetchOpenAlerts(selectedDate || null);
    }
  }, [activeTab, selectedDate]);

  // Handle details press for both tabs - Show full details only when user clicks
  const handleDetailsPress = alert => {
    console.log('Showing details for alert:', alert);
    console.log('Alert raw data:', alert.rawData);
    
    // Show full technical information only in the details view
    Alert.alert(
      'Alert Details',
      `Message: ${alert.rawData.message}\nAmul Z: ${
        alert.rawData.amulZ
      }°\nAmul Fixed Z: ${alert.rawData.amulFixedZ}°\nTimestamp: ${new Date(
        alert.rawData.timestamp,
      ).toLocaleString()}\nStatus: ${alert.status}`,
      [{ text: 'OK' }]
    );
  };

  // Handle tab change
  const handleTabChange = tab => {
    setActiveTab(tab);
  };

  // Get current tab data
  const getCurrentTabData = () => {
    if (activeTab === 'alerts') {
      return todayAlerts;
    } else {
      return openAlerts;
    }
  };

  // Call API for initial load
  useEffect(() => {
    const todayString = formatDateToAPI(new Date());
    setSelectedDate(todayString);
  }, []);

  const handleCalendarPress = () => {
    setDatePickerVisible(true);
  };

  const handleDateConfirm = async date => {
    const dateString = formatDateToAPI(date);
    setSelectedDate(dateString);
    setDatePickerVisible(false);
  };

  const handleDateCancel = () => {
    setDatePickerVisible(false);
  };

  // Manual socket reconnection
  const handleManualReconnect = () => {
    console.log('🔄 Manual reconnection triggered');
    reconnectSocket();
  };

  const currentData = getCurrentTabData();

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.centerContainer}>
            <View style={styles.textContainer}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={textLogo}
                  resizeMode="contain"
                  style={{ height: 40, width: 40, marginRight: 3 }}
                />
                <Text style={styles.companyText}>
                  Digital Business Transformation
                </Text>
              </View>
              <Text style={styles.title}>ATCS</Text>
            </View>
          </View>

          {/* Socket Status - Top Right Corner */}
          <TouchableOpacity 
            style={[
              styles.socketStatusContainer,
              socketStatus === 'connected'
                ? styles.socketConnected
                : styles.socketDisconnected,
            ]}
            onPress={handleManualReconnect}
          >
            {socketStatus === 'connected' ? (
              <Wifi size={16} color="#fff" />
            ) : (
              <WifiOff size={16} color="#fff" />
            )}
            <Text style={styles.socketStatusText}>
              {socketStatus === 'connected' ? 'Connected' : 'Disconnected'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'alerts' && styles.activeTab]}
            onPress={() => handleTabChange('alerts')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'alerts' && styles.activeTabText,
              ]}
            >
              Alerts
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'openAlerts' && styles.activeTab]}
            onPress={() => handleTabChange('openAlerts')}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === 'openAlerts' && styles.activeTabText,
              ]}
            >
              Open Alerts
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Display with Calendar Icon - Only show for Open Alerts tab */}
        {activeTab === 'openAlerts' && (
          <View style={styles.dateContainer}>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={handleCalendarPress}
            >
              <Text style={styles.dateText}>
                {selectedDate
                  ? formatDateForDisplay(selectedDate)
                  : 'Select Date'}
              </Text>
              <Calendar size={20} color="#667eea" />
            </TouchableOpacity>

            {currentData.length > 0 && (
              <Text style={styles.alertCount}>
                {currentData.length} open alert
                {currentData.length !== 1 ? 's' : ''} found
              </Text>
            )}
          </View>
        )}

        {/* Today's Date Display - Only show for Alerts tab */}
        {activeTab === 'alerts' && (
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>
              Today - {formatDateForDisplay(formatDateToAPI(new Date()))}
            </Text>
            {currentData.length > 0 && (
              <Text style={styles.alertCount}>
                {currentData.length} alert{currentData.length !== 1 ? 's' : ''}{' '}
                found
              </Text>
            )}
          </View>
        )}

        {/* Alert Cards Section */}
        <ScrollView
          style={styles.alertsContainer}
          contentContainerStyle={styles.alertsContent}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Loading alerts...</Text>
            </View>
          ) : currentData.length > 0 ? (
            currentData.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onDetailsPress={handleDetailsPress}
                status={alert.status}
              />
            ))
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {activeTab === 'alerts'
                  ? 'No alerts for today'
                  : `No open alerts ${
                      selectedDate
                        ? `for ${formatDateForDisplay(selectedDate)}`
                        : 'found'
                    }`}
              </Text>
              <Text style={styles.emptySubText}>
                {activeTab === 'alerts'
                  ? 'There are no alerts for today.'
                  : 'Select another date to view open alerts.'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Date Picker */}
        <DatePicker
          modal
          open={datePickerVisible}
          date={stringToDate(selectedDate)}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
          theme="light"
          title="Select Date"
          confirmText="Confirm"
          cancelText="Cancel"
          maximumDate={new Date()}
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    position: 'relative',
  },
  centerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    height: 80,
    width: 80,
    marginRight: 12,
  },
  textContainer: {
    alignItems: 'center',
  },
  companyText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textAlign: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  // Socket Status Styles
  socketStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    gap: 4,
    position: 'absolute',
    right: 20,
    top: 12,
  },
  socketConnected: {
    backgroundColor: '#10b981', // Green for connected
  },
  socketDisconnected: {
    backgroundColor: '#ef4444', // Red for disconnected
  },
  socketStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  // Tab Bar Styles
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#667eea',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  activeTabText: {
    color: '#667eea',
  },
  dateContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea',
    textAlign: 'center',
  },
  alertCount: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  alertsContainer: {
    flex: 1,
  },
  alertsContent: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});

export default Homepage;
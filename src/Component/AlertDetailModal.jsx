import React from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView,
  Dimensions 
} from 'react-native';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Bell, 
  Clock, 
  Calendar,
  MapPin,
  User,
  Shield 
} from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AlertDetailModal = ({ 
  visible = false,
  alert,
  onClose,
  onAcknowledge,
  style 
}) => {
  if (!visible || !alert) return null;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getIconByType = (type) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'critical': return Bell;
      case 'info': return CheckCircle;
      default: return Bell;
    }
  };

  const getStatusColor = (acknowledged) => {
    return acknowledged ? '#2ed573' : '#ffa502';
  };

  const getStatusText = (acknowledged) => {
    return acknowledged ? 'Acknowledged' : 'Pending';
  };

  const IconComponent = getIconByType(alert.type);
  const priorityColor = getPriorityColor(alert.priority);
  const statusColor = getStatusColor(alert.acknowledged);

  return (
    <View style={[styles.modalOverlay, style]}>
      <View style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.headerLeft}>
            <IconComponent size={24} color={priorityColor} />
            <Text style={styles.modalTitle}>Alert Details</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Alert Title & Priority */}
          <View style={styles.section}>
            <Text style={styles.alertTitleLarge}>{alert.title}</Text>
            <View style={[styles.priorityBadge, { backgroundColor: `${priorityColor}20` }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor }]} />
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {alert.priority} Priority
              </Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Status</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {getStatusText(alert.acknowledged)}
                </Text>
              </View>
              {!alert.acknowledged && onAcknowledge && (
                <TouchableOpacity 
                  style={[styles.acknowledgeButton, { backgroundColor: priorityColor }]}
                  onPress={() => onAcknowledge(alert)}
                >
                  <CheckCircle size={16} color="#fff" />
                  <Text style={styles.acknowledgeButtonText}>Acknowledge</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Basic Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Clock size={16} color="#666" />
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{alert.time}</Text>
              </View>
              <View style={styles.infoItem}>
                <Calendar size={16} color="#666" />
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{alert.date || 'Today'}</Text>
              </View>
              <View style={styles.infoItem}>
                <Shield size={16} color="#666" />
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>{alert.type}</Text>
              </View>
              <View style={styles.infoItem}>
                <User size={16} color="#666" />
                <Text style={styles.infoLabel}>Reported By</Text>
                <Text style={styles.infoValue}>{alert.reportedBy || 'System'}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descriptionText}>{alert.message}</Text>
          </View>

          {/* Location */}
          {alert.location && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Location</Text>
              <View style={styles.locationRow}>
                <MapPin size={16} color="#666" />
                <Text style={styles.locationText}>{alert.location}</Text>
              </View>
            </View>
          )}

          {/* Additional Details */}
          {alert.details && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Additional Details</Text>
              <Text style={styles.detailsText}>{alert.details}</Text>
            </View>
          )}

          {/* Actions */}
          {alert.actions && alert.actions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Recommended Actions</Text>
              <View style={styles.actionsList}>
                {alert.actions.map((action, index) => (
                  <View key={index} style={styles.actionItem}>
                    <View style={[styles.actionBullet, { backgroundColor: priorityColor }]} />
                    <Text style={styles.actionText}>{action}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.secondaryButton} onPress={onClose}>
            <Text style={styles.secondaryButtonText}>Close</Text>
          </TouchableOpacity>
          {!alert.acknowledged && onAcknowledge && (
            <TouchableOpacity 
              style={[styles.primaryButton, { backgroundColor: priorityColor }]}
              onPress={() => onAcknowledge(alert)}
            >
              <CheckCircle size={18} color="#fff" />
              <Text style={styles.primaryButtonText}>Acknowledge Alert</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    width: SCREEN_WIDTH - 40,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f2f6',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginLeft: 12,
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  alertTitleLarge: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  acknowledgeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  acknowledgeButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  infoItem: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    textTransform: 'capitalize',
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#666',
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  actionsList: {
    gap: 12,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  actionBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  actionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f1f2f6',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  primaryButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

export default AlertDetailModal;
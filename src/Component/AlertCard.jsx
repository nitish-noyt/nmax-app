import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import {
  AlertTriangle,
  CheckCircle,
  Bell,
  Clock,
  ArrowRight,
} from 'lucide-react-native';

const AlertCard = ({ alert, onDetailsPress, style }) => {
  const {
    type = 'info',
    title,
    message,
    time,
    priority = 'medium',
  } = alert;

  const getPriorityColor = priority => {
    switch (priority) {
      case 'high':
        return '#ff4757';
      case 'medium':
        return '#ffa502';
      case 'low':
        return '#2ed573';
      default:
        return '#747d8c';
    }
  };

  const getIconByType = type => {
    switch (type) {
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return Bell;
      case 'info':
        return CheckCircle;
      default:
        return Bell;
    }
  };

  const IconComponent = getIconByType(type);
  const priorityColor = getPriorityColor(priority);

  return (
    <View style={[styles.alertCard, style]}>
      <View
        style={[styles.priorityIndicator, { backgroundColor: priorityColor }]}
      />
      <View style={styles.alertContent}>
        <View style={styles.alertHeader}>
          <View style={styles.alertTitleContainer}>
            <IconComponent size={16} color={priorityColor} />
            <Text style={styles.alertTitle}>{title}</Text>
          </View>
          <View style={styles.alertTime}>
            <Clock size={12} color="#666" />
            <Text style={styles.timeText}>{time}</Text>
          </View>
        </View>

        <Text style={styles.alertMessage}>{message}</Text>

        <View style={styles.alertFooter}>
          {/* <View style={styles.priorityBadge}>
            <View
              style={[styles.priorityDot, { backgroundColor: priorityColor }]}
            />
            <Text style={styles.priorityText}>{priority} priority</Text>
          </View> */}

          {/* <View style={styles.alertActions}>
            {onDetailsPress && (
              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => onDetailsPress(alert)}
              >
                <Text style={styles.detailsButtonText}>Details</Text>
                <ArrowRight size={14} color="#667eea" />
              </TouchableOpacity>
            )}
          </View> */}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f2f6',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  priorityIndicator: { width: 6, height: '100%' },
  alertContent: { flex: 1, padding: 16 },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertTitleContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  alertTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  alertTime: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 12, color: '#666', marginLeft: 4 },
  alertMessage: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  alertFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  priorityText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  alertActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailsButton: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailsButtonText: { fontSize: 12, color: '#667eea', fontWeight: '500' },
});

export default AlertCard;
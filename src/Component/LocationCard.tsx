import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from "react-native";
import { MapPin, Navigation, Clock } from "lucide-react-native";

interface LocationCardProps {
  venueName: string;
  address: string;
  openTime: string;
  closeTime: string;
  latitude: number;
  longitude: number;
}

const LocationCard: React.FC<LocationCardProps> = ({
  venueName,
  address,
  openTime,
  closeTime,
  latitude,
  longitude,
}) => {
  const openMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <MapPin size={18} color="#FF6B00" />
        <View style={{ marginLeft: 8, flex: 1 }}>
          <Text style={styles.venueName}>{venueName}</Text>
          <Text style={styles.address}>{address}</Text>
        </View>
      </View>

      <View style={styles.timeRow}>
        <Clock size={16} color="#666" />
        <Text style={styles.timeText}>
          {openTime} - {closeTime}
        </Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={openMaps}>
        <Navigation size={16} color="#fff" />
        <Text style={styles.buttonText}>Get Directions</Text>
      </TouchableOpacity>
    </View>
  );
};

export default LocationCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginVertical: 12,
    elevation: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  venueName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  address: {
    fontSize: 14,
    color: "#666",
    marginTop: 2,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
  },
  timeText: {
    marginLeft: 6,
    fontSize: 13,
    color: "#555",
  },
  button: {
    marginTop: 14,
    backgroundColor: "#FF6B00",
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    marginLeft: 6,
  },
});
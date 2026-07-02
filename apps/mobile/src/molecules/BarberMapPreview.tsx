// Embedded Google Map preview with a single barber pin (profile / detail screens).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { useTheme } from '@shopify/restyle';
import {
  GOOGLE_DARK_MAP_STYLE,
  MAP_PROVIDER,
  regionAroundCoordinate,
} from '../lib/maps';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import type { AppTheme } from '../lib/restyle';

export interface BarberMapPreviewProps {
  coordinate: { latitude: number; longitude: number };
  rating?: number;
  height?: number;
}

export const BarberMapPreview: React.FC<BarberMapPreviewProps> = ({
  coordinate,
  rating = 0,
  height = 160,
}) => {
  const theme = useTheme<AppTheme>();

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        provider={MAP_PROVIDER}
        style={StyleSheet.absoluteFillObject}
        initialRegion={regionAroundCoordinate(coordinate, 0.008)}
        customMapStyle={GOOGLE_DARK_MAP_STYLE}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}
        liteMode={false}
      >
        <Marker coordinate={coordinate} tracksViewChanges={false}>
          <View style={styles.markerContainer}>
            <View style={[styles.markerBubble, { backgroundColor: theme.colors.accent }]}>
              <Icon name="star" size={10} color={theme.colors.onAccent} />
              <Text
                style={{
                  color: theme.colors.onAccent,
                  fontSize: 12,
                  fontWeight: '600',
                }}
              >
                {rating > 0 ? rating.toFixed(2).replace('.', ',') : '—'}
              </Text>
            </View>
            <View style={[styles.markerNeedle, { backgroundColor: theme.colors.accent }]} />
            <View style={[styles.markerDot, { backgroundColor: theme.colors.accent }]} />
          </View>
        </Marker>
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  markerContainer: {
    alignItems: 'center',
  },
  markerBubble: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  markerNeedle: {
    width: 2,
    height: 12,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});

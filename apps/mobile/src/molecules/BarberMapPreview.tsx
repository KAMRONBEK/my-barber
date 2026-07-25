// Embedded Yandex map preview with a single barber pin (profile / detail screens).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { YandexMapView, Marker } from 'expo-yandex-mapkit';
import {
  BARBER_MARKER_ICON,
  MARKER_ANCHOR,
  WARM_DARK_MAP_STYLE,
  cameraForCoordinate,
} from '../lib/maps';

export interface BarberMapPreviewProps {
  coordinate: { latitude: number; longitude: number };
  height?: number;
}

export const BarberMapPreview: React.FC<BarberMapPreviewProps> = ({
  coordinate,
  height = 160,
}) => {
  return (
    <View style={[styles.container, { height }]}>
      <YandexMapView
        style={StyleSheet.absoluteFillObject}
        cameraPosition={cameraForCoordinate(coordinate)}
        animated={false}
        nightMode
        mapStyle={WARM_DARK_MAP_STYLE}
        interactiveDisabled
      >
        <Marker point={coordinate} source={BARBER_MARKER_ICON} anchor={MARKER_ANCHOR} />
      </YandexMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

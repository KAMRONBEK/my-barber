// Embedded Yandex map preview with a single barber avatar marker (profile / detail screens).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { YandexMapView } from 'expo-yandex-mapkit';
import { WARM_DARK_MAP_STYLE, cameraForCoordinate } from '../lib/maps';
import { BarberMapMarker } from './BarberMapMarker';

export interface BarberMapPreviewProps {
  coordinate: { latitude: number; longitude: number };
  avatarUri?: string | null;
  initials?: string;
  height?: number;
}

export const BarberMapPreview: React.FC<BarberMapPreviewProps> = ({
  coordinate,
  avatarUri,
  initials,
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
        <BarberMapMarker point={coordinate} avatarUri={avatarUri} initials={initials} selected />
      </YandexMapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
});

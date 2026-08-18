// A map marker that shows the barber's round avatar inside a bubble with a
// little pointer tail, rendered natively via expo-yandex-mapkit's React-children
// marker icons (>= 0.0.8, which snapshots the child to a bitmap — fixes the
// earlier Android new-architecture crash). Bigger than a plain pin; the selected
// barber's bubble grows and switches to the brighter accent ring.

import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { Marker } from 'expo-yandex-mapkit';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { MARKER_ANCHOR, type LatLng } from '../lib/maps';
import type { AppTheme } from '../lib/restyle';

export interface BarberMapMarkerProps {
  point: LatLng;
  avatarUri?: string | null;
  initials?: string;
  /** Barber's average rating; a small ★ pill is shown on the bubble when > 0. */
  rating?: number;
  selected?: boolean;
  identifier?: string;
  onPress?: () => void;
}

const BASE_SIZE = 46;
const SELECTED_SIZE = 58;
const TAIL = 9;

export const BarberMapMarker = React.memo(function BarberMapMarker({
  point,
  avatarUri,
  initials,
  rating = 0,
  selected = false,
  identifier,
  onPress,
}: BarberMapMarkerProps) {
  const theme = useTheme<AppTheme>();

  const hasRating = rating > 0;
  const ratingLabel = hasRating ? rating.toFixed(1).replace('.', ',') : '';

  // Re-snapshot the native icon only while the content is settling: on mount, and
  // whenever the size/ring (selected) or photo changes. The image stops it early via
  // onLoadEnd; the timeout is an upper bound for the initials case or a slow/failed load.
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    setTracking(true);
    const t = setTimeout(() => setTracking(false), 2000);
    return () => clearTimeout(t);
  }, [selected, avatarUri]);

  const size = selected ? SELECTED_SIZE : BASE_SIZE;
  const ring = selected ? theme.colors.accent2 : theme.colors.accent;
  const inner = size - 7;

  return (
    <Marker
      point={point}
      anchor={MARKER_ANCHOR}
      zIndex={selected ? 1 : 0}
      identifier={identifier}
      handled
      onPress={onPress}
      tracksViewChanges={tracking}
    >
      <View style={styles.wrap}>
        <View
          style={[
            styles.bubble,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderColor: ring,
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={{ width: inner, height: inner, borderRadius: inner / 2 }}
              contentFit="cover"
              transition={0}
              onLoadEnd={() => setTracking(false)}
            />
          ) : (
            // No photo: a filled copper avatar placeholder with initials.
            <View
              style={[
                styles.initials,
                {
                  width: inner,
                  height: inner,
                  borderRadius: inner / 2,
                  backgroundColor: theme.colors.accent,
                },
              ]}
            >
              <Text
                style={{
                  color: theme.colors.onAccent,
                  fontWeight: '800',
                  fontSize: inner * 0.42,
                }}
              >
                {(initials ?? '').slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        {/* Rating chin badge — a small ★-rating pill on the bubble's bottom edge,
            shown only when the barber has a rating. */}
        {hasRating ? (
          <View style={[styles.ratingBadge, { borderColor: ring }]}>
            <Text style={styles.ratingText}>{`★ ${ratingLabel}`}</Text>
          </View>
        ) : null}
        {/* Pointer tail — its tip sits on the coordinate (anchor y = 1). */}
        <View style={[styles.tail, { borderTopColor: ring }]} />
      </View>
    </Marker>
  );
});

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
  },
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  initials: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingBadge: {
    marginTop: -7,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: '#f7f7f7',
  },
  ratingText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800',
    color: '#0a0a0a',
  },
  tail: {
    marginTop: -2,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: TAIL,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
});

// Barber workspace floating pill tab bar.
// Same glassmorphism style as GlassTabBar (client) but with barber-specific
// icons/routes — 4 tabs, none hidden.

import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@shopify/restyle';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Icon, type IconName } from '../atoms/Icon';
import { hapticSelection } from '../lib/haptics';
import type { AppTheme } from '../lib/restyle';

const ROUTE_ICONS: Record<string, IconName> = {
  calendar: 'calendar',
  requests: 'inbox',
  earnings: 'trending-up',
  profile: 'user',
};

export const BARBER_TAB_BAR_PILL_HEIGHT = 64;
export const BARBER_TAB_BAR_BOTTOM_OFFSET = 16;

export const BarberTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const theme = useTheme<AppTheme>();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, BARBER_TAB_BAR_BOTTOM_OFFSET) },
      ]}
      pointerEvents="box-none"
    >
      {/*
        Shadow lives on this outer, non-clipped view — a view can't clip its
        content to a rounded rect (overflow: hidden, needed below for the
        blur) and cast a visible shadow at the same time, since the clip
        also cuts off the shadow. Splitting into shadow-wrapper + clipped-pill
        is the standard fix.
      */}
      <View style={[styles.shadowWrap, { height: BARBER_TAB_BAR_PILL_HEIGHT }]}>
        <View style={styles.pill}>
          {/* Blur background */}
          <BlurView
            intensity={60}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />
          {/* Semi-transparent surface overlay */}
          <View
            style={[
              StyleSheet.absoluteFillObject,
              styles.overlay,
              { backgroundColor: `${theme.colors.surface}CC` },
            ]}
          />

          {/* Tab items — filter to known routes only */}
          <View style={styles.tabs}>
            {state.routes
              .filter((route) => route.name in ROUTE_ICONS)
              .map((route) => {
                const actualIndex = state.routes.indexOf(route);
                const { options } = descriptors[route.key];
                const label =
                  typeof options.tabBarLabel === 'string'
                    ? options.tabBarLabel
                    : (options.title ?? route.name);
                const isFocused = state.index === actualIndex;
                const iconName: IconName = ROUTE_ICONS[route.name] ?? 'calendar';

                function onPress() {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!isFocused && !event.defaultPrevented) {
                    hapticSelection();
                    navigation.navigate(route.name);
                  }
                }

                return (
                  <TabButton
                    key={route.key}
                    onPress={onPress}
                    isFocused={isFocused}
                    iconName={iconName}
                    label={label}
                    theme={theme}
                  />
                );
              })}
          </View>
        </View>
      </View>
    </View>
  );
};

const TAB_ANIM_DURATION = 260;

const TabButton: React.FC<{
  onPress: () => void;
  isFocused: boolean;
  iconName: IconName;
  label: string;
  theme: AppTheme;
}> = ({ onPress, isFocused, iconName, label, theme }) => {
  const progress = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(isFocused ? 1 : 0, { duration: TAB_ANIM_DURATION });
  }, [isFocused, progress]);

  const pillStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['transparent', theme.colors.accent],
    ),
    paddingHorizontal: interpolate(progress.value, [0, 1], [0, 16]),
  }));

  return (
    <Pressable
      onPress={onPress}
      style={styles.tabItem}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.activePill, pillStyle]}>
        <Icon
          name={iconName}
          size={isFocused ? 18 : 20}
          color={isFocused ? theme.colors.onAccent : theme.colors.muted2}
        />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 20,
    right: 20,
    // bottom is set inline from insets
    pointerEvents: 'box-none',
  },
  // Shadow-casting wrapper — must not clip (see comment above its usage),
  // so borderRadius here only shapes the shadow, not any content.
  shadowWrap: {
    height: 64,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 14,
  },
  pill: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
  },
  overlay: {
    borderRadius: 999,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 999,
  },
});

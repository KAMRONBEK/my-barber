// Glass pill tab bar. Positioned absolute at the bottom, floating above content.
// Uses expo-blur BlurView for the glassmorphism effect + a semi-transparent
// surface overlay. Active tab gets an accent-coloured pill behind the icon+label.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Icon, type IconName } from '../atoms/Icon';
import type { AppTheme } from '../lib/restyle';

const ROUTE_ICONS: Record<string, IconName> = {
  index: 'home',
  search: 'search',
  bookings: 'calendar',
  profile: 'user',
};

export const GlassTabBar: React.FC<BottomTabBarProps> = ({
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
        { bottom: Math.max(insets.bottom, 16) },
      ]}
      pointerEvents="box-none"
    >
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

        {/* Tab items */}
        <View style={styles.tabs}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const label =
              typeof options.tabBarLabel === 'string'
                ? options.tabBarLabel
                : (options.title ?? route.name);
            const isFocused = state.index === index;
            const iconName: IconName = ROUTE_ICONS[route.name] ?? 'home';

            function onPress() {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });
              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }

            return (
              <Pressable
                key={route.key}
                onPress={onPress}
                style={styles.tabItem}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
              >
                {isFocused ? (
                  <View
                    style={[
                      styles.activePill,
                      { backgroundColor: theme.colors.accent },
                    ]}
                  >
                    <Icon
                      name={iconName}
                      size={18}
                      color={theme.colors.onAccent}
                    />
                    <Text
                      style={{
                        color: theme.colors.onAccent,
                        fontSize: 12,
                        fontWeight: '600',
                        marginLeft: 5,
                      }}
                      numberOfLines={1}
                    >
                      {label}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.inactiveTab}>
                    <Icon
                      name={iconName}
                      size={20}
                      color={theme.colors.muted2}
                    />
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
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
  pill: {
    height: 64,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.6)',
    backgroundColor: 'rgba(255, 252, 247, 0.72)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  inactiveTab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

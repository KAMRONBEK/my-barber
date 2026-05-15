// Draggable floating button for opening network logger in dev builds.
// Snaps to nearest screen edge on release. Only renders when __DEV__.

import React, { useCallback, useRef } from 'react';
import {
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
} from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FAB_SIZE = 48;
const SNAP_MARGIN = 12;

interface NetworkDebugButtonProps {
  onPress: () => void;
}

export const NetworkDebugButton: React.FC<NetworkDebugButtonProps> = ({
  onPress,
}) => {
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Start position: bottom-right corner
  const startX = screenW - FAB_SIZE - SNAP_MARGIN;
  const startY = screenH - FAB_SIZE - SNAP_MARGIN - insets.bottom;

  const translateX = useSharedValue(startX);
  const translateY = useSharedValue(startY);
  const contextX = useSharedValue(0);
  const contextY = useSharedValue(0);

  const isPressed = useRef(false);

  const snapToEdge = useCallback(
    (x: number, y: number) => {
      'worklet';
      const minX = SNAP_MARGIN;
      const maxX = screenW - FAB_SIZE - SNAP_MARGIN;
      const minY = insets.top + SNAP_MARGIN;
      const maxY = screenH - FAB_SIZE - SNAP_MARGIN - insets.bottom;

      const clampedY = Math.min(Math.max(y, minY), maxY);

      // Snap to left or right edge
      const toLeft = x < screenW / 2;
      const targetX = toLeft ? minX : maxX;

      translateX.value = withSpring(targetX, { damping: 20, stiffness: 200 });
      translateY.value = withSpring(clampedY, { damping: 20, stiffness: 200 });
    },
    [screenW, screenH, insets.top, insets.bottom, translateX, translateY]
  );

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      contextX.value = translateX.value;
      contextY.value = translateY.value;
      isPressed.current = true;
    })
    .onUpdate((event) => {
      translateX.value = contextX.value + event.translationX;
      translateY.value = contextY.value + event.translationY;
    })
    .onEnd((event) => {
      isPressed.current = false;
      snapToEdge(
        contextX.value + event.translationX,
        contextY.value + event.translationY
      );
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(250)
    .onEnd(() => {
      if (!isPressed.current) {
        runOnJS(onPress)();
      }
    });

  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.fab, animatedStyle]}>
        <Pressable style={styles.inner}>
          <Animated.Text style={styles.label}>LOG</Animated.Text>
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  inner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

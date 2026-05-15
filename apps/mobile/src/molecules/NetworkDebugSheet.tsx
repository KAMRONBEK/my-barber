// Bottom sheet wrapper for react-native-network-logger.
// Used by the draggable debug FAB in dev builds.

import React, { useCallback, useRef } from 'react';
import { StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import NetworkLogger from 'react-native-network-logger';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export interface NetworkDebugSheetRef {
  open: () => void;
  close: () => void;
}

export const NetworkDebugSheet = React.forwardRef<NetworkDebugSheetRef>((_, ref) => {
  const sheetRef = useRef<BottomSheet>(null);
  const insets = useSafeAreaInsets();

  React.useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.snapToIndex(0),
    close: () => sheetRef.current?.close(),
  }));

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) {
      sheetRef.current?.close();
    }
  }, []);

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={['70%', '100%']}
      enablePanDownToClose
      onChange={handleSheetChange}
      topInset={insets.top}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <NetworkLogger theme="light" />
      </BottomSheetView>
    </BottomSheet>
  );
});

NetworkDebugSheet.displayName = 'NetworkDebugSheet';

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: '#fff',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#ccc',
  },
  content: {
    flex: 1,
  },
});

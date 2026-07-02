// Bottom sheet for "Yordam va savollar" — currently offers a single option
// to open our website. Uses BottomSheetModal (portals above the tab bar);
// see AppearanceSheet's history for why plain BottomSheet doesn't work here.

import React, { useCallback, useRef } from 'react';
import { Linking, Pressable, StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Icon } from '../atoms/Icon';
import type { AppTheme } from '../lib/restyle';

export interface HelpSheetRef {
  open: () => void;
  close: () => void;
}

const WEBSITE_URL = 'https://my-barber.uz/';

export const HelpSheet = React.forwardRef<HelpSheetRef>((_, ref) => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);

  React.useImperativeHandle(ref, () => ({
    open: () => sheetRef.current?.present(),
    close: () => sheetRef.current?.dismiss(),
  }));

  const handleSheetChange = useCallback((index: number) => {
    if (index === -1) sheetRef.current?.dismiss();
  }, []);

  const onVisitWebsite = useCallback(async () => {
    sheetRef.current?.dismiss();
    await Linking.openURL(WEBSITE_URL);
  }, []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
        opacity={0.5}
      />
    ),
    [],
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose
      onChange={handleSheetChange}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {t('profile.help')}
        </Text>
        <Pressable
          onPress={onVisitWebsite}
          style={styles.row}
          accessibilityRole="button"
          testID="help-visit-website"
        >
          <Icon name="arrow-right" size={16} color={theme.colors.accent} />
          <Text style={{ flex: 1, fontSize: 15, fontWeight: '500', color: theme.colors.fg }}>
            {t('profile.visitWebsite')}
          </Text>
        </Pressable>
      </BottomSheetView>
    </BottomSheetModal>
  );
});

HelpSheet.displayName = 'HelpSheet';

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
});

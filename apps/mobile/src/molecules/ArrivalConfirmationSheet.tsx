// Non-dismissable "are you here?" / "is the client here?" check-in prompt,
// shown ~5 minutes before a booking's scheduled time. Mounted once, globally,
// in app/_layout.tsx, and driven by useArrivalCheckStore (populated either by
// a push-notification handler or the foreground backstop poll).
//
// "Non-dismissable" means: no swipe-to-close, no backdrop-tap-to-close, and
// the Android hardware back button is swallowed while this is open — the
// only way out is tapping Yes or No.

import React, { useCallback, useEffect, useRef } from 'react';
import { BackHandler, StyleSheet } from 'react-native';
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';
import { confirmClientArrival, confirmBarberArrival } from '../lib/api';
import { useArrivalCheckStore } from '../lib/arrivalCheck';
import type { AppTheme } from '../lib/restyle';

export const ArrivalConfirmationSheet: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sheetRef = useRef<React.ElementRef<typeof BottomSheetModal>>(null);

  const activeBooking = useArrivalCheckStore((s) => s.activeBooking);
  const clear = useArrivalCheckStore((s) => s.clear);
  const dequeueNext = useArrivalCheckStore((s) => s.dequeueNext);

  useEffect(() => {
    if (activeBooking) {
      sheetRef.current?.present();
    } else {
      sheetRef.current?.dismiss();
    }
  }, [activeBooking]);

  // Swallow the Android hardware back button while presented — Yes/No are
  // the only valid exits.
  useEffect(() => {
    if (!activeBooking) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [activeBooking]);

  const mutation = useMutation({
    mutationFn: (response: 'yes' | 'no') => {
      if (!activeBooking) throw new Error('no active booking');
      return activeBooking.role === 'client'
        ? confirmClientArrival(activeBooking.id, response)
        : confirmBarberArrival(activeBooking.id, response);
    },
    onSuccess: () => {
      clear();
      setTimeout(() => dequeueNext(), 400);
    },
    onError: (err) => {
      // 409 means the booking is no longer active (cancelled/rescheduled
      // elsewhere while the sheet was up) — stale-state cleanup, not a
      // user-facing failure. Any other error keeps the sheet up with a retry.
      if (isAxiosError(err) && err.response?.status === 409) {
        clear();
        setTimeout(() => dequeueNext(), 400);
      }
    },
  });

  const respond = useCallback(
    (response: 'yes' | 'no') => mutation.mutate(response),
    [mutation],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="none"
        opacity={0.6}
      />
    ),
    [],
  );

  const isClient = activeBooking?.role === 'client';

  return (
    <BottomSheetModal
      ref={sheetRef}
      enableDynamicSizing
      enablePanDownToClose={false}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={false}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.colors.surface }}
      handleComponent={null}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Text style={[styles.title, { color: theme.colors.fg }]}>
          {isClient ? t('arrivalCheck.titleClient') : t('arrivalCheck.titleBarber')}
        </Text>
        <Text style={[styles.question, { color: theme.colors.fg }]}>
          {isClient ? t('arrivalCheck.questionClient') : t('arrivalCheck.questionBarber')}
        </Text>

        {mutation.isError && (
          <Text style={[styles.error, { color: theme.colors.danger }]}>
            {t('arrivalCheck.errorBody')}
          </Text>
        )}

        <Button
          label={t('arrivalCheck.yes')}
          variant="primary"
          fullWidth
          loading={mutation.isPending && mutation.variables === 'yes'}
          disabled={mutation.isPending}
          onPress={() => respond('yes')}
          testID="arrival-check-yes"
        />
        <Button
          label={t('arrivalCheck.no')}
          variant="secondary"
          fullWidth
          loading={mutation.isPending && mutation.variables === 'no'}
          disabled={mutation.isPending}
          onPress={() => respond('no')}
          testID="arrival-check-no"
        />
      </BottomSheetView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  question: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  error: {
    fontSize: 14,
    marginBottom: 4,
  },
});

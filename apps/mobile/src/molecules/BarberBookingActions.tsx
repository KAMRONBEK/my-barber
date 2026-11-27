// The barber's buttons for one booking: accept or decline a request, cancel an
// agreed visit, and after it starts mark it done or the client absent.

import React from 'react';
import { Alert, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, type ButtonVariant } from '../atoms/Button';
import {
  cancelBarberBooking,
  completeBooking,
  markNoShow,
  patchBookingStatus,
} from '../lib/api';
import {
  barberActions,
  invalidateBarberBookings,
  type BarberAction,
} from '../lib/bookingActions';
import { bookingErrorKey } from '../lib/bookingErrors';

const RUN: Record<BarberAction, (bookingId: string) => Promise<unknown>> = {
  confirm: (id) => patchBookingStatus(id, 'confirmed'),
  decline: (id) => patchBookingStatus(id, 'declined'),
  cancel: (id) => cancelBarberBooking(id),
  complete: completeBooking,
  noShow: markNoShow,
};

const VARIANT: Record<BarberAction, ButtonVariant> = {
  confirm: 'primary',
  decline: 'destructive',
  cancel: 'destructive',
  complete: 'primary',
  noShow: 'secondary',
};

export interface BarberBookingActionsProps {
  bookingId: string;
  status: string | undefined;
  timestamp: string;
  /** Called after an action, successful or not: the booking has to be reread. */
  onDone: () => void;
}

export const BarberBookingActions: React.FC<BarberBookingActionsProps> = ({
  bookingId,
  status,
  timestamp,
  onDone,
}) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (action: BarberAction) => RUN[action](bookingId),
    onError: (error) => {
      Alert.alert(t('common.error'), t(bookingErrorKey(error)));
    },
    onSettled: () => {
      invalidateBarberBookings(queryClient);
      onDone();
    },
  });

  function press(action: BarberAction) {
    // Accepting is the one step that is harmless to take by accident.
    if (action === 'confirm') {
      mutation.mutate(action);
      return;
    }
    Alert.alert(
      t(`barberActions.${action}.title`),
      t(`barberActions.${action}.body`),
      [
        { text: t('common.back'), style: 'cancel' },
        {
          text: t(`barberActions.${action}.label`),
          style: action === 'complete' ? 'default' : 'destructive',
          onPress: () => mutation.mutate(action),
        },
      ],
    );
  }

  const actions = barberActions(status, timestamp);
  if (actions.length === 0) return null;

  return (
    <View style={{ gap: 10 }}>
      {actions.map((action) => (
        <Button
          key={action}
          fullWidth
          variant={VARIANT[action]}
          label={t(`barberActions.${action}.label`)}
          onPress={() => press(action)}
          disabled={mutation.isPending}
          loading={mutation.isPending && mutation.variables === action}
          testID={`booking-action-${action}`}
        />
      ))}
    </View>
  );
};

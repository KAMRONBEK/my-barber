// The interactive guts of the Booking screen. We extract this so the
// expo-router screen file (`app/booking/[barberId]/index.tsx`) stays thin.
//
// Responsibilities:
//  - track selected service IDs, selected day, selected slot
//  - derive total duration via @my-barber/types.calculateTotalDuration
//  - re-derive the slot grid synchronously when services or day change
//  - present a sticky CTA that POSTs /client/bookings
//
// This is the live-recalc surface the brief calls out: toggling a service must
// rebuild the slot grid in the same render pass — no debouncing.

import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import {
  calculateTotalDuration,
  type BookingContract,
} from '@my-barber/types';
import { Text } from '../atoms/Text';
import { Button } from '../atoms/Button';
import { ServiceRow } from '../molecules/ServiceRow';
import { DateStrip } from './DateStrip';
import { SlotGrid } from './SlotGrid';
import {
  formatDayMonth,
  formatTimeRange,
  formatUZS,
  formatWeekdayShort,
  formatWeekdayLong,
  startOfDay,
  toDateKey,
} from '../lib/format';
import { deriveSlots, workingWindowForWeekday } from '../lib/slots';
import {
  type ApiBarberFull,
  createBooking,
  getBookingsForBarberDay,
} from '../lib/api';
import { queryKeys, STALE } from '../lib/query';
import type { AppTheme } from '../lib/restyle';

export interface BookingFormProps {
  barber: ApiBarberFull;
  onBooked: (booking: BookingContract) => void;
}

export const BookingForm: React.FC<BookingFormProps> = ({
  barber,
  onBooked,
}) => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  const qc = useQueryClient();

  const services = barber.services ?? [];

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    return services[0] ? [services[0].id] : [];
  });
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<Date | null>(null);

  const selectedServices = useMemo(
    () => services.filter((s) => selectedIds.includes(s.id)),
    [services, selectedIds],
  );

  // Live duration recalc — pure derivation, no debounce.
  const totalDuration = useMemo(
    () =>
      calculateTotalDuration(
        selectedServices.map((s) => ({ durationMinutes: s.durationMinutes })),
      ),
    [selectedServices],
  );

  const totalPrice = useMemo(
    () => selectedServices.reduce((sum, s) => sum + s.price, 0),
    [selectedServices],
  );

  const dateKey = toDateKey(selectedDay);
  const bookingsQuery = useQuery({
    queryKey: queryKeys.bookings(barber.id, dateKey),
    queryFn: () => getBookingsForBarberDay(barber.id, dateKey),
    staleTime: STALE.bookings,
  });

  const slots = useMemo(
    () =>
      deriveSlots({
        day: selectedDay,
        totalMinutes: totalDuration,
        existing: bookingsQuery.data ?? [],
        working: workingWindowForWeekday(selectedDay.getDay(), barber.workingHours),
      }),
    [selectedDay, totalDuration, bookingsQuery.data],
  );

  // Reset slot whenever the grid layout changes so we never keep a stale pick.
  React.useEffect(() => {
    if (
      selectedSlot &&
      !slots.some(
        (s) => s.available && s.startAt.getTime() === selectedSlot.getTime(),
      )
    ) {
      setSelectedSlot(null);
    }
  }, [slots, selectedSlot]);

  const createMut = useMutation({
    mutationFn: () => {
      if (!selectedSlot) throw new Error('no slot');
      return createBooking({
        barberId: barber.id,
        serviceIds: selectedIds,
        timestamp: selectedSlot.toISOString(),
      });
    },
    onSuccess: (booking) => {
      qc.invalidateQueries({
        queryKey: queryKeys.bookings(barber.id, dateKey),
      });
      // Prime the confirmation screen's cache lookup with barber display info
      // so ConfirmationScreen doesn't need to hardcode shop name/address.
      qc.setQueryData(['lastBooking'], {
        booking,
        barberDisplay: `${barber.firstName} ${barber.lastName}`,
        // TODO: barber shop name and address should come from a dedicated
        //       barber detail endpoint when /client/barbers/:id is available.
        shopDisplay: '',
      });
      onBooked(booking);
    },
  });

  const onToggleService = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const ctaDisabled =
    selectedIds.length === 0 || !selectedSlot || createMut.isPending;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.scroll,
        { backgroundColor: theme.colors.bg },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      {/* Services */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: theme.colors.fg,
            marginBottom: 12,
          }}
        >
          {t('booking.pickService')}
        </Text>
        <View style={{ gap: 8 }}>
          {services.length === 0 ? (
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
              {t('common.empty')}
            </Text>
          ) : (
            services.map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                selected={selectedIds.includes(s.id)}
                onToggle={onToggleService}
              />
            ))
          )}
        </View>
      </View>

      {/* Day */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: theme.colors.fg,
            marginBottom: 12,
          }}
        >
          {t('booking.pickDay')}
        </Text>
        <DateStrip
          startDate={new Date()}
          selected={selectedDay}
          onSelect={(d) => {
            setSelectedDay(d);
            setSelectedSlot(null);
          }}
        />
      </View>

      {/* Slots */}
      <View style={styles.section}>
        <Text
          style={{
            fontSize: 17,
            fontWeight: '600',
            color: theme.colors.fg,
            marginBottom: 6,
          }}
        >
          {t('booking.pickTime')}
        </Text>
        <Text
          style={{ color: theme.colors.muted, fontSize: 13, marginBottom: 12 }}
        >
          {t('booking.timesLocal', {
            dayLong: formatWeekdayLong(selectedDay),
            date: formatDayMonth(selectedDay),
          })}
        </Text>

        {selectedIds.length === 0 ? (
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
            {t('booking.noServiceSelected')}
          </Text>
        ) : (
          <SlotGrid
            slots={slots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
        )}
      </View>

      {/* Summary */}
      <View
        style={[
          styles.summary,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <SummaryRow
          label={t('booking.service')}
          value={
            selectedServices.length === 0
              ? '—'
              : selectedServices.map((s) => s.name).join(' + ')
          }
        />
        <SummaryRow
          label={t('booking.date')}
          value={`${formatWeekdayShort(selectedDay)} · ${formatDayMonth(selectedDay)}`}
        />
        <SummaryRow
          label={t('booking.time')}
          value={
            selectedSlot
              ? formatTimeRange(selectedSlot, totalDuration)
              : '—'
          }
        />
        <View
          style={[
            styles.totalRow,
            { borderTopColor: theme.colors.border },
          ]}
        >
          <Text style={{ color: theme.colors.fg, fontSize: 16, fontWeight: '600' }}>
            {t('booking.total')}
          </Text>
          <Text
            style={{
              color: theme.colors.fg,
              fontSize: 18,
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
            }}
          >
            {formatUZS(totalPrice)}
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.muted,
            fontSize: 11,
            marginTop: 10,
            letterSpacing: 0.4,
          }}
        >
          {t('booking.summaryNote')}
        </Text>
      </View>

      {/* CTA */}
      <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
        <Button
          fullWidth
          label={
            createMut.isPending
              ? t('booking.creating')
              : t('booking.confirmCta')
          }
          onPress={() => createMut.mutate()}
          disabled={ctaDisabled}
          loading={createMut.isPending}
        />
        {createMut.error ? (
          <Text
            style={{
              color: theme.colors.danger,
              fontSize: 13,
              marginTop: 10,
              textAlign: 'center',
            }}
          >
            {t('booking.createError')}
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
};

const SummaryRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.summaryRow}>
      <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{label}</Text>
      <Text
        style={{
          color: theme.colors.fg,
          fontSize: 14,
          fontWeight: '500',
        }}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 80,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  summary: {
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});

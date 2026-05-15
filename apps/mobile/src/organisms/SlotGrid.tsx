// Time-slot grid. Receives an array of SlotPill objects + the currently
// selected start time, renders a wrap-row of chips, and bubbles selection
// changes upward. Pure rendering — the parent recomputes slots when service
// selection / day changes (no debounce — the grid must rerender synchronously).
//
// Optional `unavailableSlots` prop: array of ISO time strings that should be
// shown as disabled (strikethrough, muted, opacity 0.55).

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { SlotChip } from '../molecules/SlotChip';
import type { AppTheme } from '../lib/restyle';
import type { SlotPill } from '../lib/slots';

export interface SlotGridProps {
  slots: SlotPill[];
  selected: Date | null;
  onSelect: (startAt: Date) => void;
  /** ISO time strings for slots that should be shown as unavailable. */
  unavailableSlots?: string[];
}

export const SlotGrid: React.FC<SlotGridProps> = ({
  slots,
  selected,
  onSelect,
  unavailableSlots = [],
}) => {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();

  if (slots.length === 0) {
    return (
      <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
        {t('booking.noSlotsToday')}
      </Text>
    );
  }

  const unavailableSet = new Set(unavailableSlots);

  return (
    <View style={styles.grid} accessibilityRole="list">
      {slots.map((s) => {
        const isoKey = s.startAt.toISOString();
        const isSelected =
          selected != null && selected.getTime() === s.startAt.getTime();
        // A slot is disabled if it was already marked unavailable by the parent
        // OR if it appears in the explicit unavailableSlots array.
        const isDisabled = !s.available || unavailableSet.has(isoKey);

        return (
          <View
            key={isoKey}
            style={
              isDisabled && !isSelected
                ? { opacity: 0.55 }
                : undefined
            }
          >
            <SlotChip
              startAt={s.startAt}
              selected={isSelected}
              disabled={isDisabled}
              onPress={onSelect}
              strikethrough={isDisabled && !isSelected}
            />
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});

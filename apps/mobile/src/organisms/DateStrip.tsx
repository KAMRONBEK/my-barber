// Horizontally-scrolling date strip used on the booking screen. Renders the
// next N days (default 7) starting from `startDate`.

import React, { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { DayChip } from '../molecules/DayChip';
import { addDays, startOfDay } from '../lib/format';

export interface DateStripProps {
  startDate: Date;
  days?: number;
  selected: Date;
  onSelect: (date: Date) => void;
}

export const DateStrip: React.FC<DateStripProps> = ({
  startDate,
  days = 7,
  selected,
  onSelect,
}) => {
  const dates = useMemo(() => {
    const base = startOfDay(startDate);
    return Array.from({ length: days }, (_, i) => addDays(base, i));
  }, [startDate, days]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {dates.map((d) => (
        <DayChip
          key={d.toISOString()}
          date={d}
          selected={
            d.getFullYear() === selected.getFullYear() &&
            d.getMonth() === selected.getMonth() &&
            d.getDate() === selected.getDate()
          }
          onPress={onSelect}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});

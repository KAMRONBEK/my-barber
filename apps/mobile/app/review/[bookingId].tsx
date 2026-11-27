// A client rates a completed visit: one to five stars and an optional comment.

import React, { useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { isAxiosError } from 'axios';
import { Text } from '../../src/atoms/Text';
import { Icon } from '../../src/atoms/Icon';
import { Input } from '../../src/atoms/Input';
import { Button } from '../../src/atoms/Button';
import { ScreenHeader } from '../../src/molecules/ScreenHeader';
import { ScreenLayout } from '../../src/templates/ScreenLayout';
import { createReview } from '../../src/lib/api';
import { bookingErrorKey } from '../../src/lib/bookingErrors';
import { queryKeys } from '../../src/lib/query';
import type { AppTheme } from '../../src/lib/restyle';

const STARS = [1, 2, 3, 4, 5];
const MAX_COMMENT = 500;

export default function ReviewScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { bookingId, barberName } = useLocalSearchParams<{
    bookingId: string;
    barberName?: string;
  }>();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const mutation = useMutation({
    mutationFn: () => createReview(bookingId, rating, comment.trim()),
    onSuccess: () => {
      // The barber's average rating changed along with the booking.
      for (const queryKey of [['bookings'], queryKeys.barbers, queryKeys.banner]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      router.back();
    },
    onError: () => {
      void queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });

  // 409 here means this visit was already reviewed.
  const duplicate =
    isAxiosError(mutation.error) && mutation.error.response?.status === 409;

  return (
    <ScreenLayout>
      <ScreenHeader title={t('review.title')} />
      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <Text style={[styles.question, { color: theme.colors.fg }]}>
            {t('review.question', { name: barberName || t('review.barber') })}
          </Text>
          <View style={styles.stars}>
            {STARS.map((value) => (
              <Pressable
                key={value}
                onPress={() => setRating(value)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`${value}`}
                accessibilityState={{ selected: value <= rating }}
                testID={`review-star-${value}`}
              >
                <Icon
                  name="star"
                  size={40}
                  color={value <= rating ? theme.colors.warning : theme.colors.border}
                />
              </Pressable>
            ))}
          </View>
          <Input
            label={t('review.comment')}
            value={comment}
            onChangeText={setComment}
            multiline
            maxLength={MAX_COMMENT}
            style={styles.comment}
            testID="review-comment"
          />
          {mutation.error ? (
            <Text style={{ color: theme.colors.danger, fontSize: 13, marginBottom: 12 }}>
              {t(duplicate ? 'review.duplicate' : bookingErrorKey(mutation.error))}
            </Text>
          ) : null}
          <Button
            fullWidth
            label={t('review.submit')}
            onPress={() => {
              Keyboard.dismiss();
              mutation.mutate();
            }}
            disabled={rating === 0 || duplicate}
            loading={mutation.isPending}
            testID="review-submit"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 16, paddingBottom: 32 },
  question: { fontSize: 18, fontWeight: '600', textAlign: 'center', marginBottom: 20 },
  stars: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 28 },
  comment: { height: 120, paddingTop: 14, textAlignVertical: 'top' },
});

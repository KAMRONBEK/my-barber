// Barber portfolio / detail screen. Tabs: Bio / Services / Portfolio / Reviews.
// LinearGradient cover scrim, segmented tab control, portfolio grid, review list.

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shopify/restyle';
import { Text } from '../atoms/Text';
import { Avatar } from '../atoms/Avatar';
import { Icon } from '../atoms/Icon';
import { Button } from '../atoms/Button';
import { ScreenLayout } from '../templates/ScreenLayout';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  TAB_BAR_PILL_HEIGHT,
  TAB_BAR_BOTTOM_OFFSET,
} from '../navigation/GlassTabBar';
import { shadows } from '@my-barber/ui';
import { getBanner, type ApiBarber } from '../lib/api';
import { queryKeys, STALE } from '../lib/query';
import {
  formatUZS,
  formatDurationMinutes,
  formatPriceFrom,
} from '../lib/format';
import {
  DEFAULT_SERVICE_DURATION_MINUTES,
} from '@my-barber/types';
import type { AppTheme } from '../lib/restyle';

type TabKey = 'bio' | 'services' | 'portfolio' | 'reviews';

const PORTFOLIO_GRADIENTS = [
  ['#3d1e0a', '#1d130b'] as const,
  ['#2e1508', '#1a0f06'] as const,
  ['#4a1f0c', '#221208'] as const,
  ['#3a1c10', '#1a100a'] as const,
  ['#2a1806', '#140c04'] as const,
  ['#4a220c', '#24110a'] as const,
];

const STUB_REVIEWS = [
  {
    id: '1',
    author: 'Jasur T.',
    rating: 5,
    date: '12 may 2026',
    comment: "Juda zo'r, vaqtida bo'ldi. Soch ham ajoyib chiqdi.",
  },
  {
    id: '2',
    author: 'Mirzo A.',
    rating: 4,
    date: '8 may 2026',
    comment: 'Yaxshi usta, lekin biroz kech boshladi.',
  },
  {
    id: '3',
    author: 'Sardor K.',
    rating: 5,
    date: '2 may 2026',
    comment: "Eng yaxshi sartarosh! Har doim shu yerga kelaman.",
  },
];

export const BarberShopScreen: React.FC = () => {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const tabBarPadding = TAB_BAR_PILL_HEIGHT + Math.max(insets.bottom, TAB_BAR_BOTTOM_OFFSET) + 8;
  const { id } = useLocalSearchParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<TabKey>('bio');

  const bannerQuery = useQuery({
    queryKey: queryKeys.banner,
    queryFn: getBanner,
    staleTime: STALE.banner,
  });

  const barber = useMemo<ApiBarber | undefined>(() => {
    return (bannerQuery.data ?? []).find((b) => b.id === id);
  }, [bannerQuery.data, id]);

  const minPrice = useMemo(() => {
    if (!barber?.services?.length) return null;
    return barber.services.reduce((min, s) => (s.price < min ? s.price : min), barber.services[0].price);
  }, [barber]);

  if (bannerQuery.isLoading && !barber) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>{t('common.loading')}</Text>
        </View>
      </ScreenLayout>
    );
  }

  if (!barber) {
    return (
      <ScreenLayout>
        <View style={styles.center}>
          <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
          <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
            <Text style={{ color: theme.colors.accent, fontSize: 14 }}>
              {t('common.back')}
            </Text>
          </Pressable>
        </View>
      </ScreenLayout>
    );
  }

  const rating = barber.ratingAverage ?? 0;
  const ratingCount = barber.ratingCount ?? 0;

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'bio', label: t('barber.about') },
    { key: 'services', label: t('barber.services') },
    { key: 'portfolio', label: t('barber.portfolio') },
    { key: 'reviews', label: t('barber.reviews') },
  ];

  return (
    <ScreenLayout edgeToEdgeTop>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { backgroundColor: theme.colors.bg, paddingBottom: tabBarPadding },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover with LinearGradient scrim */}
        <View style={styles.cover}>
          {/* Full dark-warm gradient base */}
          <LinearGradient
            colors={['#140f0a', '#1a120c', '#1d150f']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Bottom scrim — transparent → #1d150f for text legibility */}
          <LinearGradient
            colors={['transparent', '#1d150f']}
            start={{ x: 0.5, y: 0.3 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFillObject}
            pointerEvents="none"
          />

          <View style={styles.coverTop}>
            <Pressable
              onPress={() => router.back()}
              style={[styles.iconBtn, styles.iconBtnDark]}
              accessibilityLabel={t('common.back')}
            >
              <Icon name="back" size={18} color="#fff" />
            </Pressable>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={[styles.iconBtn, styles.iconBtnDark]}>
                <Icon name="share" size={18} color="#fff" />
              </View>
              <View style={[styles.iconBtn, styles.iconBtnDark]}>
                <Icon name="heart" size={18} color="#fff" />
              </View>
            </View>
          </View>

          {/* ID bar */}
          <View style={styles.idBar}>
            <Avatar
              size={76}
              uri={barber.avatar ?? undefined}
              initials={`${barber.firstName[0] ?? ''}${barber.lastName[0] ?? ''}`}
              ring
            />
            <View style={{ flex: 1, paddingBottom: 12 }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Text
                  style={{
                    color: '#fff',
                    fontSize: 22,
                    fontWeight: '700',
                    letterSpacing: -0.4,
                  }}
                  numberOfLines={1}
                >
                  {barber.firstName} {barber.lastName}
                </Text>
                <Icon name="verified" size={16} color={theme.colors.accent} />
              </View>
              <Text
                style={{
                  marginTop: 4,
                  color: 'rgba(255,255,255,0.78)',
                  fontSize: 13,
                }}
                numberOfLines={1}
              >
                Lochin Barbershop · Amir Temur 26
              </Text>
            </View>
          </View>
        </View>

        {/* Stats: star rating / experience / distance / price-from */}
        <View
          style={[
            styles.statsBar,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <Stat
            value={rating ? rating.toFixed(1) : String.fromCharCode(8212)}
            label={t('barber.rating')}
            icon
          />
          <Stat
            value={
              Object.prototype.hasOwnProperty.call(barber, 'experienceYears') &&
              typeof (barber as unknown as Record<string, unknown>).experienceYears === 'number'
                ? String((barber as unknown as Record<string, unknown>).experienceYears)
                : String.fromCharCode(8212)
            }
            label={t('barber.experienceLabel')}
          />
          <Stat
            value="1,2 km"
            label={t('barber.distance')}
          />
          <Stat
            value={minPrice != null ? formatUZS(minPrice) : String.fromCharCode(8212)}
            label={t('barber.priceLabel')}
            accent
          />
        </View>

        {/* Mini map widget */}
        <View
          style={[
            styles.mapWidget,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
            },
          ]}
        >
          <View style={styles.mapCanvas}>
            {/* Stylized streets */}
            <View style={[styles.mapStreet, { top: '38%', left: 0, right: 0, height: 2 }]} />
            <View style={[styles.mapStreet, { top: 0, bottom: 0, left: '48%', width: 2 }]} />
            <View style={[styles.mapStreet, { top: '62%', left: 0, right: 0, height: 1, opacity: 0.5 }]} />
            <View style={[styles.mapStreet, { top: 0, bottom: 0, left: '22%', width: 1, opacity: 0.5 }]} />
            {/* Pulse ring */}
            <View style={[styles.locRing, { borderColor: theme.colors.accent }]} />
            {/* Pin */}
            <View style={styles.mapPin}>
              <View style={[styles.mapBubble, { backgroundColor: theme.colors.accent }]}>
                <Icon name="star" size={10} color={theme.colors.onAccent} />
                <Text style={{ color: theme.colors.onAccent, fontSize: 12, fontWeight: '600' }}>
                  {rating ? rating.toFixed(2) : '—'}
                </Text>
              </View>
              <View style={[styles.mapNeedle, { backgroundColor: theme.colors.accent }]} />
              <View style={[styles.mapDot, { backgroundColor: theme.colors.accent }]} />
            </View>
          </View>
          <View style={styles.mapMeta}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Icon name="pin" size={16} color={theme.colors.accent} />
              <View>
                <Text style={{ fontSize: 14, fontWeight: '500', color: theme.colors.fg }}>
                  0,6 km {t('barber.distance').toLowerCase()}
                </Text>
                <Text style={{ fontSize: 12, color: theme.colors.muted, marginTop: 2 }}>
                  Lochin Barbershop · Amir Temur 26
                </Text>
              </View>
            </View>
            <Pressable
              style={[
                styles.navBtn,
                { backgroundColor: theme.colors.fg },
              ]}
            >
              <Icon name="arrow-right" size={14} color={theme.colors.bg} />
              <Text style={{ color: theme.colors.bg, fontSize: 13, fontWeight: '600' }}>
                {t('barber.directions')}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Segmented tab control */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
          style={styles.tabsScroll}
        >
          {TABS.map(({ key, label }) => {
            const isActive = activeTab === key;
            return (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={[
                  styles.tabChip,
                  isActive && styles.tabChipActive,
                  {
                    backgroundColor: isActive
                      ? 'rgba(42, 32, 24, 0.78)'
                      : theme.colors.surface2,
                    borderColor: isActive
                      ? 'rgba(255, 255, 255, 0.09)'
                      : theme.colors.border,
                  },
                ]}
                accessibilityRole="tab"
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: isActive ? theme.colors.bg : theme.colors.fg,
                  }}
                >
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Tab content */}
        {activeTab === 'bio' ? (
          <View style={styles.section}>
            <Text
              style={{
                color: theme.colors.fg2,
                fontSize: 14,
                lineHeight: 22,
              }}
            >
              {t('barber.bio')}{' '}
              <Text style={{ color: theme.colors.accent, fontWeight: '500' }}>
                {t('barber.more')}
              </Text>
            </Text>
          </View>
        ) : null}

        {activeTab === 'services' ? (
          <View style={styles.section}>
            <View style={{ gap: 8 }}>
              {(barber.services ?? []).map((s) => {
                const duration =
                  s.durationMinutes && s.durationMinutes > 0
                    ? s.durationMinutes
                    : DEFAULT_SERVICE_DURATION_MINUTES;
                return (
                  <View
                    key={s.id}
                    style={[
                      styles.serviceRow,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: theme.colors.fg,
                        }}
                      >
                        {s.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: theme.colors.muted,
                          marginTop: 2,
                        }}
                      >
                        {formatDurationMinutes(duration)}
                      </Text>
                    </View>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: '600',
                        color: theme.colors.fg,
                      }}
                    >
                      {formatUZS(s.price)}
                    </Text>
                  </View>
                );
              })}
              {(barber.services ?? []).length === 0 ? (
                <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {activeTab === 'portfolio' ? (
          <View style={[styles.section, styles.portfolioGrid]}>
            {PORTFOLIO_GRADIENTS.map((grads, i) => (
              <View key={i} style={styles.portfolioTile}>
                <LinearGradient
                  colors={grads}
                  style={StyleSheet.absoluteFillObject}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                />
                {/* When real photos are available, render Image here */}
              </View>
            ))}
          </View>
        ) : null}

        {activeTab === 'reviews' ? (
          <View style={styles.section}>
            {STUB_REVIEWS.length === 0 ? (
              <Text style={{ color: theme.colors.muted }}>{t('common.empty')}</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {STUB_REVIEWS.map((review) => (
                  <View
                    key={review.id}
                    style={[
                      styles.reviewCard,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                  >
                    <View style={styles.reviewHead}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: theme.colors.fg,
                          flex: 1,
                        }}
                      >
                        {review.author}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.muted2 }}>
                        {review.date}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 2, marginVertical: 6 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Icon
                          key={i}
                          name="star"
                          size={12}
                          color={
                            i < review.rating
                              ? theme.colors.accent
                              : theme.colors.border
                          }
                        />
                      ))}
                    </View>
                    <Text
                      style={{
                        fontSize: 13,
                        color: theme.colors.fg2,
                        lineHeight: 20,
                      }}
                    >
                      {review.comment}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Floating CTA */}
      <View
        style={[
          styles.floating,
          shadows.floating,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.fg,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 12 }}>
            {t('barber.priceFrom')}
          </Text>
          <Text
            style={{
              color: theme.colors.fg,
              fontSize: 18,
              fontWeight: '700',
              letterSpacing: -0.3,
              fontVariant: ['tabular-nums'],
            }}
          >
            {minPrice != null ? formatPriceFrom(minPrice) : '—'}
          </Text>
        </View>
        <Button
          label={t('barber.bookSeat')}
          onPress={() => router.push(`/booking/${barber.id}`)}
        />
      </View>
    </ScreenLayout>
  );
};

const Stat: React.FC<{
  value: string;
  label: string;
  icon?: boolean;
  accent?: boolean;
}> = ({ value, label, icon, accent }) => {
  const theme = useTheme<AppTheme>();
  return (
    <View style={styles.stat}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 4,
        }}
      >
        {icon ? (
          <Icon name="star" size={12} color={theme.colors.accent} />
        ) : null}
        <Text
          style={{
            fontSize: 16,
            fontWeight: '700',
            color: accent ? theme.colors.accent : theme.colors.fg,
            letterSpacing: -0.2,
            fontVariant: ['tabular-nums'],
          }}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      <Text
        style={{
          marginTop: 4,
          fontSize: 10,
          color: theme.colors.muted,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: 100,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cover: {
    height: 320,
    position: 'relative',
  },
  coverTop: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconBtnDark: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
  },
  idBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: -38,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  statsBar: {
    marginTop: 56,
    marginHorizontal: 20,
    padding: 14,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 8,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  mapWidget: {
    marginTop: 14,
    marginHorizontal: 20,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  mapCanvas: {
    height: 160,
    backgroundColor: '#e8e4de',
    position: 'relative',
    overflow: 'hidden',
  },
  mapStreet: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  locRing: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    marginLeft: -28,
    marginTop: -28,
    opacity: 0.25,
  },
  mapPin: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    marginLeft: -20,
    marginTop: -36,
    alignItems: 'center',
  },
  mapBubble: {
    height: 28,
    paddingHorizontal: 10,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 4,
  },
  mapNeedle: {
    width: 2,
    height: 12,
  },
  mapDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 3,
    elevation: 2,
  },
  mapMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: 12,
  },
  navBtn: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  tabsScroll: {
    flexGrow: 0,
    marginTop: 16,
  },
  tabsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
  },
  tabChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabChipActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  portfolioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  portfolioTile: {
    width: '48%',
    aspectRatio: 0.85,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1d150f',
  },
  reviewCard: {
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  reviewHead: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floating: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    borderRadius: 999,
    paddingLeft: 20,
    paddingRight: 6,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

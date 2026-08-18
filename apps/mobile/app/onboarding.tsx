// Onboarding carousel. Three slides with LinearGradient heroes, i18n copy,
// dot indicator, CTA, and a "Skip" ghost pill.
// On completion writes STORAGE_KEYS.hasSeenOnboarding = '1' via storage.setItem.

import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Button } from '../src/atoms/Button';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { setItem } from '../src/lib/storage';
import type { AppTheme } from '../src/lib/restyle';

export const ONBOARDING_SEEN_KEY = 'hasSeenOnboarding';

// Neutral dark-portrait gradient stops per slide — distinct tones within
// the same monochrome black family.
const SLIDE_GRADIENTS: Array<readonly [string, string, string]> = [
  ['#2c2c2c', '#1a1a1a', '#0d0d0d'],
  ['#262626', '#161616', '#0a0a0a'],
  ['#303030', '#1c1c1c', '#0e0e0e'],
] as const;

const SLIDES = [
  {
    titleKey: 'onboarding.slide1Title' as const,
    bodyKey: 'onboarding.slide1Body' as const,
    icon: '✂',
  },
  {
    titleKey: 'onboarding.slide2Title' as const,
    bodyKey: 'onboarding.slide2Body' as const,
    icon: '📅',
  },
  {
    titleKey: 'onboarding.slide3Title' as const,
    bodyKey: 'onboarding.slide3Body' as const,
    icon: '⭐',
  },
] as const;

export default function OnboardingScreen() {
  const theme = useTheme<AppTheme>();
  const router = useRouter();
  const { t } = useTranslation();
  const [slide, setSlide] = useState(0);

  const isLast = slide === SLIDES.length - 1;
  const currentSlide = SLIDES[slide];
  const gradients = SLIDE_GRADIENTS[slide];

  async function onNext() {
    if (!isLast) {
      setSlide((s) => s + 1);
      return;
    }
    await setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/select-role');
  }

  async function onSkip() {
    await setItem(ONBOARDING_SEEN_KEY, '1');
    router.replace('/select-role');
  }

  return (
    <ScreenLayout>
      {/* Hero — dark warm-brown LinearGradient per slide */}
      <View style={styles.heroWrap}>
        <LinearGradient
          colors={gradients}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.hero}
        >
          {/* Skip pill — top right */}
          {!isLast ? (
            <Pressable
              onPress={onSkip}
              style={[
                styles.skipPill,
                {
                  backgroundColor: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.22)',
                },
              ]}
              accessibilityRole="button"
              testID="onboarding-skip"
            >
              <Text
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 13,
                  fontWeight: '500',
                }}
              >
                {t('onboarding.skip')}
              </Text>
            </Pressable>
          ) : null}

          {/* Central icon in accent-glow ring */}
          <View
            style={[
              styles.iconRing,
              { backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Text style={{ fontSize: 52 }}>{currentSlide.icon}</Text>
          </View>

          {/* Bottom scrim gradient overlay for text legibility */}
          <LinearGradient
            colors={['transparent', gradients[2]]}
            style={StyleSheet.absoluteFillObject}
            start={{ x: 0.5, y: 0.4 }}
            end={{ x: 0.5, y: 1 }}
            pointerEvents="none"
          />
        </LinearGradient>
      </View>

      <View style={styles.body}>
        <Text
          style={{
            fontSize: 28,
            fontWeight: '700',
            color: theme.colors.fg,
            letterSpacing: -0.5,
          }}
        >
          {t(currentSlide.titleKey)}
        </Text>
        <Text
          style={{
            marginTop: 12,
            fontSize: 15,
            color: theme.colors.muted,
            lineHeight: 24,
          }}
        >
          {t(currentSlide.bodyKey)}
        </Text>
      </View>

      {/* Dot indicator */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor:
                  i === slide ? theme.colors.accent : theme.colors.border,
                width: i === slide ? 20 : 8,
              },
            ]}
          />
        ))}
      </View>

      <View style={styles.foot}>
        <Button
          fullWidth
          label={isLast ? t('common.continue') : t('common.continue')}
          onPress={onNext}
          testID="onboarding-next"
        />
      </View>
    </ScreenLayout>
  );
}

const styles = StyleSheet.create({
  heroWrap: {
    flex: 1,
    minHeight: 280,
    maxHeight: 380,
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipPill: {
    position: 'absolute',
    top: 20,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  dots: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 28,
    paddingTop: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  foot: {
    padding: 24,
  },
});

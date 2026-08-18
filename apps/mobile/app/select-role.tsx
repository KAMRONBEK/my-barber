// Role-selection screen. Two large tap-target cards with dark neutral
// LinearGradient backgrounds, white text, and a circular arrow CTA.

import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useTheme } from '@shopify/restyle';
import { useTranslation } from 'react-i18next';
import { Text } from '../src/atoms/Text';
import { Icon } from '../src/atoms/Icon';
import { ScreenLayout } from '../src/templates/ScreenLayout';
import { setItem } from '../src/lib/storage';
import type { AppTheme } from '../src/lib/restyle';

const ROLE_GRADIENTS = {
  client: ['#2c2c2c', '#1a1a1a', '#0d0d0d'] as const,
  barber: ['#242424', '#141414', '#0a0a0a'] as const,
};

export default function SelectRoleScreen() {
  const router = useRouter();
  const { t } = useTranslation();

  async function onSelectRole(role: 'client' | 'barber') {
    await setItem('role', role);
    router.push('/(auth)/login');
  }

  return (
    <ScreenLayout>
      <View style={styles.head}>
        <Text
          style={{
            color: '#6b6b6b',
            fontSize: 11,
            fontWeight: '600',
            letterSpacing: 1.6,
            textTransform: 'uppercase',
          }}
        >
          {t('selectRole.eyebrow')}
        </Text>
        <Text
          style={{
            marginTop: 14,
            fontSize: 32,
            fontWeight: '700',
            color: '#0a0a0a',
            letterSpacing: -0.6,
          }}
        >
          {t('selectRole.title')}
        </Text>
      </View>

      <View style={styles.cards}>
        <RoleCard
          icon="user"
          title={t('profile.role.client')}
          description={t('selectRole.clientDesc')}
          gradients={ROLE_GRADIENTS.client}
          onPress={() => onSelectRole('client')}
          testID="role-client"
        />
        <RoleCard
          icon="calendar"
          title={t('profile.role.barber')}
          description={t('selectRole.barberDesc')}
          gradients={ROLE_GRADIENTS.barber}
          onPress={() => onSelectRole('barber')}
          testID="role-barber"
        />
      </View>
    </ScreenLayout>
  );
}

const RoleCard: React.FC<{
  icon: 'user' | 'calendar';
  title: string;
  description: string;
  gradients: readonly [string, string, string];
  onPress: () => void;
  testID?: string;
}> = ({ icon, title, description, gradients, onPress, testID }) => {
  const theme = useTheme<AppTheme>();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => [styles.card, { opacity: pressed ? 0.88 : 1 }]}
    >
      <LinearGradient
        colors={gradients}
        start={{ x: 0.15, y: 0 }}
        end={{ x: 0.85, y: 1 }}
        style={styles.cardGradient}
      >
        {/* Icon top-left */}
        <View
          style={[
            styles.iconWrap,
            { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
          ]}
        >
          <Icon name={icon} size={22} color="#fff" />
        </View>

        {/* Text content */}
        <View style={{ marginTop: 16 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: '#fff',
              letterSpacing: -0.3,
            }}
          >
            {title}
          </Text>
          <Text
            style={{
              marginTop: 6,
              fontSize: 14,
              color: 'rgba(255,255,255,0.72)',
              lineHeight: 22,
            }}
          >
            {description}
          </Text>
        </View>

        {/* Arrow CTA — bottom right */}
        <View
          style={[
            styles.arrowBtn,
            {
              borderColor: 'rgba(255,255,255,0.5)',
              backgroundColor: 'rgba(255,255,255,0.1)',
            },
          ]}
        >
          <Icon name="arrow-right" size={18} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  head: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  cards: {
    flex: 1,
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 24,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
  },
  cardGradient: {
    flex: 1,
    padding: 24,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBtn: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

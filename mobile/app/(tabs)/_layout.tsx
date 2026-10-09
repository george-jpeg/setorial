import { SoundButton } from '../../components/SoundButton';
import { Tabs } from 'expo-router';
import { Home, Search, Wallet, MoreHorizontal, ShoppingBag, Bot } from 'lucide-react-native';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { getTierColors } from '../../utils/theme';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const ICON_SIZE = 22;

const TAB_CONFIG = [
  { name: 'index', labelKey: 'tabs.home', fallback: 'Home', Icon: Home, color: '#F59E0B' },
  { name: 'courses', labelKey: 'tabs.discover', fallback: 'Discover', Icon: Search, color: '#1CB0F6' },
  { name: 'tutor', labelKey: 'tabs.tutor', fallback: 'AI Tutor', Icon: Bot, color: '#EAB308' },
  { name: 'statistics', labelKey: 'tabs.wallet', fallback: 'Wallet', Icon: Wallet, color: '#FFC800' },
  { name: 'store', labelKey: 'tabs.store', fallback: 'Store', Icon: ShoppingBag, color: '#CE82FF' },
  { name: 'profile', labelKey: 'tabs.more', fallback: 'More', Icon: MoreHorizontal, color: '#FF4B4B' },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const theme = getTierColors(user?.tier);
  const accentColor = isDark ? theme.border : theme.primary;

  return (
    <View style={[styles.barOuter, { bottom: Math.max(16, insets.bottom) }]}>
      <View style={[
        styles.barContainer,
        {
          backgroundColor: isDark ? '#171A21' : '#F0F1F5',
          borderColor: isDark ? '#272B36' : '#D8DAE0',
        }
      ]}>
        {state.routes.map((route: any, index: number) => {
          // Explicitly block the statistics tab for non-premium users from rendering
          if (route.name === 'statistics') {
            const showWallet = ['SILVER', 'GOLD'].includes(user?.tier || '');
            if (!showWallet) return null;
          }

          // Explicitly block the tutor tab for non-gold users from rendering
          if (route.name === 'tutor') {
            const isGold = user?.tier === 'GOLD';
            if (!isGold) return null;
          }

          const focused = state.index === index;
          const config = TAB_CONFIG.find(c => c.name === route.name);
          if (!config) return null;
          const { Icon } = config;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const iconColor = focused ? (isDark ? '#000' : '#FFF') : (isDark ? '#6B7280' : '#9CA3AF');
          const circleColor = focused ? config.color : (isDark ? '#252930' : '#E0E2E8');

          return (
            <SoundButton
              key={route.key}
              onPress={onPress}
              activeOpacity={0.7}
              style={[
                styles.tabButton,
                focused && styles.tabButtonActive,
                focused && {
                  backgroundColor: isDark ? '#252930' : '#E0E2E8',
                },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: circleColor }]}>
                <Icon size={ICON_SIZE} color={iconColor} strokeWidth={focused ? 2.5 : 1.8} />
              </View>
              {focused && (
                <Text
                  style={[
                    styles.label,
                    { color: isDark ? '#F9FAFB' : '#1F2937' }
                  ]}
                  numberOfLines={1}
                >
                  {t(config.labelKey, { defaultValue: config.fallback }) as string}
                </Text>
              )}
            </SoundButton>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuthStore();
  const showWallet = ['SILVER', 'GOLD'].includes(user?.tier || '');
  const showTutor = user?.tier === 'GOLD';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="courses" />
      <Tabs.Screen name="tutor" options={{ href: showTutor ? undefined : null }} />
      <Tabs.Screen name="statistics" options={{ href: showWallet ? undefined : null }} />
      <Tabs.Screen name="store" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  barOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
    maxWidth: Dimensions.get('window').width - 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius: 18,
    padding: 4,
  },
  tabButtonActive: {
    paddingHorizontal: 10,
    paddingRight: 16,
    gap: 8,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});

import { Tabs, router, usePathname } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet, Platform, useColorScheme } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Home, Search, Wallet, MoreHorizontal, ShoppingBag, Bot } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/authStore';
import { playSound } from '../../lib/audio';

type TabConfig = {
  name: string;
  labelKey: string;
  fallback: string;
  Icon: any;
  gradient: [string, string, ...string[]];
  shadowColor: string;
};

const TAB_CONFIG: TabConfig[] = [
  {
    name: 'index',
    labelKey: 'tabs.home',
    fallback: 'Home',
    Icon: Home,
    gradient: ['#F59E0B', '#D97706'],
    shadowColor: '#F59E0B',
  },
  {
    name: 'courses',
    labelKey: 'tabs.discover',
    fallback: 'Discover',
    Icon: Search,
    gradient: ['#38BDF8', '#0284C7'],
    shadowColor: '#38BDF8',
  },
  {
    name: 'tutor',
    labelKey: 'tabs.tutor',
    fallback: 'AI Tutor',
    Icon: Bot,
    gradient: ['#F59E0B', '#D97706'],
    shadowColor: '#F59E0B',
  },
  {
    name: 'statistics',
    labelKey: 'tabs.wallet',
    fallback: 'Wallet',
    Icon: Wallet,
    gradient: ['#FBBF24', '#D97706'],
    shadowColor: '#FBBF24',
  },
  {
    name: 'store',
    labelKey: 'tabs.store',
    fallback: 'Store',
    Icon: ShoppingBag,
    gradient: ['#C084FC', '#9333EA'],
    shadowColor: '#C084FC',
  },
  {
    name: 'profile',
    labelKey: 'tabs.more',
    fallback: 'More',
    Icon: MoreHorizontal,
    gradient: ['#F87171', '#DC2626'],
    shadowColor: '#F87171',
  },
];

const TAB_TRANSITION = LinearTransition.springify().damping(20).stiffness(220);

function CustomTabBar({ state, descriptors, navigation }: any) {
  const { t } = useTranslation();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  const pathname = usePathname();

  if (!state?.routes) return null;

  // Hide tab bar when on tutor or when tabBarStyle: display: 'none'
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors?.[focusedRoute?.key]?.options;
  const isHidden =
    focusedOptions?.tabBarStyle?.display === 'none' ||
    focusedRoute?.name === 'tutor' ||
    pathname?.includes('/tutor');

  if (isHidden) {
    return null;
  }

  const isGold = user?.tier === 'GOLD';
  const showWallet = ['SILVER', 'GOLD'].includes(user?.tier || '');

  // Filter and order tabs according to TAB_CONFIG
  const visibleTabs = TAB_CONFIG.map((cfg) => {
    if (cfg.name === 'tutor' && !isGold) return null;
    if (cfg.name === 'statistics' && !showWallet) return null;
    const routeIndex = state.routes.findIndex((r: any) => r.name === cfg.name);
    if (routeIndex === -1) return null;
    return {
      route: state.routes[routeIndex],
      index: routeIndex,
      config: cfg,
      isFocused: state.index === routeIndex,
    };
  }).filter(Boolean);

  const bottomOffset = Math.max(insets.bottom, 12) + 6;
  const blurVeilHeight = bottomOffset + 38;

  return (
    <View style={pill.rootContainer} pointerEvents="box-none">
      {/* Subtle Progressive Bottom Blur Zone */}
      <View pointerEvents="none" style={[pill.bottomBlurVeil, { height: blurVeilHeight }]}>
        <BlurView
          intensity={Platform.OS === 'ios' ? 3 : 6}
          tint={isDark ? 'dark' : 'light'}
          blurMethod="dimezisBlurView"
          style={pill.blurStep1}
        />
        <BlurView
          intensity={Platform.OS === 'ios' ? 10 : 16}
          tint={isDark ? 'dark' : 'light'}
          blurMethod="dimezisBlurView"
          style={pill.blurStep2}
        />
        <BlurView
          intensity={Platform.OS === 'ios' ? 22 : 30}
          tint={isDark ? 'dark' : 'light'}
          blurMethod="dimezisBlurView"
          style={pill.blurStep3}
        />
        <BlurView
          intensity={Platform.OS === 'ios' ? 40 : 50}
          tint={isDark ? 'dark' : 'light'}
          blurMethod="dimezisBlurView"
          style={pill.blurStep4}
        />
      </View>

      {/* Floating Liquid Glass Capsule Navbar */}
      <View style={[pill.outerWrap, { bottom: bottomOffset }]} pointerEvents="box-none">
        <View
          style={[
            pill.shadowShell,
            {
              shadowColor: isDark ? '#000000' : '#0F172A',
              shadowOpacity: isDark ? 0.45 : 0.16,
            },
          ]}
        >
          <BlurView
            intensity={Platform.OS === 'ios' ? 88 : 100}
            tint={isDark ? 'dark' : 'light'}
            blurMethod="dimezisBlurView"
            style={[
              pill.blurPill,
              {
                backgroundColor: isDark
                  ? 'rgba(17, 20, 27, 0.88)'
                  : 'rgba(240, 241, 245, 0.86)',
                borderColor: isDark
                  ? 'rgba(255, 255, 255, 0.12)'
                  : 'rgba(15, 23, 42, 0.10)',
              },
            ]}
          >
            {/* Liquid Glass Specular Rim */}
            <LinearGradient
              pointerEvents="none"
              colors={
                isDark
                  ? ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.02)', 'rgba(255,255,255,0)']
                  : ['rgba(255,255,255,0.80)', 'rgba(255,255,255,0.20)', 'rgba(215,224,238,0.35)']
              }
              locations={[0, 0.4, 1]}
              style={StyleSheet.absoluteFill}
            />

            {visibleTabs.map((item: any) => {
              const { route, isFocused, config } = item;
              const { Icon } = config;

              const onPress = () => {
                try {
                  playSound('tap');
                } catch {}

                const event = navigation?.emit
                  ? navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    })
                  : null;

                if (!isFocused && !event?.defaultPrevented) {
                  if (navigation?.jumpTo) {
                    navigation.jumpTo(route.name);
                  } else if (navigation?.navigate) {
                    navigation.navigate(route.name);
                  } else {
                    const target = route.name === 'index' ? '/(tabs)' : `/(tabs)/${route.name}`;
                    router.navigate(target as any);
                  }
                }
              };

              if (isFocused) {
                // Active tab — smooth expanding vibrant pill with label
                return (
                  <Animated.View key={route.key || route.name} layout={TAB_TRANSITION}>
                    <TouchableOpacity
                      onPress={onPress}
                      activeOpacity={0.85}
                      style={[
                        pill.activeTab,
                        {
                          shadowColor: config.shadowColor,
                        },
                      ]}
                    >
                      <LinearGradient
                        colors={config.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                      />
                      <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(255,255,255,0.36)', 'rgba(255,255,255,0)']}
                        style={pill.activeSpecular}
                      />
                      <Icon size={19} color="#FFFFFF" strokeWidth={2.6} />
                      <Text style={pill.activeLabel} numberOfLines={1}>
                        {t(config.labelKey, { defaultValue: config.fallback }) as string}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                );
              }

              // Inactive tab — circular glass button
              return (
                <Animated.View key={route.key || route.name} layout={TAB_TRANSITION}>
                  <TouchableOpacity
                    onPress={onPress}
                    activeOpacity={0.7}
                    style={pill.inactiveTab}
                  >
                    <Icon
                      size={20}
                      color={isDark ? '#94A3B8' : '#64748B'}
                      strokeWidth={2.0}
                    />
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </BlurView>
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const { user } = useAuthStore();
  const isGold = user?.tier === 'GOLD';
  const showWallet = ['SILVER', 'GOLD'].includes(user?.tier || '');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: isDark ? '#0B0D12' : '#FFFFFF' },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="courses" options={{ title: 'Discover' }} />
      <Tabs.Screen
        name="tutor"
        options={{
          title: 'AI Tutor',
          href: isGold ? undefined : null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="statistics"
        options={{
          title: 'Wallet',
          href: showWallet ? undefined : null,
        }}
      />
      <Tabs.Screen name="store" options={{ title: 'Store' }} />
      <Tabs.Screen name="profile" options={{ title: 'More' }} />
    </Tabs>
  );
}

const pill = StyleSheet.create({
  rootContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  bottomBlurVeil: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  blurStep1: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  blurStep2: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '22%',
    bottom: 0,
  },
  blurStep3: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '48%',
    bottom: 0,
  },
  blurStep4: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '72%',
    bottom: 0,
  },
  outerWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  shadowShell: {
    borderRadius: 999,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 24,
    elevation: 20,
  },
  blurPill: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    borderWidth: 1,
    borderRadius: 999,
    overflow: 'hidden',
    gap: 5,
  },
  activeTab: {
    height: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 999,
    paddingHorizontal: 16,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  activeSpecular: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  activeLabel: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  inactiveTab: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

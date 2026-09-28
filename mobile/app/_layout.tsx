import "../global.css";
import "../lib/i18n";
import { Stack, useRouter, useSegments } from "expo-router";
import { useEffect, useState } from "react";
import { useAuthStore } from "../store/authStore";
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import AnimatedSplash from "../components/AnimatedSplash";
import { registerForPushNotificationsAsync } from "../services/notifications";
import { useColorScheme as useTailwindColorScheme } from 'nativewind';
import { StyleSheet, View, Text, TouchableOpacity, Modal } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { MascotInteraction } from "../components/MascotInteraction";
import { useConfigStore } from '../store/configStore';
import Animated, { FadeIn, FadeOut, SlideInDown } from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import { Globe, X, Check } from "lucide-react-native";
import { SoundButton } from "../components/SoundButton";

// Prevent the native splash from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const router = useRouter();
    const segments = useSegments();
    const [showSplash, setShowSplash] = useState(true);
    const [isOffline, setIsOffline] = useState(false);
    const { t, i18n } = useTranslation();
    const { isLangModalOpen, setLangModalOpen } = useAuthStore();

    const { setColorScheme: setTailwindScheme } = useTailwindColorScheme();

    const { isLoading, token, checkSession } = useAuthStore();

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            setIsOffline(!state.isConnected);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        checkSession();
        // Clear any previously saved manual theme override left over from old settings
        SecureStore.deleteItemAsync('theme').catch(() => {});
        // Load mascot override from public configs
        useConfigStore.getState().loadMascotOverride().catch(() => {});
        // Poll for updates every 15 seconds while the app is running
        const poll = setInterval(() => {
            useConfigStore.getState().loadMascotOverride().catch(() => {});
        }, 15000);
        return () => clearInterval(poll);
    }, []);

    // Tell NativeWind to follow the system theme
    useEffect(() => {
        setTailwindScheme('system');
    }, [setTailwindScheme]);

    // Hide the native splash screen once our animated one is showing
    useEffect(() => {
        if (showSplash) {
            SplashScreen.hideAsync();
        }
    }, [showSplash]);

    useEffect(() => {
        if (isLoading || showSplash) return;

        const inAuthGroup = segments[0] === '(auth)' || 
                            segments[0] === 'login' || 
                            segments[0] === 'register' || 
                            segments[0] === 'welcome' || 
                            segments[0] === 'onboarding' || 
                            segments[0] === 'verify-email' || 
                            segments[0] === 'forgot-password';

        if (!token && !inAuthGroup) {
            router.replace('/welcome');
        } else if (token && inAuthGroup) {
            router.replace('/(tabs)');
            // Register for push notifications when logged in
            registerForPushNotificationsAsync().catch(err => console.error('Push registration error:', err));
        }
    }, [token, isLoading, segments, showSplash]);

    return (
        <View style={StyleSheet.absoluteFill}>
            {/* Stack always mounted so NavigationContainer always exists */}
            <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="login" />
                <Stack.Screen name="register" />
                <Stack.Screen name="welcome" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="verify-email" />
                <Stack.Screen name="forgot-password" />
                <Stack.Screen name="subscription" />
                <Stack.Screen name="level" />
                <Stack.Screen name="course-detail" />
                <Stack.Screen name="active-mock" />
                <Stack.Screen name="mock-exams" />
                <Stack.Screen name="learning-path" />
                <Stack.Screen name="leaderboard" />
                <Stack.Screen name="achievements" />
                <Stack.Screen name="edit-profile" />
                <Stack.Screen name="security" />
                <Stack.Screen name="payout-history" />
                <Stack.Screen name="settings" />
                <Stack.Screen name="help" />
                <Stack.Screen name="about" />
                <Stack.Screen name="privacy" />
                <Stack.Screen name="terms" />
                <Stack.Screen name="verification" />
                <Stack.Screen name="mock-result" />
                <Stack.Screen name="tutor" />
                <Stack.Screen name="streak-celebration" />
            </Stack>

            {/* Offline Guardian */}
            {isOffline && (
                <Animated.View 
                    entering={FadeIn}
                    exiting={FadeOut}
                    className="absolute inset-0 z-[1000] bg-white dark:bg-[#0B0D12] items-center justify-center p-8"
                >
                    <MascotInteraction 
                        state="crying" 
                        message="Oops! The Pride needs a signal. Please check your internet connection." 
                    />
                </Animated.View>
            )}

            {/* Splash overlaid on top — disappears when video finishes */}
            {showSplash && (
                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]}>
                    <AnimatedSplash onFinish={() => setShowSplash(false)} />
                </View>
            )}
            {/* Global Language Picker Modal */}
            <Modal
                visible={isLangModalOpen}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setLangModalOpen(false)}
            >
                <View className="flex-1 bg-black/60 items-center justify-center p-6">
                    <Animated.View 
                        entering={SlideInDown}
                        className="bg-white dark:bg-[#1E222B] w-full rounded-[40px] p-8 items-center"
                    >
                        <TouchableOpacity 
                            onPress={() => setLangModalOpen(false)}
                            className="absolute right-6 top-6 w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 items-center justify-center"
                        >
                            <X size={20} color="#AFAFAF" />
                        </TouchableOpacity>

                        <View className="mb-6 mt-4">
                            <MascotInteraction state="happy" message={t('common.select_language')} />
                        </View>

                        <View className="w-full space-y-4">
                            {[
                                { name: 'English', code: 'en', flag: '🇺🇸' },
                                { name: 'Français', code: 'fr', flag: '🇫🇷' },
                                { name: 'Español', code: 'es', flag: '🇪🇸' }
                            ].map((lang) => {
                                const active = i18n.language === lang.code;
                                return (
                                    <TouchableOpacity 
                                        key={lang.code}
                                        onPress={() => {
                                            useAuthStore.getState().setLanguage(lang.code);
                                            setLangModalOpen(false);
                                        }}
                                        className={`flex-row items-center justify-between p-5 rounded-2xl border-2 mb-3 ${active ? 'border-[#1CB0F6] bg-blue-50 dark:bg-blue-900/20' : 'border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40'}`}
                                    >
                                        <View className="flex-row items-center">
                                            <Text className="text-2xl mr-4">{lang.flag}</Text>
                                            <Text className={`font-bold text-lg ${active ? 'text-[#1CB0F6]' : 'text-black dark:text-white'}`}>{lang.name}</Text>
                                        </View>
                                        {active && <Check size={20} color="#1CB0F6" />}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useAuthStore } from '../store/authStore';
import { Paywall } from '../components/Paywall';
import { SuperwallPlacements } from '../services/superwall';

export default function SubscriptionScreen() {
    const router = useRouter();
    const { checkSession } = useAuthStore();
    const params = useLocalSearchParams<{ placement?: string; fromOnboarding?: string }>();
    const fromOnboarding = params.fromOnboarding === 'true';
    const placement = params.placement || SuperwallPlacements.UPGRADE_MODAL;

    const handleNavigation = () => {
        if (fromOnboarding) {
            router.replace('/(tabs)');
        } else if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)');
        }
    };

    const handlePurchaseCompleted = async () => {
        await checkSession();
        handleNavigation();
    };

    const handleRestoreCompleted = async () => {
        await checkSession();
        handleNavigation();
    };

    const handleDismiss = () => {
        handleNavigation();
    };

    return (
        <View style={s.container}>
            {/* Blurred backdrop with loading spinner while Superwall loads */}
            <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
            <ActivityIndicator size="large" color="#ffffff" style={s.loader} />

            {/* Superwall renders its native paywall on top of this */}
            <Paywall
                placement={placement}
                style={s.paywall}
                onPurchaseCompleted={handlePurchaseCompleted}
                onRestoreCompleted={handleRestoreCompleted}
                onDismiss={handleDismiss}
            />
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loader: {
        position: 'absolute',
        zIndex: 1,
    },
    paywall: {
        flex: 1,
        width: '100%',
        zIndex: 2,
    },
});

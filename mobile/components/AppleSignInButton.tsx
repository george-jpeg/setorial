import React, { useState, useEffect } from 'react';
import { Platform, View, ActivityIndicator, useColorScheme } from 'react-native';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

let AppleAuthentication: any = null;
try {
    AppleAuthentication = require('expo-apple-authentication');
} catch {
    AppleAuthentication = null;
}

interface AppleSignInButtonProps {
    onError?: (msg: string) => void;
}

export function AppleSignInButton({ onError }: AppleSignInButtonProps) {
    const [isAvailable, setIsAvailable] = useState(false);
    const [loading, setLoading] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (Platform.OS === 'ios' && AppleAuthentication) {
            AppleAuthentication.isAvailableAsync()
                .then((available: boolean) => setIsAvailable(available))
                .catch(() => setIsAvailable(false));
        }
    }, []);

    if (Platform.OS !== 'ios' || !isAvailable || !AppleAuthentication) {
        return null;
    }

    const handleAppleSignIn = async () => {
        try {
            setLoading(true);
            const credential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
            });

            if (!credential.identityToken) {
                throw new Error('No identity token received from Apple');
            }

            const response = await authApi.appleLogin({
                identityToken: credential.identityToken,
                user: credential.user,
                fullName: credential.fullName,
            });

            await setAuth(response.data.user, response.data.token);
        } catch (error: any) {
            if (error.code === 'ERR_REQUEST_CANCELED') {
                // User dismissed the Apple Sign-In sheet, do not show error
                return;
            }
            console.error('[Apple Sign-In Error]', error);
            onError?.(error.response?.data?.message || error.message || 'Apple Sign-In failed');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View className="h-[52px] w-full items-center justify-center rounded-2xl bg-black dark:bg-white mb-3">
                <ActivityIndicator color={isDark ? '#000000' : '#FFFFFF'} />
            </View>
        );
    }

    return (
        <View className="w-full mb-3">
            <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={
                    isDark
                        ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                        : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={16}
                style={{ width: '100%', height: 52 }}
                onPress={handleAppleSignIn}
            />
        </View>
    );
}

import { useState } from 'react';
import { Text, View, ActivityIndicator, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { TactileButton } from './TactileButton';
import { authApi } from '../services/api';
import { useAuthStore } from '../store/authStore';

// Web client ID from Google Cloud Console (OAuth client of type "Web application").
// The backend verifies the ID token against this same ID (GOOGLE_CLIENT_IDS env var).
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    || '110264671162-fhfapf4aeq71pcajp3kthat57k2tkoqa.apps.googleusercontent.com';

let GoogleSignin: any = null;
let statusCodes: any = {};
try {
    // Native module isn't available in Expo Go — guard so the app doesn't crash there.
    const mod = require('@react-native-google-signin/google-signin');
    GoogleSignin = mod.GoogleSignin;
    statusCodes = mod.statusCodes;
    GoogleSignin.configure({ webClientId: GOOGLE_WEB_CLIENT_ID, offlineAccess: false });
} catch {
    GoogleSignin = null;
}

function GoogleLogo() {
    return (
        <Svg width={20} height={20} viewBox="0 0 48 48">
            <Path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <Path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <Path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <Path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </Svg>
    );
}

export function GoogleSignInButton({ onError, label = 'Continue with Google' }: { onError?: (msg: string) => void; label?: string }) {
    const [loading, setLoading] = useState(false);
    const setAuth = useAuthStore((s) => s.setAuth);

    const handlePress = async () => {
        if (!GoogleSignin) {
            onError?.('Google sign-in needs a development or store build (not available in Expo Go).');
            return;
        }
        try {
            setLoading(true);
            if (Platform.OS === 'android') {
                await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            }
            // Always show the account picker instead of silently reusing the last account.
            try { await GoogleSignin.signOut(); } catch { }

            const result = await GoogleSignin.signIn();
            if (result?.type === 'cancelled') return;

            const idToken = result?.data?.idToken ?? result?.idToken;
            if (!idToken) throw new Error('No ID token returned from Google');

            const response = await authApi.googleLogin(idToken);
            await setAuth(response.data.user, response.data.token);
        } catch (err: any) {
            if (err?.code === statusCodes.SIGN_IN_CANCELLED) return;
            if (err?.code === statusCodes.IN_PROGRESS) return;
            if (err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
                onError?.('Google Play Services is not available on this device.');
                return;
            }
            onError?.(err?.response?.data?.message || err?.message || 'Google sign-in failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <TactileButton
            onPress={handlePress}
            disabled={loading}
            backgroundColor="#FFFFFF"
            shadowColor="#E5E5E5"
            contentClassName="py-4 items-center justify-center border-2 border-[#E5E5E5] rounded-2xl"
            className="rounded-2xl"
        >
            {loading ? (
                <ActivityIndicator color="#4285F4" />
            ) : (
                <View className="flex-row items-center">
                    <GoogleLogo />
                    <Text className="ml-3 font-bold text-[16px] text-[#3C4043]">{label}</Text>
                </View>
            )}
        </TactileButton>
    );
}

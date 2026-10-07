import { SoundButton } from '../components/SoundButton';
import { TactileButton } from '../components/TactileButton';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Eye, EyeOff, ChevronDown } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';

export default function LoginScreen() {
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setAuth = useAuthStore((state) => state.setAuth);

    const handleLogin = async () => {
        if (!email || !password) {
            setError("Please fill all fields");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await authApi.login({ email, password });
            await setAuth(response.data.user, response.data.token);
        } catch (err: any) {
            setError(err.response?.data?.message || "Login failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                className="flex-1"
            >
                <ScrollView className="flex-1 px-5 pt-4">

                    {/* Header */}
                    <View className="flex-row items-center justify-between mb-8">
                        <SoundButton onPress={() => router.back()} className="p-2 -ml-2">
                            <ArrowLeft size={24} color="#000" strokeWidth={2.5} />
                        </SoundButton>
                        <SoundButton className="flex-row items-center cursor-pointer">
                            <Text className="text-black dark:text-white font-bold mr-1">English</Text>
                            <ChevronDown size={18} color="#000" />
                        </SoundButton>
                    </View>

                    {/* Title Area */}
                    <Animated.View entering={FadeIn.delay(100)} className="mb-8">
                        <Text className="text-[26px] font-bold text-black dark:text-white mb-1.5 tracking-tight">Access your account</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-base">Welcome back to Setorial.</Text>
                    </Animated.View>

                    {/* Form Section */}
                    <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-5">

                        {/* Email Input */}
                        <View className="border-2 border-b-4 border-[#E5E5E5] dark:border-[#272B36] rounded-2xl px-4 pt-3 pb-2 mb-4">
                            <Text className="text-gray-400 text-[12px] font-medium mb-0.5 tracking-wide">Email</Text>
                            <TextInput
                                placeholder="name@example.com"
                                placeholderTextColor="#9CA3AF"
                                value={email}
                                onChangeText={setEmail}
                                className="text-black dark:text-white text-[16px] font-semibold p-0 m-0 h-6"
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        </View>

                        {/* Password Input */}
                        <View className="border-2 border-b-4 border-[#E5E5E5] dark:border-[#272B36] rounded-2xl px-4 pt-3 pb-2 mb-4 flex-row items-center justify-between">
                            <View className="flex-1">
                                <Text className="text-gray-400 text-[12px] font-medium mb-0.5 tracking-wide">Password</Text>
                                <TextInput
                                    placeholder="••••••••••"
                                    placeholderTextColor="#9CA3AF"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    className="text-black dark:text-white text-[16px] font-semibold p-0 m-0 h-6"
                                />
                            </View>
                            <SoundButton onPress={() => setShowPassword(!showPassword)} className="p-2 -mr-2">
                                {showPassword ? (
                                    <EyeOff size={20} color="#9CA3AF" />
                                ) : (
                                    <Eye size={20} color="#9CA3AF" />
                                )}
                            </SoundButton>
                        </View>

                    </Animated.View>

                    <SoundButton onPress={() => router.push('/forgot-password')} className="items-end mb-8">
                        <Text className="text-gray-500 dark:text-gray-400 font-semibold underline">Forgot Password?</Text>
                    </SoundButton>

                    {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}

                </ScrollView>

                {/* Bottom Action Area */}
                <Animated.View entering={SlideInDown.delay(300).springify()} className="px-5 pb-8 pt-4 border-t border-transparent">
                    {/* Continue Button */}
                    <TactileButton
                        onPress={handleLogin}
                        disabled={loading}
                        backgroundColor="#F59E0B"
                        shadowColor="#D97706"
                        contentClassName="py-4 items-center justify-center"
                        className="rounded-2xl"
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text className={`font-bold text-[17px] uppercase tracking-wider ${loading ? 'text-[#AFAFAF]' : 'text-white'}`}>Log In</Text>
                        )}
                    </TactileButton>

                    <View className="flex-row items-center my-4">
                        <View className="flex-1 h-[1px] bg-[#E5E5E5] dark:bg-[#272B36]" />
                        <Text className="mx-3 text-gray-400 font-semibold">or</Text>
                        <View className="flex-1 h-[1px] bg-[#E5E5E5] dark:bg-[#272B36]" />
                    </View>

                    <GoogleSignInButton onError={setError} />
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

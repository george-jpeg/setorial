import { SoundButton } from '../components/SoundButton';
import { TactileButton } from '../components/TactileButton';
import { GoogleSignInButton } from '../components/GoogleSignInButton';
import { View, Text, TextInput, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Linking } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Eye, EyeOff, Check, ChevronDown } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState } from "react";
import { authApi } from "../services/api";
import { useAuthStore } from "../store/authStore";
import Animated, { FadeIn, FadeInDown, SlideInDown } from 'react-native-reanimated';

export default function RegisterScreen() {
    const router = useRouter();

    // Using light theme natively to match the design
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [agreed, setAgreed] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const setAuth = useAuthStore((state) => state.setAuth);

    const handleRegister = async () => {
        if (!name || !email || !password || !agreed) {
            setError("Please fill all fields and agree to the Privacy Policy");
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await authApi.register({ email, password, name });
            // Registration doesn't return a token yet. We need to go to OTP verification.
            router.push({
                pathname: "/verify-email",
                params: { email: email }
            });
        } catch (err: any) {
            const message = err.response?.data?.message;
            setError(Array.isArray(message) ? message[0] : message || "Registration failed");
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
                        <SoundButton className="flex-row items-center">
                            <Text className="text-black dark:text-white font-bold mr-1">English</Text>
                            <ChevronDown size={18} color="#000" />
                        </SoundButton>
                    </View>

                    {/* Title Area */}
                    <Animated.View entering={FadeIn.delay(100)} className="mb-8">
                        <Text className="text-[26px] font-bold text-black dark:text-white mb-1.5 tracking-tight">Create your account</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-base">We'll send you a code to verify this email.</Text>
                    </Animated.View>

                    {/* Form Section */}
                    <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-8">

                        {/* Name Input */}
                        <View className="border-2 border-b-4 border-[#E5E5E5] dark:border-[#272B36] rounded-2xl px-4 pt-3 pb-2 mb-4">
                            <Text className="text-gray-400 text-[12px] font-medium mb-0.5 tracking-wide">Full Name</Text>
                            <TextInput
                                placeholder="Your full name"
                                placeholderTextColor="#9CA3AF"
                                value={name}
                                onChangeText={setName}
                                className="text-black dark:text-white text-[16px] font-semibold p-0 m-0 h-6"
                                autoCapitalize="words"
                            />
                        </View>

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

                        {/* Referral Input (Optional styling) */}
                        <View className="border-2 border-b-4 border-[#E5E5E5] dark:border-[#272B36] rounded-2xl px-4 pt-3 pb-2 mb-4 opacity-60 justify-center h-[64px]">
                            <TextInput
                                placeholder="Referral code (optional)"
                                placeholderTextColor="#9CA3AF"
                                className="text-gray-400 text-[16px] font-medium p-0 m-0 h-6"
                                editable={false}
                            />
                        </View>
                    </Animated.View>

                    {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}

                </ScrollView>

                {/* Bottom Action Area */}
                <Animated.View entering={SlideInDown.delay(300).springify()} className="px-5 pb-8 pt-4 border-t border-transparent">
                    {/* Privacy Policy Checkbox */}
                    <SoundButton
                        className="flex-row items-center mb-6"
                        onPress={() => setAgreed(!agreed)}
                    >
                        <View className={`w-6 h-6 rounded border mr-3 items-center justify-center ${agreed ? 'bg-black border-black' : 'border-gray-300 bg-white dark:bg-[#0B0D12]'}`}>
                            {agreed && <Check size={16} color="#FFF" strokeWidth={3} />}
                        </View>
                        <Text className="text-black dark:text-white text-base">
                            I agree to Setorial's <Text className="font-bold" onPress={() => Linking.openURL('https://scholarsedgetutorial.com/privacy')}>Privacy Policy</Text>
                        </Text>
                    </SoundButton>

                    {/* Continue Button */}
                    <TactileButton
                        onPress={handleRegister}
                        disabled={loading || !agreed}
                        backgroundColor="#F59E0B"
                        shadowColor="#D97706"
                        contentClassName="py-4 items-center justify-center"
                        className="rounded-2xl"
                    >
                        {loading ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text className={`font-bold text-[17px] uppercase tracking-wider ${loading || !agreed ? 'text-[#AFAFAF]' : 'text-white'}`}>Continue</Text>
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

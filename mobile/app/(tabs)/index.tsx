import { SoundButton } from '../../components/SoundButton';
import { MascotInteraction } from '../../components/MascotInteraction';
import { Languages } from 'lucide-react-native';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, ShieldCheck, CreditCard, ChevronRight, Trophy, Star, Clock, Sparkles, Bot } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect, useCallback } from 'react';
import { authApi, walletApi, learningApi } from '../../services/api';
import { getTierColors } from '../../utils/theme';
import { TactileButton } from '../../components/TactileButton';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

export default function HomeScreen() {
    const { t } = useTranslation();
    const router = useRouter();
    const isDark = useColorScheme() === 'dark';
    const { user, token, updateUser, setLangModalOpen } = useAuthStore();
    const [balance, setBalance] = useState({ ngn: 0, usd: 0 });
    const [subjects, setSubjects] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [mascotMessage, setMascotMessage] = useState("Do you think you can pass this level? 🤨");

    const fetchData = async () => {
        if (!useAuthStore.getState().token) return;
        try {
            const [profileRes, walletRes, subjectsRes] = await Promise.all([
                authApi.getMe(),
                walletApi.getBalance(),
                learningApi.getSubjects()
            ]);

            updateUser(profileRes.data);
            setBalance({
                ngn: walletRes.data.balance,
                usd: walletRes.data.balance / (walletRes.data.exchangeRate || 1600)
            });
            setSubjects(subjectsRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    }, []);

    useEffect(() => {
        const messages = [
            "Do you think you can pass this level? 🤨",
            "Hey, let's get started! 🚀",
            "Mastering this leads to Gold tier! ✨",
            "Are you feeling smart today? 🧠",
            "Don't let your streak break! 🔥",
        ];
        setMascotMessage(messages[Math.floor(Math.random() * messages.length)]);
    }, []);

    const pulse = useSharedValue(1);
    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.2, { duration: 150 }),
                withTiming(1, { duration: 150 }),
                withTiming(1.2, { duration: 150 }),
                withTiming(1, { duration: 1500 })
            ),
            -1,
            true
        );
    }, []);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }]
    }));

    const theme = getTierColors(user?.tier);

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            <ScrollView
                className="flex-1 px-5 pt-4 pb-20"
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >

                {/* Header Section (Duolingo Style Top Bar) */}
                <View className="flex-row items-center justify-between mb-6 pb-4 border-b-2 border-[#E5E5E5] dark:border-[#272B36]">
                    <View className="flex-row items-center flex-1">
                        <SoundButton onPress={() => setLangModalOpen(true)} className="mr-3">
                            <Languages size={24} color={theme.primary} />
                        </SoundButton>
                        <ShieldCheck
                            size={28}
                            color={theme.primary}
                        />
                        <Text
                            className="font-black text-lg ml-2 tracking-tighter"
                            style={{ color: theme.primary }}
                        >
                            {user?.tier || 'FREE'}
                        </Text>
                    </View>
                    <View className="flex-row items-center">
                        <SoundButton
                            activeOpacity={0.7}
                            onPress={() => router.push('/achievements')}
                            className="flex-row items-center mr-6"
                        >
                            <Animated.View style={pulseStyle}>
                                <Star size={22} color="#FF9600" fill="#FF9600" />
                            </Animated.View>
                            <Text className="text-[#FF9600] font-bold text-lg ml-1">{user?.streak || 0}</Text>
                        </SoundButton>
                        <SoundButton
                            activeOpacity={0.7}
                            onPress={() => router.push('/leaderboard')}
                            className="flex-row items-center"
                        >
                            <Trophy size={22} color="#1CB0F6" fill="#1CB0F6" />
                            <Text className="text-[#1CB0F6] font-bold text-lg ml-1">{user?.points || 0}</Text>
                        </SoundButton>
                    </View>
                </View>

                {/* Mascot Interaction */}
                <View className="mb-6">
                    <MascotInteraction state="happy" message={mascotMessage} />
                </View>

                {/* Tier Dashboard Widget - hidden for GOLD users */}
                {user?.tier !== 'GOLD' && (
                    <View className={`mb-8 border-2 border-b-8 p-6 rounded-[24px] overflow-hidden relative ${
                        user?.tier === 'SILVER' ? 'bg-[#F0F9FF] dark:bg-[#082F49] border-[#BAE6FD] dark:border-[#0369A1]' :
                        user?.tier === 'BRONZE' ? 'bg-[#FFF7ED] dark:bg-[#431407] border-[#FED7AA] dark:border-[#9A3412]' :
                        'bg-[#F5F3FF] dark:bg-[#2E1065] border-[#DDD6FE] dark:border-[#5B21B6]'
                    }`}> 
                    {/* Tier Icon / Background Element */}
                    <View className="absolute right-[-20] top-[-20] opacity-10">
                        {user?.tier === 'SILVER' ? <Trophy size={180} color="#0EA5E9" /> :
                         user?.tier === 'BRONZE' ? <ShieldCheck size={180} color="#CD7F32" /> :
                         <Sparkles size={180} color="#8B5CF6" />}
                    </View>

                        {user?.tier === 'SILVER' ? (
                        <View className="z-10">
                            <View className="flex-row items-center mb-2">
                                <View className="w-3 h-3 rounded-full bg-[#0EA5E9] mr-2" />
                                <Text className="text-[#0369A1] dark:text-[#BAE6FD] font-black text-xs uppercase tracking-widest">{t('home.silver_tier')}</Text>
                            </View>
                            <Text className="text-[#0369A1] dark:text-[#BAE6FD] font-black text-2xl mb-2">{t('home.silver_tier')}</Text>
                            <Text className="text-[#0369A1] dark:text-[#F0F9FF] font-bold text-[16px] mb-6 leading-5">{t('home.silver_desc')}</Text>
                            <SoundButton onPress={() => router.push('/subscription')} className="bg-[#0EA5E9] flex-row justify-center items-center py-4 rounded-2xl border-b-4 border-[#0284C7] shadow-lg shadow-blue-500/40">
                                <Text className="text-white font-bold text-[18px] tracking-wider uppercase">{t('home.upgrade_to_gold')}</Text>
                            </SoundButton>
                        </View>
                    ) : user?.tier === 'BRONZE' ? (
                        <View className="z-10">
                            <View className="flex-row items-center mb-2">
                                <View className="w-3 h-3 rounded-full bg-[#CD7F32] mr-2" />
                                <Text className="text-[#9A3412] dark:text-[#FED7AA] font-black text-xs uppercase tracking-widest">{t('home.bronze_tier')}</Text>
                            </View>
                            <Text className="text-[#9A3412] dark:text-[#FED7AA] font-black text-2xl mb-2">{t('home.bronze_tier')}</Text>
                            <Text className="text-[#9A3412] dark:text-[#FFF7ED] font-bold text-[16px] mb-6 leading-5">{t('home.bronze_desc')}</Text>
                            <SoundButton onPress={() => router.push('/subscription')} className="bg-[#CD7F32] flex-row justify-center items-center py-4 rounded-2xl border-b-4 border-[#A0522D] shadow-lg shadow-orange-500/40">
                                <Text className="text-white font-bold text-[18px] tracking-wider uppercase">{t('home.upgrade_to_silver')}</Text>
                            </SoundButton>
                        </View>
                    ) : (
                        <View className="z-10">
                            <View className="flex-row items-center mb-2">
                                <View className="w-3 h-3 rounded-full bg-[#8B5CF6] mr-2" />
                                <Text className="text-[#5B21B6] dark:text-[#DDD6FE] font-black text-xs uppercase tracking-widest">{t('home.free_plan')}</Text>
                            </View>
                            <Text className="text-[#5B21B6] dark:text-[#DDD6FE] font-black text-2xl mb-2">{t('home.free_plan')}</Text>
                            <Text className="text-[#5B21B6] dark:text-[#F5F3FF] font-bold text-[16px] mb-6 leading-5">{t('home.free_desc')}</Text>
                            <SoundButton onPress={() => router.push('/subscription')} className="bg-[#8B5CF6] flex-row justify-center items-center py-4 rounded-2xl border-b-4 border-[#7C3AED] shadow-lg shadow-purple-500/40">
                                <Text className="text-white font-bold text-[18px] tracking-wider uppercase">{t('home.upgrade_to_bronze')}</Text>
                            </SoundButton>
                        </View>
                    )}
                </View>
                )}

                {/* Buying Power / Monetizable Balance */}
                {['SILVER', 'GOLD'].includes(user?.tier || '') && (
                    <View className="flex-row items-center justify-between mb-8 bg-white dark:bg-[#1E222B] border-2 border-[#E5E5E5] dark:border-[#272B36] p-5 rounded-2xl border-b-4">
                        <View>
                            <Text className="text-[#AFAFAF] dark:text-gray-400 font-bold text-xs uppercase tracking-widest mb-1">{t('home.wallet_balance')}</Text>
                            <View className="flex-row items-center">
                                <Text className="text-[#4B4B4B] dark:text-white font-bold text-lg">₦{balance.ngn.toLocaleString()}</Text>
                                <Text className="text-gray-300 dark:text-gray-600 mx-2">|</Text>
                                <Text className="text-[#4B4B4B] dark:text-white font-medium text-lg">${balance.usd.toFixed(2)}</Text>
                            </View>
                        </View>
                        <TactileButton
                            onPress={() => router.push('/payout-history')}
                            backgroundColor={theme.primary}
                            shadowColor={theme.primaryDark}
                            depth={4}
                            style={{ width: 'auto', marginBottom: 0 }}
                            contentClassName="py-3 px-6 items-center justify-center"
                        >
                            <Text className="text-white font-bold text-[13px] tracking-widest uppercase">{t('common.history')}</Text>
                        </TactileButton>
                    </View>
                )}

                {/* Promo Card -> Duolingo Style Super Card */}
                {!['SILVER', 'GOLD'].includes(user?.tier || '') && (
                    <TactileButton
                        onPress={() => {}} // User hasn't specified upgrade path yet
                        backgroundColor="#FFC800"
                        shadowColor="#E5B400"
                        depth={8}
                        className="mb-10"
                        contentClassName="p-6 flex-row items-center overflow-hidden relative"
                    >
                        <View className="w-2/3 pr-4 z-10">
                            <Text className="text-white font-black text-2xl tracking-tight leading-tight mb-2">
                                BECOME ELIGIBLE{'\n'}FOR REWARDS
                            </Text>
                            <Text className="text-yellow-800 text-[15px] font-bold mb-4">
                                Upgrade to Silver or Gold tier to monetize your points.
                            </Text>
                            <View className="bg-white dark:bg-zinc-950 px-5 py-3 rounded-xl self-start border-b-4 border-gray-200 dark:border-zinc-800">
                                <Text className="text-[#FFC800] font-bold text-[15px] uppercase tracking-wider">{t('common.upgrade')}</Text>
                            </View>
                        </View>
                        <View className="absolute right-[-10px] bottom-[-20px] opacity-70">
                            <Trophy size={140} color="#E5B400" />
                        </View>
                    </TactileButton>
                )}

                {/* Mock Exams Access */}
                <View className="mb-8">
                    <Text className="text-black dark:text-white font-bold text-xl tracking-tight mb-4">{t('home.prep')}</Text>
                    <TactileButton
                        onPress={() => router.push('/mock-exams')}
                        backgroundColor={isDark ? '#1E222B' : '#FFFFFF'}
                        shadowColor={isDark ? '#272B36' : '#E5E5E5'}
                        depth={6}
                        contentClassName="p-5 flex-row items-center justify-between"
                    >
                        <View className="flex-1 mr-4">
                            <Text className="text-[#4B4B4B] dark:text-white font-bold text-lg mb-1">{t('home.mock_exams')}</Text>
                            <Text className="text-gray-500 dark:text-gray-400">{t('home.mock_desc')}</Text>
                        </View>
                        <View className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 items-center justify-center border-2 border-[#1CB0F6]">
                            <Clock size={24} color="#1CB0F6" />
                        </View>
                    </TactileButton>
                </View>




                {/* Popular on Stake / Top Subjects */}
                <View className="mb-6">
                    <Text className="text-black dark:text-white font-bold text-xl tracking-tight mb-6">{t('home.explore')}</Text>

                    {/* Dynamic Subjects */}
                    {subjects.length > 0 ? (
                        subjects.map((subject, index) => {
                            const colors = [
                                { bg: '#F59E0B', border: '#D97706' }, // Amber
                                { bg: '#1CB0F6', border: '#1899D6' }, // Blue
                                { bg: '#CE82FF', border: '#A552DE' }, // Purple
                                { bg: '#FF4B4B', border: '#EA2B2B' }, // Red
                            ];
                            const theme = colors[index % colors.length];

                            return (
                                <View key={subject.id} className="mb-4">
                                    <TactileButton
                                        onPress={() => router.push(`/course-detail?id=${subject.id}`)}
                                        backgroundColor={theme.bg}
                                        shadowColor={theme.border}
                                        depth={6}
                                        contentClassName="p-5 flex-row items-center justify-between overflow-hidden"
                                    >
                                        <View>
                                            <Text className="text-white font-black text-2xl mb-1">{subject.name}</Text>
                                            <Text className="text-white/80 font-bold text-sm tracking-wider uppercase">
                                                {subject.topics?.length || 0} {t('home.topics')}
                                            </Text>
                                        </View>
                                        <View className="w-12 h-12 bg-black/10 dark:bg-black/20 rounded-full items-center justify-center">
                                            <ArrowUpRight size={24} color="#FFF" />
                                        </View>
                                    </TactileButton>
                                </View>
                            )
                        })
                    ) : (
                        <Text className="text-[#AFAFAF] font-bold text-[17px] text-center py-10">{t('common.loading')}</Text>
                    )}
                </View>
                
                {/* Scroll spacer */}
                <View style={{ height: 80 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

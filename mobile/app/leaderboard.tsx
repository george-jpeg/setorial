import { SoundButton } from '../components/SoundButton';
import { TactileButton } from '../components/TactileButton';
import Animated, { SlideInLeft, SlideInUp } from 'react-native-reanimated';
import { View, Text, ScrollView, ActivityIndicator, Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Crown, Medal } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { gamificationApi, learningApi } from "../services/api";
import { useAuthStore } from '../store/authStore';

function LeaderboardScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const subRes = await learningApi.getSubjects();
                setSubjects(subRes.data);
            } catch (e) {
                console.error('Failed to fetch subjects:', e);
            }
            await fetchLeaderboard();
            setLoading(false);
        };
        init();
    }, []);

    const fetchLeaderboard = async (subjectId?: string) => {
        try {
            const res = await gamificationApi.getLeaderboard(subjectId || undefined);
            setLeaderboard(res.data);
        } catch (error) {
            console.error('Failed to fetch leaderboard:', error);
        }
    };

    const handleSubjectSelect = async (id: string | null) => {
        setSelectedSubject(id);
        setLoading(true);
        await fetchLeaderboard(id || undefined);
        setLoading(false);
    };

    if (loading && leaderboard.length === 0) {
        return (
            <View className="flex-1 bg-white dark:bg-[#0B0D12] items-center justify-center">
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    const topThree = leaderboard.slice(0, 3);
    const others = leaderboard.slice(3, 15);
    
    const userRankIndex = leaderboard.findIndex(u => u.id === user?.id);
    const userRank = userRankIndex !== -1 ? userRankIndex + 1 : null;
    const isUserOutsideTop15 = userRank !== null && userRank > 15;
    const currentUserData = isUserOutsideTop15 ? leaderboard[userRankIndex] : null;

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            <View className="flex-1 px-5">
                {/* Header */}
                <View className="flex-row items-center justify-between py-6">
                    <SoundButton onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                        <ChevronLeft size={24} color="#AFAFAF" />
                    </SoundButton>
                    <Text className="text-black dark:text-white font-bold text-xl">{selectedSubject ? subjects.find(s => s.id === selectedSubject)?.name : 'Global'} Leaderboard</Text>
                    <View className="w-10" />
                </View>

                {/* Subject Selector */}
                <View className="mb-6">
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row pb-2">
                        <View className="mr-3">
                            <TactileButton
                                onPress={() => handleSubjectSelect(null)}
                                backgroundColor={!selectedSubject ? '#1CB0F6' : '#FFFFFF'}
                                shadowColor={!selectedSubject ? '#1899D6' : '#E5E5E5'}
                                depth={4}
                                contentClassName="px-6 py-3"
                            >
                                <Text className={`font-bold uppercase tracking-widest text-xs ${!selectedSubject ? 'text-white' : 'text-[#AFAFAF] dark:text-gray-400'}`}>Global</Text>
                            </TactileButton>
                        </View>
                        {subjects.map((subject) => (
                            <View key={subject.id} className="mr-3">
                                <TactileButton
                                    onPress={() => handleSubjectSelect(subject.id)}
                                    backgroundColor={selectedSubject === subject.id ? '#1CB0F6' : '#FFFFFF'}
                                    shadowColor={selectedSubject === subject.id ? '#1899D6' : '#E5E5E5'}
                                    depth={4}
                                    contentClassName="px-6 py-3"
                                >
                                    <Text className={`font-bold uppercase tracking-widest text-xs ${selectedSubject === subject.id ? 'text-white' : 'text-[#AFAFAF] dark:text-gray-400'}`}>{subject.name}</Text>
                                </TactileButton>
                            </View>
                        ))}
                    </ScrollView>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                    {/* Podium Section */}
                    <View className="flex-row items-end justify-center mb-10 pt-6">
                        {/* 2nd Place */}
                        {topThree[1] && (
                            <PodiumItem
                                user={topThree[1]}
                                rank={2}
                                height={140}
                                color="bg-gray-100 dark:bg-zinc-800"
                                icon={<Medal size={20} color="#94A3B8" />}
                                isCurrentUser={topThree[1].id === user?.id}
                            />
                        )}
                        {/* 1st Place */}
                        {topThree[0] && (
                            <PodiumItem
                                user={topThree[0]}
                                rank={1}
                                height={180}
                                color="bg-yellow-100"
                                icon={<Crown size={24} color="#EAB308" />}
                                isCurrentUser={topThree[0].id === user?.id}
                            />
                        )}
                        {/* 3rd Place */}
                        {topThree[2] && (
                            <PodiumItem
                                user={topThree[2]}
                                rank={3}
                                height={120}
                                color="bg-orange-50"
                                icon={<Medal size={20} color="#92400E" />}
                                isCurrentUser={topThree[2].id === user?.id}
                            />
                        )}
                    </View>

                    {/* Others List 4-15 */}
                    <View className="bg-white dark:bg-[#0B0D12] p-6 mb-4 min-h-[400px]">
                        <Text className="text-[#AFAFAF] dark:text-gray-500 font-bold mb-6 text-sm uppercase tracking-widest text-center">Top Performers</Text>
                        {others.map((item, index) => {
                            const actualRank = index + 4;
                            const isCurrentUser = item.id === user?.id;
                            const isLastItem = index === others.length - 1 && others.length >= 12;
                            return (
                                <Animated.View key={item.id} entering={SlideInLeft.delay(index * 100).springify()} style={{ opacity: isLastItem ? 0.4 : 1 }}>
                                    <TactileButton
                                        backgroundColor={isCurrentUser ? "#FEF3C7" : "#FFFFFF"}
                                        shadowColor={isCurrentUser ? "#FDE68A" : "#E5E5E5"}
                                        depth={4}
                                        style={{ width: '100%', marginBottom: 12 }}
                                        contentClassName="p-4 flex-row items-center justify-between"
                                    >
                                        <View className="flex-row items-center flex-1 mr-3">
                                            <Text className={`${isCurrentUser ? 'text-amber-500' : 'text-[#AFAFAF]'} font-black w-6 text-base`}>{actualRank}</Text>
                                            <View className={`w-10 h-10 rounded-full bg-[#F5F5F5] mr-3 overflow-hidden border-2 ${isCurrentUser ? 'border-amber-400' : 'border-[#E5E5E5]'}`}>
                                                <Image source={{ uri: item.avatarUrl || `https://i.pravatar.cc/100?u=${item.id}` }} className="w-full h-full rounded-full" />
                                            </View>
                                            <View className="flex-1 justify-center">
                                                <Text 
                                                    className={`${isCurrentUser ? 'text-amber-700 dark:text-amber-400' : 'text-gray-900 dark:text-white'} font-bold text-sm`}
                                                    numberOfLines={1}
                                                    ellipsizeMode="tail"
                                                >
                                                    {isCurrentUser ? 'You' : (item.name || 'Student')}
                                                </Text>
                                                <Text className={`${isCurrentUser ? 'text-amber-500' : 'text-[#AFAFAF] dark:text-gray-400'} text-[11px] font-bold`}>Rank #{actualRank}</Text>
                                            </View>
                                        </View>
                                        <View className={`${isCurrentUser ? 'bg-amber-400 border-amber-500' : 'bg-[#FFC800] border-[#E5B400]'} px-3 py-1.5 rounded-xl border-b-4 flex-shrink-0`}>
                                            <Text className={`${isCurrentUser ? 'text-white' : 'text-yellow-950'} font-extrabold text-xs uppercase tracking-wider`}>{item.points} pts</Text>
                                        </View>
                                    </TactileButton>
                                </Animated.View>
                            );
                        })}
                    </View>

                    {/* Current User Floating Rank (if outside top 15) */}
                    {isUserOutsideTop15 && currentUserData && (
                        <View className="px-6 pb-10">
                            <Text className="text-center text-gray-400 font-bold mb-4 uppercase tracking-widest text-xs">Your Rank</Text>
                            <Animated.View entering={SlideInUp.springify()}>
                                <TactileButton
                                    backgroundColor="#FEF3C7"
                                    shadowColor="#FDE68A"
                                    depth={4}
                                    style={{ width: '100%' }}
                                    contentClassName="p-4 flex-row items-center justify-between"
                                >
                                    <View className="flex-row items-center flex-1 mr-3">
                                        <Text className="text-amber-500 font-black w-8 text-base text-center">{userRank}</Text>
                                        <View className="w-10 h-10 rounded-full bg-[#F5F5F5] mr-3 overflow-hidden border-2 border-amber-400">
                                            <Image source={{ uri: currentUserData.avatarUrl || `https://i.pravatar.cc/100?u=${currentUserData.id}` }} className="w-full h-full rounded-full" />
                                        </View>
                                        <View className="flex-1 justify-center">
                                            <Text 
                                                className="text-amber-700 dark:text-amber-400 font-bold text-sm"
                                                numberOfLines={1}
                                                ellipsizeMode="tail"
                                            >
                                                You
                                            </Text>
                                            <Text className="text-amber-500 text-[11px] font-bold">Rank #{userRank}</Text>
                                        </View>
                                    </View>
                                    <View className="bg-amber-400 px-3 py-1.5 rounded-xl border-b-4 border-amber-500 flex-shrink-0">
                                        <Text className="text-white font-extrabold text-xs uppercase tracking-wider">{currentUserData.points} pts</Text>
                                    </View>
                                </TactileButton>
                            </Animated.View>
                        </View>
                    )}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

function PodiumItem({ user, rank, height, color, icon, isCurrentUser }: any) {
    const isWinner = rank === 1;
    return (
        <Animated.View entering={SlideInUp.delay(rank * 100).springify().damping(22).stiffness(100).mass(0.8)} className="items-center mx-2 w-28">
            <View className="relative mb-4 z-10">
                <View className={`w-16 h-16 rounded-full border-4 ${isCurrentUser ? 'border-amber-400' : 'border-white'} overflow-hidden shadow-sm ${color}`}>
                    <Image source={{ uri: user.avatarUrl || `https://i.pravatar.cc/100?u=${user.id}` }} className="w-full h-full" />
                </View>
                <View className="absolute top-[-20] self-center bg-white dark:bg-zinc-950 rounded-full p-1 border-2 border-[#E5E5E5]">
                    {icon}
                </View>
            </View>
            <View
                style={{ height }}
                className={`${color} w-full rounded-t-3xl items-center pt-8 border-2 border-b-0 ${isWinner ? 'border-[#E5B400] z-0' : 'border-[#CECECE] opacity-90 -mt-8'}`}
            >
                <Text className="text-black dark:text-white/60 font-black uppercase tracking-widest text-sm mb-1">#{rank}</Text>
                <Text className="text-black dark:text-white font-extrabold text-2xl">{user.points}</Text>
                <Text numberOfLines={1} ellipsizeMode="tail" className={`${isCurrentUser ? 'text-amber-500 font-black' : 'text-black dark:text-white/70 font-bold'} text-[11px] mt-2 uppercase tracking-wide px-1`}>{isCurrentUser ? 'You' : (user.name?.split(' ')[0] || 'User')}</Text>
            </View>
        </Animated.View>
    );
}

export default LeaderboardScreen;

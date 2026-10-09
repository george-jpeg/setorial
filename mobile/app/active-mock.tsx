import { SoundButton } from '../components/SoundButton';
import { TactileButton } from '../components/TactileButton';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, ScrollView, AppState, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, Grid } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef, useMemo } from 'react';
import { mockApi } from '../services/api';
import { MathText } from '../components/MathText';
import { feedback } from '../lib/feedback';

export default function ActiveMockScreen() {
    const { attemptId, mockId } = useLocalSearchParams();
    const router = useRouter();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const [mock, setMock] = useState<any>(null);
    const [answers, setAnswers] = useState<number[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [showPalette, setShowPalette] = useState(false);
    const [timeLeft, setTimeLeft] = useState(0);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const appState = useRef(AppState.currentState);

    useEffect(() => {
        fetchMock();
    }, []);

    const normalizeOptions = (raw: any): string[] => {
        if (!raw) return ['Option A', 'Option B', 'Option C', 'Option D'];
        if (Array.isArray(raw)) return raw.map(String);
        if (typeof raw === 'string') {
            try {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed.map(String);
                if (parsed && typeof parsed === 'object') return Object.values(parsed).map(String);
            } catch {
                return [raw];
            }
        }
        if (typeof raw === 'object') return Object.values(raw).map(String);
        return [String(raw)];
    };

    const fetchMock = async () => {
        try {
            const res = await mockApi.getDetails(mockId as string);
            const data = res.data;
            if (!data || !data.questions || data.questions.length === 0) {
                Alert.alert('No Questions', 'This mock exam does not contain any questions yet.', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
                return;
            }
            setMock(data);
            setTimeLeft((data.durationMinutes || 60) * 60);
            setAnswers(new Array(data.questions.length).fill(-1));
        } catch (error: any) {
            console.error('Failed to load mock details', error);
            Alert.alert('Error', error.response?.data?.message || 'Failed to load mock details');
            router.back();
        }
    };

    // Timer Logic
    useEffect(() => {
        if (!mock) return;
        if (timeLeft <= 0) {
            handleSubmit();
            return;
        }

        const interval = setInterval(() => {
            setTimeLeft((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(interval);
    }, [timeLeft, mock]);

    // Anti-Cheat (AppState) Trackers
    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextAppState => {
            if (
                appState.current.match(/inactive|background/) &&
                nextAppState === 'active'
            ) {
                // Return to App
                setTabSwitches((prev) => prev + 1);
                feedback.warning();
                Alert.alert(
                    "Warning: App Switched",
                    "Switching apps or closing the exam window is treated as an anti-cheat violation. Doing this too many times will nullify your score."
                );
            }
            appState.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

    const handleSelectOption = (optIndex: number) => {
        feedback.optionSelect();
        setAnswers((prev) => {
            const newAnswers = [...prev];
            newAnswers[currentQIndex] = optIndex;
            return newAnswers;
        });
    };

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const res = await mockApi.submit(attemptId as string, answers, tabSwitches);
            if (res.data.status === 'CHEATED') {
                Alert.alert('Exam Nullified', `Your exam was flagged for cheating due to excessive app switches. Score: 0.`);
                router.replace('/(tabs)');
            } else {
                router.replace({
                    pathname: '/mock-result',
                    params: { data: JSON.stringify(res.data) }
                });
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit exam');
            router.replace('/(tabs)');
        } finally {
            setIsSubmitting(false);
        }
    };

    const confirmSubmit = () => {
        const answeredCount = answers.filter(a => a !== -1).length;
        const total = mock?.questions?.length || 0;
        Alert.alert(
            "Submit Exam?",
            `You have answered ${answeredCount} of ${total} questions. Are you ready to submit your exam?`,
            [
                { text: "Continue Test", style: "cancel" },
                { text: "Submit Now", style: "destructive", onPress: handleSubmit }
            ]
        );
    };

    if (!mock) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12] items-center justify-center">
                <Text className="text-gray-500 dark:text-white font-bold">Preparing Mock Exam...</Text>
            </SafeAreaView>
        );
    }

    const totalQuestions = mock.questions.length;
    const currentQ = mock.questions[currentQIndex] || {};
    const options = normalizeOptions(currentQ.options);
    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;
    const answeredCount = answers.filter(a => a !== -1).length;

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-3 border-b-2 border-[#E5E5E5] dark:border-[#272B36]">
                <SoundButton onPress={confirmSubmit} className="p-1">
                    <ArrowLeft size={24} color={isDark ? '#FFF' : '#000'} />
                </SoundButton>

                <View className="items-center flex-1 mx-2">
                    <Text className="text-black dark:text-white font-black text-base" numberOfLines={1}>
                        {mock.title}
                    </Text>
                    <Text className="text-gray-400 text-xs font-bold">
                        Question {currentQIndex + 1} of {totalQuestions}
                    </Text>
                </View>

                <View className="flex-row items-center space-x-2">
                    <TouchableOpacity 
                        onPress={() => setShowPalette(!showPalette)}
                        className={`p-2 rounded-xl border ${showPalette ? 'bg-amber-100 border-amber-400' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700'}`}
                    >
                        <Grid size={18} color={showPalette ? '#D97706' : (isDark ? '#FFF' : '#374151')} />
                    </TouchableOpacity>

                    <View className="bg-red-100 dark:bg-red-900/30 px-2.5 py-1.5 rounded-xl flex-row items-center">
                        <Clock size={14} color="#FF4B4B" />
                        <Text className="text-[#FF4B4B] font-black text-xs ml-1 tracking-widest">
                            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Question Palette Dropdown / Grid */}
            {showPalette && (
                <View className="bg-gray-50 dark:bg-[#1A1D24] p-4 border-b-2 border-gray-200 dark:border-gray-800 max-h-48">
                    <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                        Jump to Question ({answeredCount}/{totalQuestions} Answered)
                    </Text>
                    <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {mock.questions.map((_: any, idx: number) => {
                            const isAnswered = answers[idx] !== -1;
                            const isCurrent = currentQIndex === idx;
                            return (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => {
                                        setCurrentQIndex(idx);
                                        setShowPalette(false);
                                    }}
                                    className={`w-9 h-9 rounded-lg items-center justify-center border font-bold text-xs ${
                                        isCurrent 
                                            ? 'bg-amber-500 border-amber-600' 
                                            : isAnswered 
                                                ? 'bg-emerald-500 border-emerald-600' 
                                                : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700'
                                    }`}
                                >
                                    <Text className={`font-black text-xs ${isCurrent || isAnswered ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                        {idx + 1}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                </View>
            )}

            {/* Progress Bar */}
            <View className="h-1 bg-gray-100 dark:bg-gray-800 w-full">
                <View 
                    style={{ width: `${Math.round(((currentQIndex + 1) / totalQuestions) * 100)}%` }} 
                    className="h-full bg-amber-500"
                />
            </View>

            {/* Main Question Container */}
            <ScrollView className="flex-1 px-5 pt-5 pb-10" showsVerticalScrollIndicator={false}>
                <Animated.View key={`q_${currentQIndex}`} entering={FadeIn.duration(200)} className="mb-6">
                    <MathText 
                        content={`${currentQIndex + 1}. ${currentQ.text || 'Question'}`} 
                        fontSize={19} 
                        containerStyle={{ marginBottom: 20 }} 
                        color={isDark ? '#FFFFFF' : '#171717'} 
                    />

                    {options.map((opt: string, optIndex: number) => {
                        const isSelected = answers[currentQIndex] === optIndex;
                        return (
                            <SoundButton
                                key={optIndex}
                                activeOpacity={0.8}
                                onPress={() => handleSelectOption(optIndex)}
                                className={`p-4 rounded-xl border-2 border-b-4 mb-3 flex-row items-center
                                    ${isSelected
                                        ? 'bg-blue-50 dark:bg-[#1C2C47] border-[#1CB0F6] dark:border-[#1CB0F6]'
                                        : 'bg-white dark:bg-[#1E222B] border-[#E5E5E5] dark:border-[#272B36]'}`}
                            >
                                <View className={`w-7 h-7 rounded-full border-2 items-center justify-center mr-3
                                    ${isSelected ? 'border-[#1CB0F6] bg-[#1CB0F6]' : 'border-[#CBD5E1] dark:border-[#4B4B4B]'}`}>
                                    {isSelected ? (
                                        <View className="w-2.5 h-2.5 rounded-full bg-white" />
                                    ) : (
                                        <Text className="text-gray-400 text-xs font-bold">
                                            {String.fromCharCode(65 + optIndex)}
                                        </Text>
                                    )}
                                </View>
                                <View style={{ flex: 1 }}>
                                    <MathText 
                                        content={opt} 
                                        color={isSelected ? '#1CB0F6' : (isDark ? '#FFFFFF' : '#4B4B4B')} 
                                        fontSize={16} 
                                    />
                                </View>
                            </SoundButton>
                        );
                    })}
                </Animated.View>
            </ScrollView>

            {/* Bottom CBT Navigation Controls */}
            <View className="px-5 py-4 border-t-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0B0D12] flex-row items-center justify-between">
                <TouchableOpacity
                    disabled={currentQIndex === 0}
                    onPress={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
                    className={`flex-row items-center py-3 px-4 rounded-xl border ${currentQIndex === 0 ? 'opacity-30 border-gray-200' : 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700'}`}
                >
                    <ChevronLeft size={18} color={isDark ? '#FFF' : '#374151'} />
                    <Text className="font-bold text-sm ml-1 text-gray-700 dark:text-gray-200">Prev</Text>
                </TouchableOpacity>

                {currentQIndex < totalQuestions - 1 ? (
                    <TactileButton
                        onPress={() => setCurrentQIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                        backgroundColor="#1CB0F6"
                        shadowColor="#0284C7"
                        contentClassName="py-3 px-6 flex-row items-center justify-center"
                        className="rounded-xl"
                    >
                        <Text className="text-white font-bold text-sm uppercase tracking-wider mr-1">Next</Text>
                        <ChevronRight size={18} color="#FFF" />
                    </TactileButton>
                ) : (
                    <TactileButton
                        onPress={confirmSubmit}
                        disabled={isSubmitting}
                        backgroundColor="#F59E0B"
                        shadowColor="#D97706"
                        contentClassName="py-3 px-6 flex-row items-center justify-center"
                        className="rounded-xl"
                    >
                        <CheckCircle2 size={18} color="#FFF" style={{ marginRight: 6 }} />
                        <Text className="text-white font-black text-sm uppercase tracking-wider">
                            {isSubmitting ? 'Submitting...' : 'Finish Exam'}
                        </Text>
                    </TactileButton>
                )}
            </View>
        </SafeAreaView>
    );
}

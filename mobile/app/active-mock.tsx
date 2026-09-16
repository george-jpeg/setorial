import { SoundButton } from '../components/SoundButton';
import { TactileButton } from '../components/TactileButton';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { View, Text, TouchableOpacity, ScrollView, AppState, Alert, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock, ArrowLeft, CheckCircle2 } from 'lucide-react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
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
    const [timeLeft, setTimeLeft] = useState(0);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const appState = useRef(AppState.currentState);

    useEffect(() => {
        fetchMock();
    }, []);

    const fetchMock = async () => {
        try {
            const res = await mockApi.getDetails(mockId as string);
            setMock(res.data);
            setTimeLeft(res.data.durationMinutes * 60);
            setAnswers(new Array(res.data.questions.length).fill(-1));
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load mock details');
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

    const handleSelectOption = (qIndex: number, optIndex: number) => {
        feedback.optionSelect();
        setAnswers((prev) => {
            const newAnswers = [...prev];
            newAnswers[qIndex] = optIndex;
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
            } else {
                router.replace({
                    pathname: '/mock-result',
                    params: { data: JSON.stringify(res.data) }
                });
            }
        } catch (error: any) {
            Alert.alert('Error', error.response?.data?.message || 'Failed to submit exam');
            router.replace('/(tabs)');
        }
    };

    const confirmSubmit = () => {
        Alert.alert(
            "Submit Exam?",
            "Are you sure you want to finish and submit your answers?",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Submit", onPress: handleSubmit }
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

    const minutes = Math.floor(timeLeft / 60);
    const seconds = timeLeft % 60;

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b-2 border-[#E5E5E5] dark:border-[#272B36]">
                <SoundButton onPress={confirmSubmit}>
                    <ArrowLeft size={24} color={isDark ? '#FFF' : '#000'} />
                </SoundButton>
                <Text className="text-black dark:text-white font-bold text-lg">{mock.title}</Text>

                <View className="bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full flex-row items-center">
                    <Clock size={16} color="#FF4B4B" />
                    <Text className="text-[#FF4B4B] font-bold ml-1 tracking-widest">
                        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                    </Text>
                </View>
            </View>

            <ScrollView className="flex-1 px-5 pt-6 pb-20" showsVerticalScrollIndicator={false}>
                {mock.questions.map((q: any, qIndex: number) => (
                    <Animated.View key={q.id} entering={FadeIn.delay(qIndex * 80 + 100)} className="mb-6">
                        <MathText content={`${qIndex + 1}. ${q.text}`} fontSize={20} containerStyle={{ marginBottom: 16 }} color={isDark ? '#FFFFFF' : '#171717'} />

                        {q.options.map((opt: string, optIndex: number) => {
                            const isSelected = answers[qIndex] === optIndex;
                            return (
                                <SoundButton
                                    key={optIndex}
                                    activeOpacity={0.8}
                                    onPress={() => handleSelectOption(qIndex, optIndex)}
                                    className={`p-4 rounded-xl border-2 border-b-4 mb-2 flex-row items-center
                                        ${isSelected
                                            ? 'bg-blue-50 dark:bg-[#1C2C47] border-[#1CB0F6] dark:border-[#1CB0F6]'
                                            : 'bg-white dark:bg-[#1E222B] border-[#E5E5E5] dark:border-[#272B36]'}`}
                                >
                                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center mr-3
                                        ${isSelected ? 'border-[#1CB0F6] bg-[#1CB0F6]' : 'border-[#E5E5E5] dark:border-[#4B4B4B]'}`}>
                                        {isSelected && <View className="w-2 h-2 rounded-full bg-white" />}
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <MathText content={opt} color={isSelected ? '#1CB0F6' : (isDark ? '#FFFFFF' : '#4B4B4B')} fontSize={16} />
                                    </View>
                                </SoundButton>
                            );
                        })}
                    </Animated.View>
                ))}

                <Animated.View entering={FadeInDown.delay(300).springify()}>
                    <TactileButton
                        onPress={confirmSubmit}
                        disabled={isSubmitting}
                        backgroundColor="#F59E0B"
                        shadowColor="#D97706"
                        contentClassName="py-4 flex-row items-center justify-center"
                        className="rounded-2xl"
                    >
                        <CheckCircle2 size={24} color="#FFF" style={{ marginRight: 8 }} />
                        <Text className="text-white font-bold text-lg uppercase tracking-wider">
                            Submit Exam
                        </Text>
                    </TactileButton>
                </Animated.View>
                {/* Scroll spacer to match homepage spacing */}
                <View style={{ height: 80 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

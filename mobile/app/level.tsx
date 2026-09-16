import React, { useState, useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Dimensions, useColorScheme, Linking, TextInput, StyleSheet, Image, Platform } from "react-native";
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe';
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, CheckCircle2, XCircle, Trophy, ArrowRight, Home, BookOpen, Heart, RefreshCcw, Flame, Timer } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useVideoPlayer, VideoView } from 'expo-video';
import Animated, { FadeIn, FadeInDown, FadeInUp, FadeOut, SlideInDown, SlideInRight, SlideOutLeft, ZoomIn, useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, useDerivedValue, withDelay, useAnimatedProps, SharedValue } from 'react-native-reanimated';
import * as SecureStore from 'expo-secure-store';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native';

import { learningApi } from "../services/api";
import { emit } from '../lib/eventBus';
import { MathText } from "../components/MathText";
import { feedback } from "../lib/feedback";
import { MascotInteraction } from '../components/MascotInteraction';
import { FillInTheBlank } from '../components/FillInTheBlank';
import { ShiningProgressBar } from '../components/ShiningProgressBar';
import { TactileButton } from '../components/TactileButton';
import { SoundButton } from '../components/SoundButton';
import { useAuthStore } from '../store/authStore';

const { width } = Dimensions.get('window');

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function ReText({ style, text }: { style?: any; text: SharedValue<string> }) {
  const animatedProps = useAnimatedProps(() => {
    return {
      text: text.value,
    } as any;
  });

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      defaultValue={text.value}
      caretHidden
      selectionColor="transparent"
      contextMenuHidden
      style={style}
      animatedProps={animatedProps}
    />
  );
}

function MarkdownText({ content }: { content: string }) {
    return <MathText content={content} fontSize={16} />;
}

export default function LevelScreen() {
    const router = useRouter();
    const { user } = useAuthStore();
    const { id } = useLocalSearchParams();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    
    const [lesson, setLesson] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const startTime = useRef(Date.now());
    const [phase, setPhase] = useState<'reading' | 'questions' | 'finished'>('reading');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<number | null>(null);
    const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
    const [showNext, setShowNext] = useState(false);
    const [answers, setAnswers] = useState<number[]>([]);
    const [result, setResult] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [hearts, setHearts] = useState(5);
    const [showResumePrompt, setShowResumePrompt] = useState(false);
    const [savedSession, setSavedSession] = useState<any>(null);

    // Animation values
    const checkScale = useSharedValue(1);
    const progress = useSharedValue(0);
    const xpValue = useSharedValue(0);
    const lottieRef = useRef<LottieView>(null);

    useEffect(() => {
        if (lesson?.questions?.length > 0) {
            progress.value = withSpring(currentIndex / lesson.questions.length, {
                damping: 15,
                stiffness: 90
            });
        }
    }, [currentIndex, lesson]);

    useEffect(() => {
        if (id) {
            checkSavedSession();
            fetchLesson();
        }
                                ) : (
                                    videoStarted ? (
                                        <YoutubePlayer
                                            height={210}
                                            play={true}
                                            videoId={youTubeId as string}
                                            onChangeState={(state) => {
                                                // state can be 'playing', 'paused', 'ended', 'buffering', 'unstarted', 'cued', 'error'
                                                if (state === 'error') {
                                                    console.warn('YouTube iframe player error state', state);
                                                    if (youTubeId) setVideoFailedId(youTubeId);
                                                    setVideoStarted(false);
                                                }
                                            }}
                                            onError={(e: any) => {
                                                console.warn('YouTube iframe player error', e);
                                                if (youTubeId) setVideoFailedId(youTubeId);
                                                setVideoStarted(false);
                                            }}
                                        />
                                    ) : (
    };

    const resumeSession = () => {
        if (savedSession) {
            setCurrentIndex(savedSession.currentIndex || 0);
            setAnswers(savedSession.answers || []);
            setHearts(savedSession.hearts ?? 5);
            setPhase('questions');
        }
        setShowResumePrompt(false);
    };

    const startFresh = async () => {
        await SecureStore.deleteItemAsync(`lesson_session_${id}`);
        setShowResumePrompt(false);
    };

    useEffect(() => {
        if (phase === 'questions' && lesson) {
            SecureStore.setItemAsync(`lesson_session_${id}`, JSON.stringify({
                currentIndex,
                answers,
                hearts
            })).catch(() => {});
        }
    }, [currentIndex, answers, hearts, phase]);

    const xpText = useDerivedValue(() => {
        return `${Math.round(xpValue.value)}`;
    });

    useEffect(() => {
        if (phase === 'finished' && result?.passed) {
            const xp = result?.pointsEarned || 40;
            xpValue.value = withDelay(800, withTiming(xp, { duration: 1500 }));
            const timer = setTimeout(() => {
                lottieRef.current?.play();
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [phase, result]);

    const handleOptionSelect = (index: number | null) => {
        if (showNext) return;
        setSelectedOption(index);
        if (index !== null) {
            feedback.optionSelect();
            checkScale.value = withSequence(withSpring(1.05), withSpring(1));
        }
    };

    const handleCheck = () => {
        if (selectedOption === null) return;
        const correct = lesson.questions[currentIndex].correctOption === selectedOption;
        setIsCorrect(correct);
        setShowNext(true);
        checkScale.value = withSequence(withSpring(1.1, { damping: 10, stiffness: 200 }), withSpring(1));
        if (correct) {
            feedback.correctAnswer();
        } else {
            feedback.wrongAnswer();
            setHearts(prev => Math.max(0, prev - 1));
        }
    };

    const handleNext = () => {
        const newAnswers = [...answers, selectedOption!];
        setAnswers(newAnswers);
        setSelectedOption(null);
        setIsCorrect(null);
        setShowNext(false);

        if (currentIndex < lesson.questions.length - 1) {
            setCurrentIndex(currentIndex + 1);
        } else {
            submitLesson(newAnswers);
        }
    };

    const submitLesson = async (finalAnswers: number[]) => {
        setSubmitting(true);
        try {
            await SecureStore.deleteItemAsync(`lesson_session_${id}`);
            const res = await learningApi.submitLesson({
                lessonId: id as string,
                answers: finalAnswers
            });
            setResult(res.data);
            setPhase('finished');
            // notify listeners (subject/course pages) that a lesson was completed
            try { emit('lessonCompleted', { lessonId: lesson.id }); } catch (e) {}
            if (res.data.passed) {
                feedback.victory();
                try {
                    const { user, updateUser } = useAuthStore.getState();
                    const oldStreak = user?.streak || 0;
                    const meRes = await import('../services/api').then(m => m.authApi.getMe());
                    if (meRes.data) {
                        await updateUser(meRes.data);
                        const newStreak = meRes.data.streak || 0;
                        if (newStreak > oldStreak && newStreak >= 2) {
                            setTimeout(() => {
                                router.push({ pathname: '/streak-celebration', params: { streak: String(newStreak) } });
                            }, 1500);
                        }
                    }
                } catch (e) {
                    console.log('Streak check failed:', e);
                }
            } else {
                feedback.tryAgain();
            }
        } catch (error) {
            console.error('Failed to submit lesson:', error);
            alert('Failed to submit lesson. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const isYouTube = lesson?.videoUrl && /youtube\.com|youtu\.be/.test(lesson.videoUrl);

    const extractYouTubeId = (url: string | undefined) => {
        if (!url) return null;
        // common formats: https://www.youtube.com/watch?v=VIDEOID or https://youtu.be/VIDEOID
        const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (shortMatch && shortMatch[1]) return shortMatch[1];
        const longMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (longMatch && longMatch[1]) return longMatch[1];
        // embed url
        const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
        if (embedMatch && embedMatch[1]) return embedMatch[1];
        return null;
    };

    const youTubeId = extractYouTubeId(lesson?.videoUrl);

    const player = useVideoPlayer((!isYouTube ? (lesson?.videoUrl || '') : ''), (player) => {
        player.loop = false;
    });

    const [videoStarted, setVideoStarted] = useState(false);
    const [videoFailedId, setVideoFailedId] = useState<string | null>(null);

    const handleRecordPlay = async () => {
        if (videoStarted) return;
        // If we've previously seen a playback failure for this YouTube id,
        // open externally instead of retrying the embedded player to avoid Error 153 loops.
        if (youTubeId && videoFailedId === youTubeId) {
            try {
                await Linking.openURL(lesson.videoUrl);
                return;
            } catch (e) {
                console.warn('Failed to open external YouTube URL', e);
            }
        }

        setVideoStarted(true);
        try {
            await learningApi.recordVideoPlay(id as string);
        } catch (e) {
            // ignore failures silently
            console.log('record play failed', e);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-white dark:bg-[#0B0D12] items-center justify-center">
                <ActivityIndicator size="large" color="#F59E0B" />
            </View>
        );
    }

    if (!lesson) {
        return (
            <View className="flex-1 bg-white dark:bg-[#0B0D12] items-center justify-center p-5">
                <Text className="text-gray-500 dark:text-gray-400 mb-4 font-medium">Lesson not found</Text>
                <SoundButton onPress={() => router.back()} className="bg-black px-6 py-3 rounded-full">
                    <Text className="text-white font-bold">Go Back</Text>
                </SoundButton>
            </View>
        );
    }

    if (showResumePrompt && lesson && phase === 'reading') {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
                <View className="flex-1 items-center justify-center px-8">
                    <View className="w-24 h-24 bg-blue-100 dark:bg-blue-900/30 rounded-full items-center justify-center mb-6">
                        <RefreshCcw size={48} color="#1899D6" />
                    </View>
                    <Text className="text-3xl font-black text-center text-gray-900 dark:text-white mb-4">Resume Lesson?</Text>
                    <Text className="text-gray-500 dark:text-gray-400 text-lg text-center mb-10 font-medium">
                        We saved your progress from last time. Would you like to pick up where you left off?
                    </Text>
                    
                    <View className="w-full">
                        <TactileButton 
                            onPress={resumeSession} 
                            backgroundColor="#1CB0F6"
                            shadowColor="#1899D6"
                            contentClassName="w-full p-4 items-center justify-center"
                            className="mb-4"
                        >
                            <Text className="text-white font-bold text-[17px] uppercase tracking-wider">Resume</Text>
                        </TactileButton>
                        
                        <TactileButton 
                            onPress={startFresh} 
                            backgroundColor={isDark ? '#0B0D12' : '#FFFFFF'}
                            shadowColor={isDark ? '#1E222B' : '#E5E5E5'}
                            contentClassName="w-full p-4 items-center justify-center"
                        >
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-[17px] uppercase tracking-wider">Start Over</Text>
                        </TactileButton>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'questions' && hearts === 0) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
                <View className="flex-1 px-8 items-center justify-center">
                    <Animated.View entering={FadeIn} className="items-center w-full">
                        <View className="w-24 h-24 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mb-6">
                            <Heart size={48} color="#FF4B4B" fill="#FF4B4B" />
                        </View>
                        <Text className="text-3xl font-black text-black dark:text-white mb-2">Out of Hearts!</Text>
                        <Text className="text-gray-500 dark:text-gray-400 text-lg mb-8 font-medium text-center">
                            You've made too many mistakes. Restart the level to try again.
                        </Text>
                        <TactileButton
                            onPress={() => {
                                setHearts(5);
                                setCurrentIndex(0);
                                setAnswers([]);
                                setSelectedOption(null);
                                setIsCorrect(null);
                                setShowNext(false);
                            }}
                            backgroundColor="#1CB0F6"
                            shadowColor="#1899D6"
                            contentClassName="w-full p-4 items-center justify-center"
                            className="mb-4"
                        >
                            <Text className="text-white font-bold text-[17px] uppercase tracking-wider">Restart Level</Text>
                        </TactileButton>
                        <SoundButton
                            activeOpacity={0.8}
                            onPress={() => router.back()}
                            className="bg-transparent w-full p-4 items-center justify-center"
                        >
                            <Text className="text-gray-500 dark:text-gray-400 font-bold text-[17px] uppercase tracking-wider">Quit</Text>
                        </SoundButton>
                    </Animated.View>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'reading') {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
                <View className="flex-row items-center justify-between p-5 border-b-2 border-gray-100 dark:border-gray-800">
                    <SoundButton onPress={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                        <XCircle size={28} color="#AFAFAF" />
                    </SoundButton>
                    <Text className="font-bold text-lg text-gray-800 dark:text-white">Learn</Text>
                    <View className="w-10 h-10" />
                </View>

                <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
                    {lesson.videoUrl && (
                        <View className="mb-6 rounded-2xl overflow-hidden border-2 border-gray-100 dark:border-gray-800 bg-black">
                            {isYouTube ? (
                                youTubeId ? (
                                    videoStarted ? (
                                        <WebView
                                            style={{ width: '100%', height: 210, backgroundColor: '#000' }}
                                            originWhitelist={["*"]}
                                            thirdPartyCookiesEnabled={true}
                                            sharedCookiesEnabled={true}
                                            source={{ html: `<!doctype html><html><head><meta name="viewport" content="initial-scale=1.0, maximum-scale=1.0" /></head><body style="margin:0;background-color:#000"><iframe width="100%" height="100%" src="https://www.youtube-nocookie.com/embed/${youTubeId}?rel=0&modestbranding=1&playsinline=1" frameborder="0" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></body></html>` }}
                                            javaScriptEnabled={true}
                                            domStorageEnabled={true}
                                            allowsInlineMediaPlayback={true}
                                            mediaPlaybackRequiresUserAction={false}
                                            allowsFullscreenVideo={true}
                                            mixedContentMode="always"
                                            startInLoadingState={true}
                                            userAgent={Platform.OS === 'ios' ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15' : undefined}
                                            onError={(e) => {
                                                console.warn('YouTube WebView error', e.nativeEvent?.description || e);
                                                // mark this video as failed so we don't retry the embedded player repeatedly
                                                if (youTubeId) setVideoFailedId(youTubeId);
                                                // fallback: stop embedded player and show the open-external UI
                                                setVideoStarted(false);
                                            }}
                                        />
                                    ) : (
                                        <TouchableOpacity activeOpacity={0.9} onPress={handleRecordPlay} style={{ width: '100%', height: 210, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                            <Image source={{ uri: `https://img.youtube.com/vi/${youTubeId}/hqdefault.jpg` }} style={{ width: '100%', height: 210, position: 'absolute', left: 0, top: 0 }} />
                                            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                                                <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>▶</Text>
                                            </View>
                                        </TouchableOpacity>
                                    )
                                ) : (
                                    <View style={{ width: '100%', height: 210, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
                                        <TouchableOpacity onPress={() => Linking.openURL(lesson.videoUrl)} className="px-4 py-3 rounded-md bg-red-600">
                                            <Text className="text-white font-bold">Open in YouTube</Text>
                                        </TouchableOpacity>
                                    </View>
                                )
                            ) : (
                                videoStarted ? (
                                    <VideoView
                                        player={player}
                                        style={{ width: '100%', height: 210 }}
                                        contentFit="contain"
                                        allowsFullscreen
                                    />
                                ) : (
                                    <TouchableOpacity activeOpacity={0.9} onPress={handleRecordPlay} style={{ width: '100%', height: 210, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
                                        <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                                            <Text style={{ color: '#fff', fontSize: 32, fontWeight: '900' }}>▶</Text>
                                        </View>
                                    </TouchableOpacity>
                                )
                            )}
                        </View>
                    )}
                    <View className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl items-center justify-center mb-6">
                        <BookOpen size={28} color="#1899D6" />
                    </View>
                    <Text className="text-2xl font-black text-gray-900 dark:text-white mb-6 leading-tight">{lesson.name}</Text>
                    <MarkdownText content={lesson.content || ''} />
                    <View className="mt-8">
                        <MascotInteraction 
                            state="happy" 
                            message="Pay attention! I'll be testing you on this in a minute. 😉" 
                        />
                    </View>
                    <View className="h-20" />
                </ScrollView>

                <View className="p-5 border-t-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0B0D12]">
                    <View className="mb-4 items-center">
                        <Text className="text-gray-400 dark:text-gray-500 font-bold text-xs uppercase tracking-widest">Pass Requirement: 60%</Text>
                    </View>
                    <TactileButton
                        onPress={() => lesson.questions?.length > 0 ? setPhase('questions') : submitLesson([])}
                        backgroundColor="#1CB0F6"
                        shadowColor="#1899D6"
                        contentClassName="p-4 items-center justify-center"
                    >
                        <Text className="text-white font-bold text-[17px] uppercase tracking-wider">
                            {lesson.questions?.length > 0 ? 'Start Exercises' : 'Complete Lesson'}
                        </Text>
                    </TactileButton>
                </View>
            </SafeAreaView>
        );
    }

    if (phase === 'finished') {
        const accuracy = Math.round(((result?.score || 0) / (lesson?.questions?.length || 1)) * 100);
        const rating = result?.passed ? (accuracy === 100 ? 'Perfect' : 'Amazing') : 'Needs Work';
        
        const baseXp = 10;
        const bonusXp = result?.passed ? Math.round(accuracy * 0.1) : 0;
        const xp = baseXp + bonusXp;

        const streakDays = user?.streak || 0;
        const unitProgress = 1;
        const unitTotal = 4;
        const unitCompletion = Math.min(unitProgress / unitTotal, 1);
        const elapsedMins = Math.max(1, Math.round((Date.now() - startTime.current) / 60000));

        const backgroundGradient = isDark
            ? (['#0B0F14', '#0E1319', '#111214'] as const)
            : (['#FFFDF6', '#FFFDF6', '#FFFFFF'] as const);

        return (
            <View style={{ flex: 1, backgroundColor: isDark ? '#0B0D12' : '#FFFFFF' }}>
                <LinearGradient
                    colors={backgroundGradient}
                    style={StyleSheet.absoluteFillObject}
                />

                {/* Confetti Layer */}
                {result?.passed && (
                    <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, zIndex: 10 }}>
                        <LottieView
                            ref={lottieRef}
                            source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_u4yrau.json' }}
                            autoPlay={false}
                            loop={false}
                            style={{ width: '100%', height: '100%' }}
                            resizeMode="cover"
                        />
                    </View>
                )}

                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 40 }}>
                        {/* Hero Section */}
                        <Animated.View entering={ZoomIn.duration(600)} style={{ alignItems: 'center', marginBottom: 30 }}>
                            <View style={{ width: 200, height: 200, alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                                <LottieView
                                    source={result?.passed 
                                        ? require('../assets/animations/Happy-mood.json') 
                                        : require('../assets/animations/sad-mood-loop.json')
                                    }
                                    autoPlay
                                    loop={true}
                                    style={{ width: '100%', height: '100%' }}
                                />
                            </View>
                            <Text style={{ fontSize: 32, fontWeight: '900', textAlign: 'center', color: isDark ? '#FFE7A3' : '#D6A500' }}>
                                {result?.passed ? (accuracy === 100 ? 'Perfect!' : 'Well done!') : 'Keep Training!'}
                            </Text>
                            <Text style={{ fontSize: 17, fontWeight: '600', textAlign: 'center', marginTop: 8, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                                {result?.passed ? (accuracy === 100 ? "You didn't make a single mistake!" : 'You are making great progress.') : 'Mistakes help you learn.'}
                            </Text>
                        </Animated.View>

                        {/* XP Counter Section */}
                        {result?.passed && (
                            <Animated.View entering={FadeInUp.delay(400).springify()} style={{ alignItems: 'center', marginBottom: 30 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                                    <ReText
                                        text={xpText}
                                        style={{ color: '#FFC800', fontSize: 72, fontWeight: '900', textAlign: 'center' }}
                                    />
                                    <Text style={{ fontSize: 24, fontWeight: '900', marginLeft: 8, color: '#FFC800' }}>
                                        XP
                                    </Text>
                                </View>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: isDark ? '#6B7280' : '#9CA3AF' }}>
                                    Base {baseXp} + Bonus {bonusXp}
                                </Text>
                            </Animated.View>
                        )}

                        {/* 3D Stats Pillars */}
                        <View style={{ flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: 30 }}>
                            <Animated.View entering={FadeInDown.delay(600).springify()} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
                                <View style={{ width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingTop: 16, paddingBottom: 12, borderBottomWidth: 6, backgroundColor: '#1CB0F6', borderBottomColor: '#1480B0' }}>
                                    <Timer size={24} color="white" />
                                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 18, marginTop: 6 }}>
                                        {elapsedMins}m
                                    </Text>
                                </View>
                                <Text style={{ fontWeight: '700', textTransform: 'uppercase', marginTop: 12, fontSize: 11, letterSpacing: 1, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                                    Focus
                                </Text>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(700).springify()} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
                                <View style={{ width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingTop: 16, paddingBottom: 12, borderBottomWidth: 6, backgroundColor: '#58CC02', borderBottomColor: '#46A302' }}>
                                    <CheckCircle2 size={24} color="white" />
                                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 18, marginTop: 6 }}>
                                        {accuracy}%
                                    </Text>
                                </View>
                                <Text style={{ fontWeight: '700', textTransform: 'uppercase', marginTop: 12, fontSize: 11, letterSpacing: 1, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                                    Accuracy
                                </Text>
                            </Animated.View>

                            <Animated.View entering={FadeInDown.delay(800).springify()} style={{ flex: 1, alignItems: 'center', paddingHorizontal: 6 }}>
                                <View style={{ width: '100%', borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingTop: 16, paddingBottom: 12, borderBottomWidth: 6, backgroundColor: '#FF4B4B', borderBottomColor: '#D42D2D' }}>
                                    <Heart size={24} color="white" />
                                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 18, marginTop: 6 }}>
                                        {rating}
                                    </Text>
                                </View>
                                <Text style={{ fontWeight: '700', textTransform: 'uppercase', marginTop: 12, fontSize: 11, letterSpacing: 1, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                                    Rating
                                </Text>
                            </Animated.View>
                        </View>

                        {/* Progress Bar Section */}
                        {result?.passed && (
                            <Animated.View entering={FadeInUp.delay(900).springify()} style={{ width: '100%', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Flame size={20} color="#FF4B4B" fill="#FF4B4B" />
                                        <Text style={{ color: isDark ? '#FFFFFF' : '#111827', fontWeight: '800', marginLeft: 6, letterSpacing: 0.5 }}>
                                            {streakDays} DAY STREAK
                                        </Text>
                                    </View>
                                    <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '700' }}>
                                        {unitProgress}/{unitTotal}
                                    </Text>
                                </View>
                                <View style={{ height: 16, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)', borderRadius: 8, overflow: 'hidden' }}>
                                    <View style={{ width: `${Math.round(unitCompletion * 100)}%`, height: '100%', backgroundColor: '#58CC02', borderRadius: 8 }} />
                                </View>
                            </Animated.View>
                        )}
                    </View>

                    {/* Footer */}
                    <Animated.View entering={FadeInUp.delay(1000)} style={{ paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 }}>
                        <TactileButton
                            onPress={() => result?.passed ? router.back() : setPhase('questions')}
                            backgroundColor={result?.passed ? '#58CC02' : '#1CB0F6'}
                            shadowColor={result?.passed ? '#46A302' : '#1480B0'}
                            contentClassName="w-full p-4 items-center justify-center"
                        >
                            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 17, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                                {result?.passed ? 'Continue' : 'Try Again'}
                            </Text>
                        </TactileButton>
                    </Animated.View>
                </SafeAreaView>
            </View>
        );
    }

    const currentQuestion = lesson.questions[currentIndex];
    const progressPercent = ((currentIndex) / lesson.questions.length) * 100;
    const isFillInTheBlank = currentQuestion ? /___|__\d+__/.test(currentQuestion.text) : false;

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            <View className="flex-1 px-5 pt-5 pb-2">
                <View className="flex-row items-center justify-between mb-8">
                    <SoundButton onPress={() => router.back()} className="w-10 h-10 flex items-center justify-center -ml-2">
                        <XCircle size={28} color="#AFAFAF" />
                    </SoundButton>
                    <View className="flex-1 mx-4">
                        <ShiningProgressBar 
                            progress={progressPercent / 100} 
                            color="#58CC02" 
                            backgroundColor={isDark ? '#272B36' : '#E5E5E5'} 
                            height={16} 
                        />
                    </View>
                    <View className="flex-row items-center bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-full border border-red-100 dark:border-red-900/30" style={{ minWidth: 64, justifyContent: 'center', gap: 6 }}>
                        <Heart size={16} color="#FF4B4B" fill="#FF4B4B" />
                        <Text className="text-[#FF4B4B] font-black text-[15px]">{hearts}</Text>
                    </View>
                </View>

                {/* Provocative Mascot in Questions */}
                {currentIndex === 0 && !showNext && (
                    <Animated.View entering={FadeIn} className="mb-6">
                        <MascotInteraction 
                            state="happy" 
                            message="Let's see if you were actually reading! 🦁" 
                        />
                    </Animated.View>
                )}

                <Animated.View
                    key={currentIndex}
                    entering={SlideInRight.springify().damping(16).stiffness(100)}
                    exiting={SlideOutLeft.duration(180)}
                    className="flex-1"
                >
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 240 }}>
                        {isFillInTheBlank ? (
                            <FillInTheBlank 
                                sentence={currentQuestion.text}
                                options={currentQuestion.options}
                                onSelect={handleOptionSelect}
                                disabled={showNext}
                                isCorrect={isCorrect}
                            />
                        ) : (
                            <>
                                <MathText content={currentQuestion.text} fontSize={22} containerStyle={{ marginBottom: 32 }} />

                                {currentQuestion.options.map((option: string, index: number) => {
                                    const isSelected = selectedOption === index;
                                    const isWrong = isSelected && isCorrect === false;
                                    const isRight = (isSelected && isCorrect === true) || (isCorrect !== null && index === currentQuestion.correctOption);

                                    let borderColor = isDark ? '#272B36' : '#E5E5E5';
                                    let bgColor = isDark ? '#1E222B' : 'white';
                                    let textColor = isDark ? 'white' : '#4B4B4B';
                                    let shadowColor = isDark ? '#1E222B' : '#E5E5E5';
                                    let circleColor = 'transparent';

                                    if (isSelected && isCorrect === null) {
                                        borderColor = '#1899D6';
                                        bgColor = isDark ? '#1CB0F625' : '#DDF4FF';
                                        shadowColor = '#1899D6';
                                        circleColor = '#1899D6';
                                        textColor = isDark ? '#38BDF8' : '#1899D6';
                                    } else if (isRight) {
                                        borderColor = '#58CC02';
                                        bgColor = isDark ? '#1E3A1E' : '#D7FFB8';
                                        textColor = isDark ? '#58CC02' : '#2B7200';
                                        shadowColor = '#46A302';
                                        circleColor = '#58CC02';
                                    } else if (isWrong) {
                                        borderColor = '#FF4B4B';
                                        bgColor = isDark ? '#3A1E1E' : '#FFDCDC';
                                        textColor = isDark ? '#FF4B4B' : '#EA2B2B';
                                        shadowColor = '#EA2B2B';
                                        circleColor = '#FF4B4B';
                                    }

                                    return (
                                        <Animated.View key={index}>
                                            <TactileButton
                                                onPress={() => handleOptionSelect(index)}
                                                disabled={false}
                                                backgroundColor={bgColor}
                                                shadowColor={shadowColor}
                                                depth={4}
                                                className="mb-4"
                                                contentClassName="flex-row items-center p-5"
                                            >
                                                <View style={{ borderColor: isSelected || isRight || isWrong ? 'transparent' : (isDark ? '#272B36' : '#E5E5E5'), backgroundColor: isSelected || isRight || isWrong ? circleColor : 'transparent' }} className="w-8 h-8 rounded-full border-2 items-center justify-center mr-4">
                                                    {(isSelected || isRight || isWrong) ? (
                                                        <View className="w-2.5 h-2.5 bg-white rounded-full" />
                                                    ) : (
                                                        <Text className="text-[#AFAFAF] font-bold text-sm">{index + 1}</Text>
                                                    )}
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <MathText content={option} color={textColor} fontSize={17} />
                                                </View>
                                            </TactileButton>
                                        </Animated.View>
                                    );
                                })}
                            </>
                        )}
                    </ScrollView>
                </Animated.View>
            </View>

            {/* Bottom Feedback Banner & Action Button */}
            <View className={`pt-4 px-5 pb-8 border-t-2 border-gray-100 dark:border-gray-800 ${isCorrect === true ? 'bg-[#D7FFB8] dark:bg-[#1A2E1A]' : isCorrect === false ? 'bg-[#FFDCDC] dark:bg-[#2E1A1A]' : 'bg-white dark:bg-[#0B0D12]'}`}>
                {isCorrect === true && (
                    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 250, zIndex: 10, overflow: 'hidden' }}>
                        <LottieView
                            source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_u4yrau.json' }}
                            autoPlay={true}
                            loop={false}
                            style={{ width: '100%', height: '100%', transform: [{ scale: 1.2 }] }}
                            resizeMode="cover"
                        />
                    </View>
                )}
                {isCorrect !== null && (
                    <Animated.View entering={SlideInDown} className="mb-4 -ml-2">
                        <MascotInteraction
                            state={isCorrect ? 'happy' : 'crying'}
                            size={90}
                            noEntryAnimation={true}
                            messageNode={
                                <View style={{ minHeight: 40, justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 20, fontWeight: '900', color: isCorrect ? (isDark ? '#58CC02' : '#2B7200') : (isDark ? '#FF6B6B' : '#EA2B2B'), marginBottom: 2 }}>
                                        {isCorrect ? 'Well done!' : 'Incorrect'}
                                    </Text>
                                    {!isCorrect && (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <Text style={{ color: isDark ? '#FF8080' : '#EA2B2B', fontWeight: '700', fontSize: 15 }}>
                                                Correct answer:{' '}
                                            </Text>
                                            <MathText 
                                                content={currentQuestion.options[currentQuestion.correctOption]} 
                                                color={isDark ? '#FF8080' : '#EA2B2B'} 
                                                fontSize={15} 
                                            />
                                        </View>
                                    )}
                                </View>
                            }
                        />
                    </Animated.View>
                )}

                <View style={{ transform: [{ scale: checkScale.value }] }}>
                    <TactileButton
                        onPress={showNext ? handleNext : handleCheck}
                        disabled={selectedOption === null || submitting}
                        backgroundColor={
                            showNext
                                ? (isCorrect === true ? '#58CC02' : '#FF4B4B')
                                : (selectedOption === null || submitting ? (isDark ? '#272B36' : '#E5E5E5') : '#58CC02')
                        }
                        shadowColor={
                            showNext
                                ? (isCorrect === true ? '#46A302' : '#EA2B2B')
                                : (selectedOption === null || submitting ? (isDark ? '#1E222B' : '#CECECE') : '#46A302')
                        }
                        contentClassName="p-4 items-center justify-center"
                    >
                        {submitting ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text className={`font-black text-[17px] uppercase tracking-widest ${selectedOption === null && !showNext ? 'text-[#AFAFAF]' : 'text-white'}`}>
                                {showNext ? (currentIndex === lesson.questions.length - 1 ? 'Finish' : (isCorrect ? 'Excellent! Continue' : 'Continue')) : 'Check'}
                            </Text>
                        )}
                    </TactileButton>
                </View>
            </View>
        </SafeAreaView>
    );
}

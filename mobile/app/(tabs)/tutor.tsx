import { SoundButton } from '../../components/SoundButton';
import { TactileButton } from '../../components/TactileButton';
import { MascotInteraction } from '../../components/MascotInteraction';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { Send, Sparkles, StopCircle, RefreshCw, Bot } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import EventSource from 'react-native-sse';
import { tutorApi } from '../../services/api';
import { MathText } from '../../components/MathText';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant' | 'tutor';
    text: string;
    done?: boolean;
};

export default function TabTutorScreen() {
    const router = useRouter();
    const { user, token } = useAuthStore();
    const [message, setMessage] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialFetch, setInitialFetch] = useState(true);
    const scrollViewRef = useRef<ScrollView>(null);
    const esRef = useRef<EventSource | null>(null);

    const isGold = user?.tier === 'GOLD';
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    useEffect(() => {
        if (!isGold) return;
        loadLatestSession();
    }, [isGold]);

    const loadLatestSession = async () => {
        try {
            const sessions = await tutorApi.getSessions();
            if (sessions.data.length > 0) {
                const latestSession = sessions.data[0];
                setSessionId(latestSession.id);
                const messages = await tutorApi.getMessages(latestSession.id);
                setChat(messages.data.map((m: any) => ({
                    id: m.id,
                    role: m.role === 'user' ? 'user' : 'assistant',
                    text: m.content,
                    done: true
                })));
            } else {
                setChat([
                    { id: 'greeting', role: 'assistant', text: `Hello ${user?.name || 'Scholar'}! I'm your Personal AI Tutor. How can I help your studies today?`, done: true }
                ]);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
            setChat([
                { id: 'greeting', role: 'assistant', text: `Hello ${user?.name || 'Scholar'}! I'm your Personal AI Tutor. How can I help your studies today?`, done: true }
            ]);
        } finally {
            setInitialFetch(false);
        }
    };

    const handleSend = () => {
        if (!message.trim() || loading || !isGold) return;

        const userMsg = message.trim();
        setMessage('');
        const tempId = Date.now().toString();
        const assistantTempId = tempId + '_assistant';
        
        setChat(prev => [
            ...prev, 
            { id: tempId, role: 'user', text: userMsg, done: true },
            { id: assistantTempId, role: 'assistant', text: '', done: false }
        ]);
        setLoading(true);

        const url = tutorApi.getChatUrl();
        const eventSource = new EventSource(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                sessionId: sessionId,
                message: userMsg
            }),
            pollingInterval: 0
        });

        esRef.current = eventSource;

        eventSource.addEventListener('session' as any, (event: any) => {
            if (event.data) {
                const data = JSON.parse(event.data);
                if (data.sessionId) setSessionId(data.sessionId);
            }
        });

        eventSource.addEventListener('message', (event: any) => {
            if (event.data) {
                if (event.data === '[DONE]') {
                    setLoading(false);
                    setChat(prev => {
                        const newChat = [...prev];
                        if (newChat.length > 0) {
                            const lastIndex = newChat.length - 1;
                            newChat[lastIndex] = { ...newChat[lastIndex], done: true };
                        }
                        return newChat;
                    });
                    eventSource.close();
                    return;
                }
                try {
                    const parsed = JSON.parse(event.data);
                    const newText = parsed.text || '';
                    if (newText) {
                        setChat(prev => {
                            const newChat = [...prev];
                            const lastIndex = newChat.length - 1;
                            newChat[lastIndex] = { ...newChat[lastIndex], text: newChat[lastIndex].text + newText };
                            return newChat;
                        });
                        scrollViewRef.current?.scrollToEnd({ animated: false });
                    }
                } catch (e) {
                    console.error('SSE Parse Error', e);
                }
            }
        });

        eventSource.addEventListener('error', (event: any) => {
            console.error('SSE Error:', event);
            setLoading(false);
            setChat(prev => {
                const newChat = [...prev];
                if (newChat.length > 0) {
                    const lastIndex = newChat.length - 1;
                    if (!newChat[lastIndex].text) {
                        newChat[lastIndex] = { ...newChat[lastIndex], text: "Sorry, I couldn't connect to the server. Please try again.", done: true };
                    } else {
                        newChat[lastIndex] = { ...newChat[lastIndex], done: true };
                    }
                }
                return newChat;
            });
            eventSource.close();
        });
    };

    const handleStop = () => {
        if (esRef.current) {
            esRef.current.close();
            setLoading(false);
            setChat(prev => {
                const newChat = [...prev];
                if (newChat.length > 0) {
                    const lastIndex = newChat.length - 1;
                    newChat[lastIndex] = { ...newChat[lastIndex], done: true };
                }
                return newChat;
            });
        }
    };

    useEffect(() => {
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }, [chat.length, initialFetch]);

    if (!isGold) {
        return (
            <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12] items-center justify-center p-8">
                <MascotInteraction 
                    state="sad" 
                    message="Oops! The Personal Tutor is exclusive to our Gold Pride members. Upgrade to get 1-on-1 help!" 
                />
                <View className="mt-8 mb-4 w-full px-4">
                    <TactileButton 
                        onPress={() => router.push('/subscription')}
                        backgroundColor="#EAB308"
                        shadowColor="#CA8A04"
                        depth={6}
                        contentClassName="py-4 items-center justify-center"
                    >
                        <Text className="text-white font-black uppercase tracking-widest">Upgrade to Gold</Text>
                    </TactileButton>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            {/* Tab Header for Tutor */}
            <View className="flex-row items-center justify-between px-5 py-4 border-b-2 border-gray-100 dark:border-gray-800">
                <View className="flex-row items-center space-x-3">
                    <View className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center border border-amber-300 dark:border-amber-700">
                        <Bot size={22} color="#D97706" />
                    </View>
                    <View className="ml-2">
                        <View className="flex-row items-center">
                            <Text className="text-black dark:text-white font-black text-lg">AI Tutor</Text>
                            <View className="ml-2 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                                <Text className="text-amber-500 font-black text-[10px] tracking-wider uppercase">GOLD</Text>
                            </View>
                        </View>
                        <Text className="text-gray-400 text-xs font-semibold">1-on-1 Personal Academic Mentor</Text>
                    </View>
                </View>

                <TouchableOpacity 
                    onPress={() => { setChat([]); setSessionId(null); loadLatestSession(); }} 
                    className="w-10 h-10 items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full"
                >
                    <RefreshCw size={18} color="#AFAFAF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <ScrollView 
                    ref={scrollViewRef}
                    className="flex-1 px-5 pt-4"
                    contentContainerStyle={{ paddingBottom: 20 }}
                >
                    {initialFetch ? (
                        <ActivityIndicator size="large" color="#EAB308" className="mt-20" />
                    ) : (
                        chat.map((msg, i) => (
                            <Animated.View 
                                key={msg.id} 
                                entering={msg.role === 'user' ? SlideInRight : FadeIn}
                                className={`mb-6 flex-row ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {(msg.role === 'assistant' || msg.role === 'tutor') && (
                                    <View className="mr-3 mt-1">
                                        <View className="w-10 h-10 items-center justify-center mt-[-6px]">
                                            <LottieView
                                                source={require('../../assets/animations/Happy-mood.json')}
                                                autoPlay
                                                loop
                                                style={{ width: 40, height: 40 }}
                                            />
                                        </View>
                                    </View>
                                )}
                                <View 
                                    className={`max-w-[82%] rounded-2xl p-4 border-2 ${
                                        msg.role === 'user' 
                                            ? 'bg-amber-50 dark:bg-[#2A2312] border-amber-300 dark:border-amber-700/60 rounded-br-xs' 
                                            : 'bg-white dark:bg-[#1E222B] border-[#E5E5E5] dark:border-[#272B36] rounded-bl-xs'
                                    }`}
                                >
                                    {msg.text ? (
                                        <MathText 
                                            content={msg.text} 
                                            color={msg.role === 'user' ? (isDark ? '#FDE68A' : '#78350F') : (isDark ? '#F3F4F6' : '#1F2937')} 
                                            fontSize={16} 
                                        />
                                    ) : (
                                        <View className="flex-row items-center py-1">
                                            <ActivityIndicator size="small" color="#EAB308" />
                                            <Text className="ml-2 text-xs font-bold text-gray-400">Thinking...</Text>
                                        </View>
                                    )}
                                </View>
                            </Animated.View>
                        ))
                    )}
                </ScrollView>

                {/* Input Area with bottom clearance for tab bar */}
                <View className="px-5 pt-3 pb-24 border-t-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0B0D12]">
                    <View className="flex-row items-center bg-gray-50 dark:bg-[#1E222B] rounded-2xl border-2 border-b-4 border-gray-100 dark:border-[#272B36] px-4 py-2">
                        <TextInput
                            className="flex-1 text-black dark:text-white font-bold text-[16px] py-2"
                            placeholder="Ask your tutor anything..."
                            placeholderTextColor="#94A3B8"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />
                        <View className="ml-2 w-10 h-10">
                            {loading ? (
                                <TactileButton 
                                    onPress={handleStop}
                                    backgroundColor="#EF4444"
                                    shadowColor="#B91C1C"
                                    depth={4}
                                    borderRadius={999}
                                    style={{ width: 40, height: 40 }}
                                    contentClassName="w-10 h-10 items-center justify-center"
                                >
                                    <StopCircle size={18} color="#FFF" />
                                </TactileButton>
                            ) : (
                                <TactileButton 
                                    onPress={handleSend}
                                    disabled={!message.trim()}
                                    backgroundColor={message.trim() ? '#EAB308' : '#E5E5E5'}
                                    shadowColor={message.trim() ? '#CA8A04' : '#CECECE'}
                                    depth={4}
                                    borderRadius={999}
                                    style={{ width: 40, height: 40 }}
                                    contentClassName="w-10 h-10 items-center justify-center"
                                >
                                    <Send size={18} color={message.trim() ? '#FFF' : '#AFAFAF'} />
                                </TactileButton>
                            )}
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

import { SoundButton } from '../components/SoundButton';
import { TactileButton } from '../components/TactileButton';
import { MascotInteraction } from '../components/MascotInteraction';
import { View, Text, TextInput, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Send, Sparkles, StopCircle, RefreshCw } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { LION_IMAGES } from '../lib/lionMood';
import LottieView from 'lottie-react-native';
import EventSource from 'react-native-sse';
import Markdown from 'react-native-markdown-display';
import { tutorApi } from '../services/api';
import { MathText } from '../components/MathText';

type ChatMessage = {
    id: string;
    role: 'user' | 'assistant' | 'tutor';
    text: string;
    done?: boolean;
};

export default function TutorScreen() {
    const router = useRouter();
    const { user, token } = useAuthStore();
    const [message, setMessage] = useState('');
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [initialFetch, setInitialFetch] = useState(true);
    const scrollViewRef = useRef<any>(null);
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
                    { id: 'greeting', role: 'assistant', text: `Hello ${user?.name || 'Scholar'}! I'm your Personal Tutor. How can I help you today?`, done: true }
                ]);
            }
        } catch (error) {
            console.error('Failed to load sessions:', error);
            setChat([
                { id: 'greeting', role: 'assistant', text: `Hello ${user?.name || 'Scholar'}! I'm your Personal Tutor. How can I help you today?`, done: true }
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
                <TactileButton 
                    onPress={() => router.back()}
                    backgroundColor="transparent"
                    shadowColor="transparent"
                    depth={0}
                    contentClassName="items-center justify-center"
                >
                    <Text className="text-gray-400 font-bold">Go Back</Text>
                </TactileButton>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#0B0D12]">
            {/* Header */}
            <View className="flex-row items-center justify-between px-5 py-6 border-b-2 border-gray-100 dark:border-gray-800">
                <SoundButton onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                    <ChevronLeft size={24} color="#AFAFAF" />
                </SoundButton>
                <View className="flex-row items-center">
                </View>
                <TouchableOpacity onPress={() => { setChat([]); setSessionId(null); }} className="w-10 h-10 items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-full">
                    <RefreshCw size={18} color="#AFAFAF" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                className="flex-1"
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
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
                                        <View className="w-12 h-12 items-center justify-center mt-[-8px]">
                                            <LottieView
                                                source={require('../assets/animations/Happy-mood.json')}
                                                autoPlay
                                                loop
                                                style={{ width: 56, height: 56 }}
                                            />
                                        </View>
                                    </View>
                                )}
                                <View 
                                    className={`max-w-[85%] p-4 rounded-2xl border-2 border-b-4 ${
                                        msg.role === 'user' 
                                        ? 'bg-[#1CB0F6] border-[#1899D6] rounded-tr-none' 
                                        : 'w-full bg-white dark:bg-[#1E222B] border-gray-100 dark:border-[#272B36] rounded-tl-none'
                                    }`}
                                >
                                    {msg.role === 'user' ? (
                                        <Text className="font-bold text-[16px] text-white">
                                            {msg.text}
                                        </Text>
                                    ) : (
                                        msg.text ? (
                                            msg.done ? (
                                                <MathText
                                                    content={msg.text}
                                                    color={isDark ? '#FFFFFF' : '#333333'}
                                                    fontSize={16}
                                                />
                                            ) : (
                                                <Markdown
                                                    style={{
                                                        body: { color: isDark ? '#FFFFFF' : '#333333', fontSize: 16 },
                                                        code_inline: { backgroundColor: '#f0f0f0', color: '#e83e8c', borderRadius: 4, padding: 2 },
                                                        code_block: { backgroundColor: '#1E1E1E', color: '#D4D4D4', padding: 10, borderRadius: 8 },
                                                        fence: { backgroundColor: '#1E1E1E', color: '#D4D4D4', padding: 10, borderRadius: 8 }
                                                    }}
                                                >
                                                    {msg.text}
                                                </Markdown>
                                            )
                                        ) : (
                                            <ActivityIndicator size="small" color="#EAB308" />
                                        )
                                    )}
                                </View>
                            </Animated.View>
                        ))
                    )}
                    <View className="h-4" />
                </ScrollView>

                {/* Input Area */}
                <View className="p-5 border-t-2 border-gray-100 dark:border-gray-800 bg-white dark:bg-[#0B0D12]">
                    <View className="flex-row items-center bg-gray-50 dark:bg-[#1E222B] rounded-2xl border-2 border-b-4 border-gray-100 dark:border-[#272B36] px-4 py-2">
                        <TextInput
                            className="flex-1 text-black dark:text-white font-bold text-[16px] py-2"
                            placeholder="Ask me anything..."
                            placeholderTextColor="#94A3B8"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />
                        <View className="ml-2 w-12 h-12">
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
                                    backgroundColor={message.trim() ? '#1CB0F6' : '#E5E5E5'}
                                    shadowColor={message.trim() ? '#1899D6' : '#CECECE'}
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

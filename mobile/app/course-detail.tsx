import { TactileButton } from '../components/TactileButton';
import { MascotInteraction } from '../components/MascotInteraction';
import { SoundButton } from '../components/SoundButton';
import { View, Text, ScrollView, ActivityIndicator, Dimensions, useColorScheme } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, Star, Lock, Check } from "lucide-react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { on } from '../lib/eventBus';
import { learningApi } from "../services/api";
import Animated, { FadeIn, FadeInDown, ZoomIn, withRepeat, withTiming, withSequence, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import AnimatedGrassBackground from '../components/AnimatedGrassBackground';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const NODE_SIZE = 72;
const NODE_SPACING = 80;
const X_AMPLITUDE = 60;

// Floating Label Component (Speech Bubble)
function FloatingLabel({ label, nodeIsLeft, isCurrent, onPress }: { label: string, nodeIsLeft: boolean, isCurrent: boolean, onPress?: () => void }) {
    const offset = useSharedValue(0);

    useEffect(() => {
        if (isCurrent) {
            offset.value = withRepeat(
                withSequence(
                    withTiming(nodeIsLeft ? -6 : 6, { duration: 500 }),
                    withTiming(0, { duration: 500 })
                ),
                -1,
                true
            );
        }
    }, [isCurrent, nodeIsLeft]);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: offset.value }]
    }));

    return (
        <Animated.View
            entering={isCurrent ? FadeIn.delay(600) : FadeIn.delay(200)}
            style={[{
                position: 'absolute',
                left: nodeIsLeft ? NODE_SIZE + 12 : undefined,
                right: !nodeIsLeft ? NODE_SIZE + 12 : undefined,
                top: isCurrent ? -15 : 10,
                width: 140,
                flexDirection: nodeIsLeft ? 'row' : 'row-reverse',
                alignItems: 'center',
                zIndex: isCurrent ? 40 : 20,
            }, animatedStyle]}
        >
            <View style={{
                width: 0,
                height: 0,
                borderTopWidth: 8,
                borderBottomWidth: 8,
                borderLeftWidth: nodeIsLeft ? 0 : 8,
                borderRightWidth: nodeIsLeft ? 8 : 0,
                borderTopColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: nodeIsLeft ? 'transparent' : '#FFF',
                borderRightColor: nodeIsLeft ? '#FFF' : 'transparent',
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
            }} />
            
            <View style={{
                backgroundColor: '#FFF',
                borderRadius: 16,
                padding: 12,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 6,
                borderWidth: 2,
                borderColor: '#E5E7EB',
                flex: 1,
                alignItems: 'center',
            }}>
                <Text style={{ 
                    color: isCurrent ? '#F59E0B' : '#6B7280', 
                    fontWeight: '900', 
                    fontSize: 14, 
                    marginBottom: isCurrent ? 8 : 0,
                    textAlign: 'center'
                }}>
                    {label}
                </Text>
                
                {isCurrent && onPress && (
                    <TactileButton
                        onPress={onPress}
                        backgroundColor="#58CC02"
                        shadowColor="#46A302"
                        depth={4}
                        contentClassName="py-2 px-2 items-center justify-center w-full"
                    >
                        <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 }}>
                            START
                        </Text>
                    </TactileButton>
                )}
            </View>
        </Animated.View>
    );
}

export default function CourseDetailScreen() {
    const router = useRouter();
    const { id } = useLocalSearchParams();
    const [subject, setSubject] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const theme = {
        background: isDark ? '#1a2e1a' : '#e4fcc6',
        text: isDark ? '#FFFFFF' : '#374151',
        border: isDark ? '#2e472e' : '#c6e8a1',
    };

    useEffect(() => {
        if (id) fetchSubject();
        // subscribe to lesson completion events and refresh subject automatically
        const unsub = on('lessonCompleted', () => {
            fetchSubject();
        });
        return () => {
            unsub();
        };
    }, [id]);

    const fetchSubject = async () => {
        try {
            const res = await learningApi.getSubject(id as string);
            setSubject(res.data);
        } catch (error) {
            console.error('Failed to fetch subject details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator size="large" color="#58CC02" />
            </View>
        );
    }

    if (!subject) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <Text style={{ color: theme.text, marginBottom: 16 }}>Subject not found</Text>
                <TactileButton onPress={() => router.back()} backgroundColor="#1CB0F6" shadowColor="#1899D6" contentClassName="px-6 py-3 items-center justify-center">
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Go Back</Text>
                </TactileButton>
            </View>
        );
    }

    return (
        <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
            <AnimatedGrassBackground isDark={isDark} />
            {/* Header Banner */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 16,
                paddingBottom: 20,
                borderBottomWidth: 1,
                borderBottomColor: theme.border,
                backgroundColor: theme.background,
                zIndex: 20,
            }}>
                <SoundButton onPress={() => router.back()} style={{ marginRight: 12 }}>
                    <ChevronLeft size={28} color={theme.text} />
                </SoundButton>
                <Text style={{ color: theme.text, fontWeight: '800', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    {subject.name}
                </Text>
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 120, paddingTop: 24 }}
                showsVerticalScrollIndicator={false}
            >
                {subject.topics?.map((topic: any, topicIndex: number) => {
                    const lessons = topic.lessons || [];
                    const UNIT_COLOR = topicIndex % 2 === 0 ? '#58CC02' : '#1CB0F6'; 
                    const UNIT_COLOR_DARK = topicIndex % 2 === 0 ? '#46A302' : '#1480B0';

                    let pathD = '';
                    const points = lessons.map((_: any, i: number) => {
                        const offset = Math.sin((i * Math.PI) / 2) * X_AMPLITUDE;
                        const y = i * (NODE_SIZE + NODE_SPACING) + NODE_SIZE / 2;
                        const x = SCREEN_WIDTH / 2 + offset;
                        return { x, y };
                    });

                    points.forEach((p: any, i: number) => {
                        if (i === 0) {
                            pathD += `M ${p.x} ${p.y}`;
                        } else {
                            const prev = points[i - 1];
                            const c1y = prev.y + 35;
                            const c2y = p.y - 35;
                            pathD += ` C ${prev.x} ${c1y} ${p.x} ${c2y} ${p.x} ${p.y}`;
                        }
                    });

                    const totalHeight = points.length > 0 ? points[points.length - 1].y + NODE_SIZE : 0;

                    return (
                        <View key={topic.id} style={{ marginBottom: 40 }}>
                            {/* Unit Header - styled like kit */}
                            <Animated.View entering={FadeInDown.delay(topicIndex * 100)}>
                                <View style={{
                                    backgroundColor: UNIT_COLOR,
                                    marginHorizontal: 16,
                                    marginBottom: 32,
                                    borderRadius: 16,
                                    padding: 20,
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 4 },
                                    shadowOpacity: 0.15,
                                    shadowRadius: 8,
                                    elevation: 6,
                                }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, paddingRight: 16 }}>
                                            <Text style={{ color: 'rgba(255,255,255,0.9)', fontWeight: '800', fontSize: 16, textTransform: 'uppercase', marginBottom: 4 }}>
                                                {subject.name}
                                            </Text>
                                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 20, lineHeight: 26 }}>
                                                {topic.name}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>

                            {/* Path Container */}
                            <View style={{ height: totalHeight, width: SCREEN_WIDTH, position: 'relative', alignItems: 'center' }}>
                                {/* The Connector Line */}
                                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: totalHeight }}>
                                    <Svg width={SCREEN_WIDTH} height="100%">
                                        <Path
                                            d={pathD}
                                            stroke={theme.border}
                                            strokeWidth="10"
                                            strokeLinecap="round"
                                            fill="none"
                                        />
                                    </Svg>
                                </View>

                                {/* The Nodes */}
                                {lessons.map((lesson: any, index: number) => {
                                    const point = points[index];
                                    if (!point) return null;

                                    const isCompleted = lesson.status === 'COMPLETED';
                                    const isCurrent = lesson.status === 'CURRENT';
                                    const isLocked = lesson.status === 'LOCKED';
                                    
                                    // Place label on the side with more space:
                                    // i=0(center)->Right, i=1(right)->Left, i=2(center)->Left, i=3(left)->Right
                                    const isLeft = (index % 4 === 0) || (index % 4 === 3);

                                    let bgColor = isDark ? '#374151' : '#E5E7EB';
                                    let shadowColor = isDark ? '#1F2937' : '#D1D5DB';
                                    let icon = <Lock size={32} color={isDark ? '#6B7280' : '#9CA3AF'} />;

                                    if (isCompleted) {
                                        bgColor = '#FFC800';
                                        shadowColor = '#F49000';
                                        icon = <Check size={36} color="#FFF" />;
                                    } else if (isCurrent) {
                                        bgColor = '#58CC02';
                                        shadowColor = '#46A302';
                                        icon = <Star size={36} color="#FFF" fill="#FFF" />;
                                    }

                                    return (
                                        <Animated.View
                                            key={lesson.id}
                                            entering={ZoomIn.delay(150 + index * 80).springify().damping(14)}
                                            style={{
                                                position: 'absolute',
                                                left: point.x - NODE_SIZE / 2,
                                                top: point.y - NODE_SIZE / 2,
                                                width: NODE_SIZE,
                                                height: NODE_SIZE,
                                                alignItems: 'center',
                                                zIndex: isCurrent ? 40 : 20,
                                            }}
                                        >
                                            {!isLocked && (
                                                <FloatingLabel 
                                                    label={lesson.name || 'Lesson'}
                                                    nodeIsLeft={isLeft}
                                                    isCurrent={isCurrent}
                                                    onPress={isCurrent ? () => router.push(`/level?id=${lesson.id}`) : undefined}
                                                />
                                            )}

                                            <TactileButton
                                                disabled={isLocked}
                                                onPress={() => router.push(`/level?id=${lesson.id}`)}
                                                backgroundColor={bgColor}
                                                shadowColor={shadowColor}
                                                depth={isCurrent ? 8 : (isLocked ? 4 : 6)}
                                                borderRadius={999}
                                                style={{ width: NODE_SIZE, height: NODE_SIZE }}
                                                contentClassName="items-center justify-center w-full h-full"
                                            >
                                                <View style={{
                                                    width: '100%', 
                                                    height: '100%', 
                                                    borderRadius: 999, 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    borderWidth: (isCompleted || isCurrent) ? 4 : 0,
                                                    borderColor: 'rgba(255,255,255,0.2)'
                                                }}>
                                                    {icon}
                                                </View>
                                            </TactileButton>
                                        </Animated.View>
                                    );
                                })}
                            </View>
                        </View>
                    );
                })}

                {(!subject.topics || subject.topics.length === 0) && (
                    <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: 40, paddingHorizontal: 24 }}>
                        <MascotInteraction
                            state="thinking"
                            message="No units available yet! Check back later."
                        />
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

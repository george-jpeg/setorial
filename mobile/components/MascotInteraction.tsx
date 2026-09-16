import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import Animated, { 
    FadeInRight, 
    SlideInUp,
    FadeIn,
    BounceIn,
} from 'react-native-reanimated';
import LottieView from 'lottie-react-native';
import { stateToMood, LION_IMAGES, type LionMood } from '../lib/lionMood';
import { useConfigStore } from '../store/configStore';

interface MascotInteractionProps {
    message?: string;
    messageNode?: React.ReactNode;
    /** Legacy state names for backward compat, OR direct lion mood names */
    state?: 'happy' | 'sad' | 'thinking' | 'pointing_down' | 'pointing_up' | 'pointing_left' | 'pointing_right' | 'angry' | 'crying' | 'freezing' | 'sleeping' | 'formal';
    size?: number;
    /** Direct mood override (takes priority over state) */
    mood?: LionMood;
    noEntryAnimation?: boolean;
}

export const MascotInteraction: React.FC<MascotInteractionProps> = ({ 
    message, 
    messageNode,
    state = 'happy', 
    size = 120,
    mood,
    noEntryAnimation = false,
}) => {
    // Determine which lion to show
    const override = useConfigStore((s) => s.mascotOverride);
    const lionMood = (override && override.enabled && override.mood) ? (override.mood as LionMood) : (mood || stateToMood(state));
    const lionImage = LION_IMAGES[lionMood];
    
    // Check if mood has a Lottie animation
    const hasLottie = ['happy', 'sad', 'crying'].includes(lionMood);
    let lottieSource = null;
    if (lionMood === 'happy') {
        lottieSource = require('../assets/animations/Happy-mood.json');
    } else if (lionMood === 'sad' || lionMood === 'crying') {
        lottieSource = require('../assets/animations/sad-mood-loop.json');
    }

    return (
        <View style={styles.container}>
            {/* Lion Image — slides up from its own boundary */}
            <View style={[styles.lionContainer, { width: size, height: size }]}>
                <Animated.View
                    entering={noEntryAnimation ? undefined : SlideInUp.delay(100).springify().damping(22).stiffness(100).mass(0.8)}
                    style={styles.lionInner}
                >
                    {hasLottie ? (
                        <LottieView
                            source={lottieSource}
                            autoPlay
                            loop
                            style={[styles.lionImage, { width: size, height: size }]}
                        />
                    ) : (
                        <Image
                            source={lionImage}
                            style={[styles.lionImage, { width: size, height: size }]}
                            resizeMode="contain"
                        />
                    )}
                </Animated.View>
            </View>

            {/* Speech Bubble */}
            {(message || messageNode) && (
                <Animated.View 
                    entering={noEntryAnimation ? undefined : FadeInRight.delay(400).springify().damping(22).stiffness(100).mass(0.8)}
                    style={styles.bubble}
                    className="bg-white dark:bg-[#1E222B] border-2 border-b-4 border-gray-100 dark:border-[#272B36]"
                    pointerEvents="box-none"
                >
                    {messageNode ? messageNode : (
                        <Text className="text-black dark:text-white font-bold text-[15px] leading-5">
                            {message}
                        </Text>
                    )}
                    
                    {/* Tail of the bubble */}
                    <View 
                        style={styles.bubbleTail}
                        className="absolute -left-[10px] bottom-[-2px] w-0 h-0 border-l-[10px] border-l-transparent border-t-[10px] border-t-white dark:border-t-[#1E222B]"
                    />
                </Animated.View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 8,
        width: '100%',
    },
    lionContainer: {
        overflow: 'hidden',
        borderRadius: 20,
        marginBottom: -4,
    },
    lionInner: {
        width: '100%',
        height: '100%',
    },
    lionImage: {
        borderRadius: 20,
    },
    bubble: {
        flex: 1,
        padding: 12,
        borderRadius: 16,
        borderBottomLeftRadius: 0,
        marginLeft: 8,
        marginBottom: 12,
        zIndex: 0,
    },
    bubbleTail: {
        borderRightWidth: 10,
        borderRightColor: 'transparent',
    }
});

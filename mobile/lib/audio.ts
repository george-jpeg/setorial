import { createAudioPlayer } from 'expo-audio';
import { useAuthStore } from '../store/authStore';

const SOUNDS = {
  tap: require('../assets/sounds/tap.wav'),
  pop: require('../assets/sounds/pop.wav'),
  boop: require('../assets/sounds/boop.wav'),
  correct: require('../assets/sounds/correct.wav'),
  incorrect: require('../assets/sounds/incorrect.wav'),
  victory: require('../assets/sounds/victory.wav'),
  complete: require('../assets/sounds/complete.wav'),
};

export async function playSound(name: keyof typeof SOUNDS) {
  // Respect the user's sound preference
  if (!useAuthStore.getState().soundEnabled) return;
  
  try {
    const player = createAudioPlayer(SOUNDS[name]);
    player.volume = 0.5;
    player.play();
  } catch (error) {
    console.log('Error playing sound:', error);
  }
}

import { Platform } from 'react-native';

export const SuperwallPlacements = {
  UPGRADE_MODAL: 'UpgradeModal',
  LESSON_LIMIT: 'LessonLimit',
  AI_TUTOR: 'AiTutor',
  CUSTOM_MOCK: 'CustomMock',
  STORE_POWERUP: 'StorePowerup',
  ONBOARDING_COMPLETION: 'OnboardingCompletion',
} as const;

export type SuperwallPlacementName = typeof SuperwallPlacements[keyof typeof SuperwallPlacements] | string;

const isExpoGo = typeof globalThis !== 'undefined' && Boolean((globalThis as any).expo?.modules?.ExpoGo);
const canUseSuperwall = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGo;

let nativeUsePlacement: any = null;

if (canUseSuperwall) {
  try {
    const sw = require('expo-superwall');
    nativeUsePlacement = sw.usePlacement;
  } catch (e) {
    // In environments where native modules are missing (Expo Go), fallback safely
  }
}

/**
 * Universal safe hook for registering Superwall placements.
 * Falls back gracefully in Expo Go and Web so the app never crashes.
 */
export function usePlacement(callbacks?: any) {
  if (nativeUsePlacement) {
    return nativeUsePlacement(callbacks);
  }

  return {
    registerPlacement: async ({ feature }: { placement: string; params?: any; feature?: () => void }) => {
      feature?.();
    },
    state: { status: 'idle' } as const,
  };
}

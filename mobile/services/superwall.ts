import { usePlacement as useSuperwallPlacement, type usePlacementCallbacks } from 'expo-superwall';
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

/**
 * Universal safe hook for registering Superwall placements
 */
export function usePlacement(callbacks?: usePlacementCallbacks) {
  if (Platform.OS === 'web') {
    return {
      registerPlacement: async ({ feature }: { placement: string; params?: any; feature?: () => void }) => {
        feature?.();
      },
      state: { status: 'idle' } as const,
    };
  }

  return useSuperwallPlacement(callbacks);
}

export { useSuperwallPlacement };

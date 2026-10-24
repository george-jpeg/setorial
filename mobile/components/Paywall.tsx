import React from 'react';
import { View, Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import RevenueCatUI from 'react-native-purchases-ui';
import Purchases from 'react-native-purchases';
import { purchasesService } from '../services/purchases';
import { SuperwallPlacements } from '../services/superwall';

const isExpoGo =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (typeof globalThis !== 'undefined' && Boolean((globalThis as any).expo?.modules?.ExpoGo));

export const isSuperwallEnabled = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGo;

interface PaywallProps {
  placement?: string;
  style?: any;
  onPurchaseCompleted?: () => void;
  onRestoreCompleted?: () => void;
  onDismiss?: () => void;
}

const SuperwallTrigger: React.FC<PaywallProps> = ({
  placement = SuperwallPlacements.UPGRADE_MODAL,
  style,
  onPurchaseCompleted,
  onRestoreCompleted,
  onDismiss,
}) => {
  const { usePlacement, useSuperwall, useSuperwallStore } = require('expo-superwall');
  const { isConfigured } = useSuperwall();
  const [triggered, setTriggered] = React.useState(false);
  const [fallbackToRC, setFallbackToRC] = React.useState(false);
  const triedDefaultRef = React.useRef(placement === SuperwallPlacements.UPGRADE_MODAL);

  const onDismissRef = React.useRef(onDismiss);
  const onPurchaseCompletedRef = React.useRef(onPurchaseCompleted);
  const onRestoreCompletedRef = React.useRef(onRestoreCompleted);

  React.useEffect(() => {
    onDismissRef.current = onDismiss;
    onPurchaseCompletedRef.current = onPurchaseCompleted;
    onRestoreCompletedRef.current = onRestoreCompleted;
  });

  const syncPurchases = async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      purchasesService.syncCustomerInfo(info);
    } catch (e) {
      console.warn('[Paywall] Failed to sync customer info:', e);
    }
  };

  const { registerPlacement } = usePlacement({
    onDismiss: async (_info: any, result: any) => {
      if (result && result.type === 'purchased') {
        await syncPurchases();
        onPurchaseCompletedRef.current?.();
      } else if (result && result.type === 'restored') {
        await syncPurchases();
        onRestoreCompletedRef.current?.();
      } else {
        onDismissRef.current?.();
      }
    },
    onSkip: (reason: any) => {
      console.warn('[Superwall] Paywall skipped:', reason);
      if (!triedDefaultRef.current) {
        triedDefaultRef.current = true;
        registerPlacement({ placement: SuperwallPlacements.UPGRADE_MODAL });
        return;
      }
      onDismissRef.current?.();
    },
    onError: (error: any) => {
      console.warn('[Superwall] Paywall error:', error);
      setFallbackToRC(true);
    },
  });

  React.useEffect(() => {
    if (!triggered && isConfigured) {
      setTriggered(true);

      try {
        const store = useSuperwallStore?.getState?.();
        if (store?.setSubscriptionStatus) {
          // Ensure subscriptionStatus is set before presenting to prevent Timeout 105
          // and allow Free/Bronze/Silver users to view the upgrade paywall
          store
            .setSubscriptionStatus({ status: 'INACTIVE' })
            .then(() => {
              registerPlacement({ placement });
            })
            .catch(() => {
              registerPlacement({ placement });
            });
        } else {
          registerPlacement({ placement });
        }
      } catch {
        registerPlacement({ placement });
      }
    }
  }, [triggered, isConfigured, registerPlacement, placement]);

  if (fallbackToRC) {
    return (
      <RevenueCatUI.Paywall
        style={style}
        onPurchaseCompleted={async () => {
          await syncPurchases();
          onPurchaseCompleted?.();
        }}
        onRestoreCompleted={async () => {
          await syncPurchases();
          onRestoreCompleted?.();
        }}
        onDismiss={onDismiss}
      />
    );
  }

  return <View style={{ flex: 1 }} />;
};

export const Paywall: React.FC<PaywallProps> = (props) => {
  const {
    style,
    placement = SuperwallPlacements.UPGRADE_MODAL,
    onPurchaseCompleted,
    onRestoreCompleted,
    onDismiss,
  } = props;

  if (isSuperwallEnabled) {
    return (
      <SuperwallTrigger
        placement={placement}
        style={style}
        onPurchaseCompleted={onPurchaseCompleted}
        onRestoreCompleted={onRestoreCompleted}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <RevenueCatUI.Paywall
      style={style}
      onPurchaseCompleted={async () => {
        try {
          const info = await Purchases.getCustomerInfo();
          purchasesService.syncCustomerInfo(info);
        } catch {}
        onPurchaseCompleted?.();
      }}
      onRestoreCompleted={async () => {
        try {
          const info = await Purchases.getCustomerInfo();
          purchasesService.syncCustomerInfo(info);
        } catch {}
        onRestoreCompleted?.();
      }}
      onDismiss={onDismiss}
    />
  );
};

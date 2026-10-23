import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, {
  PRODUCT_CATEGORY,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { useAuthStore } from '../store/authStore';
import { purchasesService } from '../services/purchases';

export const SUPERWALL_API_KEYS = {
  ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_KEY || '',
};

// Check if running in Expo Go or Web where custom native modules are not loaded
const isExpoGo = typeof globalThis !== 'undefined' && Boolean((globalThis as any).expo?.modules?.ExpoGo);
const canUseSuperwall = (Platform.OS === 'ios' || Platform.OS === 'android') && !isExpoGo;

let NativeSuperwallProvider: React.FC<{ children: React.ReactNode }> | null = null;

if (canUseSuperwall) {
  try {
    const {
      CustomPurchaseControllerProvider,
      SuperwallProvider,
      useUser,
    } = require('expo-superwall');

    function SuperwallSyncInner() {
      const { setSubscriptionStatus, identify, signOut, update } = useUser();
      const { user } = useAuthStore();

      // 1. Sync User Identity & Attributes
      useEffect(() => {
        if (user?.id) {
          identify(user.id).catch((err: any) => console.log('[Superwall] Identify error:', err));
          update({
            email: user.email,
            name: user.name,
            tier: user.tier,
            billingCountry: user.billingCountry || 'NG',
            points: user.points || 0,
            streak: user.streak || 0,
          }).catch((err: any) => console.log('[Superwall] Update attributes error:', err));
        } else {
          signOut();
        }
      }, [user?.id, user?.tier, user?.points, user?.streak]);

      // 2. Sync Subscription Status from RevenueCat into Superwall
      useEffect(() => {
        const listener = (customerInfo: any) => {
          const entitlementIds = Object.keys(customerInfo.entitlements.active);

          setSubscriptionStatus({
            status: entitlementIds.length === 0 ? 'INACTIVE' : 'ACTIVE',
            entitlements: entitlementIds.map((id) => ({
              id,
              type: 'SERVICE_LEVEL',
            })),
          });

          // Also ensure internal auth store is updated
          purchasesService.syncCustomerInfo(customerInfo);
        };

        Purchases.addCustomerInfoUpdateListener(listener);

        const syncInitialStatus = async () => {
          try {
            const customerInfo = await Purchases.getCustomerInfo();
            const entitlementIds = Object.keys(customerInfo.entitlements.active);

            setSubscriptionStatus({
              status: entitlementIds.length === 0 ? 'INACTIVE' : 'ACTIVE',
              entitlements: entitlementIds.map((id) => ({
                id,
                type: 'SERVICE_LEVEL',
              })),
            });

            purchasesService.syncCustomerInfo(customerInfo);
          } catch (error) {
            console.log('[Superwall] Initial status sync:', error);
          }
        };

        syncInitialStatus();

        return () => {
          Purchases.removeCustomerInfoUpdateListener(listener);
        };
      }, [setSubscriptionStatus]);

      return null;
    }

    NativeSuperwallProvider = function NativeSuperwallContainer({ children }: { children: React.ReactNode }) {
      return (
        <CustomPurchaseControllerProvider
          controller={{
            onPurchase: async (params: any) => {
              try {
                const products = await Promise.all([
                  Purchases.getProducts([params.productId], PRODUCT_CATEGORY.SUBSCRIPTION),
                  Purchases.getProducts([params.productId], PRODUCT_CATEGORY.NON_SUBSCRIPTION),
                ]).then((results) => results.flat());

                const product =
                  products.find((p) => p.identifier === params.productId) ??
                  (params.platform === 'android' && params.basePlanId
                    ? products.find((p) => p.identifier === `${params.productId}:${params.basePlanId}`)
                    : undefined) ??
                  products[0];

                if (!product) {
                  return { type: 'failed', error: 'Product not found in store catalog' };
                }

                if (params.platform === 'android' && product.subscriptionOptions?.length) {
                  const optionId = params.offerId
                    ? `${params.basePlanId}:${params.offerId}`
                    : params.basePlanId;
                  const option = product.subscriptionOptions.find((opt) => opt.id === optionId);

                  if (!option) {
                    return { type: 'failed', error: 'Subscription option not found' };
                  }

                  await Purchases.purchaseSubscriptionOption(option);
                  return { type: 'purchased' };
                }

                await Purchases.purchaseStoreProduct(product);
                return { type: 'purchased' };
              } catch (error: any) {
                if (error.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
                  return { type: 'cancelled' };
                }
                return { type: 'failed', error: error.message };
              }
            },

            onPurchaseRestore: async () => {
              try {
                await Purchases.restorePurchases();
                return { type: 'restored' };
              } catch (error: any) {
                return { type: 'failed', error: error.message };
              }
            },
          }}
        >
          <SuperwallProvider
            apiKeys={SUPERWALL_API_KEYS}
            options={{
              passIdentifiersToPlayStore: true,
            }}
            onConfigurationError={(error: any) => {
              console.warn('[Superwall] Configuration warning:', error.message);
            }}
          >
            <SuperwallSyncInner />
            {children}
          </SuperwallProvider>
        </CustomPurchaseControllerProvider>
      );
    };
  } catch (e) {
    console.warn('[Superwall] Native module not loaded, running in compatibility fallback mode');
  }
}

interface SuperwallWrapperProps {
  children: React.ReactNode;
}

export function SuperwallWrapper({ children }: SuperwallWrapperProps) {
  if (NativeSuperwallProvider) {
    return <NativeSuperwallProvider>{children}</NativeSuperwallProvider>;
  }

  // Graceful fallback for Expo Go and Web
  return <>{children}</>;
}

import Purchases, { LOG_LEVEL, PurchasesPackage, CustomerInfo, PurchasesOfferings } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';

export const REVENUECAT_API_KEYS = {
  ios: 'appl_1vFuSIKkhAQTTOWdLBgvVmJKTQ',
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY || 'test_ipPDlMpjQhUtJyElPmXURiilqJv',
};

export const getRevenueCatApiKey = () => {
  return Platform.OS === 'ios' ? REVENUECAT_API_KEYS.ios : REVENUECAT_API_KEYS.android;
};

let isConfigured = false;

export const purchasesService = {
  /**
   * Initializes RevenueCat Purchases SDK
   */
  async init(userId?: string) {
    if (Platform.OS === 'web') return;
    if (isConfigured) {
      if (userId) {
        await this.login(userId);
      }
      return;
    }

    try {
      if (__DEV__) {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      } else {
        Purchases.setLogLevel(LOG_LEVEL.INFO);
      }

      await Purchases.configure({
        apiKey: getRevenueCatApiKey(),
        appUserID: userId || null,
      });

      isConfigured = true;

      // Listen for customer info updates (e.g. renewal, cancellation, upgrade)
      Purchases.addCustomerInfoUpdateListener((info) => {
        purchasesService.syncCustomerInfo(info);
      });
    } catch (error) {
      console.error('[RevenueCat] Failed to configure Purchases:', error);
    }
  },

  /**
   * Log in a user with their backend User ID
   */
  async login(userId: string) {
    if (Platform.OS === 'web' || !isConfigured) return;
    try {
      const { customerInfo } = await Purchases.logIn(userId);
      this.syncCustomerInfo(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] LogIn failed:', error);
    }
  },

  /**
   * Log out user from RevenueCat (returns to anonymous ID)
   */
  async logout() {
    if (Platform.OS === 'web' || !isConfigured) return;
    try {
      const customerInfo = await Purchases.logOut();
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] LogOut failed:', error);
    }
  },

  /**
   * Fetch currently available offerings and packages
   */
  async getOfferings(): Promise<PurchasesOfferings | null> {
    if (Platform.OS === 'web' || !isConfigured) return null;
    try {
      return await Purchases.getOfferings();
    } catch (error) {
      console.error('[RevenueCat] Failed to fetch offerings:', error);
      return null;
    }
  },

  /**
   * Purchase a specific RevenueCat package
   */
  async purchasePackage(packageToBuy: PurchasesPackage) {
    if (Platform.OS === 'web' || !isConfigured) {
      throw new Error('In-app purchases are not supported on this platform');
    }
    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
      this.syncCustomerInfo(customerInfo);
      return customerInfo;
    } catch (error: any) {
      if (error.userCancelled) {
        console.log('[RevenueCat] User cancelled purchase');
        return null;
      }
      throw error;
    }
  },

  /**
   * Restore purchases (required for App Store & Google Play compliance)
   */
  async restorePurchases() {
    if (Platform.OS === 'web' || !isConfigured) return null;
    try {
      const customerInfo = await Purchases.restorePurchases();
      this.syncCustomerInfo(customerInfo);
      return customerInfo;
    } catch (error) {
      console.error('[RevenueCat] Restore failed:', error);
      throw error;
    }
  },

  /**
   * Present the native RevenueCat paywall modal UI
   */
  async presentPaywall(offeringIdentifier?: string): Promise<PAYWALL_RESULT | null> {
    if (Platform.OS === 'web') return null;
    try {
      const offerings = await this.getOfferings();
      const offering = offeringIdentifier && offerings?.all[offeringIdentifier]
        ? offerings.all[offeringIdentifier]
        : offerings?.current || undefined;

      const result = await RevenueCatUI.presentPaywall({ offering });
      if (result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED) {
        const info = await Purchases.getCustomerInfo();
        this.syncCustomerInfo(info);
      }
      return result;
    } catch (error) {
      console.error('[RevenueCatUI] Failed to present paywall:', error);
      return null;
    }
  },

  /**
   * Maps active RevenueCat entitlements to Setorial tiers and updates auth store
   */
  syncCustomerInfo(info: CustomerInfo) {
    const entitlements = info.entitlements.active;
    let resolvedTier: 'FREE' | 'BRONZE' | 'SILVER' | 'GOLD' = 'FREE';

    if (entitlements['gold'] || entitlements['setorial_gold']) {
      resolvedTier = 'GOLD';
    } else if (entitlements['silver'] || entitlements['setorial_silver']) {
      resolvedTier = 'SILVER';
    } else if (entitlements['bronze'] || entitlements['setorial_bronze']) {
      resolvedTier = 'BRONZE';
    }

    const { user, updateUser } = useAuthStore.getState();
    if (user && resolvedTier !== 'FREE' && user.tier !== resolvedTier) {
      updateUser({ tier: resolvedTier });
    }
    return resolvedTier;
  },
};

export { Purchases, RevenueCatUI, PAYWALL_RESULT };

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { useAuthStore } from '../store/authStore';

const API_URL = 'https://setorial-production.up.railway.app';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Bypass-Tunnel-Reminder': 'true'
    }
});

api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            // Token expired or invalid
            await useAuthStore.getState().logout();
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: (data: any) => api.post('/auth/login', data),
    register: (data: any) => api.post('/auth/register', data),
    verifyOtp: (data: { email: string; otp: string }) => api.post('/auth/verify-otp', data),
    getMe: () => api.get('/users/me'),
    updateProfile: (data: any) => api.patch('/users/me', data),
    changePassword: (data: any) => api.patch('/auth/password', data),
    forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
    resetPassword: (data: { email: string; otp: string; newPassword: string }) => api.post('/auth/reset-password', data),
    getProgress: () => api.get('/users/me/progress'),
};

export const walletApi = {
    getBalance: () => api.get('/wallet/balance'),
    getTransactions: () => api.get('/wallet/transactions'),
};

export const gamificationApi = {
    getLeaderboard: (subjectId?: string) => api.get(`/gamification/leaderboard${subjectId ? `?subjectId=${subjectId}` : ''}`),
};

export const subscriptionApi = {
    initialize: (data: { tier: string, billingCycle?: string }) => api.post('/subscriptions/initialize', data),
    verify: (reference: string) => api.get(`/subscriptions/verify/${reference}`),
    getPricing: (country: string) => api.get(`/pricing?country=${country}`),
};

export const learningApi = {
    getSubjects: () => api.get('/learning/subjects'),
    getSubject: (id: string) => api.get(`/learning/subjects/${id}`),
    getLesson: (id: string) => api.get(`/learning/lessons/${id}`),
    recordVideoPlay: (lessonId: string) => api.post(`/learning/lessons/${lessonId}/play`),
    submitLesson: (data: any) => api.post('/learning/lessons/submit', data),
    search: (q: string) => api.get(`/learning/search?q=${q}`),
    regenerateLesson: (id: string) => api.post(`/learning/lessons/${id}/regenerate`),
    generateAiLevels: (data: { subjectId: string, topicName: string, numLevels: number }) => 
        api.post('/learning/ai/generate-levels', data),
    generateAiMock: (data: { subjectId: string, title: string, numQuestions?: number }) => 
        api.post('/learning/ai/generate-mock', data),
};

export const kycApi = {
    submitKyc: (data: { payoutMethod: 'NGN_BANK' | 'USD_PAYPAL'; payoutAccount: Record<string, any> }) =>
        api.post('/users/me/kyc', data),
    getBanks: () => api.get('/users/me/kyc/banks'),
    resolveAccount: (accountNumber: string, bankCode: string) =>
        api.get(`/users/me/kyc/resolve?accountNumber=${accountNumber}&bankCode=${bankCode}`),
};

export const mockApi = {
    getAvailable: () => api.get('/mocks'),
    getDetails: (id: string) => api.get(`/mocks/${id}`),
    start: (id: string) => api.post(`/mocks/${id}/start`),
    submit: (id: string, answers: number[], tabSwitches: number) =>
        api.post(`/mocks/${id}/submit`, { answers, tabSwitches }),
    generateCustom: (data: { subjectIds: string[], numQuestions: number, durationMinutes: number }) =>
        api.post('/mocks/custom', data),
    initializePayment: (id: string) => api.post(`/mocks/${id}/pay`),
    verifyPayment: (reference: string) => api.post('/mocks/verify-payment', { reference }),
};

export const storeApi = {
    getStore: () => api.get('/store'),
    getMyPowerUps: () => api.get('/store/my-powerups'),
    buy: (type: string) => api.post(`/store/buy/${type}`),
    verify: (reference: string) => api.get(`/store/verify/${reference}`),
};
export const supportApi = {
    sendMessage: (data: { subject: string, message: string }) => api.post('/support/message', data),
    getMyMessages: () => api.get('/support/my-messages'),
};

export const tutorApi = {
    getSessions: () => api.get('/learning/tutor/sessions'),
    getMessages: (id: string) => api.get(`/learning/tutor/sessions/${id}/messages`),
    getChatUrl: () => `${API_URL}/learning/tutor/chat`,
};

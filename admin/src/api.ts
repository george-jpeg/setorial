import axios from 'axios';

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;
const baseUrl = rawBaseUrl
    ? rawBaseUrl.startsWith('http')
        ? rawBaseUrl
        : `https://${rawBaseUrl}`
    : 'https://setorial-production.up.railway.app';

const api = axios.create({
    baseURL: baseUrl,
});

// Intercept requests to add the token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Intercept responses to handle 401s
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('admin_token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export const adminApi = {
    login: (data: any) => api.post('/auth/login', data),
    getDashboardStats: () => api.get('/admin/dashboard'),
    getPendingKyc: () => api.get('/admin/kyc'),
    approveKyc: (id: string) => api.post(`/admin/kyc/${id}/approve`),
    rejectKyc: (id: string, reason: string) => api.post(`/admin/kyc/${id}/reject`, { reason }),
    getUsers: (params: any) => api.get('/admin/users', { params }),
    getUserAnalytics: (id: string) => api.get(`/admin/users/${id}/analytics`),
    getUserStats: (id: string) => api.get(`/admin/users/${id}/stats`),
    getCohortOverview: () => api.get('/admin/analytics/overview'),
    exportAnalyticsCsv: () => api.get('/admin/analytics/export'),
    freezeUser: (id: string, isFrozen: boolean) => api.post(`/admin/users/${id}/freeze`, { isFrozen }),
    flagUser: (id: string, isFlagged: boolean) => api.post(`/admin/users/${id}/flag`, { isFlagged }),
    createTutor: (data: any) => api.post('/admin/users/tutor', data),
    // Payouts
    getPayoutBatches: () => api.get('/admin/payout-batches'),
    triggerPayout: (month: string, revenue: number) =>
        api.post(`/admin/payout/trigger?month=${month}&revenue=${revenue}`),

    // Pricing & Regions
    getPricing: () => api.get('/admin/pricing'),
    createPricing: (data: any) => api.post('/admin/pricing', data),
    updatePricing: (id: string, data: any) => api.patch(`/admin/pricing/${id}`, data),
    deletePricing: (id: string) => api.delete(`/admin/pricing/${id}`),
    getRegionalStats: () => api.get('/admin/regions'),

    // Global Config
    getConfigs: () => api.get('/admin/configs'),
    updateConfig: (key: string, value: string, description?: string) => api.post(`/admin/configs/${key}`, { value, description }),

    // Discounts
    getDiscounts: () => api.get('/admin/discounts'),
    createDiscount: (data: any) => api.post('/admin/discounts', data),
    toggleDiscount: (id: string, isActive: boolean) => api.post(`/admin/discounts/${id}/toggle`, { isActive }),

    // Learning & AI Content
    getSubjects: () => api.get('/learning/subjects'),
    createSubject: (data: any) => api.post('/learning/subjects', data),
    deleteSubject: (id: string) => api.delete(`/learning/subjects/${id}`),
    createTopic: (data: any) => api.post('/learning/topics', data),
    deleteTopic: (id: string) => api.delete(`/learning/topics/${id}`),
    updateTopic: (id: string, data: any) => api.post(`/learning/topics/${id}`, data),
    createLesson: (data: any) => api.post('/learning/lessons', data),
    generateAiLevels: (data: { subjectId: string, topicName: string, numLevels: number }) => 
        api.post('/learning/ai/generate-levels', data),
    generateFullSubject: (data: { subjectId: string, numTopics: number }) => 
        api.post('/learning/ai/generate-full-subject', data),
    regenerateLesson: (id: string) => api.post(`/learning/lessons/${id}/regenerate`),
    generateAiMock: (data: { subjectId: string, title: string, numQuestions?: number, durationMinutes?: number }) => 
        api.post('/learning/ai/generate-mock', data),
    getLesson: (id: string) => api.get(`/learning/lessons/${id}`),
    updateLesson: (id: string, data: any) => {
        // If data is FormData (containing video), axial handles it
        return api.post(`/learning/lessons/${id}`, data);
    },

    // Mock Exams
    getMocks: () => api.get('/mocks'),
    getMockDetails: (id: string) => api.get(`/mocks/${id}`),
    createMock: (data: any) => api.post('/admin/mocks', data), 
    updateMock: (id: string, data: any) => api.patch(`/admin/mocks/${id}`, data),
    deleteMock: (id: string) => api.delete(`/admin/mocks/${id}`),

    // Support
    getSupportMessages: () => api.get('/admin/support'),
    replyToSupport: (id: string, reply: string, adminName: string) => 
        api.post(`/admin/support/${id}/reply`, { reply, adminName }),

    // Notifications
    sendNotification: (data: { userId?: string, recentOnly?: boolean, title: string, body: string, data?: any }) => 
        api.post('/admin/notifications/send', data),
    sendEmailBroadcast: (data: { subject: string, body: string, emails?: string[] }) => 
        api.post('/admin/notifications/email', data),

    // Approvals
    approveSubject: (id: string) => api.post(`/learning/subjects/${id}/approve`),
    approveTopic: (id: string) => api.post(`/learning/topics/${id}/approve`),
    approveLesson: (id: string) => api.post(`/learning/lessons/${id}/approve`),
    approveMock: (id: string) => api.post(`/admin/mocks/${id}/approve`),
};

export default api;

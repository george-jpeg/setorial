import { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    Users,
    ShieldCheck,
    CreditCard,
    LogOut,
    AlertTriangle,
    TrendingUp,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    DollarSign,
    UserCheck,
    Globe,
    CalendarDays,
    Map,
    Edit2,
    Edit3,
    Trash2,
    Plus,
    RefreshCcw,
    BookOpen,
    Wand2,
    Layers,
    Ticket,
    Bell,
    Percent,
    X,
    LifeBuoy,
    Send
} from 'lucide-react';
import { adminApi } from './api';
import { SignupsTrendChart, RetentionCurveChart } from './components/Charts';

/* ─── Reusable Components ──────────────────────────────────────────────────── */

const SidebarItem = ({ icon: Icon, label, active, onClick, badge }: { icon: any; label: string; active: boolean; onClick: () => void; badge?: number }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg font-medium transition-all relative ${active
            ? 'bg-zinc-100/80 text-zinc-900'
            : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/50'
            }`}
    >
        <Icon size={18} />
        <span className="text-sm">{label}</span>
        {badge !== undefined && badge > 0 && (
            <span className="ml-auto bg-red-50 text-red-600 ring-1 ring-inset ring-red-600/10 text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center justify-center">{badge}</span>
        )}
    </button>
);


const StatCard = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | number }) => (
    <div className="card">
        <div className="flex items-center space-x-4 mb-2 -mt-1">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-zinc-100`}>
                <Icon size={20} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500 font-medium text-sm">{label}</p>
        </div>
        <h3 className="text-3xl font-semibold text-zinc-900 mt-2 tracking-tight">{value}</h3>
    </div>
);

const tierBadge = (tier: string) => {
    const styles: Record<string, string> = {
        FREE: 'bg-zinc-100 text-zinc-700 ring-zinc-500/10',
        BRONZE: 'bg-amber-50 text-amber-700 ring-amber-600/20',
        SILVER: 'bg-slate-100 text-slate-700 ring-slate-500/20',
        GOLD: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
    };
    const style = styles[tier] || styles.FREE;
    return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>{tier}</span>;
};

const kycBadge = (status: string) => {
    const styles: Record<string, string> = {
        UNVERIFIED: 'bg-zinc-100 text-zinc-700 ring-zinc-500/10',
        PENDING: 'bg-yellow-50 text-yellow-800 ring-yellow-600/20',
        APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
        REJECTED: 'bg-red-50 text-red-700 ring-red-600/10',
    };
    const style = styles[status] || styles.UNVERIFIED;
    return <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${style}`}>{status}</span>;
};

/* ─── Main Dashboard ───────────────────────────────────────────────────────── */

function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            window.atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export default function AdminDashboard() {
    const token = localStorage.getItem('admin_token');
    const user = token ? parseJwt(token) : null;
    const userRole = user?.role || 'ADMIN';

    const [activeTab, setActiveTab] = useState(userRole === 'TUTOR' ? 'learning' : 'overview');
    const [stats, setStats] = useState<any>(null);
    const [cohortStats, setCohortStats] = useState<any>(null);
    const [kycRequests, setKycRequests] = useState<any[]>([]);
    const [users, setUsers] = useState<any[]>([]);
    const [analyticsModalUser, setAnalyticsModalUser] = useState<any>(null);
    const [analyticsLoading, setAnalyticsLoading] = useState(false);
    const [payoutBatches, setPayoutBatches] = useState<any[]>([]);
    const [pricingList, setPricingList] = useState<any[]>([]);
    const [regionalStats, setRegionalStats] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [mocks, setMocks] = useState<any[]>([]);
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generatingSyllabus, setGeneratingSyllabus] = useState(false);
    const [isMockModalOpen, setIsMockModalOpen] = useState(false);
    const [editingMock, setEditingMock] = useState<any>(null);
    const [mockForm, setMockForm] = useState({
        title: '',
        description: '',
        durationMinutes: 60,
        price: 100,
        questions: [{ text: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }]
    });

    // Lesson Modal State
    const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<any>(null);
    const [lessonForm, setLessonForm] = useState({ name: '', content: '', videoUrl: '', rewardPoints: 10, questions: [] as any[] });

    // Mock AI Modal State
    const [isMockAiModalOpen, setIsMockAiModalOpen] = useState(false);
    const [mockAiForm, setMockAiForm] = useState({ subjectId: '', title: '', numQuestions: '60', durationMinutes: '120' });

    // Filters
    const [tierFilter, setTierFilter] = useState('');
    const [kycFilter, setKycFilter] = useState('');
    const [flagFilter, setFlagFilter] = useState('');
    const [userSearch, setUserSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');

    // Tutor Management Modal State
    const [isTutorModalOpen, setIsTutorModalOpen] = useState(false);
    const [tutorForm, setTutorForm] = useState({ name: '', email: '', password: '' });

    const handleSaveTutor = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tutorForm.name || !tutorForm.email || !tutorForm.password) {
            alert('Please fill out all fields.');
            return;
        }
        setLoading(true);
        try {
            await adminApi.createTutor(tutorForm);
            setIsTutorModalOpen(false);
            setTutorForm({ name: '', email: '', password: '' });
            alert('Tutor account created successfully!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create tutor');
        } finally {
            setLoading(false);
        }
    };

    // Payout trigger
    const [payoutMonth, setPayoutMonth] = useState('');
    const [payoutRevenue, setPayoutRevenue] = useState('');

    // Notifications
    const [broadcastType, setBroadcastType] = useState<'push' | 'email'>('push');
    const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'recent' | 'user'>('all');
    const [targetUserId, setTargetUserId] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');
    const [useSpecificEmails, setUseSpecificEmails] = useState(false);
    const [specificEmails, setSpecificEmails] = useState('');

    // Pricing Modal
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [editingPricing, setEditingPricing] = useState<any>(null);
    const [pricingForm, setPricingForm] = useState({
        countryCode: '',
        countryName: '',
        economicTier: 'TIER_C',
        multiplier: '1.0',
        currency: 'USD',
        bronzeMonthly: '0',
        silverMonthly: '0',
        goldMonthly: '0',
        bronzeAnnual: '0',
        silverAnnual: '0',
        goldAnnual: '0',
        isActive: true
    });

    const handleSaveMock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (editingMock) {
                await adminApi.updateMock(editingMock.id, mockForm);
            } else {
                await adminApi.createMock(mockForm);
            }
            setIsMockModalOpen(false);
            fetchData();
        } catch (err) { alert('Operation failed'); }
        finally { setLoading(false); }
    };

    const addQuestionField = () => {
        setMockForm({
            ...mockForm,
            questions: [...mockForm.questions, { text: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }]
        });
    };

    const updateQuestion = (idx: number, field: string, value: any) => {
        const newQs = [...mockForm.questions];
        (newQs[idx] as any)[field] = value;
        setMockForm({ ...mockForm, questions: newQs });
    };

    const updateOption = (qIdx: number, oIdx: number, value: string) => {
        const newQs = [...mockForm.questions];
        newQs[qIdx].options[oIdx] = value;
        setMockForm({ ...mockForm, questions: newQs });
    };

    const [supportMessages, setSupportMessages] = useState<any[]>([]);
    const [replyingTo, setReplyingTo] = useState<any>(null);
    const [supportReply, setSupportReply] = useState('');

    const handleReplySupport = async () => {
        if (!supportReply.trim()) return;
        setLoading(true);
        try {
            await adminApi.replyToSupport(replyingTo.id, supportReply, 'Admin');
            setReplyingTo(null);
            setSupportReply('');
            const res = await adminApi.getSupportMessages();
            setSupportMessages(res.data);
        } catch (err) { alert('Reply failed'); }
        finally { setLoading(false); }
    };

    // Topic Modal State
    const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
    const [editingTopic, setEditingTopic] = useState<any>(null);
    const [topicForm, setTopicForm] = useState({ name: '', description: '', order: 0 });

    useEffect(() => {
        fetchData();
    }, [activeTab, tierFilter, kycFilter, roleFilter]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'overview') {
                const [dashboardRes, cohortRes] = await Promise.all([
                    adminApi.getDashboardStats(),
                    adminApi.getCohortOverview(),
                ]);
                setStats(dashboardRes.data);
                setCohortStats(cohortRes.data);
            } else if (activeTab === 'kyc') {
                const res = await adminApi.getPendingKyc();
                setKycRequests(res.data);
            } else if (activeTab === 'users') {
                const params: any = {};
                if (tierFilter) params.tier = tierFilter;
                if (kycFilter) params.kycStatus = kycFilter;
                if (roleFilter) params.role = roleFilter;
                const res = await adminApi.getUsers(params);
                setUsers(res.data);
            } else if (activeTab === 'payouts') {
                const res = await adminApi.getPayoutBatches();
                setPayoutBatches(res.data);
            } else if (activeTab === 'pricing') {
                const res = await adminApi.getPricing();
                setPricingList(res.data);
            } else if (activeTab === 'regions') {
                const res = await adminApi.getRegionalStats();
                setRegionalStats(res.data);
            } else if (activeTab === 'learning') {
                const res = await adminApi.getSubjects();
                setSubjects(res.data);
            } else if (activeTab === 'mocks') {
                const res = await adminApi.getMocks();
                setMocks(res.data);
            } else if (activeTab === 'discounts') {
                const res = await adminApi.getDiscounts();
                setDiscounts(res.data);
            } else if (activeTab === 'support') {
                const res = await adminApi.getSupportMessages();
                setSupportMessages(res.data);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleApproveKyc = async (id: string) => {
        if (!confirm('Approve this KYC submission?')) return;
        try {
            await adminApi.approveKyc(id);
            fetchData();
        } catch (err) { alert('Failed to approve'); }
    };

    const handleRejectKyc = async (id: string) => {
        const reason = prompt('Reason for rejection?');
        if (!reason) return;
        try {
            await adminApi.rejectKyc(id, reason);
            fetchData();
        } catch (err) { alert('Failed to reject'); }
    };

    const handleFreezeUser = async (id: string, currentStatus: boolean) => {
        try {
            await adminApi.freezeUser(id, !currentStatus);
            fetchData();
        } catch (err) { alert('Failed to update freeze status'); }
    };

    const handleShowAnalytics = async (id: string) => {
        setAnalyticsModalUser({});
        setAnalyticsLoading(true);
        try {
            const [statsRes, analyticsRes] = await Promise.all([
                adminApi.getUserStats(id),
                adminApi.getUserAnalytics(id),
            ]);
            setAnalyticsModalUser({
                ...analyticsRes.data,
                ...statsRes.data,
                user: analyticsRes.data.user,
            });
        } catch (err: any) {
            console.error('Failed to load analytics', err);
            setAnalyticsModalUser(null);
            alert(err.response?.data?.message || 'Failed to load analytics');
        } finally {
            setAnalyticsLoading(false);
        }
    };

    const handleExportAnalyticsCsv = async () => {
        try {
            const res = await adminApi.exportAnalyticsCsv();
            const blob = new Blob([res.data.csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'setorial-cohort-export.csv';
            link.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.response?.data?.message || 'CSV export failed');
        }
    };

    const handleFlagUser = async (id: string, currentStatus: boolean) => {
        try {
            await adminApi.flagUser(id, !currentStatus);
            fetchData();
        } catch (err) { alert('Failed to update flag status'); }
    };

    const handleTriggerPayout = async () => {
        if (!payoutMonth || !payoutRevenue) { alert('Enter month (e.g. 2026-03) and revenue amount.'); return; }
        if (!confirm(`Trigger payout for ${payoutMonth} with ₦${Number(payoutRevenue).toLocaleString()} revenue?`)) return;
        try {
            await adminApi.triggerPayout(payoutMonth, Number(payoutRevenue));
            alert('Payout triggered successfully!');
            setPayoutMonth('');
            setPayoutRevenue('');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Payout failed');
        }
    };

    const openPricingModal = (pricing: any = null) => {
        if (pricing) {
            setEditingPricing(pricing);
            setPricingForm({
                ...pricing,
                multiplier: String(pricing.multiplier),
                bronzeMonthly: String(pricing.bronzeMonthly),
                silverMonthly: String(pricing.silverMonthly),
                goldMonthly: String(pricing.goldMonthly),
                bronzeAnnual: String(pricing.bronzeAnnual),
                silverAnnual: String(pricing.silverAnnual),
                goldAnnual: String(pricing.goldAnnual),
            });
        } else {
            setEditingPricing(null);
            setPricingForm({
                countryCode: '',
                countryName: '',
                economicTier: 'TIER_C',
                multiplier: '1.0',
                currency: 'USD',
                bronzeMonthly: '0',
                silverMonthly: '0',
                goldMonthly: '0',
                bronzeAnnual: '0',
                silverAnnual: '0',
                goldAnnual: '0',
                isActive: true
            });
        }
        setIsPricingModalOpen(true);
    };

    const handleSavePricing = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...pricingForm,
                multiplier: Number(pricingForm.multiplier),
                bronzeMonthly: Number(pricingForm.bronzeMonthly),
                silverMonthly: Number(pricingForm.silverMonthly),
                goldMonthly: Number(pricingForm.goldMonthly),
                bronzeAnnual: Number(pricingForm.bronzeAnnual),
                silverAnnual: Number(pricingForm.silverAnnual),
                goldAnnual: Number(pricingForm.goldAnnual),
            };

            if (editingPricing) {
                await adminApi.updatePricing(editingPricing.id, payload);
            } else {
                await adminApi.createPricing(payload);
            }
            setIsPricingModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to save pricing configuration');
        }
    };

    const handleDeletePricing = async (id: string, countryName: string) => {
        if (!confirm(`Are you sure you want to delete pricing for ${countryName}? This will permanently remove the configuration for this region.`)) return;
        try {
            await adminApi.deletePricing(id);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete pricing');
        }
    };




    const handleGenerateAiLevels = async (subjectId: string, topicName: string) => {
        const numLevels = prompt('How many levels (lessons) should the AI generate? (e.g. 5)');
        if (!numLevels || isNaN(Number(numLevels))) return;

        if (!confirm(`Generate ${numLevels} AI levels for "${topicName}"? This will generate textbook-length content. This may take up to a minute.`)) return;
        
        setLoading(true);
        try {
            await adminApi.generateAiLevels({ subjectId, topicName, numLevels: Number(numLevels) });
            alert('Levels successfully generated!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to generate levels.');
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerateLesson = async (lessonId: string, lessonName: string) => {
        if (!confirm(`Are you sure you want to REGENERATE AI content for "${lessonName}"? This will overwrite the current content and questions with deep textbook-style material.`)) return;
        
        setLoading(true);
        try {
            await adminApi.regenerateLesson(lessonId);
            alert('Lesson successfully regenerated with high-depth content!');
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to regenerate lesson');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateAiMock = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await adminApi.generateAiMock({ 
                subjectId: mockAiForm.subjectId, 
                title: mockAiForm.title, 
                numQuestions: Number(mockAiForm.numQuestions),
                durationMinutes: Number(mockAiForm.durationMinutes)
            });
            alert('AI Mock Exam generated successfully!');
            setIsMockAiModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to generate mock exam');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSubject = async () => {
        const name = prompt('Subject Name? (e.g. Mathematics)');
        const iconInfo = prompt('Icon Identifier or URL? (e.g. math)');
        
        if (name && iconInfo) {
            try {
                setLoading(true);
                const res = await adminApi.createSubject({ name, iconInfo, description: 'New Subject' });
                const subjectId = res.data.id;

                const numTopics = prompt('How many topics should the AI generate for this subject? (e.g. 5)');
                if (numTopics && !isNaN(Number(numTopics))) {
                    setLoading(false);
                    setGeneratingSyllabus(true);
                    try {
                        await adminApi.generateFullSubject({ subjectId, numTopics: Number(numTopics) });
                        alert('Wormhole Opened! The full syllabus is being built in the background. Please check back in a few minutes to see all topics and lessons.');
                    } catch (err: any) {
                        alert(err.response?.data?.message || 'AI Generation partially failed. Please check the subject.');
                    } finally {
                        setGeneratingSyllabus(false);
                    }
                }
                fetchData();
            } catch (err) { 
                alert('Failed to create subject'); 
                setLoading(false);
            }
        }
    };

    const handleCreateTopic = async (subjectId: string) => {
        const name = prompt('Topic Name? (e.g. Data Structures)');
        const description = prompt('Description?');
        const order = prompt('Order index? (e.g. 1)');
        if (name && order) {
            try {
                await adminApi.createTopic({ subjectId, name, description: description || '', order: Number(order) });
                fetchData();
            } catch (err) { alert('Failed to create'); }
        }
    };

    // Theme toggle
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('admin_theme') === 'dark' ? 'dark' : 'light'));

    // Mobile sidebar state
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Mascot mood manual override (stored in globalConfig via admin API)
    const [mascotOverrideEnabled, setMascotOverrideEnabled] = useState<boolean>(false);
    const [mascotMood, setMascotMood] = useState<string>('happy');

    const loadMascotConfig = async () => {
        try {
            const res = await adminApi.getConfigs();
            const configs = res.data as Array<any>;
            const entry = configs.find((c: any) => c.key === 'mascot_mood_override');
            if (entry && entry.value) {
                try {
                    const parsed = typeof entry.value === 'string' ? JSON.parse(entry.value) : entry.value;
                    setMascotOverrideEnabled(Boolean(parsed.enabled));
                    setMascotMood(parsed.mood || 'happy');
                } catch (e) {
                    // value might be plain string mood
                    setMascotOverrideEnabled(true);
                    setMascotMood(String(entry.value));
                }
            } else {
                setMascotOverrideEnabled(false);
            }
        } catch (err) {
            // ignore silently — non-critical
        }
    };

    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'dark') {
            root.classList.add('dark');
            localStorage.setItem('admin_theme', 'dark');
        } else {
            root.classList.remove('dark');
            localStorage.setItem('admin_theme', 'light');
        }
    }, [theme]);

    useEffect(() => {
        // load mascot config once on mount
        loadMascotConfig();
    }, []);

    const saveMascotConfig = async (enabled: boolean, mood: string) => {
        try {
            const payload = JSON.stringify({ enabled, mood });
            await adminApi.updateConfig('mascot_mood_override', payload, 'Manual mascot mood override set from admin');
            setMascotOverrideEnabled(enabled);
            setMascotMood(mood);
            alert('Mascot override saved');
        } catch (err: any) {
            console.error('Failed to save mascot config', err);
            alert(err.response?.data?.message || 'Failed to save mascot override');
        }
    };

    const handleEditTopic = (topic: any) => {
        setEditingTopic(topic);
        setTopicForm({
            name: topic.name,
            description: topic.description || '',
            order: topic.order || 0
        });
        setIsTopicModalOpen(true);
    };

    const handleSaveTopic = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await adminApi.updateTopic(editingTopic.id, topicForm);
            alert('Topic updated successfully!');
            setIsTopicModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update topic');
        }
    };

    const handleCreateLesson = async (topicId: string) => {
        const name = prompt('Lesson Name? (e.g. Introduction to Physics)');
        if (!name) return;
        try {
            const res = await adminApi.createLesson({ topicId, name, questions: [] });
            const lesson = res.data;
            // Open the edit modal so admin can add content, video link and questions
            setEditingLesson(lesson);
            setLessonForm({
                name: lesson.name,
                content: lesson.content || '',
                videoUrl: lesson.videoUrl || '',
                rewardPoints: lesson.rewardPoints ?? 10,
                questions: lesson.questions || []
            });
            setIsLessonModalOpen(true);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create lesson');
        }
    };

    const handleDeleteSubject = async (id: string, name: string) => {
        if (!confirm(`Delete subject "${name}" and ALL its topics and lessons? This cannot be undone.`)) return;
        try {
            await adminApi.deleteSubject(id);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete subject');
        }
    };

    const handleDeleteTopic = async (id: string, name: string) => {
        if (!confirm(`Delete topic "${name}" and ALL its lessons?`)) return;
        try {
            await adminApi.deleteTopic(id);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to delete topic');
        }
    };

    const handleCreateMock = async () => {
        const title = prompt('Mock Exam Title?');
        const description = prompt('Description?');
        const duration = prompt('Duration (minutes)?');
        const price = prompt('Price (NGN)?');
        if (title && duration && price) {
            try {
                // For simplicity, we create with 0 questions initially or prompt for JSON
                await adminApi.createMock({ 
                    title, 
                    description, 
                    durationMinutes: Number(duration), 
                    price: Number(price),
                    questions: [] 
                });
                fetchData();
            } catch (err) { alert('Failed to create mock'); }
        }
    };

    const handleDeleteMock = async (id: string, title: string) => {
        if (!confirm(`Delete mock exam "${title}"?`)) return;
        try {
            await adminApi.deleteMock(id);
            fetchData();
        } catch (err) { alert('Failed to delete mock'); }
    };

    const handleSendBroadcast = async () => {
        if (broadcastTarget === 'user' && !targetUserId.trim()) {
            alert('Please enter a User ID');
            return;
        }
        const title = prompt('Notification Title?');
        const body = prompt('Notification Message?');
        if (title && body) {
            try {
                await adminApi.sendNotification({ 
                    title, 
                    body,
                    userId: broadcastTarget === 'user' ? targetUserId.trim() : undefined,
                    recentOnly: broadcastTarget === 'recent'
                });
                alert('Push broadcast notification queued!');
            } catch (err) { alert('Failed to send push notification'); }
        }
    };

    const handleSendEmailBroadcast = async () => {
        if (!emailSubject || !emailBody) {
            alert('Please enter both subject and body for the email broadcast.');
            return;
        }
        const targetDesc = useSpecificEmails ? 'the specified email list' : 'all verified students';
        if (!confirm(`Are you sure you want to send this email to ${targetDesc}?`)) return;

        const payload: any = { subject: emailSubject, body: emailBody };
        if (useSpecificEmails) {
            const emails = specificEmails.split(',').map(s => s.trim()).filter(Boolean);
            if (emails.length === 0) { alert('Enter at least one email address.'); return; }
            payload.emails = emails;
        }

        setLoading(true);
        try {
            await adminApi.sendEmailBroadcast(payload);
            alert('Email broadcast sent successfully!');
            setEmailSubject('');
            setEmailBody('');
            setSpecificEmails('');
            setUseSpecificEmails(false);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to send email broadcast');
        } finally {
            setLoading(false);
        }
    };

    const handleEditLesson = (lesson: any) => {
        setEditingLesson(lesson);
        setLessonForm({
            name: lesson.name,
            content: lesson.content || '',
            videoUrl: lesson.videoUrl || '',
            rewardPoints: lesson.rewardPoints ?? 10,
            questions: lesson.questions || []
        });
        setIsLessonModalOpen(true);
    };

    const handleSaveLesson = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload: any = {
                name: lessonForm.name,
                content: lessonForm.content,
                videoUrl: lessonForm.videoUrl,
                rewardPoints: lessonForm.rewardPoints,
                questions: lessonForm.questions
            };

            await adminApi.updateLesson(editingLesson.id, payload);
            alert('Lesson updated successfully!');
            setIsLessonModalOpen(false);
            fetchData();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to update lesson');
        } finally {
            setLoading(false);
        }
    };

    // Lesson question helpers
    const addLessonQuestion = () => {
        setLessonForm(prev => ({
            ...prev,
            questions: [...(prev.questions || []), { text: '', options: ['', '', '', ''], correctOption: 0 }]
        }));
    };

    const updateLessonQuestionField = (qIdx: number, field: string, value: any) => {
        setLessonForm(prev => ({
            ...prev,
            questions: prev.questions.map((q: any, i: number) => i === qIdx ? { ...q, [field]: value } : q)
        }));
    };

    const updateLessonOption = (qIdx: number, oIdx: number, value: string) => {
        setLessonForm(prev => ({
            ...prev,
            questions: prev.questions.map((q: any, i: number) => {
                if (i !== qIdx) return q;
                const newOptions = [...q.options];
                newOptions[oIdx] = value;
                return { ...q, options: newOptions };
            })
        }));
    };

    const setLessonQuestionCorrectOption = (qIdx: number, oIdx: number) => {
        setLessonForm(prev => ({
            ...prev,
            questions: prev.questions.map((q: any, i: number) => i === qIdx ? { ...q, correctOption: oIdx } : q)
        }));
    };

    const addLessonOption = (qIdx: number) => {
        setLessonForm(prev => ({
            ...prev,
            questions: prev.questions.map((q: any, i: number) => i === qIdx ? { ...q, options: [...q.options, ''] } : q)
        }));
    };

    const removeLessonQuestion = (qIdx: number) => {
        setLessonForm(prev => ({
            ...prev,
            questions: prev.questions.filter((_: any, i: number) => i !== qIdx)
        }));
    };

    /* ─── Tab Content ──────────────────────────────────────────────────────── */

    const renderContent = () => {
        if (userRole === 'TUTOR' && activeTab !== 'learning' && activeTab !== 'mocks') {
            setTimeout(() => setActiveTab('learning'), 0);
            return null;
        }

        if (loading) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

        switch (activeTab) {

            /* ── LEARNING CONTENT ────────────────────────────────────────── */
            case 'learning':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Learning Journeys</h2>
                                <p className="text-sm text-zinc-500 mt-1">Manage subjects, topics, and automatically generate lessons via AI.</p>
                            </div>

                            <button
                                onClick={handleCreateSubject}
                                className="btn-primary h-10 px-6 text-sm"
                            >
                                <Plus size={18} className="mr-2" />
                                Create Subject
                            </button>
                        </div>

                        {subjects.length === 0 ? (
                            <div className="card text-center py-20 bg-zinc-50/50">
                                <BookOpen size={48} className="mx-auto text-zinc-300 mb-4" />
                                <h3 className="text-lg font-medium text-zinc-900">No Subjects Found</h3>
                                <p className="text-zinc-500 mt-1">Create your first subject to start building the learning pathway.</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {subjects.map((subject: any) => (
                                    <div key={subject.id} className="card p-6 border border-zinc-200">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100/50">
                                                    <BookOpen size={24} className="text-indigo-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center space-x-2">
                                                        <h3 className="text-xl font-bold text-zinc-900">{subject.name}</h3>
                                                        {subject.isApproved === false ? (
                                                            <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Pending Approval</span>
                                                        ) : (
                                                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Live</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-zinc-500">{subject.topics?.length || 0} Topics Available</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                {userRole === 'ADMIN' && subject.isApproved === false && (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm(`Approve Subject "${subject.name}"?`)) {
                                                                await adminApi.approveSubject(subject.id);
                                                                fetchData();
                                                            }
                                                        }}
                                                        className="btn-secondary h-9 px-4 text-xs !bg-emerald-50 !text-emerald-700 !ring-emerald-200"
                                                    >
                                                        Approve Live
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => {
                                                        setMockAiForm({ ...mockAiForm, subjectId: subject.id, title: `AI Mock Exam for ${subject.name}` });
                                                        setIsMockAiModalOpen(true);
                                                    }}
                                                    className="btn-secondary h-9 px-4 text-xs !bg-purple-50 !text-purple-700 !ring-purple-200"
                                                >
                                                    <Wand2 size={14} className="mr-2" />
                                                    AI Mock
                                                </button>
                                                <button
                                                    onClick={() => handleCreateTopic(subject.id)}
                                                    className="btn-secondary h-9 px-4 text-xs"
                                                >
                                                    <Plus size={14} className="mr-2" />
                                                    Add Topic
                                                </button>
                                                {userRole === 'ADMIN' && (
                                                    <button
                                                        onClick={() => handleDeleteSubject(subject.id, subject.name)}
                                                        className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors ring-1 ring-red-200"
                                                        title="Delete Subject"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        {subject.topics?.length > 0 ? (
                                            <div className="space-y-3">
                                                {subject.topics.map((topic: any) => (
                                                    <div key={topic.id} className="bg-zinc-50 rounded-xl ring-1 ring-zinc-200/60 flex flex-col overflow-hidden">
                                                        <div className="p-4 flex items-center justify-between bg-white border-b border-zinc-100">
                                                            <div className="flex items-center space-x-3">
                                                                <div className="w-8 h-8 bg-zinc-100 rounded-lg flex items-center justify-center shadow-sm border border-zinc-200">
                                                                    <Layers size={16} className="text-zinc-500" />
                                                                </div>
                                                                <div>
                                                                    <div className="flex items-center space-x-2">
                                                                        <h4 className="font-semibold text-zinc-900 text-sm">{topic.name}</h4>
                                                                        {topic.isApproved === false ? (
                                                                            <span className="inline-flex items-center rounded-md bg-yellow-50 px-1.5 py-0.5 text-[9px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/10">Pending Approval</span>
                                                                        ) : (
                                                                            <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.5 text-[9px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">Live</span>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-xs text-zinc-500">{topic.lessons?.length || 0} Levels (Lessons) included</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center space-x-2">
                                                                {userRole === 'ADMIN' && topic.isApproved === false && (
                                                                    <button
                                                                        onClick={async () => {
                                                                            if (confirm(`Approve Topic "${topic.name}"?`)) {
                                                                                await adminApi.approveTopic(topic.id);
                                                                                fetchData();
                                                                            }
                                                                        }}
                                                                        className="h-8 px-3 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors ring-1 ring-emerald-200 text-[11px] font-bold uppercase tracking-wider"
                                                                    >
                                                                        Approve
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => handleCreateLesson(topic.id)}
                                                                    className="h-8 px-3 flex items-center justify-center rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-indigo-600 transition-colors ring-1 ring-zinc-200 text-[11px] font-bold uppercase tracking-wider"
                                                                    title="Add Lesson Manually"
                                                                >
                                                                    <Plus size={14} className="mr-1" />
                                                                    Lesson
                                                                </button>
                                                                {userRole === 'ADMIN' && (
                                                                    <button 
                                                                        onClick={() => handleEditTopic(topic)}
                                                                        className="h-8 px-3 flex items-center justify-center rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-indigo-600 transition-colors ring-1 ring-zinc-200 text-[11px] font-bold uppercase tracking-wider"
                                                                        title="Edit Topic Details"
                                                                    >
                                                                        <Edit3 size={14} className="mr-1" />
                                                                        Edit
                                                                    </button>
                                                                )}
                                                                {(!topic.lessons || topic.lessons.length === 0) ? (
                                                                    <button
                                                                        onClick={() => handleGenerateAiLevels(subject.id, topic.name)}
                                                                        className="h-8 px-3 flex items-center justify-center rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors ring-1 ring-purple-200 text-[11px] font-bold uppercase tracking-wider"
                                                                    >
                                                                        <Wand2 size={14} className="mr-1" />
                                                                        Scan AI
                                                                    </button>
                                                                ) : (
                                                                    <div className="h-8 px-3 flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 text-[10px] font-bold uppercase tracking-wider">
                                                                        <CheckCircle2 size={14} className="mr-1" />
                                                                        Synced
                                                                    </div>
                                                                )}
                                                                {userRole === 'ADMIN' && (
                                                                    <button
                                                                        onClick={() => handleDeleteTopic(topic.id, topic.name)}
                                                                        className="h-8 w-8 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors ring-1 ring-red-200"
                                                                        title="Delete Topic"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                        
                                                        {userRole === 'ADMIN' && topic.lessons && topic.lessons.length > 0 && (
                                                            <div className="bg-zinc-50 px-4 py-3 space-y-2">
                                                                {topic.lessons.map((lesson: any) => (
                                                                    <div key={lesson.id} className="flex items-center justify-between text-sm py-1 border-b border-zinc-200 last:border-0 hover:bg-zinc-100/50 px-2 rounded-md transition-colors">
                                                                        <div className="flex items-center space-x-2">
                                                                            <span className="text-zinc-700 font-medium">Lvl {lesson.order}: {lesson.name}</span>
                                                                            {lesson.isApproved === false ? (
                                                                                <span className="inline-flex items-center rounded-md bg-yellow-50 px-1.5 py-0.2 text-[9px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/10">Pending</span>
                                                                            ) : (
                                                                                <span className="inline-flex items-center rounded-md bg-emerald-50 px-1.5 py-0.2 text-[9px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10">Live</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center space-x-3">
                                                                            {userRole === 'ADMIN' && lesson.isApproved === false && (
                                                                                <button
                                                                                    onClick={async () => {
                                                                                        if (confirm(`Approve Lesson "${lesson.name}"?`)) {
                                                                                            await adminApi.approveLesson(lesson.id);
                                                                                            fetchData();
                                                                                        }
                                                                                    }}
                                                                                    className="text-[10px] text-emerald-600 hover:text-emerald-800 font-bold uppercase tracking-wider px-2 py-1 rounded-md hover:bg-emerald-50 transition-colors"
                                                                                >
                                                                                    Approve
                                                                                </button>
                                                                            )}
                                                                            <button 
                                                                                onClick={() => handleRegenerateLesson(lesson.id, lesson.name)}
                                                                                className="text-[10px] text-purple-600 hover:text-purple-800 font-bold uppercase tracking-wider px-2 py-1 rounded-md hover:bg-purple-50 transition-colors flex items-center"
                                                                                title="Regenerate with High Depth AI"
                                                                            >
                                                                                <RefreshCcw size={12} className="mr-1" />
                                                                                Regen AI
                                                                            </button>
                                                                            <button 
                                                                                onClick={() => handleEditLesson(lesson)}
                                                                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium px-2 py-1 rounded-md hover:bg-indigo-50 transition-colors"
                                                                            >
                                                                                Edit & Video
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="bg-zinc-50 p-6 rounded-xl border border-dashed border-zinc-300 text-center">
                                                <p className="text-zinc-500 text-sm">No topics added to this subject yet.</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            /* ── OVERVIEW ───────────────────────────────────────────────── */
            case 'overview':
                return (
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Platform Overview</h2>
                            <p className="text-sm text-zinc-500 mt-1">Real-time health and financial metrics for Setorial.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <StatCard icon={TrendingUp} label="Month Revenue" value={`₦${(stats?.currentMonthRevenue ?? 0).toLocaleString()}`} />
                            <StatCard icon={CreditCard} label="Total Liability" value={`₦${(stats?.totalLiability ?? 0).toLocaleString()}`} />
                            <StatCard icon={Clock} label="Pending KYC" value={stats?.pendingKycCount ?? 0} />
                            <StatCard icon={Users} label="Total Students" value={stats?.totalUsers ?? 0} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <StatCard icon={UserCheck} label="Approved KYC" value={stats?.approvedKycCount ?? 0} />
                            <StatCard icon={DollarSign} label="Reward Pool Cap" value={`₦${(stats?.rewardPoolCap ?? 0).toLocaleString()}`} />
                        </div>

                        <div className="card !p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/60 flex items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-sm font-semibold text-zinc-900">Cohort Analytics</h3>
                                    <p className="text-xs text-zinc-500 mt-1">Live student growth, retention, and engagement snapshot.</p>
                                </div>
                                <button onClick={handleExportAnalyticsCsv} className="btn-secondary h-9 px-3 text-xs">Export CSV</button>
                            </div>
                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                <StatCard icon={Users} label="Registered Users" value={cohortStats?.totalRegisteredUsers ?? 0} />
                                <StatCard icon={TrendingUp} label="Active Today" value={cohortStats?.active?.today ?? 0} />
                                <StatCard icon={Clock} label="Active This Week" value={cohortStats?.active?.thisWeek ?? 0} />
                                <StatCard icon={CalendarDays} label="Active This Month" value={cohortStats?.active?.thisMonth ?? 0} />
                            </div>
                            <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                                <div className="card p-4">
                                    <div className="text-xs text-zinc-500">Avg streak</div>
                                    <div className="mt-2 text-2xl font-semibold text-zinc-900">{Number(cohortStats?.averageStreakLength ?? 0).toFixed(1)}</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-xs text-zinc-500">Avg lesson rate</div>
                                    <div className="mt-2 text-2xl font-semibold text-zinc-900">{Number(cohortStats?.averageLessonCompletionRate ?? 0).toFixed(1)}%</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-xs text-zinc-500">Retention (D7)</div>
                                    <div className="mt-2 text-2xl font-semibold text-zinc-900">{Number(cohortStats?.retentionRate?.day7 ?? 0).toFixed(1)}%</div>
                                </div>
                                <div className="card p-4">
                                    <div className="text-xs text-zinc-500">Payout eligible</div>
                                    <div className="mt-2 text-2xl font-semibold text-zinc-900">{cohortStats?.learnAndEarn?.eligibleUsers ?? 0}</div>
                                </div>
                            </div>
                            <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="card p-4">
                                    <h4 className="text-sm font-semibold text-zinc-900 mb-3">Signups (last 30 days)</h4>
                                    <SignupsTrendChart data={(cohortStats?.newSignupsTrend?.daily ?? [])} />
                                </div>
                                <div className="card p-4">
                                    <h4 className="text-sm font-semibold text-zinc-900 mb-3">Retention Curve (D1 / D7 / D30)</h4>
                                    <RetentionCurveChart retention={cohortStats?.retentionRate ?? {}} />
                                </div>
                            </div>
                            <div className="px-6 pb-6 grid grid-cols-1 xl:grid-cols-2 gap-6">
                                <div className="card p-4">
                                    <h4 className="text-sm font-semibold text-zinc-900 mb-3">Tier distribution</h4>
                                    <div className="space-y-3">
                                        {Object.entries(cohortStats?.planTierBreakdown ?? { FREE: 0, BRONZE: 0, SILVER: 0, GOLD: 0 }).map(([tier, count]) => (
                                            <div key={tier} className="flex items-center justify-between text-sm">
                                                <span className="text-zinc-600">{tier}</span>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-2 rounded-full bg-zinc-100 overflow-hidden">
                                                        <div className="h-full rounded-full bg-zinc-900" style={{ width: `${((Number(count) / Math.max(1, cohortStats?.totalRegisteredUsers ?? 1)) * 100).toFixed(0)}%` }} />
                                                    </div>
                                                    <span className="font-medium text-zinc-900">{Number(count)}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="card p-4">
                                    <h4 className="text-sm font-semibold text-zinc-900 mb-3">At-risk + top performers</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex items-center justify-between text-zinc-700">
                                            <span>At-risk users</span>
                                            <span className="font-semibold text-zinc-900">{(cohortStats?.atRiskUsers ?? []).length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-700">
                                            <span>Top performers</span>
                                            <span className="font-semibold text-zinc-900">{(cohortStats?.topPerformers ?? []).length}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-700">
                                            <span>Streak freezes used</span>
                                            <span className="font-semibold text-zinc-900">{cohortStats?.streakFreezeUsage?.usersWhoUsedFreeze ?? 0}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-zinc-700">
                                            <span>Eligible payout amount</span>
                                            <span className="font-semibold text-zinc-900">₦{Number(cohortStats?.learnAndEarn?.totalAmountOwed ?? 0).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {stats?.alert === 'LIABILITY EXCEEDS SAFE THRESHOLD' && (
                            <div className="bg-amber-50 ring-1 ring-inset ring-amber-600/20 p-5 rounded-xl flex items-center space-x-4">
                                <AlertTriangle size={24} className="text-amber-600" />
                                <div>
                                    <h4 className="text-amber-900 font-semibold text-sm">Financial Alert: Liability Ratio High</h4>
                                    <p className="text-amber-800 text-sm mt-0.5">Total liability exceeds the 20% reward pool cap. Distribution ratio: {((stats?.liabilityRatio ?? 0) * 100).toFixed(1)}%</p>
                                </div>
                            </div>
                        )}

                        <div className="card !p-0 overflow-hidden">
                            <div className="px-6 py-4 border-b border-zinc-100 bg-zinc-50/50">
                                <h3 className="text-sm font-semibold text-zinc-900">Latest Payout Batch</h3>
                            </div>
                            <div className="p-6">
                                {stats?.latestPayoutBatch ? (
                                    <div className="flex justify-between items-center bg-zinc-50 p-4 rounded-lg ring-1 ring-zinc-200">
                                        <div>
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">MONTH {stats.latestPayoutBatch.month}</p>
                                            <p className="text-sm font-semibold text-zinc-900 mt-0.5 capitalize">{stats.latestPayoutBatch.status.toLowerCase()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Total Paid</p>
                                            <p className="text-sm font-bold text-secondary mt-0.5">₦{Number(stats.latestPayoutBatch.totalPaid).toLocaleString()}</p>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-zinc-500 text-sm italic">No payout batches recorded yet.</p>
                                )}
                            </div>
                        </div>
                    </div>
                );

            /* ── KYC REVIEW ─────────────────────────────────────────────── */
            case 'kyc':
                return (
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">KYC Review Queue</h2>
                            <p className="text-sm text-zinc-500 mt-1">Manual verification for student payout accounts.</p>
                        </div>

                        {kycRequests.length === 0 ? (
                            <div className="card flex flex-col items-center justify-center py-24 bg-zinc-50/50 border-dashed">
                                <CheckCircle2 size={40} className="text-zinc-300 mb-3" />
                                <p className="text-zinc-500 font-medium">No pending requests. All clear!</p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {kycRequests.map((req: any) => (
                                    <div key={req.id} className="card flex flex-col md:flex-row justify-between items-start md:items-center py-5">
                                        <div className="space-y-1.5 flex-1 w-full">
                                            <div className="flex items-center space-x-3">
                                                <h4 className="font-semibold text-zinc-900">{req.name || 'Unnamed Student'}</h4>
                                                {tierBadge(req.tier)}
                                            </div>
                                            <p className="text-sm text-zinc-500">{req.email} • <span className="text-[10px]">SUBMITTED {new Date(req.createdAt).toLocaleDateString()}</span></p>

                                            <div className="mt-4 flex flex-col md:flex-row md:items-center gap-4 bg-zinc-50 p-4 rounded-lg ring-1 ring-zinc-200">
                                                <div className="flex-1">
                                                    <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Payout Method: {req.payoutMethod}</p>
                                                    {req.payoutMethod === 'NGN_BANK' ? (
                                                        <p className="text-sm font-medium text-zinc-700">{req.payoutAccount?.bankName} • {req.payoutAccount?.accountNumber} • <span className="uppercase">{req.payoutAccount?.accountName}</span></p>
                                                    ) : (
                                                        <p className="text-sm font-medium text-zinc-700">{req.payoutAccount?.email}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex space-x-2 mt-6 md:mt-0 ml-0 md:ml-6">
                                            <button onClick={() => handleRejectKyc(req.id)} className="btn-secondary h-10 px-4 text-xs">
                                                <XCircle size={16} className="mr-2 text-zinc-400" />
                                                Reject
                                            </button>
                                            <button onClick={() => handleApproveKyc(req.id)} className="btn-primary h-10 px-4 text-xs">
                                                <CheckCircle2 size={16} className="mr-2" />
                                                Approve
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );

            /* ── STUDENTS ───────────────────────────────────────────────── */
            case 'users':
                return (
                    <div className="space-y-10">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Platform Directory</h2>
                                <p className="text-sm text-zinc-500 mt-1">Manage platform users, tutors, and roles.</p>
                            </div>
                            <div className="flex flex-wrap gap-2 items-center">
                                <select
                                    value={roleFilter}
                                    onChange={(e) => setRoleFilter(e.target.value)}
                                    className="input-field w-32 h-10 py-0 text-xs font-medium cursor-pointer"
                                >
                                    <option value="">All Roles</option>
                                    <option value="STUDENT">Students</option>
                                    <option value="TUTOR">Tutors</option>
                                    <option value="ADMIN">Admins</option>
                                </select>
                                <select
                                    value={tierFilter}
                                    onChange={(e) => setTierFilter(e.target.value)}
                                    className="input-field w-32 h-10 py-0 text-xs font-medium cursor-pointer"
                                >
                                    <option value="">All Tiers</option>
                                    <option value="FREE">Free</option>
                                    <option value="BRONZE">Bronze</option>
                                    <option value="SILVER">Silver</option>
                                    <option value="GOLD">Gold</option>
                                </select>
                                <select
                                    value={kycFilter}
                                    onChange={(e) => setKycFilter(e.target.value)}
                                    className="input-field w-36 h-10 py-0 text-xs font-medium cursor-pointer"
                                >
                                    <option value="">All KYC Status</option>
                                    <option value="UNVERIFIED">Unverified</option>
                                    <option value="PENDING">Pending</option>
                                    <option value="APPROVED">Approved</option>
                                    <option value="REJECTED">Rejected</option>
                                </select>
                                <select
                                    value={flagFilter}
                                    onChange={(e) => setFlagFilter(e.target.value)}
                                    className="input-field w-28 h-10 py-0 text-xs font-medium cursor-pointer"
                                >
                                    <option value="">All Health</option>
                                    <option value="FLAGGED">Flagged</option>
                                    <option value="HEALTHY">Healthy</option>
                                </select>
                                <div className="relative w-48">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="input-field pl-10 h-10 py-0 text-xs"
                                        value={userSearch}
                                        onChange={(e) => setUserSearch(e.target.value)}
                                    />
                                </div>
                                <button
                                    onClick={() => setIsTutorModalOpen(true)}
                                    className="btn-primary h-10 px-4 text-xs flex items-center space-x-2"
                                >
                                    <Plus size={16} />
                                    <span>Create Tutor</span>
                                </button>
                            </div>
                        </div>

                        <div className="card !p-0 overflow-hidden">
                            <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="bg-zinc-50 border-b border-zinc-100">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">User / Tutor</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Role</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Tier</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">KYC Status</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Status</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Points</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {users
                                        .filter(u => u.name?.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase()))
                                        .filter(u => flagFilter === '' || (flagFilter === 'FLAGGED' ? u.isFlagged : !u.isFlagged))
                                        .map((u: any) => (
                                            <tr key={u.id} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-zinc-900">{u.name || 'Setorial User'}</div>
                                                    <div className="text-xs text-zinc-500">{u.email}</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {u.role === 'ADMIN' ? (
                                                        <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-1 text-[10px] font-medium text-purple-700 ring-1 ring-inset ring-purple-600/10">ADMIN</span>
                                                    ) : u.role === 'TUTOR' ? (
                                                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-[10px] font-medium text-blue-700 ring-1 ring-inset ring-blue-600/10">TUTOR</span>
                                                    ) : (
                                                        <span className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">STUDENT</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-center">{u.role === 'STUDENT' ? tierBadge(u.tier) : '-'}</td>
                                                <td className="px-6 py-4 text-center">{u.role === 'STUDENT' ? kycBadge(u.kycStatus) : '-'}</td>
                                                <td className="px-6 py-4 text-center space-y-1">
                                                    {u.isFrozen && <span className="inline-flex items-center rounded-md bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700 ring-1 ring-inset ring-red-600/10">FROZEN</span>}
                                                    {u.isFlagged && <span className="inline-flex items-center rounded-md bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700 ring-1 ring-inset ring-orange-600/10">FLAGGED</span>}
                                                    {!u.isFrozen && !u.isFlagged && <span className="inline-flex items-center rounded-md bg-zinc-50 px-2 py-1 text-[10px] font-medium text-zinc-700 ring-1 ring-inset ring-zinc-500/10">HEALTHY</span>}
                                                </td>
                                                <td className="px-6 py-4 text-right font-medium text-zinc-900">{u.role === 'STUDENT' ? (u.points ?? 0).toLocaleString() : '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleFlagUser(u.id, u.isFlagged)}
                                                            className={`p-1.5 rounded-lg border ${u.isFlagged ? 'bg-orange-50 border-orange-200 text-orange-600' : 'bg-white border-zinc-200 text-zinc-400 hover:text-orange-600'}`}
                                                            title={u.isFlagged ? 'Unflag Account' : 'Flag for Review'}
                                                        >
                                                            <AlertTriangle size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleFreezeUser(u.id, u.isFrozen)}
                                                            className={`p-1.5 rounded-lg border ${u.isFrozen ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-zinc-200 text-zinc-400 hover:text-red-600'}`}
                                                            title={u.isFrozen ? 'Unfreeze Wallet' : 'Freeze Wallet'}
                                                        >
                                                            <ShieldCheck size={16} />
                                                        </button>
                                                            <button
                                                                onClick={() => handleShowAnalytics(u.id)}
                                                                className="p-1.5 rounded-lg border bg-white border-zinc-200 text-zinc-400 hover:text-zinc-700"
                                                                title="View Analytics"
                                                            >
                                                                <TrendingUp size={16} />
                                                            </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                        </div>
                    </div>
                );

            /* ── PAYOUTS ────────────────────────────────────────────────── */
            case 'payouts':
                return (
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Payout Management</h2>
                            <p className="text-sm text-zinc-500 mt-1">Simulate and trigger automated monthly rewards.</p>
                        </div>

                        <div className="card bg-zinc-900 text-white !border-0 shadow-lg">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                                <div>
                                    <h3 className="text-lg font-semibold flex items-center">
                                        <RefreshCcw size={20} className="mr-2 text-zinc-400" />
                                        Next Payout Cycle
                                    </h3>
                                    <p className="text-zinc-400 text-sm mt-1">Triggers automatically on the 28th, but can be forced manually.</p>
                                </div>
                                <div className="flex items-center space-x-3 w-full md:w-auto">
                                    <div className="relative flex-1 md:w-48">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₦</span>
                                        <input
                                            type="number"
                                            className="w-full bg-zinc-800 border-0 ring-1 ring-zinc-700/50 rounded-lg py-2 pl-7 pr-3 text-sm focus:ring-zinc-600"
                                            placeholder="Simulate Revenue"
                                            value={payoutRevenue} // Assuming payoutRevenue is the correct state variable
                                            onChange={(e) => setPayoutRevenue(e.target.value)} // Assuming setPayoutRevenue is the correct state setter
                                        />
                                    </div>
                                    <button onClick={handleTriggerPayout} className="btn-secondary !bg-white !text-zinc-900 !ring-0 hover:!bg-zinc-100 h-9 px-6 text-sm">
                                        Trigger Now
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-zinc-900 px-1">Payout History</h3>
                            <div className="card !p-0 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-zinc-50 border-b border-zinc-100">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Month</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Amount Paid</th>
                                            <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-100">
                                        {payoutBatches.map((batch: any) => (
                                            <tr key={batch.id} className="hover:bg-zinc-50/50 transition-colors">
                                                <td className="px-6 py-4 font-semibold text-zinc-900 uppercase">MONTH {batch.month}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${batch.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                                                        }`}>
                                                        {batch.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right font-bold text-zinc-900">₦{Number(batch.totalPaid).toLocaleString()}</td>
                                                <td className="px-6 py-4 text-right text-xs text-zinc-500">{new Date(batch.createdAt).toLocaleDateString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );

            /* ── GLOBAL PRICING ─────────────────────────────────────────── */
            case 'pricing':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Geo-Pricing Config</h2>
                                <p className="text-sm text-zinc-500 mt-1">Configure subscription costs per country.</p>
                            </div>
                            <button
                                onClick={() => openPricingModal()}
                                className="btn-primary h-10 px-6 text-sm"
                            >
                                <Plus size={18} className="mr-2" />
                                Add Country
                            </button>
                        </div>

                        <div className="card !p-0 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-zinc-50 border-b border-zinc-100">
                                    <tr>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Country</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Multiplier</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Bronze</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Silver</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Gold</th>
                                        <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-zinc-100">
                                    {pricingList.map((p: any) => (
                                        <tr key={p.id} className="hover:bg-zinc-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-zinc-900">{p.countryName}</div>
                                                <div className="text-[10px] font-bold text-zinc-400 tracking-wider font-mono">{p.countryCode}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-0.5 text-[10px] font-bold text-zinc-600 ring-1 ring-inset ring-zinc-500/10 uppercase">
                                                    {p.economicTier} ({p.multiplier}x)
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs font-medium text-zinc-600">
                                                {p.currency} {Number(p.bronzeMonthly).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs font-medium text-zinc-600">
                                                {p.currency} {Number(p.silverMonthly).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs font-medium text-zinc-600">
                                                {p.currency} {Number(p.goldMonthly).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end space-x-1">
                                                    <button onClick={() => openPricingModal(p)} className="p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-lg transition-colors">
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button onClick={() => handleDeletePricing(p.id, p.countryName)} className="p-2 text-zinc-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );

            /* ── REGIONAL STATS ─────────────────────────────────────────── */
            case 'regions':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Regional Reward Pools</h2>
                                <p className="text-sm text-zinc-500 mt-1">Live reward pool metrics isolated per country.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {regionalStats.map((reg: any) => {
                                return (
                                    <div key={reg.country} className="card relative overflow-hidden">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-zinc-900">{reg.country || 'Global'}</h3>
                                                <p className="text-xs text-zinc-500 font-medium">Regional Liability</p>
                                            </div>
                                            <Globe size={20} className="text-zinc-100" />
                                        </div>
                                        <div className="flex items-baseline space-x-2">
                                            <span className="text-2xl font-bold text-zinc-900">₦{Number(reg.liability).toLocaleString()}</span>
                                            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Liability</span>
                                        </div>
                                        <div className="mt-6 space-y-3">
                                            <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${reg.isHealthy ? 'bg-zinc-900' : 'bg-amber-500'}`}
                                                    style={{ width: `${Math.min(100, (reg.liability / reg.poolCap) * 100)}%` }}
                                                ></div>
                                            </div>
                                            <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider">
                                                <span className="text-zinc-400">Pool: ₦{Number(reg.poolCap).toLocaleString()}</span>
                                                <span className={reg.isHealthy ? 'text-zinc-900' : 'text-amber-600'}>
                                                    {((reg.liability / reg.poolCap) * 100).toFixed(1)}% Used
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );

            /* ── DISCOUNTS ─────────────────────────────────────────────── */
            case 'discounts':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Discount & Promo Codes</h2>
                                <p className="text-sm text-zinc-500 mt-1">Manage active promotional campaigns and track usage.</p>
                            </div>
                            <button className="btn-primary h-10 px-6 text-sm" onClick={() => {
                                const code = prompt('Enter code:');
                                const percent = prompt('Enter discount percent (e.g. 10):');
                                if (code && percent) {
                                    adminApi.createDiscount({ code, discountPercent: Number(percent) }).then(() => fetchData());
                                }
                            }}>
                                <Plus size={18} className="mr-2" />
                                Create New Code
                            </button>
                        </div>
                        <div className="card !p-0 overflow-hidden shadow-sm">
                            <AdminDiscountsTable />
                        </div>
                    </div>
                );

            /* ── MOCK EXAMS ─────────────────────────────────────────────── */
            case 'mocks':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Standardized Mocks</h2>
                                <p className="text-sm text-zinc-500 mt-1">Manage CBT simulations with AI or manual questions.</p>
                            </div>
                            <div className="flex space-x-3">
                                <button onClick={() => setIsMockAiModalOpen(true)} className="btn-primary bg-purple-600 hover:bg-purple-700 flex items-center space-x-2">
                                    <Wand2 size={16} />
                                    <span>AI Generator</span>
                                </button>
                                <button onClick={() => {
                                    setEditingMock(null);
                                    setMockForm({
                                        title: '',
                                        description: '',
                                        durationMinutes: 60,
                                        price: 100,
                                        questions: [{ text: '', options: ['', '', '', ''], correctOption: 0, explanation: '' }]
                                    });
                                    setIsMockModalOpen(true);
                                }} className="btn-secondary flex items-center space-x-2">
                                    <Plus size={16} />
                                    <span>Create Manual</span>
                                </button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {mocks.map((mock: any) => (
                                <div key={mock.id} className="card p-6 flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                                    <div className="flex items-center space-x-4">
                                        <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center border border-amber-100">
                                            <Ticket size={24} className="text-amber-600" />
                                        </div>
                                        <div>
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-bold text-zinc-900">{mock.title}</h4>
                                                {mock.isApproved === false ? (
                                                    <span className="inline-flex items-center rounded-md bg-yellow-50 px-2 py-0.5 text-[10px] font-medium text-yellow-800 ring-1 ring-inset ring-yellow-600/20">Pending Approval</span>
                                                ) : (
                                                    <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Live</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-zinc-500">{mock.durationMinutes} mins • ₦{Number(mock.price).toLocaleString()} • {mock._count?.questions ?? 0} Questions</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        {userRole === 'ADMIN' && mock.isApproved === false && (
                                            <button
                                                onClick={async () => {
                                                    if (confirm(`Approve Mock Exam "${mock.title}"?`)) {
                                                        await adminApi.approveMock(mock.id);
                                                        fetchData();
                                                    }
                                                }}
                                                className="h-9 px-4 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 transition-colors ring-1 ring-emerald-200 text-xs font-bold uppercase tracking-wider"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setEditingMock(mock);
                                                setMockForm({
                                                    title: mock.title,
                                                    description: mock.description || '',
                                                    durationMinutes: mock.durationMinutes,
                                                    price: Number(mock.price),
                                                    questions: mock.questions || []
                                                });
                                                setIsMockModalOpen(true);
                                            }}
                                            className="h-9 px-4 flex items-center justify-center rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 transition-colors ring-1 ring-zinc-200 text-xs font-bold uppercase tracking-wider"
                                        >
                                            <Edit2 size={14} className="mr-2" />
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMock(mock.id, mock.title)}
                                            className="h-9 w-9 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 text-red-500 transition-colors ring-1 ring-red-200"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                );

            /* ── NOTIFICATIONS ───────────────────────────────────────────── */
            case 'notifications':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Broadcast Center</h2>
                                <p className="text-sm text-zinc-500 mt-1">Communicate with your students via Push or Email.</p>
                            </div>
                            <div className="flex bg-zinc-100 p-1 rounded-xl">
                                <button
                                    onClick={() => setBroadcastType('push')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${broadcastType === 'push' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                                >
                                    Push Notification
                                </button>
                                <button
                                    onClick={() => setBroadcastType('email')}
                                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${broadcastType === 'email' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
                                >
                                    Email Broadcast
                                </button>
                            </div>
                        </div>

                        {broadcastType === 'push' ? (
                            <div className="card p-8 bg-zinc-900 text-white max-w-2xl border-0 shadow-2xl">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Broadcast Target</label>
                                        <div className="flex space-x-2 mb-4">
                                            <button 
                                                onClick={() => setBroadcastTarget('all')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md ${broadcastTarget === 'all' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                            >
                                                All Users
                                            </button>
                                            <button 
                                                onClick={() => setBroadcastTarget('recent')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md ${broadcastTarget === 'recent' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                            >
                                                Recent (24h)
                                            </button>
                                            <button 
                                                onClick={() => setBroadcastTarget('user')}
                                                className={`px-3 py-1.5 text-xs font-bold rounded-md ${broadcastTarget === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-400'}`}
                                            >
                                                Specific User
                                            </button>
                                        </div>
                                        
                                        {broadcastTarget === 'user' && (
                                            <input 
                                                type="text"
                                                placeholder="Enter User ID (UUID)..."
                                                value={targetUserId}
                                                onChange={e => setTargetUserId(e.target.value)}
                                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
                                            />
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSendBroadcast}
                                        className="w-full h-12 bg-white text-zinc-900 font-bold rounded-xl hover:bg-zinc-100 transition-all flex items-center justify-center space-x-2"
                                    >
                                        <Bell size={18} />
                                        <span>Compose & Send Push</span>
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Email Subject</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Big Updates to the Platform!"
                                            value={emailSubject}
                                            onChange={(e) => setEmailSubject(e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email Content (HTML Supported)</label>
                                            <span className="text-[10px] text-zinc-400 font-medium">Wrapped in Setorial Template</span>
                                        </div>
                                        <textarea
                                            className="input-field min-h-[300px] py-4 resize-none"
                                            placeholder="Write your email content here..."
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                        ></textarea>
                                    </div>
                                    <div className="flex items-start space-x-3">
                                        <label className="inline-flex items-center mt-1">
                                            <input type="checkbox" className="mr-2" checked={useSpecificEmails} onChange={e => setUseSpecificEmails(e.target.checked)} />
                                            <span className="text-sm text-zinc-500">Send to specific emails</span>
                                        </label>
                                    </div>

                                    {useSpecificEmails && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Recipient Emails (comma separated)</label>
                                            <textarea
                                                className="input-field min-h-[120px] py-3"
                                                placeholder="user1@example.com, user2@example.com"
                                                value={specificEmails}
                                                onChange={(e) => setSpecificEmails(e.target.value)}
                                            />
                                        </div>
                                    )}
                                    <button
                                        onClick={handleSendEmailBroadcast}
                                        className="w-full h-12 bg-zinc-900 text-white font-bold rounded-xl hover:bg-zinc-800 transition-all flex items-center justify-center space-x-2"
                                    >
                                        <CheckCircle2 size={18} />
                                        <span>Send Mass Email</span>
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Preview</label>
                                    <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                                        <div className="bg-zinc-900 p-6 text-center">
                                            <h1 className="text-white font-black text-xl tracking-tighter">SETORIAL</h1>
                                        </div>
                                        <div className="p-8">
                                            <h2 className="text-lg font-bold text-zinc-900 mb-4">{emailSubject || 'Subject Line Goes Here'}</h2>
                                            <div
                                                className="text-zinc-600 space-y-4 text-sm leading-relaxed"
                                                dangerouslySetInnerHTML={{ __html: emailBody || '<p className="italic text-zinc-400">Content preview will appear here...</p>' }}
                                            ></div>
                                        </div>
                                        <div className="bg-zinc-50 p-4 border-t border-zinc-100 text-center">
                                            <p className="text-[10px] text-zinc-400">© {new Date().getFullYear()} Setorial Platform</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            /* ── SUPPORT ───────────────────────────────────────────────── */
            case 'support':
                return (
                    <div className="space-y-10">
                        <div className="flex justify-between items-end">
                            <div>
                                <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Support Tickets</h2>
                                <p className="text-sm text-zinc-500 mt-1">Manage user inquiries and technical support requests.</p>
                            </div>
                        </div>

                        <div className="grid gap-4">
                            {supportMessages.length === 0 ? (
                                <div className="card py-20 text-center">
                                    <p className="text-zinc-500">No support messages found.</p>
                                </div>
                            ) : (
                                supportMessages.map((msg: any) => (
                                    <div key={msg.id} className={`card border-l-4 ${msg.status === 'OPEN' ? 'border-amber-500 bg-amber-50/10' : 'border-zinc-200'}`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="flex items-center space-x-2">
                                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${msg.status === 'OPEN' ? 'bg-amber-100 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                                                        {msg.status}
                                                    </span>
                                                    <h3 className="font-bold text-zinc-900">{msg.subject}</h3>
                                                </div>
                                                <p className="text-xs text-zinc-500 mt-1">From: {msg.user?.name} ({msg.user?.email}) • {new Date(msg.createdAt).toLocaleString()}</p>
                                            </div>
                                            {msg.status === 'OPEN' && (
                                                <button 
                                                    onClick={() => setReplyingTo(msg)}
                                                    className="btn-primary h-8 px-4 text-xs"
                                                >
                                                    Reply
                                                </button>
                                            )}
                                        </div>
                                        <div className="bg-white p-4 rounded-xl ring-1 ring-zinc-200 text-sm text-zinc-700 whitespace-pre-wrap">
                                            {msg.message}
                                        </div>
                                        
                                        {msg.adminReply && (
                                            <div className="mt-4 pl-4 border-l-2 border-zinc-200">
                                                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-1">Admin Reply • {new Date(msg.repliedAt).toLocaleDateString()}</p>
                                                <div className="text-sm text-zinc-600 italic">
                                                    "{msg.adminReply}"
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Reply Modal */}
                        {replyingTo && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl shadow-xl ring-1 ring-zinc-950/5 w-full max-w-xl overflow-hidden">
                                    <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                        <h3 className="text-lg font-semibold text-zinc-900">Reply to: {replyingTo.subject}</h3>
                                        <button onClick={() => setReplyingTo(null)} className="text-zinc-400 hover:text-zinc-600">
                                            <XCircle size={20} />
                                        </button>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="bg-zinc-50 p-4 rounded-xl text-sm text-zinc-600 italic">
                                            "{replyingTo.message}"
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Your Response</label>
                                            <textarea 
                                                className="input-field min-h-[150px] py-4"
                                                placeholder="Type your resolution or answer here..."
                                                value={supportReply}
                                                onChange={(e) => setSupportReply(e.target.value)}
                                            />
                                        </div>
                                        <button 
                                            onClick={handleReplySupport}
                                            disabled={loading || !supportReply.trim()}
                                            className="w-full btn-primary h-12 text-sm"
                                        >
                                            {loading ? 'Sending...' : 'Send Reply & Resolve'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Analytics Modal */}
                        {analyticsModalUser && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
                                <div className="bg-white rounded-2xl shadow-xl ring-1 ring-zinc-950/5 w-full max-w-2xl overflow-hidden">
                                    <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                                        <h3 className="text-lg font-semibold text-zinc-900">Analytics • {analyticsModalUser.user.name || analyticsModalUser.user.email}</h3>
                                        <button onClick={() => setAnalyticsModalUser(null)} className="text-zinc-400 hover:text-zinc-600">Close</button>
                                    </div>
                                    <div className="p-8 space-y-4">
                                        {analyticsLoading ? (
                                            <div>Loading...</div>
                                        ) : (
                                            <div className="space-y-6">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Plan Tier</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.tier || analyticsModalUser.planTier || (analyticsModalUser.user?.tier)}</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Date Joined</div>
                                                        <div className="font-bold text-zinc-900">{new Date(analyticsModalUser.dateJoined || analyticsModalUser.user.createdAt).toLocaleString()}</div>
                                                    </div>

                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Current Streak</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.currentStreak ?? analyticsModalUser.user?.currentStreak ?? 0}</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Longest Streak</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.longestStreak ?? analyticsModalUser.user?.longestStreak ?? 0}</div>
                                                    </div>

                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Last Active</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.lastActiveDate || analyticsModalUser.user?.lastActiveAt ? new Date(analyticsModalUser.lastActiveDate || analyticsModalUser.user?.lastActiveAt).toLocaleString() : '—'}</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Last Lesson Completed</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.lastLessonCompleted ? `${analyticsModalUser.lastLessonCompleted.lessonName} • ${new Date(analyticsModalUser.lastLessonCompleted.completedAt).toLocaleString()}` : '—'}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Lessons Completed (All / Week / Today)</div>
                                                        <div className="font-bold text-zinc-900">{(analyticsModalUser.lessonsCompleted?.allTime ?? analyticsModalUser.lessonsCompleted) || 0} / {(analyticsModalUser.lessonsCompleted?.thisWeek) ?? 0} / {(analyticsModalUser.lessonsCompleted?.today) ?? 0}</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Lesson Completion Rate</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.lessonCompletionRate ?? analyticsModalUser.lessonCompletionRate ?? '—'}%</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Missed Days (Total / Week / Month)</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.missedDays?.total ?? 0} / {analyticsModalUser.missedDays?.thisWeek ?? 0} / {analyticsModalUser.missedDays?.thisMonth ?? 0}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-3 gap-4">
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Streak Freezes (Used / Remaining)</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.streakFreezes?.used ?? 0} / {analyticsModalUser.streakFreezes?.remaining ?? 0}</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Total Points / Level</div>
                                                        <div className="font-bold text-zinc-900">{Number(analyticsModalUser.totalPoints ?? analyticsModalUser.totalPoints ?? 0).toLocaleString()} • Lv. {analyticsModalUser.currentLevel ?? analyticsModalUser.currentLevel ?? '—'}</div>
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Learn & Earn (Points / Payable / Paid)</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.learnAndEarn?.pointsEarned ?? analyticsModalUser.totalPoints ?? 0} pts • ₦{Number(analyticsModalUser.learnAndEarn?.amountPayable ?? analyticsModalUser.amountPayable ?? 0).toLocaleString()} • ₦{Number(analyticsModalUser.learnAndEarn?.totalEverPaidOut ?? analyticsModalUser.totalPaidOut ?? 0).toLocaleString()}</div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Monetization Eligibility</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.monetization?.eligible ? 'Yes' : 'No'}</div>
                                                        {analyticsModalUser.monetization?.reason && (<div className="text-xs text-zinc-500 mt-2">{analyticsModalUser.monetization.reason}</div>)}
                                                    </div>
                                                    <div className="card p-4">
                                                        <div className="text-sm text-zinc-500">Average Daily Time Spent</div>
                                                        <div className="font-bold text-zinc-900">{analyticsModalUser.averageDailyTimeSpent?.minutes ?? analyticsModalUser.averageDailyTimeSpent?.seconds ?? 0} mins</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="text-sm text-zinc-500 font-semibold">Recent Mock Exams</div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {(analyticsModalUser.mockExamHistory || []).slice(0,5).map((m: any, idx: number) => (
                                                            <div key={idx} className="p-3 border rounded-lg bg-white">
                                                                <div className="font-bold">{m.examTitle}</div>
                                                                <div className="text-sm text-zinc-500">Score: {m.score} • {m.completedAt ? new Date(m.completedAt).toLocaleString() : '—'}</div>
                                                            </div>
                                                        ))}
                                                        {(!analyticsModalUser.mockExamHistory || analyticsModalUser.mockExamHistory.length === 0) && <div className="text-sm text-zinc-500">No mock exam history.</div>}
                                                    </div>
                                                </div>

                                                <div>
                                                    <div className="text-sm text-zinc-500 font-semibold mb-2">Badges & Achievements</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(analyticsModalUser.badges || []).map((b: any) => (
                                                            <div key={b.id} className="px-3 py-2 rounded-lg border bg-white text-sm">
                                                                <div className="font-semibold">{b.name}</div>
                                                                <div className="text-xs text-zinc-500">{b.awardedAt ? new Date(b.awardedAt).toLocaleDateString() : ''}</div>
                                                            </div>
                                                        ))}
                                                        {(analyticsModalUser.badges || []).length === 0 && <div className="text-sm text-zinc-500">No badges yet.</div>}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );

            /* ── CONFIG ─────────────────────────────────────────────────── */
            case 'configs':
                return (
                    <div className="space-y-10">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-zinc-900">Global Configuration</h2>
                            <p className="text-sm text-zinc-500 mt-1">Adjust platform-wide constants and variables.</p>
                        </div>
                        <div className="card !p-0 overflow-hidden">
                            <AdminConfigTable />
                        </div>
                    </div>
                );
        }
    };

    /* ─── Layout ───────────────────────────────────────────────────────────── */

    return (
        <div className="min-h-screen flex bg-zinc-50 font-sans text-zinc-900">
            {/* Sidebar - hidden on small screens */}
            <aside className="hidden md:flex w-64 bg-zinc-50 border-r border-zinc-200 px-4 py-6 flex flex-col shrink-0">
                <div className="mb-10 px-2 flex items-center space-x-2">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-sm">
                        <ShieldCheck size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-semibold tracking-tight text-zinc-900">Setorial Admin</h1>
                    </div>
                </div>

                <nav className="flex-1 space-y-1">
                    {userRole !== 'TUTOR' && (
                        <>
                            <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                            <SidebarItem icon={ShieldCheck} label="KYC Review" active={activeTab === 'kyc'} onClick={() => setActiveTab('kyc')} badge={stats?.pendingKycCount} />
                            <SidebarItem icon={Users} label="Students" active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                        </>
                    )}
                    <SidebarItem icon={BookOpen} label="Learning" active={activeTab === 'learning'} onClick={() => setActiveTab('learning')} />
                    <SidebarItem icon={Ticket} label="Mock Exams" active={activeTab === 'mocks'} onClick={() => setActiveTab('mocks')} />
                    {userRole !== 'TUTOR' && (
                        <>
                            <SidebarItem icon={Percent} label="Discounts" active={activeTab === 'discounts'} onClick={() => setActiveTab('discounts')} />
                            <SidebarItem icon={Bell} label="Notifications" active={activeTab === 'notifications'} onClick={() => setActiveTab('notifications')} />
                            <SidebarItem icon={Globe} label="Geo-Pricing" active={activeTab === 'pricing'} onClick={() => setActiveTab('pricing')} />
                            <SidebarItem icon={Map} label="Region Pools" active={activeTab === 'regions'} onClick={() => setActiveTab('regions')} />
                            <SidebarItem icon={CreditCard} label="Payouts" active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} />
                            <SidebarItem icon={RefreshCcw} label="Config" active={activeTab === 'configs'} onClick={() => setActiveTab('configs')} />
                            <SidebarItem icon={LifeBuoy} label="Support" active={activeTab === 'support'} onClick={() => setActiveTab('support')} badge={supportMessages.filter((m: any) => m.status === 'OPEN').length} />
                        </>
                    )}
                </nav>

                <div className="mt-auto space-y-3">
                    <div className="px-3">
                        <div className="mb-2 px-3 py-2 rounded-lg bg-zinc-50">
                            <div className="flex items-center justify-between mb-2">
                                <div className="text-sm font-medium text-zinc-700">Mascot Override</div>
                                <label className="flex items-center space-x-2">
                                    <input
                                        type="checkbox"
                                        checked={mascotOverrideEnabled}
                                        onChange={e => {
                                            const enabled = e.target.checked;
                                            // if enabling and no mood selected, default to happy
                                            const moodToSave = mascotMood || 'happy';
                                            saveMascotConfig(enabled, moodToSave);
                                        }}
                                    />
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <select className="input-field text-sm" value={mascotMood} onChange={e => setMascotMood(e.target.value)}>
                                    <option value="happy">happy</option>
                                    <option value="angry">angry</option>
                                    <option value="freezing">freezing</option>
                                    <option value="crying">crying</option>
                                    <option value="sad">sad</option>
                                    <option value="sleeping">sleeping</option>
                                    <option value="formal">formal</option>
                                </select>
                                <button className="btn-secondary h-9 px-3 text-xs" onClick={() => saveMascotConfig(mascotOverrideEnabled, mascotMood)}>Save</button>
                            </div>
                        </div>
                        <label className="flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all cursor-pointer">
                            <input type="checkbox" checked={theme === 'dark'} onChange={e => setTheme(e.target.checked ? 'dark' : 'light')} />
                            <span className="text-sm">Dark Mode</span>
                        </label>
                    </div>

                    <button onClick={() => { localStorage.removeItem('admin_token'); window.location.reload(); }} className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-all">
                        <LogOut size={18} />
                        <span className="text-sm">Log out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile sidebar drawer */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-40 flex md:hidden">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setMobileMenuOpen(false)} />
                    <div className="relative w-72 bg-white border-r border-zinc-200 p-4 overflow-y-auto">
                        <div className="mb-6 flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center shadow-sm">
                                    <ShieldCheck size={18} className="text-white" />
                                </div>
                                <h1 className="text-base font-semibold">Setorial Admin</h1>
                            </div>
                            <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-500">Close</button>
                        </div>
                        <nav className="space-y-1">
                            {userRole !== 'TUTOR' && (
                                <>
                                    <SidebarItem icon={LayoutDashboard} label="Overview" active={activeTab === 'overview'} onClick={() => { setActiveTab('overview'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={ShieldCheck} label="KYC Review" active={activeTab === 'kyc'} onClick={() => { setActiveTab('kyc'); setMobileMenuOpen(false); }} badge={stats?.pendingKycCount} />
                                    <SidebarItem icon={Users} label="Students" active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setMobileMenuOpen(false); }} />
                                </>
                            )}
                            <SidebarItem icon={BookOpen} label="Learning" active={activeTab === 'learning'} onClick={() => { setActiveTab('learning'); setMobileMenuOpen(false); }} />
                            <SidebarItem icon={Ticket} label="Mock Exams" active={activeTab === 'mocks'} onClick={() => { setActiveTab('mocks'); setMobileMenuOpen(false); }} />
                            {userRole !== 'TUTOR' && (
                                <>
                                    <SidebarItem icon={Percent} label="Discounts" active={activeTab === 'discounts'} onClick={() => { setActiveTab('discounts'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={Bell} label="Notifications" active={activeTab === 'notifications'} onClick={() => { setActiveTab('notifications'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={Globe} label="Geo-Pricing" active={activeTab === 'pricing'} onClick={() => { setActiveTab('pricing'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={Map} label="Region Pools" active={activeTab === 'regions'} onClick={() => { setActiveTab('regions'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={CreditCard} label="Payouts" active={activeTab === 'payouts'} onClick={() => { setActiveTab('payouts'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={RefreshCcw} label="Config" active={activeTab === 'configs'} onClick={() => { setActiveTab('configs'); setMobileMenuOpen(false); }} />
                                    <SidebarItem icon={LifeBuoy} label="Support" active={activeTab === 'support'} onClick={() => { setActiveTab('support'); setMobileMenuOpen(false); }} badge={supportMessages.filter((m: any) => m.status === 'OPEN').length} />
                                </>
                            )}
                        </nav>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1 bg-white p-4 md:p-8 overflow-y-auto">
                <div className="max-w-7xl mx-auto">
                    {/* Mobile header */}
                    <div className="md:hidden flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-md bg-zinc-100">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                            <h2 className="text-lg font-semibold">{(activeTab === 'overview' && 'Platform Overview') || activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h2>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button onClick={() => { setTheme(theme === 'dark' ? 'light' : 'dark'); }} className="p-2 rounded-md bg-zinc-100">{theme === 'dark' ? '🌙' : '☀️'}</button>
                        </div>
                    </div>

                    {renderContent()}
                </div>
            </main>

            {/* Pricing Modal */}
            {isPricingModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl ring-1 ring-zinc-950/5 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900">{editingPricing ? 'Edit' : 'Add'} Geo-Pricing</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Define regional subscription costs and multipliers.</p>
                            </div>
                            <button onClick={() => setIsPricingModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSavePricing} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 overflow-y-auto space-y-8">
                                {/* Primary Info */}
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Country Name</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. Nigeria"
                                            value={pricingForm.countryName}
                                            onChange={(e) => setPricingForm({ ...pricingForm, countryName: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">ISO Code</label>
                                        <input
                                            type="text"
                                            className="input-field font-mono"
                                            placeholder="e.g. NG"
                                            value={pricingForm.countryCode}
                                            onChange={(e) => setPricingForm({ ...pricingForm, countryCode: e.target.value.toUpperCase() })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-6">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Economic Tier</label>
                                        <select
                                            className="input-field h-11 py-0 cursor-pointer text-sm"
                                            value={pricingForm.economicTier}
                                            onChange={(e) => setPricingForm({ ...pricingForm, economicTier: e.target.value })}
                                        >
                                            <option value="TIER_A">Tier A (High)</option>
                                            <option value="TIER_B">Tier B (Mid)</option>
                                            <option value="TIER_C">Tier C (Low)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Multiplier</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            className="input-field"
                                            value={pricingForm.multiplier}
                                            onChange={(e) => setPricingForm({ ...pricingForm, multiplier: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Currency</label>
                                        <input
                                            type="text"
                                            className="input-field"
                                            placeholder="e.g. NGN"
                                            value={pricingForm.currency}
                                            onChange={(e) => setPricingForm({ ...pricingForm, currency: e.target.value.toUpperCase() })}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Monthly Pricing */}
                                <div className="space-y-4 pt-4">
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Monthly Subs (Base)</h4>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-600 ml-1">Bronze</label>
                                            <input type="number" className="input-field" value={pricingForm.bronzeMonthly} onChange={(e) => setPricingForm({ ...pricingForm, bronzeMonthly: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-600 ml-1">Silver</label>
                                            <input type="number" className="input-field" value={pricingForm.silverMonthly} onChange={(e) => setPricingForm({ ...pricingForm, silverMonthly: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-600 ml-1">Gold</label>
                                            <input type="number" className="input-field" value={pricingForm.goldMonthly} onChange={(e) => setPricingForm({ ...pricingForm, goldMonthly: e.target.value })} required />
                                        </div>
                                    </div>
                                </div>

                                {/* Annual Pricing */}
                                <div className="space-y-4 pt-4">
                                    <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest px-1">Annual Subs (Base)</h4>
                                    <div className="grid grid-cols-3 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-600 ml-1">Bronze</label>
                                            <input type="number" className="input-field" value={pricingForm.bronzeAnnual} onChange={(e) => setPricingForm({ ...pricingForm, bronzeAnnual: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-600 ml-1">Silver</label>
                                            <input type="number" className="input-field" value={pricingForm.silverAnnual} onChange={(e) => setPricingForm({ ...pricingForm, silverAnnual: e.target.value })} required />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-zinc-600 ml-1">Gold</label>
                                            <input type="number" className="input-field" value={pricingForm.goldAnnual} onChange={(e) => setPricingForm({ ...pricingForm, goldAnnual: e.target.value })} required />
                                        </div>
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="flex items-center space-x-3 pt-4">
                                    <input
                                        type="checkbox"
                                        id="isActive"
                                        className="w-4 h-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                                        checked={pricingForm.isActive}
                                        onChange={(e) => setPricingForm({ ...pricingForm, isActive: e.target.checked })}
                                    />
                                    <label htmlFor="isActive" className="text-sm font-medium text-zinc-700 cursor-pointer">Active and available for users</label>
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsPricingModalOpen(false)} className="btn-secondary h-10 px-6 text-sm">Cancel</button>
                                <button
                                    type="submit"
                                    className="btn-primary h-10 px-8 text-sm"
                                >
                                    {editingPricing ? 'Save Changes' : 'Create Region'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Lesson Edit Modal */}
            {isLessonModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl ring-1 ring-zinc-950/5 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900">Edit Lesson: {editingLesson?.name}</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Update content and upload protected video content.</p>
                            </div>
                            <button onClick={() => setIsLessonModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveLesson} className="flex flex-col flex-1 overflow-hidden">
                            <div className="p-8 overflow-y-auto space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Lesson Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={lessonForm.name}
                                        onChange={(e) => setLessonForm({ ...lessonForm, name: e.target.value })}
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Markdown Content</label>
                                    <textarea
                                        className="input-field min-h-[300px] py-4 font-mono text-sm leading-relaxed"
                                        value={lessonForm.content}
                                        onChange={(e) => setLessonForm({ ...lessonForm, content: e.target.value })}
                                        placeholder="Enter detailed textbook-style markdown here..."
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5 p-6 bg-zinc-50 rounded-xl border-2 border-dashed border-zinc-200">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider block mb-2">Lesson Video (YouTube link)</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                                        value={lessonForm.videoUrl}
                                        onChange={(e) => setLessonForm({ ...lessonForm, videoUrl: e.target.value })}
                                    />
                                    {editingLesson?.videoUrl && (
                                        <p className="mt-2 text-xs text-emerald-600 font-medium">✓ Current video link set.</p>
                                    )}
                                </div>

                                <div className="space-y-2 p-6 bg-white rounded-xl border border-zinc-100">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Quiz Questions</label>
                                        <button type="button" onClick={addLessonQuestion} className="btn-secondary h-8 px-3 text-xs">Add Question</button>
                                    </div>
                                    {lessonForm.questions && lessonForm.questions.length === 0 && (
                                        <p className="text-xs text-zinc-500">No questions yet. Click "Add Question" to create the lesson quiz.</p>
                                    )}
                                    {lessonForm.questions?.map((q: any, qi: number) => (
                                        <div key={qi} className="p-4 bg-zinc-50 rounded-lg mb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <input
                                                    type="text"
                                                    className="input-field"
                                                    placeholder={`Question ${qi + 1}`}
                                                    value={q.text}
                                                    onChange={(e) => updateLessonQuestionField(qi, 'text', e.target.value)}
                                                />
                                                <button type="button" onClick={() => removeLessonQuestion(qi)} className="text-red-500 hover:text-red-700 text-sm ml-3">Remove</button>
                                            </div>
                                            {q.options.map((opt: string, oi: number) => (
                                                <div key={oi} className="flex items-center space-x-3 mb-2">
                                                    <input type="radio" name={`correct-${qi}`} checked={q.correctOption === oi} onChange={() => setLessonQuestionCorrectOption(qi, oi)} />
                                                    <input
                                                        type="text"
                                                        className="input-field flex-1"
                                                        placeholder={`Option ${oi + 1}`}
                                                        value={opt}
                                                        onChange={(e) => updateLessonOption(qi, oi, e.target.value)}
                                                    />
                                                </div>
                                            ))}
                                            <div className="flex items-center space-x-2">
                                                <button type="button" onClick={() => addLessonOption(qi)} className="btn-secondary h-8 px-3 text-xs">Add Option</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsLessonModalOpen(false)} className="btn-secondary h-10 px-6 text-sm">Cancel</button>
                                <button type="submit" className="btn-primary h-10 px-8 text-sm" disabled={loading}>
                                    {loading ? 'Saving...' : 'Save Lesson'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* AI Mock Exam Modal */}
            {isMockAiModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl ring-1 ring-zinc-950/5 w-full max-w-lg overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900">Generate AI Mock Exam</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">The AI will create diverse questions based on the subject.</p>
                            </div>
                            <button onClick={() => setIsMockAiModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleGenerateAiMock} className="p-8 space-y-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Subject</label>
                                <select
                                    className="input-field bg-white"
                                    value={mockAiForm.subjectId}
                                    onChange={(e) => {
                                        const selSub = subjects.find((s: any) => s.id === e.target.value);
                                        setMockAiForm({ ...mockAiForm, subjectId: e.target.value, title: selSub ? `AI Mock Exam for ${selSub.name}` : mockAiForm.title });
                                    }}
                                    required
                                >
                                    <option value="" disabled>Select a subject...</option>
                                    {subjects.map((sub: any) => (
                                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Exam Title</label>
                                <input
                                    type="text"
                                    className="input-field"
                                    value={mockAiForm.title}
                                    onChange={(e) => setMockAiForm({ ...mockAiForm, title: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Number of Questions (20-180)</label>
                                <input
                                    type="number"
                                    min="20"
                                    max="180"
                                    className="input-field"
                                    value={mockAiForm.numQuestions}
                                    onChange={(e) => setMockAiForm({ ...mockAiForm, numQuestions: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Duration (Minutes)</label>
                                <input
                                    type="number"
                                    min="10"
                                    max="360"
                                    className="input-field"
                                    value={mockAiForm.durationMinutes}
                                    onChange={(e) => setMockAiForm({ ...mockAiForm, durationMinutes: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="pt-4 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsMockAiModalOpen(false)} className="btn-secondary h-10 px-6 text-sm">Cancel</button>
                                <button type="submit" className="btn-primary bg-purple-600 hover:bg-purple-700 h-10 px-8 text-sm" disabled={loading}>
                                    {loading ? 'Generating...' : 'Start AI Generation'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Topic Edit Modal */}
            {isTopicModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/20 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl ring-1 ring-zinc-950/5 w-full max-w-lg overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                        <div className="px-8 py-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
                            <div>
                                <h3 className="text-lg font-semibold text-zinc-900">Edit Topic: {editingTopic?.name}</h3>
                                <p className="text-xs text-zinc-500 mt-0.5">Modify topic name, description, or ordering.</p>
                            </div>
                            <button onClick={() => setIsTopicModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 transition-colors">
                                <XCircle size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSaveTopic} className="flex flex-col">
                            <div className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Topic Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={topicForm.name}
                                        onChange={(e) => setTopicForm({ ...topicForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Description</label>
                                    <textarea
                                        className="input-field min-h-[120px] py-4 leading-relaxed resize-none"
                                        value={topicForm.description}
                                        onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider ml-1">Order Index</label>
                                    <input
                                        type="number"
                                        className="input-field"
                                        value={topicForm.order}
                                        onChange={(e) => setTopicForm({ ...topicForm, order: Number(e.target.value) })}
                                        required
                                    />
                                </div>
                            </div>
                            <div className="px-8 py-6 border-t border-zinc-100 bg-zinc-50/50 flex justify-end space-x-3">
                                <button type="button" onClick={() => setIsTopicModalOpen(false)} className="btn-secondary h-10 px-6 text-sm">Cancel</button>
                                <button type="submit" className="btn-primary h-10 px-8 text-sm">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {generatingSyllabus && (
                <div className="fixed inset-0 bg-zinc-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 relative mb-8">
                        <div className="absolute inset-0 border-4 border-indigo-500/20 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-t-indigo-500 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Wand2 size={40} className="text-indigo-400 animate-pulse" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Wormhole Active</h2>
                    <p className="text-indigo-200 text-lg max-w-md mx-auto leading-relaxed">
                        The AI is currently building the full curriculum, drafting high-depth lessons, and generating study materials...
                    </p>
                    <div className="mt-8 flex space-x-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                    </div>
                    <p className="mt-12 text-zinc-500 text-sm font-medium uppercase tracking-widest">Please do not close this tab</p>
                </div>
            )}
            {/* Manual Mock Modal */}
            {isMockModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-950/40 backdrop-blur-md">
                    <div className="bg-white rounded-[32px] shadow-2xl ring-1 ring-zinc-950/5 w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-10 py-8 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-zinc-900 tracking-tight">{editingMock ? 'Edit Mock Exam' : 'Create Manual Mock'}</h3>
                                <p className="text-sm text-zinc-500 mt-1">Set the standard for excellence. Manually craft every question.</p>
                            </div>
                            <button onClick={() => setIsMockModalOpen(false)} className="w-10 h-10 rounded-full hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-all">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMock} className="flex-1 overflow-hidden flex flex-col">
                            <div className="flex-1 overflow-y-auto p-10 space-y-10">
                                {/* Basic Info */}
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Exam Title</label>
                                        <input type="text" className="input-field" value={mockForm.title} onChange={(e) => setMockForm({ ...mockForm, title: e.target.value })} required />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Duration (Minutes)</label>
                                        <input type="number" className="input-field" value={mockForm.durationMinutes} onChange={(e) => setMockForm({ ...mockForm, durationMinutes: Number(e.target.value) })} required />
                                    </div>
                                </div>

                                {/* Questions */}
                                <div className="space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-lg font-bold text-zinc-900">Exam Questions ({mockForm.questions.length})</h4>
                                        <button type="button" onClick={addQuestionField} className="btn-secondary py-2 px-4 text-xs flex items-center space-x-2">
                                            <Plus size={14} />
                                            <span>Add Question</span>
                                        </button>
                                    </div>

                                    {mockForm.questions.map((q, qIdx) => (
                                        <div key={qIdx} className="p-8 rounded-[24px] border-2 border-zinc-100 bg-zinc-50/30 space-y-6">
                                            <div className="flex items-center justify-between">
                                                <span className="w-8 h-8 rounded-full bg-zinc-900 text-white flex items-center justify-center text-xs font-bold">{qIdx + 1}</span>
                                                <button type="button" onClick={() => {
                                                    const newQs = mockForm.questions.filter((_, i) => i !== qIdx);
                                                    setMockForm({ ...mockForm, questions: newQs });
                                                }} className="text-red-500 hover:text-red-700 text-xs font-bold uppercase tracking-widest">Remove</button>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Question Text (LaTeX Support)</label>
                                                <textarea className="input-field min-h-[80px] py-4" value={q.text} onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)} required />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                {q.options.map((opt, oIdx) => (
                                                    <div key={oIdx} className="space-y-1.5">
                                                        <div className="flex items-center justify-between px-1">
                                                            <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Option {String.fromCharCode(65 + oIdx)}</label>
                                                            <input type="radio" name={`correct-${qIdx}`} checked={q.correctOption === oIdx} onChange={() => updateQuestion(qIdx, 'correctOption', oIdx)} />
                                                        </div>
                                                        <input type="text" className="input-field h-10 text-sm" value={opt} onChange={(e) => updateOption(qIdx, oIdx, e.target.value)} required />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] ml-1">Explanation (CBT Correction)</label>
                                                <textarea className="input-field min-h-[60px] py-3 text-sm italic bg-blue-50/30 border-blue-100" value={q.explanation} onChange={(e) => updateQuestion(qIdx, 'explanation', e.target.value)} placeholder="Explain why the correct option is right..." />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="px-10 py-8 border-t border-zinc-100 bg-zinc-50/50 flex justify-end space-x-4">
                                <button type="button" onClick={() => setIsMockModalOpen(false)} className="btn-secondary h-12 px-8 text-sm font-bold uppercase tracking-widest">Cancel</button>
                                <button type="submit" className="btn-primary h-12 px-12 text-sm font-bold uppercase tracking-[0.2em] shadow-xl shadow-zinc-900/10" disabled={loading}>
                                    {loading ? 'Saving...' : 'Publish Mock Exam'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isTutorModalOpen && (
                <div className="fixed inset-0 bg-zinc-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
                        <div className="px-8 py-6 border-b border-zinc-100 bg-zinc-50/50">
                            <h3 className="text-lg font-bold text-zinc-900">Create Tutor Account</h3>
                            <p className="text-xs text-zinc-500 mt-1">Specify tutor profile information. They will be registered directly with full syllabus creation permissions.</p>
                        </div>
                        <form onSubmit={handleSaveTutor} className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Full Name</label>
                                <input
                                    type="text"
                                    className="input-field h-12"
                                    value={tutorForm.name}
                                    onChange={(e) => setTutorForm({ ...tutorForm, name: e.target.value })}
                                    placeholder="e.g. Dr. John Doe"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Email Address</label>
                                <input
                                    type="email"
                                    className="input-field h-12"
                                    value={tutorForm.email}
                                    onChange={(e) => setTutorForm({ ...tutorForm, email: e.target.value })}
                                    placeholder="tutor@setorial.com"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em]">Password</label>
                                <input
                                    type="password"
                                    className="input-field h-12"
                                    value={tutorForm.password}
                                    onChange={(e) => setTutorForm({ ...tutorForm, password: e.target.value })}
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="pt-4 flex justify-end space-x-3">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsTutorModalOpen(false);
                                        setTutorForm({ name: '', email: '', password: '' });
                                    }}
                                    className="btn-secondary h-10 px-4 text-xs font-bold uppercase"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-primary h-10 px-6 text-xs font-bold uppercase tracking-wider"
                                >
                                    Create Account
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Sub-Components ────────────────────────────────────────────────────── */

const AdminConfigTable = () => {
    const [configs, setConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const res = await adminApi.getConfigs();
            setConfigs(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleUpdate = async (key: string, currentValue: string) => {
        const newValue = prompt(`Update value for ${key}:`, currentValue);
        if (newValue === null || newValue === currentValue) return;
        try {
            await adminApi.updateConfig(key, newValue);
            fetchConfigs();
        } catch (err) { alert('Update failed'); }
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Loading configs...</div>;

    return (
        <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Config Key</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
                {configs.map((c: any) => (
                    <tr key={c.id}>
                        <td className="px-6 py-4 font-mono text-xs font-bold text-zinc-900 uppercase">{c.key}</td>
                        <td className="px-6 py-4 text-sm text-zinc-600">{c.value}</td>
                        <td className="px-6 py-4 text-xs text-zinc-500">{c.description || 'No description'}</td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => handleUpdate(c.key, c.value)} className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors">
                                <Edit2 size={16} />
                            </button>
                        </td>
                    </tr>
                ))}
                {configs.length === 0 && (
                    <tr>
                        <td colSpan={4} className="px-6 py-10 text-center text-zinc-500 italic">No configurations found. Add them via API or Database.</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

const AdminDiscountsTable = () => {
    const [discounts, setDiscounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDiscounts();
    }, []);

    const fetchDiscounts = async () => {
        try {
            const res = await adminApi.getDiscounts();
            setDiscounts(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleToggle = async (id: string, current: boolean) => {
        try {
            await adminApi.toggleDiscount(id, !current);
            fetchDiscounts();
        } catch (err) { alert('Failed to toggle'); }
    };

    if (loading) return <div className="p-8 text-center text-zinc-400">Loading discounts...</div>;

    return (
        <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 border-b border-zinc-100">
                <tr>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Code</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Discount</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Usage</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-3 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
                {discounts.map((d: any) => (
                    <tr key={d.id}>
                        <td className="px-6 py-4 font-bold text-zinc-900 tracking-wider font-mono">{d.code}</td>
                        <td className="px-6 py-4 text-center text-sm font-semibold text-emerald-600">{d.discountPercent}% OFF</td>
                        <td className="px-6 py-4 text-center text-xs text-zinc-500">{d.usedCount} used {d.maxUses ? `/ ${d.maxUses}` : ''}</td>
                        <td className="px-6 py-4 text-center">
                            <span className={`inline-flex items-center rounded-md px-2 py-1 text-[10px] font-bold ring-1 ring-inset ${d.isActive ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' : 'bg-zinc-100 text-zinc-700 ring-zinc-500/10'}`}>
                                {d.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                            <button onClick={() => handleToggle(d.id, d.isActive)} className="text-xs font-semibold text-zinc-500 hover:text-zinc-900">
                                {d.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                        </td>
                    </tr>
                ))}
                {discounts.length === 0 && (
                    <tr>
                        <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 italic">No discount codes active.</td>
                    </tr>
                )}
            </tbody>
        </table>
    );
};

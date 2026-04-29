<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import Tag from 'primevue/tag';

const router = useRouter();
const exams = ref([]);
const student = ref(null);
const isLoading = ref(false);
const startingSkillId = ref(null);
const selectedLevel = ref(1);
const isDemo = ref(false);

const fetchDashboard = async () => {
    isLoading.value = true;
    try {
        const [userRes, examsRes] = await Promise.all([
            api.get('/user'),
            api.get('/exams'),
        ]);
        student.value = userRes.data;
        exams.value = examsRes.data;
        // Check role case-insensitively and include typos
        const userRole = (student.value?.role || '').toLowerCase();
        isDemo.value = ['demo', 'deom', 'staff'].includes(userRole);
    } catch (err) {
        console.error('Failed to load dashboard', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchDashboard);

const skills = () => exams.value?.[0]?.skills || [];

const isSkillCompleted = (skillId) => {
    // For demo users, we don't show it as "blocked" even if completed
    if (isDemo.value) return false;
    
    const exam = exams.value?.[0];
    if (!exam || !exam.completed_skill_ids) return false;
    return exam.completed_skill_ids.includes(skillId);
};

const startSkill = async (skillId) => {
    if (!exams.value[0]) return;
    // Remove the blocking check for demo users
    if (!isDemo.value && isSkillCompleted(skillId)) return;
    
    startingSkillId.value = skillId;
    try {
        const payload = { skill_id: skillId };
        if (isDemo.value) payload.level_id = selectedLevel.value;
        
        const res = await api.post(`/exams/${exams.value[0].id}/start`, payload);
        router.push(`/exam/${res.data.attempt.id}`);
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to start session');
    } finally {
        startingSkillId.value = null;
    }
};

const resetDemoProgress = async () => {
    const examId = exams.value?.[0]?.id;
    if (!examId || !confirm('Are you sure you want to reset all exam progress? This will delete all your answers and start you fresh. This action cannot be undone.')) return;
    isLoading.value = true;
    try {
        await api.post(`/exams/${examId}/reset-demo`);
        await fetchDashboard();
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to reset progress.');
        isLoading.value = false;
    }
};

const getSkillIcon = (name) => {
    name = name.toLowerCase();
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    if (name.includes('grammar') || name.includes('structure')) return '📋';
    return '🎯';
};

const logout = () => {
    localStorage.removeItem('token');
    router.push('/login');
};
</script>

<template>
    <div class="min-h-screen bg-[#F8FAFC] font-sans text-slate-900">

        <!-- Soft background blobs -->
        <div class="fixed inset-0 pointer-events-none overflow-hidden">
            <div class="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px]"></div>
            <div class="absolute top-[30%] -left-[10%] w-[30%] h-[30%] bg-brand-accent/10 rounded-full blur-[120px]"></div>
        </div>

        <!-- Header -->
        <header class="bg-white border-b border-slate-100 sticky top-0 z-50 shadow-sm transition-all duration-300">
            <div class="max-w-7xl mx-auto px-8 h-20 flex justify-between items-center">
                <div class="flex items-center space-x-4">
                    <div class="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white shadow-lg shadow-brand-primary/20">
                        <i class="pi pi-book"></i>
                    </div>
                    <div>
                        <h1 class="text-base font-black text-brand-primary tracking-tight leading-none uppercase">Arab<span class="text-brand-accent">Academy</span></h1>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Student Excellence Portal</span>
                    </div>
                </div>

                <div class="flex items-center space-x-6">
                    <div class="text-right hidden sm:block">
                        <p class="text-[9px] font-black text-slate-300 uppercase tracking-widest">Authorized Candidate</p>
                        <p class="text-xs font-bold text-slate-700 uppercase tracking-tight">{{ student?.name || student?.email }}</p>
                    </div>
                    <button @click="logout" 
                            class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all border border-slate-100 flex items-center justify-center group">
                        <i class="pi pi-sign-out group-hover:scale-110 transition-transform"></i>
                    </button>
                </div>
            </div>
        </header>

        <main class="relative z-10 max-w-7xl mx-auto px-8 py-16">

            <!-- Loading State -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-40 animate-in fade-in duration-700">
                <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                <p class="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">Propagating Student Profile...</p>
            </div>

            <div v-else class="space-y-16 animate-in fade-in slide-in-from-bottom-8 duration-1000">

                <!-- Greeting Section -->
                <section class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                    <div class="space-y-4">
                        <div class="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-lg border border-emerald-100">
                            <i class="pi pi-verified text-[10px]"></i>
                            <span class="text-[9px] font-black uppercase tracking-[0.2em]">Credential Integrity Verified</span>
                        </div>
                        <div class="flex flex-col space-y-2">
                            <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                Hi, <span class="text-brand-primary">{{ student?.first_name || student?.name || 'Candidate' }}</span>
                            </h2>
                            <p class="text-slate-500 font-medium text-lg italic opacity-80 uppercase tracking-tighter">"Knowledge is power. Select your cognitive module below."</p>
                        </div>
                    </div>

                    <!-- Demo Tool -->
                    <div v-if="isDemo" class="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] shadow-sm animate-in zoom-in-95 duration-500 w-full md:w-auto">
                         <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md">
                                <i class="pi pi-bolt text-sm"></i>
                            </div>
                            <span class="text-[10px] font-black text-amber-600 uppercase tracking-widest">Demo Override Tool</span>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[9px] font-black text-amber-500 uppercase tracking-widest ml-1">Force Starting Level</label>
                            <div class="flex gap-1.5">
                                <button v-for="l in 9" :key="l" @click="selectedLevel = l"
                                    :class="selectedLevel === l ? 'bg-amber-500 text-white shadow-md' : 'bg-white text-amber-600 hover:bg-amber-100'"
                                    class="w-9 h-9 rounded-xl font-black text-xs transition-all flex items-center justify-center border border-amber-200">
                                    {{ l }}
                                </button>
                            </div>
                            <p class="text-[8px] font-bold text-amber-400 mt-2 italic">* Demo accounts can bypass adaptive sequencing.</p>
                        </div>
                        <button @click="resetDemoProgress" class="mt-5 w-full py-2.5 bg-rose-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 active:scale-95 transition-all shadow-md flex justify-center items-center gap-2">
                            <i class="pi pi-refresh"></i> Reset Exam Progress
                        </button>
                    </div>
                </section>

                <!-- Student Profile Matrix -->
                <section class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div class="lg:col-span-3 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-12 relative overflow-hidden group">
                        <div class="absolute -right-10 -top-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
                        
                        <!-- Identity Avatar -->
                        <div class="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-xl shrink-0">
                            {{ student?.first_name?.[0] || 'S' }}
                        </div>

                        <div class="flex-1 space-y-6 text-center md:text-left">
                            <div class="space-y-1">
                                <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Institutional Identity</p>
                                <h3 class="text-3xl font-black text-slate-800 tracking-tight uppercase">{{ student?.first_name || student?.name }} {{ student?.last_name || '' }}</h3>
                            </div>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Code</p>
                                    <p class="text-xs font-black uppercase text-brand-primary">{{ student?.student?.student_code || 'DEMO-ACC' }}</p>
                                </div>
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <Tag value="ACTIVE" severity="success" class="text-[8px] px-2 font-black tracking-widest" />
                                </div>
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                                    <p class="text-xs font-black uppercase text-slate-600">{{ student?.gender || 'N/A' }}</p>
                                </div>
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                                    <p class="text-xs font-black uppercase text-brand-accent">{{ student?.student?.category?.name || 'Administrative' }}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Small Stat Card -->
                    <div class="bg-brand-primary rounded-[2.5rem] p-10 text-white flex flex-col justify-between shadow-lg shadow-rose-100 relative overflow-hidden">
                        <div class="absolute -left-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                        <p class="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] relative z-10">Evaluations Finished</p>
                        <div class="relative z-10">
                            <span class="text-6xl font-black italic tracking-tighter">{{ exams?.[0]?.completed_skill_ids?.length || 0 }}</span>
                            <span class="text-lg font-bold ml-2 opacity-60">/ {{ (exams?.[0]?.skills?.length || 0) }}</span>
                        </div>
                    </div>
                </section>

                <!-- No Exams State -->
                <div v-if="!exams.length" class="bg-white border-2 border-dashed border-slate-201 rounded-[3rem] p-32 text-center shadow-sm">
                    <span class="text-6xl mb-6 block grayscale opacity-20">💼</span>
                    <h3 class="text-2xl font-black text-slate-700 tracking-tight uppercase">No Active Evaluation Segments</h3>
                    <p class="text-slate-400 font-bold mt-4 text-sm uppercase tracking-widest leading-relaxed">
                        Your account is pending institutional approval.<br/>Please contact administrative services.
                    </p>
                </div>

                <!-- Skills Selection List ( Style) -->
                <section v-else class="max-w-4xl mx-auto">
                    <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6 border-b border-slate-100 pb-8">
                        <div class="space-y-4">
                            <p class="text-[10px] font-black text-brand-primary uppercase tracking-[0.4em] ml-1">Assessment Roadmap</p>
                            <h3 class="text-4xl font-black text-slate-900 tracking-tighter uppercase">Academic Modules</h3>
                        </div>
                        <div class="flex items-center space-x-3 bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100">
                            <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ skills().length }} Domains Available</span>
                        </div>
                    </div>

                    <div class="space-y-4">
                        <div v-for="(skill, index) in skills()" :key="skill.id"
                             class="group relative bg-white border border-slate-100 rounded-[2rem] p-6 transition-all duration-500 hover:shadow-[0_20px_50px_rgba(0,0,0,0.04)] hover:border-brand-primary/20 flex flex-col md:flex-row items-center gap-8"
                             :class="isSkillCompleted(skill.id) ? 'opacity-70 bg-slate-50/50' : ''">
                            
                            <!-- Index & Icon -->
                            <div class="flex items-center gap-6 shrink-0 w-full md:w-auto">
                                <div class="text-[10px] font-black text-slate-300 w-6 tabular-nums">0{{ index + 1 }}</div>
                                <div :class="[
                                    isSkillCompleted(skill.id) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-600 group-hover:bg-brand-primary group-hover:text-white',
                                    'w-16 h-16 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500 shadow-sm'
                                ]">
                                    <i v-if="isSkillCompleted(skill.id)" class="pi pi-check text-xl"></i>
                                    <span v-else>{{ getSkillIcon(skill.name) }}</span>
                                </div>
                            </div>

                            <!-- Name & Details -->
                            <div class="flex-grow text-center md:text-left space-y-1">
                                <h4 class="text-xl font-black text-slate-800 tracking-tight group-hover:text-brand-primary transition-colors uppercase leading-none">{{ skill.name }}</h4>
                                <div class="flex items-center justify-center md:justify-start gap-3 mt-2">
                                    <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest italic">Standard Proficiency Track</span>
                                    <div v-if="isSkillCompleted(skill.id)" class="w-1 h-1 rounded-full bg-emerald-300"></div>
                                    <span v-if="isSkillCompleted(skill.id)" class="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Completed</span>
                                </div>
                            </div>

                            <!-- Action Area -->
                            <div class="shrink-0 w-full md:w-auto">
                                <button v-if="!isSkillCompleted(skill.id)" 
                                    @click="startSkill(skill.id)"
                                    :disabled="startingSkillId !== null"
                                    class="w-full md:w-auto px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-brand-primary hover:shadow-xl hover:shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-50">
                                    <span v-if="startingSkillId === skill.id" class="flex items-center gap-3">
                                        <i class="pi pi-spin pi-spinner text-xs"></i> Initialize...
                                    </span>
                                    <span v-else>Launch Module</span>
                                </button>
                                <div v-else class="px-10 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-[11px] uppercase tracking-widest border border-emerald-100 text-center">
                                    Assessment Logged
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>

        <footer class="max-w-7xl mx-auto px-8 py-20 text-center">
            <div class="flex flex-col items-center space-y-6 opacity-30">
                <div class="h-px w-24 bg-slate-200"></div>
                <div class="flex items-center space-x-8">
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Encrypted Session</span>
                    <span class="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">Arab Academy Protocol 2024</span>
                </div>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const exams = ref([]);
const student = ref(null);
const isLoading = ref(false);
const startingSkillId = ref(null);

const fetchDashboard = async () => {
    isLoading.value = true;
    try {
        const [userRes, examsRes] = await Promise.all([
            api.get('/user'),
            api.get('/exams'),
        ]);
        student.value = userRes.data;
        exams.value = examsRes.data;
    } catch (err) {
        console.error('Failed to load dashboard', err);
    } finally {
        isLoading.value = false;
    }
};

onMounted(fetchDashboard);

const skills = () => exams.value?.[0]?.skills || [];

const isSkillCompleted = (skillId) => {
    const exam = exams.value?.[0];
    if (!exam || !exam.completed_skill_ids) return false;
    return exam.completed_skill_ids.includes(skillId);
};

const startSkill = async (skillId) => {
    if (!exams.value[0]) return;
    if (isSkillCompleted(skillId)) return;
    
    startingSkillId.value = skillId;
    try {
        const res = await api.post(`/exams/${exams.value[0].id}/start`, { skill_id: skillId });
        router.push(`/exam/${res.data.attempt.id}`);
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to start session');
    } finally {
        startingSkillId.value = null;
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
                <section class="space-y-4">
                    <div class="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-lg border border-emerald-100">
                        <i class="pi pi-verified text-[10px]"></i>
                        <span class="text-[9px] font-black uppercase tracking-[0.2em]">Credential Integrity Verified</span>
                    </div>
                    <div class="flex flex-col space-y-2">
                        <h2 class="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                            Hi, <span class="text-brand-primary">{{ student?.user?.first_name || 'Candidate' }}</span>
                        </h2>
                        <p class="text-slate-500 font-medium text-lg italic opacity-80 uppercase tracking-tighter">"Knowledge is power. Select your cognitive module below."</p>
                    </div>
                </section>

                <!-- Student Profile Matrix -->
                <section class="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <div class="lg:col-span-3 bg-white rounded-[2.5rem] p-10 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center md:items-start space-y-8 md:space-y-0 md:space-x-12 relative overflow-hidden group">
                        <div class="absolute -right-10 -top-10 w-40 h-40 bg-brand-primary/5 rounded-full blur-3xl transition-all group-hover:scale-150"></div>
                        
                        <!-- Identity Avatar -->
                        <div class="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-xl shrink-0">
                            {{ student?.user?.first_name?.[0] || 'S' }}
                        </div>

                        <div class="flex-1 space-y-6 text-center md:text-left">
                            <div class="space-y-1">
                                <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Institutional Identity</p>
                                <h3 class="text-3xl font-black text-slate-800 tracking-tight uppercase">{{ student?.user?.first_name }} {{ student?.user?.last_name }}</h3>
                            </div>

                            <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Code</p>
                                    <p class="text-xs font-black uppercase text-brand-primary">{{ student?.student_code || 'UNCODED' }}</p>
                                </div>
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                    <Tag value="ACTIVE" severity="success" class="text-[8px] px-2 font-black tracking-widest" />
                                </div>
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Gender</p>
                                    <p class="text-xs font-black uppercase text-slate-600">{{ student?.user?.gender || 'N/A' }}</p>
                                </div>
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Category</p>
                                    <p class="text-xs font-black uppercase text-brand-accent">{{ student?.category?.name || 'Academic' }}</p>
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

                <!-- Skills Selection Grid -->
                <section v-else>
                    <div class="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
                        <div class="space-y-4">
                            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] ml-1">Academic Assessment Matrix</p>
                            <div class="flex items-center space-x-4">
                                <div class="w-2 h-10 bg-brand-primary rounded-full"></div>
                                <h3 class="text-3xl font-black text-slate-800 tracking-tight uppercase">Select Evaluation Domain</h3>
                            </div>
                        </div>
                        <div class="bg-white border border-slate-100 rounded-[1.5rem] px-8 py-4 shadow-sm flex items-center space-x-4">
                            <div class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                            <span class="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] whitespace-nowrap">{{ skills().length }} Active Modalities</span>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        <button v-for="(skill, index) in skills()" :key="skill.id"
                            @click="startSkill(skill.id)"
                            :disabled="startingSkillId !== null || isSkillCompleted(skill.id)"
                            :class="[
                                isSkillCompleted(skill.id) ? 'opacity-70 grayscale-[0.5]' : 'group hover:-translate-y-2',
                                'relative text-left focus:outline-none disabled:cursor-not-allowed transition-all duration-500'
                            ]">

                            <!-- Premium Card Component -->
                            <div :class="isSkillCompleted(skill.id) ? 'bg-slate-50/50' : 'bg-white hover:shadow-[0_45px_100px_rgba(0,0,0,0.06)] hover:border-brand-primary/10'"
                                 class="relative rounded-[2.5rem] p-10 overflow-hidden border border-slate-100 shadow-sm transition-all duration-500 h-full">
                                
                                <!-- Decorative Background Element -->
                                <div class="absolute -right-6 -bottom-6 text-[140px] text-slate-50 opacity-[0.4] select-none pointer-events-none leading-none transition-all duration-700 transform group-hover:-rotate-12">
                                    {{ getSkillIcon(skill.name) }}
                                </div>

                                <div class="relative z-10 space-y-8">
                                    <!-- Dynamic Icon Housing -->
                                    <div :class="[
                                        isSkillCompleted(skill.id) ? 'bg-emerald-50 text-emerald-500 border-emerald-100' : 'bg-brand-primary/5 text-brand-primary border-brand-primary/10 group-hover:bg-brand-primary group-hover:text-white',
                                        'w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-3xl shadow-sm border transition-all duration-500'
                                    ]">
                                        <i v-if="isSkillCompleted(skill.id)" class="pi pi-check"></i>
                                        <span v-else-if="startingSkillId !== skill.id" class="transform transition-transform group-hover:rotate-12">{{ getSkillIcon(skill.name) }}</span>
                                        <div v-else class="w-6 h-6 border-3 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin"></div>
                                    </div>

                                    <!-- Labeling -->
                                    <div class="space-y-3">
                                        <div class="flex items-center justify-between">
                                            <h4 class="text-2xl font-black text-slate-800 tracking-tight group-hover:text-brand-primary transition-colors uppercase leading-none">{{ skill.name }}</h4>
                                            <Tag v-if="isSkillCompleted(skill.id)" value="COMPLETED" severity="success" class="text-[8px] px-2 font-black tracking-widest" />
                                        </div>
                                        <div class="flex items-center space-x-2">
                                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol Type: </span>
                                            <span class="text-[9px] font-black text-brand-accent uppercase tracking-widest">Institutional</span>
                                        </div>
                                    </div>

                                    <!-- Bottom Interface -->
                                    <div class="pt-6 border-t border-slate-50 flex items-center justify-between">
                                        <span class="text-[10px] font-black uppercase tracking-[0.2em]" 
                                              :class="isSkillCompleted(skill.id) ? 'text-emerald-600' : 'text-slate-400 group-hover:text-brand-primary'">
                                            {{ isSkillCompleted(skill.id) ? 'EVALUATION FINISHED' : (startingSkillId === skill.id ? 'SYNCING CONTENT...' : 'ENTER ASSESSMENT') }}
                                        </span>
                                        <div :class="isSkillCompleted(skill.id) ? 'bg-emerald-50' : 'bg-slate-50 group-hover:bg-brand-primary'"
                                             class="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:translate-x-1">
                                            <i :class="isSkillCompleted(skill.id) ? 'pi pi-verified text-emerald-500' : 'pi pi-arrow-right text-brand-primary group-hover:text-white'" 
                                               class="text-[10px]"></i>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </button>
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

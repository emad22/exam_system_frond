<script setup>
import { ref, onMounted, computed, watch, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import AudioRecorder from '@/components/AudioRecorder.vue';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const attempt = ref(null);
const currentSkill = ref(null);
const questions = ref([]);
const currentIndex = ref(0);
const answers = ref([]);
const systemRequirements = ref([]);
const globalOffset = ref(0);       
const totalSkillQuestions = ref(0); 
const currentLevel = ref(null);

const isLoading = ref(true);
const isStarting = ref(true); 
const isSubmittingBatch = ref(false);
const questionSubmitted = ref(false);
const isRetryAttempt = ref(false);
const showRetryNotification = ref(false);
const errorMsg = ref('');
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);
const audioRef = ref(null);
const isAudioPlaying = ref(false);
const hasListened = ref(false);

const syncAudioState = () => {
    if (audioRef.value) isAudioPlaying.value = !audioRef.value.paused;
};

const toggleAudioManual = async () => {
    if (!audioRef.value) return;
    try {
        if (audioRef.value.paused) await audioRef.value.play();
        else audioRef.value.pause();
    } catch (err) {
        console.error('Audio playback failed:', err);
    }
    syncAudioState();
};

const onAudioError = (e) => {
    console.error('Audio element error:', e);
    isAudioPlaying.value = false;
};

const canStart = computed(() => {
    const mandatoryIds = systemRequirements.value.filter(r => r.is_mandatory).map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const toggleRequirement = (id) => {
    if (autoVerifiedIds.value.includes(id)) return;
    const index = checkedRequirements.value.indexOf(id);
    if (index === -1) checkedRequirements.value.push(id);
    else checkedRequirements.value.splice(index, 1);
};

const autoVerifyRequirements = (requirements) => {
    const ua = navigator.userAgent.toLowerCase();
    const isOnline = navigator.onLine;
    const isChrome = ua.includes('chrome') && !ua.includes('edg');
    const isEdge = ua.includes('edg');
    const isDesktop = !/android|iphone|ipad|mobile/.test(ua);
    const hasMediaDevices = !!(navigator.mediaDevices);

    requirements.forEach(req => {
        const cat = req.category?.toLowerCase();
        const title = req.title?.toLowerCase();
        let verified = false;
        if (cat === 'internet' || title.includes('internet')) verified = isOnline;
        else if (cat === 'browser' || title.includes('chrome')) verified = (isChrome || isEdge) && isDesktop;
        else if (cat === 'hardware' || title.includes('audio')) verified = hasMediaDevices;

        if (verified) {
            autoVerifiedIds.value.push(req.id);
            if (!checkedRequirements.value.includes(req.id)) checkedRequirements.value.push(req.id);
        }
    });
};

const fetchData = async () => {
    isLoading.value = true;
    try {
        const [attRes, reqRes] = await Promise.all([
            api.get(`/attempts/${attemptId}`),
            api.get('/public/system-requirements')
        ]);
        attempt.value = attRes.data;
        systemRequirements.value = reqRes.data;
        autoVerifyRequirements(reqRes.data);
        
        if (attempt.value.status === 'completed' || attempt.value.status === 'voided') {
            router.push(`/exam/${attemptId}/result`);
        }
    } catch (err) {
        errorMsg.value = "Session initialization failed.";
    } finally {
        isLoading.value = false;
    }
};

const beginExam = async () => {
    isStarting.value = false;
    await fetchNextBatch();
}

const fetchNextBatch = async () => {
    isLoading.value = true;
    questions.value = []; // Safety clear
    try {
        const res = await api.get(`/attempts/${attemptId}/next-batch`);
        if (res.data.questions?.length > 0) {
            currentSkill.value = res.data.skill;
            currentLevel.value = res.data.level;
            totalSkillQuestions.value = res.data.total_questions;
            questions.value = res.data.questions;
            currentIndex.value = 0;
            questionSubmitted.value = false;
            hasListened.value = false;
            
            answers.value = questions.value.map(q => ({
                question_id: q.id,
                option_id: null,
                text_answer: '',
                recorded_file: null
            }));
        } else {
            errorMsg.value = "Module content empty.";
        }
    } catch (err) {
        errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
    } finally {
        isLoading.value = false;
        // Reset interactive states for the new batch
        questionSubmitted.value = false;
        hasListened.value = false;
        isAudioPlaying.value = false;
        if (audioRef.value) audioRef.value.pause();
        
        window.scrollTo(0, 0);
    }
};

const submitAnswer = () => {
    const ans = answers.value[currentIndex.value];
    const q = currentQ.value;
    let isValid = false;
    if (q.type === 'mcq' || q.type === 'true_false') isValid = !!ans.option_id;
    else if (q.type === 'speaking') isValid = !!ans.recorded_file;
    else isValid = !!ans.text_answer;

    if (!isValid) {
        alert('Please complete the task before proceeding.');
        return;
    }
    questionSubmitted.value = true;
};

const advanceQuestion = async () => {
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        questionSubmitted.value = false;
        hasListened.value = false;
        window.scrollTo(0, 0);
    } else {
        await submitCurrentBatch();
    }
};

const submitCurrentBatch = async () => {
    isSubmittingBatch.value = true;
    try {
        const formData = new FormData();
        answers.value.forEach((ans, index) => {
            formData.append(`answers[${index}][question_id]`, ans.question_id);
            if (ans.option_id) formData.append(`answers[${index}][option_id]`, ans.option_id);
            if (ans.text_answer) formData.append(`answers[${index}][text_answer]`, ans.text_answer);
            if (ans.recorded_file) formData.append(`answers[${index}][audio_file]`, ans.recorded_file, `voice.webm`);
        });

        const res = await api.post(`/attempts/${attemptId}/submit-batch`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        if (res.data.finished_exam) router.push(`/exam/${attemptId}/result`);
        else if (res.data.next_step === 'dashboard') router.push('/dashboard');
        else {
            // Handle retry notification logic
            if (res.data.retry_attempt) {
                isRetryAttempt.value = true;
                showRetryNotification.value = true;
                // Notification stays visible until student clicks "Proceed" on the notice (or it auto-closes)
                // For now, we'll just show it and then fetch the next batch
            } else {
                isRetryAttempt.value = false;
                showRetryNotification.value = false;
                globalOffset.value += questions.value.length;
            }
            
            await fetchNextBatch();
        }
    } catch (err) {
        alert('Data transmission error. Try again.');
    } finally {
        isSubmittingBatch.value = false;
    }
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);
const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);
const wordCount = computed(() => (answers.value[currentIndex.value]?.text_answer || '').trim().split(/\s+/).filter(w => w).length);

const getSkillIcon = (name) => {
    name = name?.toLowerCase() || '';
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    return '🎯';
};

// Auto-play media when question changes
watch(currentQ, (newQ) => {
    const mediaUrl = newQ?.passage?.media_url || newQ?.media_url;
    if (mediaUrl) {
        nextTick(() => {
            if (audioRef.value) {
                audioRef.value.play().catch(err => {
                    console.warn('Autoplay blocked by browser. User interaction required.', err);
                });
            }
        });
    }
});

onMounted(fetchData);
</script>

<template>
    <div class="min-h-screen bg-slate-50 font-sans text-slate-900">
        
        <!-- TOEFL Institutional Header -->
        <header v-if="!isStarting && currentSkill" class="bg-slate-800 text-white sticky top-0 z-[1000] shadow-md h-16">
            <div class="max-w-[1600px] mx-auto px-6 h-full flex justify-between items-center">
                <!-- Section Title -->
                <div class="flex items-center space-x-6">
                    <span class="text-sm font-black uppercase tracking-wider text-slate-400 border-r border-slate-600 pr-6">{{ currentSkill?.name }}</span>
                    <span class="text-sm font-bold text-white uppercase tracking-tight">Question {{ displayNumber }} of {{ totalSkillQuestions }}</span>
                </div>

                <!-- Navigation Actions -->
                <div class="flex items-center space-x-2">
                    <div class="flex items-center space-x-4 bg-slate-900/50 px-4 py-1.5 rounded-lg border border-slate-700 mr-6">
                        <i class="pi pi-clock text-slate-400 text-xs"></i>
                        <span class="text-lg font-black tabular-nums tracking-tighter">45:00</span>
                    </div>
                    
                    <button class="h-10 px-6 bg-slate-700 text-slate-300 rounded font-bold text-xs uppercase hover:bg-slate-600 transition-all opacity-50 cursor-not-allowed">Back</button>
                    <button v-if="!questionSubmitted" @click="submitAnswer" 
                        class="h-10 px-8 bg-brand-primary text-white rounded font-black text-xs uppercase hover:bg-brand-primary/90 transition-all shadow-lg">Confirm</button>
                    <button v-else @click="advanceQuestion" 
                        class="h-10 px-8 bg-emerald-600 text-white rounded font-black text-xs uppercase hover:bg-emerald-500 transition-all shadow-lg flex items-center gap-2">
                        Next <i class="pi pi-chevron-right text-[10px]"></i>
                    </button>
                </div>
            </div>
        </header>

        <main class="max-w-[1600px] mx-auto px-6 py-6">
            
            <!-- Retry Notification Overlay -->
            <div v-if="showRetryNotification" class="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-6">
                <div class="bg-white rounded-lg p-10 max-w-xl w-full shadow-2xl border border-slate-200 text-center">
                    <div class="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-2xl">
                        <i class="pi pi-refresh"></i>
                    </div>
                    <h3 class="text-xl font-black text-slate-900 tracking-tight mb-4 uppercase">Institutional Notification</h3>
                    <p class="text-slate-600 text-base font-medium leading-relaxed mb-8">
                        Performance threshold not met. Initializing secondary evaluation cycle with fresh content...
                    </p>
                    <button @click="showRetryNotification = false" 
                        class="w-full py-4 bg-slate-800 text-white rounded font-bold uppercase text-xs tracking-widest hover:bg-slate-700 transition-all">
                        Begin Retry Phase
                    </button>
                </div>
            </div>

            <!-- Loading -->
            <div v-if="isLoading" class="flex flex-col items-center justify-center py-40">
                <div class="w-10 h-10 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <p class="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Synchronizing Assessment Matrix...</p>
            </div>

            <!-- Start Screen -->
            <div v-else-if="isStarting" class="max-w-4xl mx-auto py-12">
                <div class="bg-white rounded-xl p-16 border border-slate-200 shadow-xl text-center">
                    <h2 class="text-4xl font-black text-slate-900 tracking-tight mb-4 uppercase">Assessment Preparation</h2>
                    <p class="text-slate-500 text-base font-medium mb-12">System requirements verified. You are entering a strictly timed environment.</p>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mb-16">
                        <div class="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Components</h4>
                            <div class="space-y-4">
                                <div v-for="skill in attempt?.skills" :key="skill.id" class="flex items-center space-x-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                                    <span class="text-xl">{{ getSkillIcon(skill.name) }}</span>
                                    <span class="text-[11px] font-black text-slate-700 uppercase tracking-widest">{{ skill.name }}</span>
                                </div>
                            </div>
                        </div>
                        <div class="bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Prerequisites</h4>
                            <div class="space-y-4">
                                <div v-for="req in systemRequirements" :key="req.id" @click="toggleRequirement(req.id)"
                                    class="flex items-center justify-between p-4 bg-white rounded-xl shadow-sm border border-slate-100 cursor-pointer group">
                                    <span class="text-[10px] font-black text-slate-600 uppercase tracking-tight">{{ req.title }}</span>
                                    <div :class="checkedRequirements.includes(req.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-slate-50 border-slate-200'" class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all">
                                        <i v-if="checkedRequirements.includes(req.id)" class="pi pi-check text-[8px] text-white"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button @click="beginExam" :disabled="!canStart"
                        class="w-full py-8 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-[0.4em] shadow-2xl hover:bg-brand-primary hover:shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-30">
                        Launch Assessment Cycle
                    </button>
                </div>
            </div>

            <!-- Exam Split Screen -->
            <div v-else-if="currentQ" class="grid grid-cols-1 lg:grid-cols-12 gap-px bg-slate-300 border border-slate-300 shadow-lg min-h-[calc(100vh-100px)] animate-in fade-in duration-500 overflow-hidden">
                
                <!-- Left: Stimulus -->
                <div class="lg:col-span-7 bg-white p-8 overflow-y-auto custom-scrollbar flex flex-col h-full">
                    <div class="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                        <div class="flex items-center space-x-2">
                            <i class="pi pi-file-edit text-slate-400"></i>
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Resource Material</span>
                        </div>
                        <div class="flex items-center space-x-4">
                            <button class="text-slate-400 hover:text-slate-600 transition-colors"><i class="pi pi-volume-up"></i></button>
                            <button class="text-slate-400 hover:text-slate-600 transition-colors"><i class="pi pi-question-circle"></i></button>
                        </div>
                    </div>

                    <div class="flex-grow prose prose-slate max-w-none">
                        <!-- Passage Handling -->
                        <div v-if="currentQ.passage" class="space-y-8">
                            <h3 class="text-2xl font-black text-slate-900 tracking-tight leading-tight">{{ currentQ.passage.title }}</h3>
                            
                            <!-- Passage Media (Audio/Video) -->
                            <div v-if="currentQ.passage.media_url" class="bg-slate-50 p-6 border border-slate-200 rounded space-y-4">
                                <audio ref="audioRef" :src="currentQ.passage.media_url" controls @play="isAudioPlaying = true" @pause="isAudioPlaying = false" @ended="hasListened = true" class="w-full h-10"></audio>
                                <p class="text-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Audio Resource Stream</p>
                            </div>

                            <p class="text-xs text-slate-400 font-bold italic leading-relaxed">
                                {{ currentQ.instructions || 'Review the stimulus carefully and provide your academic response.' }}
                            </p>

                            <div v-if="currentQ.passage.content" class="text-lg text-slate-700 leading-[1.8] font-serif text-justify whitespace-pre-wrap">{{ currentQ.passage.content }}</div>
                        </div>

                        <!-- Standalone Media Handling -->
                        <div v-else-if="currentQ.media_url" class="flex flex-col items-center justify-center py-10 space-y-8 h-full bg-slate-50 rounded border border-slate-200 border-dashed">
                            <div class="w-20 h-20 bg-white rounded-full flex items-center justify-center text-slate-400 border border-slate-200 shadow-sm">
                                <i :class="currentQ.media_url.includes('.mp4') ? 'pi pi-video' : 'pi pi-volume-up'" class="text-3xl"></i>
                            </div>
                            <div class="w-full max-w-sm bg-white p-6 border border-slate-200 shadow-md rounded space-y-4">
                                <audio ref="audioRef" :src="currentQ.media_url" controls @play="isAudioPlaying = true" @pause="isAudioPlaying = false" @ended="hasListened = true" class="w-full h-10"></audio>
                                <p class="text-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">Institutional Audio Content</p>
                            </div>
                        </div>

                        <!-- Standalone Placeholder -->
                        <div v-else class="flex flex-col items-center justify-center h-full space-y-6 py-20 bg-slate-50 border border-dashed border-slate-200 rounded">
                            <i class="pi pi-shield text-4xl text-slate-200"></i>
                            <div class="text-center space-y-2">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Direct Engagement Protocol</p>
                                <p class="text-xs text-slate-300 font-medium italic">"Stand-alone evaluation phase. Focus on the prompt."</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Response -->
                <div class="lg:col-span-5 bg-white p-8 flex flex-col h-full border-l border-slate-200 shadow-inner">
                    <div class="flex items-center space-x-2 mb-8 pb-4 border-b border-slate-100">
                        <i class="pi pi-pencil text-brand-primary"></i>
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question Task</span>
                    </div>

                    <div class="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-8">
                        <h3 class="text-xl font-bold text-slate-900 leading-tight">
                            {{ currentQ.content || 'Academic Prompt Task' }}
                        </h3>
                        <p class="text-[11px] font-bold text-slate-500 italic border-l-2 border-brand-primary/20 pl-4">
                            {{ currentQ.instructions || 'Carefully review the provided material and deliver your institutional response accordingly.' }}
                        </p>

                        <div class="pt-4 space-y-4">
                            <!-- MCQ -->
                            <div v-if="currentQ.type === 'mcq' || currentQ.type === 'true_false'" class="space-y-2">
                                <button v-for="opt in currentQ.options" :key="opt.id"
                                    @click="answers[currentIndex].option_id = opt.id"
                                    :disabled="questionSubmitted"
                                    class="w-full text-left p-4 rounded border transition-all flex items-start gap-4 group"
                                    :class="answers[currentIndex].option_id === opt.id 
                                        ? 'border-brand-primary bg-brand-primary/5' 
                                        : 'border-slate-200 hover:border-slate-400 bg-white'">
                                    <div class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all"
                                        :class="answers[currentIndex].option_id === opt.id ? 'bg-brand-primary border-brand-primary' : 'border-slate-300'">
                                        <div v-if="answers[currentIndex].option_id === opt.id" class="w-2 h-2 bg-white rounded-full"></div>
                                    </div>
                                    <span class="font-medium text-slate-700 leading-snug">{{ opt.option_text }}</span>
                                </button>
                            </div>

                            <!-- Writing -->
                            <div v-if="currentQ.type === 'writing'" class="space-y-4">
                                <textarea v-model="answers[currentIndex].text_answer" :disabled="questionSubmitted"
                                    class="w-full bg-slate-50 border border-slate-200 rounded-lg p-6 text-base font-medium focus:border-brand-primary transition-all min-h-[300px] outline-none"
                                    placeholder="Compose response..."></textarea>
                                <div class="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2">
                                    <span>Word Count: {{ wordCount }}</span>
                                    <span>Required: {{ currentQ.min_words || 0 }} - {{ currentQ.max_words || '∞' }}</span>
                                </div>
                            </div>

                            <!-- Speaking -->
                            <div v-if="currentQ.type === 'speaking'" class="space-y-6">
                                <div v-if="(currentQ.passage?.media_url || currentQ.media_url) && !hasListened" class="p-8 bg-slate-50 border border-slate-200 rounded text-center space-y-4">
                                    <i class="pi pi-lock text-2xl text-slate-300"></i>
                                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Listen to resource to unlock recorder</p>
                                </div>
                                <AudioRecorder v-else @recorded="(blob) => answers[currentIndex].recorded_file = blob"
                                    class="!bg-slate-50 !border-slate-200" :disabled="questionSubmitted" />
                            </div>
                        </div>
                    </div>

                    <!-- Actions moved to Header for TOEFL style, but keeping a placeholder footer if needed -->
                    <div class="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                        <span class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Institutional Assessment Protocol 2024</span>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.animate-in { animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1); }
.custom-scrollbar::-webkit-scrollbar { width: 4px; }
.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
.custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 10px; }
.custom-scrollbar-dark::-webkit-scrollbar { width: 4px; }
.custom-scrollbar-dark::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 10px; }
.custom-scrollbar-dark::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
</style>

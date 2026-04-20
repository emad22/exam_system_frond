<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';

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

const isLoading = ref(true);
const isStarting = ref(true); 
const isSubmittingBatch = ref(false);
const questionSubmitted = ref(false);
const errorMsg = ref('');
const checkedRequirements = ref([]);
const autoVerifiedIds = ref([]);

const canStart = computed(() => {
    const mandatoryIds = systemRequirements.value
        .filter(r => r.is_mandatory)
        .map(r => r.id);
    return mandatoryIds.every(id => checkedRequirements.value.includes(id));
});

const toggleRequirement = (id) => {
    if (autoVerifiedIds.value.includes(id)) return;
    const index = checkedRequirements.value.indexOf(id);
    if (index === -1) {
        checkedRequirements.value.push(id);
    } else {
        checkedRequirements.value.splice(index, 1);
    }
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

        if (cat === 'internet' || title.includes('internet') || title.includes('connection')) {
            verified = isOnline;
        } else if (cat === 'browser' || title.includes('browser') || title.includes('chrome') || title.includes('edge')) {
            verified = (isChrome || isEdge) && isDesktop;
        } else if (cat === 'hardware' || title.includes('audio') || title.includes('sound') || title.includes('speaker')) {
            verified = hasMediaDevices;
        }

        if (verified) {
            autoVerifiedIds.value.push(req.id);
            if (!checkedRequirements.value.includes(req.id)) {
                checkedRequirements.value.push(req.id);
            }
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
        
        if (attempt.value.status === 'completed') {
            router.push(`/exam/${attemptId}/result`);
            return;
        }
    } catch (err) {
        console.error('Failed to load exam data', err);
        errorMsg.value = "Connection lost. Please check your internet.";
    } finally {
        isLoading.value = false;
    }
};

const beginExam = async () => {
    isStarting.value = false;
    questionSubmitted.value = false;
    await fetchNextBatch();
}

const fetchNextBatch = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const res = await api.get(`/attempts/${attemptId}/next-batch`);
        if (res.data.questions && res.data.questions.length > 0) {
            if (currentSkill.value?.id !== res.data.skill?.id) {
                globalOffset.value = 0;
            }
            currentSkill.value = res.data.skill;
            if (res.data.total_questions) {
                totalSkillQuestions.value = res.data.total_questions;
            }
            questions.value = res.data.questions;
            currentIndex.value = 0;
            questionSubmitted.value = false;
            
            answers.value = questions.value.map(q => ({
                question_id: q.id,
                option_id: null,
                text_answer: ''
            }));
        } else {
            errorMsg.value = "No questions found for this level.";
        }
    } catch (err) {
        console.error('Failed to fetch next batch', err);
        errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
    } finally {
        isLoading.value = false;
        window.scrollTo(0, 0);
    }
};

const submitAnswer = () => {
    const ans = answers.value[currentIndex.value];
    if (!ans.option_id && !ans.text_answer) {
        alert('Please select an answer before submitting.');
        return;
    }
    questionSubmitted.value = true;
};

const advanceQuestion = async () => {
    questionSubmitted.value = false;
    if (currentIndex.value < questions.value.length - 1) {
        currentIndex.value++;
        window.scrollTo(0, 0);
    } else {
        await submitCurrentBatch();
    }
};

const submitCurrentBatch = async () => {
    isSubmittingBatch.value = true;
    try {
        const res = await api.post(`/attempts/${attemptId}/submit-batch`, {
            answers: answers.value
        });
        
        if (res.data.finished_exam) {
            router.push(`/exam/${attemptId}/result`);
        } else if (res.data.next_step === 'dashboard') {
            router.push('/dashboard');
        } else {
            globalOffset.value += questions.value.length;
            await fetchNextBatch();
        }
    } catch (err) {
        console.error('Failed to submit batch', err);
        alert('Network error while saving progress. Please try again.');
    } finally {
        isSubmittingBatch.value = false;
    }
};

const currentQ = computed(() => questions.value[currentIndex.value] || null);
const displayNumber = computed(() => globalOffset.value + currentIndex.value + 1);
const displayTotal  = computed(() => totalSkillQuestions.value || '...');
const isLastQuestion = computed(() => currentIndex.value === questions.value.length - 1);

const wordCount = computed(() => {
    const text = answers.value[currentIndex.value]?.text_answer || '';
    if (!text.trim()) return 0;
    return text.trim().split(/\s+/).length;
});

const isWordCountValid = computed(() => {
    if (!currentQ.value || currentQ.value.type !== 'writing') return true;
    const min = currentQ.value.min_words || 0;
    const max = currentQ.value.max_words || 99999;
    return wordCount.value >= min && wordCount.value <= max;
});

onMounted(fetchData);
</script>

<template>
  <div class="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-rose-100 selection:text-indigo-900 overflow-x-hidden">
    
    <!-- Assessment Header -->
    <header class="bg-white/80 backdrop-blur-xl border-b border-slate-100 sticky top-0 z-50 shadow-sm">
        <div class="max-w-[1600px] mx-auto px-8 h-20 flex justify-between items-center">
            
            <div class="flex items-center space-x-6">
                <div class="flex items-center space-x-3 pr-6 border-r border-slate-100">
                    <div class="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center text-white font-black italic shadow-lg shadow-brand-primary/20">A</div>
                    <div class="flex flex-col">
                        <span class="text-sm font-black tracking-tight text-brand-primary uppercase leading-tight">Arab<span class="text-brand-accent">Academy</span></span>
                        <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest leading-none">Assessment Suite</span>
                    </div>
                </div>
                
                <div v-if="!isStarting && currentSkill" class="animate-in fade-in slide-in-from-left-4 duration-500">
                    <div class="flex items-center space-x-3">
                        <div class="w-1.5 h-6 bg-brand-primary rounded-full"></div>
                        <h1 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">{{ currentSkill.name }} Domain</h1>
                    </div>
                </div>
            </div>

            <div v-if="!isStarting && questions.length > 0" class="flex items-center space-x-8">
                <!-- Global Question Counter -->
                <div class="bg-slate-50 px-6 py-2 rounded-2xl border border-slate-100 flex items-center space-x-4 shadow-sm">
                    <div class="text-center">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Progress Matrix</p>
                        <p class="text-sm font-black text-brand-primary tracking-tighter">
                            {{ displayNumber }} <span class="text-slate-300 mx-1">/</span> {{ displayTotal }}
                        </p>
                    </div>
                </div>

                <div class="h-8 w-px bg-slate-100"></div>

                <button @click="router.push('/dashboard')" class="text-rose-500 bg-rose-50 hover:bg-rose-100 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border border-rose-100">
                    Interrupt Session
                </button>
            </div>
        </div>
        
        <!-- Global Progress Line -->
        <div v-if="!isStarting && questions.length > 0 && totalSkillQuestions > 0" class="h-1 w-full bg-slate-50">
            <div class="h-full bg-brand-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(159,18,57,0.3)]" :style="{ width: `${(displayNumber / totalSkillQuestions) * 100}%` }"></div>
        </div>
    </header>

    <main class="w-full relative z-10 min-h-[calc(100vh-80px)]">
        
        <!-- Loading -->
        <div v-if="isLoading" class="flex flex-col items-center justify-center py-48">
             <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
             <p class="mt-8 text-[11px] font-black text-slate-400 uppercase tracking-[0.4em] animate-pulse">Syncing Cognitive Assets...</p>
        </div>

        <!-- Error -->
        <div v-else-if="errorMsg" class="max-w-2xl mx-auto py-32 px-8 text-center space-y-12 animate-in zoom-in-95 duration-500">
             <div class="w-24 h-24 bg-rose-50 text-rose-500 rounded-[2rem] flex items-center justify-center text-4xl mx-auto shadow-sm border border-rose-100">
                 <i class="pi pi-exclamation-triangle"></i>
             </div>
             <div class="space-y-4">
                 <h2 class="text-3xl font-black text-slate-800 tracking-tight uppercase">Operational Error</h2>
                 <p class="text-slate-500 font-medium leading-relaxed text-lg">{{ errorMsg }}</p>
             </div>
             <div class="pt-6">
                 <button @click="router.push('/dashboard')" class="bg-brand-primary text-white px-12 py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest shadow-xl shadow-rose-100 hover:-translate-y-1 transition-all">
                    Return to Mission Control
                 </button>
             </div>
        </div>

        <!-- 1. Formal Assessment Introduction (Test Booklet Style) -->
        <div v-else-if="isStarting && attempt" class="max-w-5xl mx-auto px-8 py-20 animate-in fade-in slide-in-from-bottom-12 duration-1000">
             <div class="bg-white border border-slate-100 rounded-[3.5rem] p-12 md:p-24 shadow-[0_40px_100px_rgba(0,0,0,0.04)] relative overflow-hidden">
                  
                  <!-- Abstract Decorative Elements -->
                  <div class="absolute -top-24 -right-24 w-64 h-64 bg-brand-primary/5 rounded-full blur-3xl"></div>
                  <div class="absolute -bottom-24 -left-24 w-64 h-64 bg-brand-accent/5 rounded-full blur-3xl"></div>

                  <div class="relative z-10 text-center mb-20">
                       <div class="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-10 shadow-sm transition-transform hover:rotate-6 duration-500">
                            <i class="pi pi-shield text-3xl text-brand-primary"></i>
                       </div>
                       
                       <div class="flex flex-col items-center space-y-6 mb-8">
                            <span class="text-[10px] font-black text-brand-primary/60 uppercase tracking-[0.5em] ml-[0.5em]">Evaluation Protocol Initiation</span>
                            <div class="h-1.5 w-16 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full"></div>
                       </div>
                       
                       <h2 class="text-5xl md:text-6xl font-black text-slate-900 tracking-tighter leading-none mb-8">Ready for Assessment?</h2>
                       <p class="text-slate-400 font-medium max-w-xl mx-auto text-lg leading-relaxed italic">"Verification complete. You are about to enter a timed evaluation sequence. Please ensure zero interruptions."</p>
                  </div>

                  <!-- Instruction Matrix -->
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-12 mb-20 text-left bg-slate-50/50 rounded-[2.5rem] p-12 border border-slate-100">
                       <div class="space-y-8">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <span class="w-6 h-px bg-slate-200 mr-4"></span>
                                Evaluation Components
                            </h4>
                            <div class="space-y-4">
                                 <div v-for="skill in attempt.skills" :key="skill.id" class="flex items-center space-x-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm group hover:border-brand-primary/20 transition-all">
                                      <div class="w-10 h-10 bg-rose-50 text-brand-primary rounded-xl flex items-center justify-center text-xl shadow-sm italic transition-transform group-hover:scale-110">
                                          {{ getSkillIcon(skill.name) }}
                                      </div>
                                      <div>
                                          <span class="text-xs font-black text-slate-800 uppercase tracking-widest block leading-none mb-1">{{ skill.name }}</span>
                                          <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest opacity-60">Verified Domain</span>
                                      </div>
                                 </div>
                            </div>
                       </div>
                        <div class="space-y-8">
                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                <span class="w-6 h-px bg-slate-200 mr-4"></span>
                                Integrity Prerequisites
                            </h4>
                            <ul class="space-y-4">
                                 <li v-for="req in systemRequirements" :key="req.id" 
                                      class="flex items-start group rounded-2xl p-4 transition-all bg-white border border-slate-100 shadow-sm"
                                      :class="autoVerifiedIds.includes(req.id) ? 'border-emerald-100' : 'cursor-pointer hover:border-brand-primary/20'"
                                      @click="toggleRequirement(req.id)">
                                      
                                      <div class="relative mr-4 shrink-0">
                                          <div :class="checkedRequirements.includes(req.id) 
                                              ? (autoVerifiedIds.includes(req.id) ? 'bg-emerald-500 border-emerald-500' : 'bg-brand-primary border-brand-primary') 
                                              : 'border-slate-200 bg-slate-50 group-hover:border-slate-300'" 
                                               class="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all shadow-sm">
                                               <i v-if="checkedRequirements.includes(req.id)" class="pi pi-check text-xs text-white"></i>
                                          </div>
                                      </div>
                                      
                                      <div class="flex-1 pt-1">
                                           <div class="flex flex-wrap items-center gap-2">
                                               <span :class="checkedRequirements.includes(req.id) ? (autoVerifiedIds.includes(req.id) ? 'text-emerald-700' : 'text-brand-primary') : 'text-slate-600'" 
                                                     class="transition-colors font-black uppercase text-[11px] tracking-tight">{{ req.title }}</span>
                                               <span v-if="autoVerifiedIds.includes(req.id)" class="text-[7px] bg-emerald-50 text-emerald-600 border border-emerald-100 px-3 py-1 rounded-full font-black uppercase tracking-[0.2em] ml-auto">
                                                   System Pass ✓
                                               </span>
                                           </div>
                                           <p class="text-[9px] text-slate-400 mt-1 uppercase tracking-tighter leading-relaxed">
                                               {{ req.is_mandatory ? 'Required for Authentication' : 'Recommended Optimization' }}
                                           </p>
                                      </div>
                                 </li>
                            </ul>
                       </div>
                  </div>

                  <div class="flex flex-col items-center space-y-12">
                       <button @click="beginExam" 
                            :disabled="!canStart"
                            :class="!canStart ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none' : 'bg-brand-primary text-white shadow-2xl shadow-rose-100 hover:shadow-rose-300 hover:-translate-y-2 active:scale-95'"
                            class="px-20 py-8 rounded-[3rem] font-black uppercase text-[11px] tracking-[0.4em] ml-[0.4em] transition-all duration-500 flex items-center space-x-6">
                            <span>Initialize Assessment Loop</span>
                            <i class="pi pi-arrow-right animate-pulse"></i>
                       </button>
                       <div class="flex items-center space-x-8 opacity-40">
                            <div class="flex items-center space-x-3">
                                 <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><i class="pi pi-lock text-[10px]"></i></div>
                                 <span class="text-[8px] font-black uppercase tracking-[0.2em]">Encrypted</span>
                            </div>
                            <div class="w-1 h-1 bg-slate-300 rounded-full"></div>
                            <div class="flex items-center space-x-3">
                                 <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><i class="pi pi-server text-[10px]"></i></div>
                                 <span class="text-[8px] font-black uppercase tracking-[0.2em]">Validated</span>
                            </div>
                       </div>
                  </div>
             </div>
        </div>

        <!-- THE EXAM VIEW (TOEFL Split Screen Logic) -->
        <div v-else-if="currentQ" class="h-[calc(100vh-80px)] overflow-hidden animate-in fade-in duration-1000">
            
            <div :class="[currentQ.passage_content ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1']" class="grid h-full w-full">
                
                <!-- Left Pane: Passage (Pinned as in TOEFL) -->
                <div v-if="currentQ.passage_content" class="bg-white border-r border-slate-100 overflow-y-auto p-12 md:p-24 custom-scrollbar animate-in slide-in-from-left-12 duration-1000 shadow-inner">
                    <div class="max-w-3xl mx-auto">
                        <div class="flex items-start justify-between mb-16 px-4">
                             <div class="flex items-center space-x-4">
                                  <div class="w-1.5 h-10 bg-brand-primary rounded-full shadow-sm shadow-brand-primary/20"></div>
                                  <div>
                                       <span class="text-[9px] font-black text-slate-300 uppercase tracking-[0.4em] block mb-1">Contextual Resource</span>
                                       <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight italic">Reading Passage Matrix</h3>
                                  </div>
                             </div>
                             <div class="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] bg-rose-50 px-4 py-2 rounded-xl border border-rose-100">Academic Scroll</div>
                        </div>
                        <div class="prose prose-slate max-w-none">
                             <div class="text-2xl font-medium text-slate-800 leading-[2.1] whitespace-pre-wrap font-serif text-justify dir-rtl pr-10 border-r-2 border-slate-50 transition-all hover:border-brand-primary/10">
                                 {{ currentQ.passage_content }}
                             </div>
                        </div>
                    </div>
                </div>

                <!-- Right Pane: Question & Answers -->
                <div :class="{'bg-white': !currentQ.passage_content, 'bg-slate-50/30': currentQ.passage_content}" class="overflow-y-auto p-12 md:p-24 flex flex-col items-center justify-start animate-in slide-in-from-right-12 duration-1000">
                    <div class="w-full max-w-2xl bg-white p-12 md:p-16 rounded-[3.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.03)] border border-slate-100">
                        
                        <!-- Question Header -->
                        <div class="mb-14 flex items-center justify-between border-b border-slate-50 pb-8">
                             <div class="text-[10px] font-black text-brand-primary bg-rose-50 px-4 py-2 rounded-xl border border-rose-100 uppercase tracking-[0.2em]">
                                 {{ currentSkill?.name }} Protocol
                             </div>
                             <div class="flex items-center space-x-2">
                                 <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                 <div class="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Synapse Active</div>
                             </div>
                        </div>

                        <!-- Question Content -->
                        <div class="space-y-10 mb-20">
                            <h2 class="text-3xl md:text-4xl font-black text-slate-900 leading-[1.25] tracking-tighter">
                                {{ currentQ.content }}
                            </h2>

                            <!-- Audio Player -->
                            <div v-if="currentQ.media_url" class="p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] shadow-sm flex flex-col space-y-6 animate-in slide-in-from-top-6 duration-700">
                                <div class="flex items-center justify-between">
                                     <div class="flex items-center space-x-4">
                                          <div class="w-12 h-12 bg-white text-brand-primary rounded-2xl flex items-center justify-center shadow-sm border border-slate-100">
                                              <i class="pi pi-volume-up text-xl"></i>
                                          </div>
                                          <span class="text-[10px] font-black text-brand-primary uppercase tracking-[0.3em]">Audio Transceiver</span>
                                     </div>
                                     <span class="text-[8px] font-black text-slate-300 uppercase tracking-widest italic opacity-60">High-Fidelity Stream</span>
                                </div>
                                <audio :src="currentQ.media_url" controls class="w-full h-12 rounded-full opacity-90 hover:opacity-100 transition-opacity"></audio>
                            </div>
                        </div>

                        <!-- A. MCQ (Clean Professional List) -->
                        <div v-if="currentQ.type === 'mcq'" class="space-y-5" :class="questionSubmitted ? 'pointer-events-none' : ''">
                            <label v-for="(option, idx) in currentQ.options" :key="option.id" 
                                :class="[
                                    answers[currentIndex].option_id === option.id ? 'border-brand-primary bg-rose-50/10 ring-8 ring-rose-50/30' : 'border-slate-100 bg-white hover:border-slate-200',
                                    questionSubmitted && answers[currentIndex].option_id !== option.id ? 'opacity-30' : '',
                                    !questionSubmitted ? 'cursor-pointer' : 'cursor-default'
                                ]"
                                class="flex items-center p-8 rounded-[1.75rem] border-2 transition-all duration-500 group relative">
                                <input type="radio" :value="option.id" v-model="answers[currentIndex].option_id" class="hidden" :disabled="questionSubmitted">
                                
                                <div :class="answers[currentIndex].option_id === option.id ? 'bg-brand-primary border-brand-primary text-white shadow-lg shadow-rose-100' : 'bg-slate-50 border-slate-100 text-slate-300 group-hover:border-slate-200'"
                                     class="w-12 h-12 rounded-xl border-2 flex items-center justify-center mr-6 transition-all duration-500 flex-shrink-0 font-black text-xs italic tracking-tighter">
                                    {{ String.fromCharCode(65 + idx) }}
                                </div>
                                <span class="text-xl font-bold text-slate-800 leading-tight tracking-tight">{{ option.option_text }}</span>
                            </label>
                        </div>

                        <!-- B. True/False -->
                        <div v-if="currentQ.type === 'true_false'" class="grid grid-cols-2 gap-8" :class="questionSubmitted ? 'pointer-events-none' : ''">
                             <label v-for="option in currentQ.options" :key="option.id" 
                                :class="[
                                    answers[currentIndex].option_id === option.id ? 'border-brand-primary bg-rose-50/10 ring-8 ring-rose-50/30' : 'border-slate-100 bg-white hover:border-slate-200',
                                    questionSubmitted && answers[currentIndex].option_id !== option.id ? 'opacity-30' : '',
                                    !questionSubmitted ? 'cursor-pointer transform hover:-translate-y-1' : 'cursor-default'
                                ]"
                                class="flex flex-col items-center justify-center p-16 rounded-[2.5rem] border-2 transition-all duration-500 group shadow-sm">
                                 <input type="radio" :value="option.id" v-model="answers[currentIndex].option_id" class="hidden" :disabled="questionSubmitted">
                                 <div class="mb-10 w-20 h-20 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-white transition-colors duration-500 shadow-sm border border-slate-50">
                                     <i :class="[
                                           option.option_text === 'True' || option.option_text === 'صواب' ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-500',
                                           answers[currentIndex].option_id === option.id ? 'opacity-100 scale-125' : 'opacity-20 grayscale'
                                     ]" class="text-5xl transition-all duration-700"></i>
                                 </div>
                                 <span class="font-black text-xs uppercase tracking-[0.3em] ml-[0.3em] text-slate-800">{{ option.option_text }}</span>
                             </label>
                        </div>

                        <!-- C. Short Answer -->
                        <div v-if="currentQ.type === 'short_answer'" class="space-y-6">
                             <div class="relative group">
                                 <div class="absolute inset-0 bg-brand-primary/5 rounded-[1.5rem] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                 <InputText v-model="answers[currentIndex].text_answer" 
                                    placeholder="Execute textual response..." 
                                    class="relative w-full rounded-3xl p-10 bg-slate-50 border-2 border-slate-100 text-2xl font-black text-slate-800 focus:border-brand-primary focus:bg-white outline-none transition-all shadow-inner tracking-tight" />
                             </div>
                             <div class="flex items-center space-x-3 px-6 opacity-30">
                                 <i class="pi pi-shield text-[10px]"></i>
                                 <p class="text-[9px] font-black text-slate-500 uppercase tracking-widest">Responses are encrypted and hashed for validation</p>
                             </div>
                        </div>

                        <!-- D. Writing (Report/Essay) -->
                        <div v-if="currentQ.type === 'writing'" class="space-y-8">
                            <div class="flex justify-between items-center bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100">
                                <div class="flex items-center space-x-8">
                                     <div class="flex flex-col">
                                          <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Metric</span>
                                          <div class="flex items-center space-x-3">
                                               <span :class="isWordCountValid ? 'text-emerald-600' : 'text-amber-500'" class="text-lg font-black tracking-tighter">{{ wordCount }} Words</span>
                                               <div v-if="isWordCountValid" class="w-6 h-6 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center text-[10px]"><i class="pi pi-check"></i></div>
                                          </div>
                                     </div>
                                     <div class="w-px h-10 bg-slate-200"></div>
                                     <div class="flex flex-col">
                                          <span class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Threshold</span>
                                          <span class="text-xs font-black text-slate-700 tracking-wider">Min: {{ currentQ.min_words || 0 }} / Max: {{ currentQ.max_words || '∞' }}</span>
                                     </div>
                                </div>
                                <div v-if="currentQ.min_words && wordCount < currentQ.min_words" class="flex items-center space-x-2 text-amber-500">
                                     <i class="pi pi-info-circle animate-pulse"></i>
                                     <span class="text-[9px] font-black uppercase tracking-widest">+{{ currentQ.min_words - wordCount }} Required</span>
                                </div>
                            </div>

                            <div class="relative group">
                                <div class="absolute inset-0 bg-brand-primary/5 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                <textarea v-model="answers[currentIndex].text_answer" 
                                          rows="14" 
                                          class="relative w-full rounded-[2.5rem] p-12 bg-slate-50/50 border-2 border-slate-100 text-xl font-medium leading-[1.8] text-slate-900 focus:border-brand-primary focus:bg-white outline-none transition-all resize-none shadow-inner"
                                          placeholder="Synthesize your institutional report here..."></textarea>
                            </div>
                            
                            <div class="bg-rose-50/30 p-8 rounded-[2rem] border border-rose-100/50 flex items-start space-x-6">
                                <div class="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-brand-primary shadow-sm flex-shrink-0"><i class="pi pi-bolt"></i></div>
                                <p class="text-[11px] font-bold text-slate-500 leading-relaxed italic opacity-80 uppercase tracking-tighter transition-opacity">
                                    Strategic Tip: Ensure your logical structure adheres to the provided rubric. Maintain high lexical diversity for maximum score density.
                                </p>
                            </div>
                        </div>

                        <!-- Footer: Two-Step Submit then Next -->
                        <div class="mt-24 pt-12 border-t border-slate-50">

                            <!-- STEP 1: Not yet submitted — show Submit button -->
                            <div v-if="!questionSubmitted" class="flex items-center justify-between">
                                <div class="flex flex-col">
                                    <span class="text-[8px] font-black text-slate-300 uppercase tracking-[0.4em] mb-1">Index Point</span>
                                    <div class="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] italic">
                                        سؤال <span class="text-brand-primary">{{ displayNumber }}</span> من <span class="text-slate-400">{{ displayTotal }}</span>
                                    </div>
                                </div>
                                <button @click="submitAnswer"
                                    :disabled="(!answers[currentIndex]?.option_id && !answers[currentIndex]?.text_answer) || !isWordCountValid"
                                    class="flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] ml-[0.3em] transition-all duration-500 shadow-[0_20px_50px_rgba(159,18,57,0.15)] hover:shadow-[0_25px_60px_rgba(159,18,57,0.25)] hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:shadow-none bg-brand-primary text-white">
                                    <i class="pi pi-check-circle text-base"></i>
                                    <span>تأكيد الإجابة</span>
                                </button>
                            </div>

                            <!-- STEP 2: Submitted — show Next or Finish -->
                            <div v-else class="flex items-center justify-between animate-in zoom-in-95 duration-500">
                                <div class="flex items-center gap-3 bg-emerald-50 text-emerald-600 border border-emerald-100 px-6 py-4 rounded-2xl shadow-sm">
                                    <div class="w-6 h-6 bg-emerald-500 text-white rounded-lg flex items-center justify-center text-[8px] animate-bounce"><i class="pi pi-check"></i></div>
                                    <span class="text-[10px] font-black uppercase tracking-[0.3em] ml-[0.3em]">Synapse Success</span>
                                </div>
                                <button @click="advanceQuestion" :disabled="isSubmittingBatch"
                                    :class="isLastQuestion
                                        ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700'
                                        : 'bg-brand-primary shadow-brand-primary/20'"
                                    class="flex items-center gap-4 px-12 py-5 rounded-[2rem] font-black text-[12px] uppercase tracking-[0.3em] ml-[0.3em] text-white shadow-2xl hover:-translate-y-1 active:scale-95 transition-all duration-500 disabled:opacity-50">
                                    <div v-if="isSubmittingBatch" class="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                                    <span>{{ isLastQuestion ? 'إنهاء المهارة ➜' : 'السؤال التالي ➜' }}</span>
                                </button>
                            </div>
                        </div>


                    </div>
                </div>

            </div>

        </div>

    </main>

    <!-- Global Sound Waves (Visual Only) -->
    <div v-if="!isStarting && currentQ" class="fixed bottom-0 left-0 w-full h-1 bg-slate-50 flex items-end pointer-events-none opacity-20">
         <div v-for="i in 100" :key="i" class="flex-1 bg-brand-primary" :style="{ height: `${Math.random() * 100}%`, transition: 'height 0.3s' }"></div>
    </div>
  </div>
</template>

<style scoped>
.prop-rtl { direction: rtl; }
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #f1f1f1;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>

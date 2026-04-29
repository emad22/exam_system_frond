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
const isDemo = ref(false);

// Timer State
const timeLeftSeconds = ref(0);
const timerInterval = ref(null);
const timerConfig = ref(null);

const formattedTime = computed(() => {
    if (timeLeftSeconds.value <= 0) return "00:00:00";
    const h = Math.floor(timeLeftSeconds.value / 3600);
    const m = Math.floor((timeLeftSeconds.value % 3600) / 60);
    const s = timeLeftSeconds.value % 60;
    if (h > 0) {
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
});

const startTimer = () => {
    // --- FIX: Direct check from localStorage to prevent race conditions ---
    const user = JSON.parse(localStorage.getItem('user'));
    const role = (user?.role || '').toLowerCase();
    if (['demo', 'deom', 'staff'].includes(role)) {
        isDemo.value = true;
        return; 
    }
    isDemo.value = false;
    if (!timerConfig.value) return;
    
    const config = timerConfig.value;
    
    // Use ONLY the per-skill duration logic as requested
    const limitMinutes = config.skillDuration;
    let createdStr = config.skillStartedAt;

    if (!createdStr || !limitMinutes) {
        // If there's no limit for this specific skill, don't show the timer
        return;
    }
    
    // Parse as UTC to avoid timezone issues
    if (!createdStr.endsWith('Z') && !createdStr.match(/[+-]\d{2}:\d{2}$/)) {
        createdStr += 'Z';
    }
    
    const startTime = new Date(createdStr).getTime();
    const limitMs = limitMinutes * 60 * 1000;
    
    const updateTime = () => {
        const now = new Date().getTime();
        const elapsed = now - startTime;
        const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));
        
        timeLeftSeconds.value = remaining;
        
        if (remaining <= 0) {
            clearInterval(timerInterval.value);
            
            // --- NEW: Skip auto-submission for Demo users ---
            if (isDemo.value) {
                console.log("Time expired, but skipping auto-submit for demo user.");
                return;
            }

            alert("Time is up! Your answers will be submitted automatically.");
            submitCurrentBatch();
        }
    };
    
    updateTime(); // Initial call
    if (timerInterval.value) clearInterval(timerInterval.value);
    timerInterval.value = setInterval(updateTime, 1000);
};

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
    startTimer();
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
            
            // Populate timer configuration
            timerConfig.value = {
                type: res.data.timer_type,
                globalLimit: res.data.time_limit,
                skillDuration: res.data.skill_duration,
                skillStartedAt: res.data.current_skill_started_at
            };
            
            answers.value = questions.value.map(q => {
                const base = {
                    question_id: q.id,
                    option_id: null,
                    text_answer: '',
                    recorded_file: null,
                    // Initialize ALL complex fields as empty/null to ensure reactivity
                    drag_drop_answers: [],
                    selected_words: [],
                    fill_blank_answers: [],
                    matching_answers: {},
                    ordering_answers: [],
                    highlight_answers: []
                };
                return base;
            });
            
            // Populate extra state based on type
            questions.value.forEach((q, idx) => {
                const content = q.content || '';
                if (q.type === 'drag_drop') {
                    // Support [target], [ ], or []
                    const slotCount = (content.match(/\[\s*target\s*\]|\[\s*\]/gi) || []).length;
                    answers.value[idx].drag_drop_answers = Array(slotCount).fill(null);
                } else if (q.type === 'word_selection' || q.type === 'click_word') {
                    answers.value[idx].selected_words = [];
                } else if (q.type === 'fill_blank') {
                    // Support [input], [ ], or []
                    const slotCount = (content.match(/\[\s*input\s*\]|\[\s*\]/gi) || []).length;
                    answers.value[idx].fill_blank_answers = Array(slotCount).fill('');
                } else if (q.type === 'matching') {
                    answers.value[idx].matching_answers = {};
                } else if (q.type === 'ordering') {
                    // Start with an empty sequence for the Sentence Builder UI
                    answers.value[idx].ordering_answers = [];
                } else if (q.type === 'highlight') {
                    answers.value[idx].highlight_answers = [];
                } else if (q.type === 'short_answer') {
                    answers.value[idx].text_answer = '';
                }
            });
        } else {
            errorMsg.value = res.data.error || "Module content empty.";
        }
    } catch (err) {
        if (err.response?.status === 404) {
            errorMsg.value = err.response?.data?.error || "No more questions available for this level.";
        } else {
            errorMsg.value = err.response?.data?.error || "Assessment segment unavailable.";
        }
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
    
    if (q.type === 'mcq' || q.type === 'true_false') {
        isValid = !!ans.option_id;
    } else if (q.type === 'speaking') {
        isValid = !!ans.recorded_file;
    } else if (q.type === 'drag_drop') {
        isValid = ans.drag_drop_answers.every(a => a !== null);
        if (isValid) {
            // Serialize to text_answer for backend
            ans.text_answer = JSON.stringify(ans.drag_drop_answers);
        }
    } else if (q.type === 'fill_blank') {
        isValid = ans.fill_blank_answers.every(a => a && a.trim().length > 0);
        if (isValid) ans.text_answer = JSON.stringify(ans.fill_blank_answers);
    } else if (q.type === 'matching') {
        const sourceCount = q.options.filter(o => o.is_correct).length;
        isValid = Object.keys(ans.matching_answers).length === sourceCount;
        if (isValid) ans.text_answer = JSON.stringify(ans.matching_answers);
    } else if (q.type === 'ordering') {
        // Must use all available words to be valid
        const requiredCount = q.options.length;
        isValid = ans.ordering_answers.length === requiredCount;
        if (isValid) ans.text_answer = JSON.stringify(ans.ordering_answers);
    } else if (q.type === 'highlight') {
        isValid = ans.highlight_answers.length > 0;
        if (isValid) ans.text_answer = JSON.stringify(ans.highlight_answers);
    } else if (q.type === 'short_answer') {
        isValid = ans.text_answer && ans.text_answer.trim().length > 0;
    } else if (q.type === 'click_word' || q.type === 'word_selection') {
        isValid = ans.selected_words.length > 0;
        if (isValid) ans.text_answer = JSON.stringify(ans.selected_words);
    } else {
        isValid = !!ans.text_answer;
    }

    if (!isValid) {
        alert('Please complete the task before proceeding.');
        return;
    }
    questionSubmitted.value = true;
};

// Word Selection Helpers
const getWords = (content) => {
    // Remove HTML tags for word splitting if necessary, or just use textContent
    const tmp = document.createElement("DIV");
    tmp.innerHTML = content;
    const text = tmp.textContent || tmp.innerText || "";
    return text.split(/\s+/).filter(w => w.length > 0);
};

const toggleWord = (word, qIdx) => {
    if (questionSubmitted.value) return;
    const ans = answers.value[qIdx];
    const index = ans.selected_words.indexOf(word);
    if (index === -1) ans.selected_words.push(word);
    else ans.selected_words.splice(index, 1);
};

// Drag & Drop Helpers
const onDragStart = (event, option) => {
    if (questionSubmitted.value) return;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('option', JSON.stringify(option));
};

const onDrop = (event, slotIdx, qIdx) => {
    if (questionSubmitted.value) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    
    try {
        const data = event.dataTransfer.getData('option');
        if (!data) return;
        const option = JSON.parse(data);
        const ans = answers.value[qIdx];
        
        // Update the specific slot with the dropped word
        ans.drag_drop_answers[slotIdx] = option.option_text;
    } catch (err) {
        console.error('Drop processing failed:', err);
    }
};

const clearSlot = (slotIdx, qIdx) => {
    if (questionSubmitted.value) return;
    answers.value[qIdx].drag_drop_answers[slotIdx] = null;
};

const parsedDragDropContent = (content) => {
    if (!content) return [];
    // Split by [target] or []
    return content.split(/\[\s*target\s*\]|\[\s*\]/gi);
};

const parsedFillBlankContent = (content) => {
    if (!content) return [];
    // Split by [input] or []
    return content.split(/\[\s*input\s*\]|\[\s*\]/gi);
};

// Matching Helpers
const selectedMatchSource = ref(null);
const toggleMatchSource = (sourceId) => {
    if (selectedMatchSource.value === sourceId) selectedMatchSource.value = null;
    else selectedMatchSource.value = sourceId;
};
const completeMatch = (targetText) => {
    if (!selectedMatchSource.value || isAlreadyMatched(targetText)) return;
    answers.value[currentIndex.value].matching_answers[selectedMatchSource.value] = targetText;
    selectedMatchSource.value = null;
};
const removeMatch = (sourceId) => {
    delete answers.value[currentIndex.value].matching_answers[sourceId];
};
const isAlreadyMatched = (targetText) => {
    return Object.values(answers.value[currentIndex.value].matching_answers).includes(targetText);
};
const getMatchingLeft = (q) => {
    return q.options.filter(o => o.option_text.includes('|')).map(o => ({
        id: o.id,
        option_text: o.option_text.split('|')[0].trim()
    }));
};
const getMatchingRight = (q) => {
    const targets = [];
    q.options.forEach(o => {
        if (o.option_text.includes('|')) {
            targets.push(o.option_text.split('|')[1].trim());
        } else {
            targets.push(o.option_text.trim());
        }
    });
    // Use the text as the ID for the targets list
    return [...new Set(targets)].map(t => ({ id: t, option_text: t }));
};
const getOptionText = (idOrText) => {
    const opt = questions.value[currentIndex.value].options.find(o => o.id == idOrText);
    if (opt && opt.option_text.includes('|')) return opt.option_text.split('|')[0].trim();
    return idOrText; // It's likely the target text already
};

// Ordering Helpers
const addToOrdering = (word) => {
    if (questionSubmitted.value) return;
    answers.value[currentIndex.value].ordering_answers.push(word);
};
const removeFromOrdering = (index) => {
    if (questionSubmitted.value) return;
    answers.value[currentIndex.value].ordering_answers.splice(index, 1);
};
const getAvailableWords = (q, qIdx) => {
    const allWords = q.options.map(o => o.option_text);
    const selectedWords = answers.value[qIdx].ordering_answers;
    
    // We need to handle duplicate words if they exist in the sentence
    // So we subtract the counts
    let pool = [...allWords];
    selectedWords.forEach(w => {
        const index = pool.indexOf(w);
        if (index > -1) pool.splice(index, 1);
    });
    return pool;
};

// Highlight Helpers
const toggleHighlight = (word, qIdx) => {
    if (questionSubmitted.value) return;
    const ans = answers.value[qIdx];
    const index = ans.highlight_answers.indexOf(word);
    if (index === -1) ans.highlight_answers.push(word);
    else ans.highlight_answers.splice(index, 1);
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
            
            // Complex types
            if (ans.selected_words && ans.selected_words.length > 0) {
                ans.selected_words.forEach((word, wIdx) => {
                    formData.append(`answers[${index}][selected_words][${wIdx}]`, word);
                });
            }
            if (ans.drag_drop_answers && ans.drag_drop_answers.length > 0) {
                ans.drag_drop_answers.forEach((val, vIdx) => {
                    formData.append(`answers[${index}][drag_drop_answers][${vIdx}]`, val || '');
                });
            }
            if (ans.fill_blank_answers && ans.fill_blank_answers.length > 0) {
                ans.fill_blank_answers.forEach((val, vIdx) => {
                    formData.append(`answers[${index}][fill_blank_answers][${vIdx}]`, val || '');
                });
            }
            if (ans.matching_answers && Object.keys(ans.matching_answers).length > 0) {
                formData.append(`answers[${index}][matching_answers]`, JSON.stringify(ans.matching_answers));
            }
            if (ans.ordering_answers && ans.ordering_answers.length > 0) {
                ans.ordering_answers.forEach((val, vIdx) => {
                    formData.append(`answers[${index}][ordering_answers][${vIdx}]`, val || '');
                });
            }
            if (ans.highlight_answers && ans.highlight_answers.length > 0) {
                ans.highlight_answers.forEach((val, vIdx) => {
                    formData.append(`answers[${index}][highlight_answers][${vIdx}]`, val || '');
                });
            }
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

const shouldShowQuestion = computed(() => {
    if (!currentQ.value) return false;
    const hasAudio = !!(currentQ.value.passage?.audio_url || currentQ.value.passage?.audio_path || currentQ.value.audio_url || currentQ.value.audio_path);
    if (hasAudio) {
        return hasListened.value;
    }
    return true; // Show immediately if no audio
});

const resolveUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    // Fallback: Use the base URL from the API service if the path is relative
    const baseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;
    const storageBase = baseUrl.replace('/api', '/storage');
    return `${storageBase}/${path.replace('storage/', '')}`;
};

const getSkillIcon = (name) => {
    name = name?.toLowerCase() || '';
    if (name.includes('listening')) return '🎧';
    if (name.includes('reading')) return '📖';
    if (name.includes('writing')) return '✍️';
    if (name.includes('speaking')) return '🗣️';
    return '🎯';
};

// Auto-play media when question changes and update progress
watch(currentQ, (newQ) => {
    if (newQ && newQ.id) {
        // Update last_seen_question_id in background
        api.post(`/attempts/${attemptId}/update-progress`, { question_id: newQ.id })
            .catch(err => console.warn('Progress update failed', err));
    }

    const mediaUrl = newQ?.passage?.media_url || newQ?.audio_url || newQ?.media_url;
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

onMounted(async () => {
    const user = JSON.parse(localStorage.getItem('user'));
    isDemo.value = user && ['demo', 'deom', 'staff'].includes(user.role?.toLowerCase());
    await fetchData();
});
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
                    <div v-if="!isDemo && timerConfig && timerConfig.skillDuration > 0" :class="['flex items-center space-x-4 px-4 py-1.5 rounded-lg border mr-6 transition-colors', timeLeftSeconds < 300 ? 'bg-rose-900/50 border-rose-500 text-rose-300 animate-pulse' : 'bg-slate-900/50 border-slate-700 text-white']">
                        <i class="pi pi-clock text-xs" :class="timeLeftSeconds < 300 ? 'text-rose-400' : 'text-slate-400'"></i>
                        <span class="text-lg font-black tabular-nums tracking-tighter">{{ formattedTime }}</span>
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

            <!-- Error State -->
            <div v-else-if="errorMsg" class="max-w-xl mx-auto py-32 text-center space-y-8">
                <div class="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2rem] flex items-center justify-center mx-auto text-3xl shadow-lg shadow-rose-100">
                    <i class="pi pi-exclamation-circle"></i>
                </div>
                <div class="space-y-2">
                    <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Institutional Alert</h2>
                    <p class="text-slate-500 font-medium leading-relaxed">{{ errorMsg }}</p>
                </div>
                <button @click="router.push('/dashboard')" 
                    class="px-10 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-brand-primary transition-all active:scale-95">
                    Return to Command Center
                </button>
            </div>

            <!-- Exam Split Screen -->
            <div v-else-if="currentQ" class="grid grid-cols-1 lg:grid-cols-12 gap-px bg-slate-300 border border-slate-300 shadow-lg min-h-[calc(100vh-100px)] animate-in fade-in duration-500 overflow-hidden">
                
                <!-- Left: Stimulus -->
                <div :class="shouldShowQuestion ? 'lg:col-span-7' : 'lg:col-span-12'" class="bg-white p-8 overflow-y-auto custom-scrollbar flex flex-col h-full transition-all duration-700">
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
                        <!-- 1. Passage Content (Stimulus) -->
                        <div v-if="currentQ.passage" class="space-y-8 mb-12 pb-12 border-b border-slate-100 border-dashed">
                            <h3 v-if="currentQ.passage.title" class="text-2xl font-black text-slate-900 tracking-tight leading-tight">{{ currentQ.passage.title }}</h3>
                            
                            <!-- Passage Image -->
                            <div v-if="currentQ.passage.image_url || currentQ.passage.image_path" class="w-full animate-in zoom-in-95 duration-500 mb-8">
                                <img :src="resolveUrl(currentQ.passage.image_url || currentQ.passage.image_path)" 
                                    class="w-full h-auto rounded-3xl shadow-xl border border-slate-100" alt="Passage Resource" />
                            </div>

                            <!-- Passage Media (Audio/Video/General) -->
                            <div v-if="currentQ.passage.audio_url || currentQ.passage.audio_path || currentQ.passage.media_url || currentQ.passage.media_path" 
                                class="bg-slate-50 p-8 border border-slate-200 rounded-3xl space-y-6 shadow-inner mb-8">
                                
                                <div class="flex items-center gap-4 mb-2">
                                    <div class="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-indigo-500">
                                        <i class="pi pi-volume-up"></i>
                                    </div>
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passage Resource Stream</span>
                                </div>

                                <audio v-if="(currentQ.passage.audio_url || currentQ.passage.audio_path) && !hasListened" 
                                    ref="audioRef" :src="resolveUrl(currentQ.passage.audio_url || currentQ.passage.audio_path)" 
                                    controls autoplay @play="isAudioPlaying = true" @pause="isAudioPlaying = false" @ended="hasListened = true" 
                                    class="w-full h-12 animate-in fade-in duration-500"></audio>
                                
                                <video v-if="(currentQ.passage.media_url || currentQ.passage.media_path) && (currentQ.passage.media_url || currentQ.passage.media_path).includes('.mp4')" 
                                    :src="resolveUrl(currentQ.passage.media_url || currentQ.passage.media_path)" 
                                    controls class="w-full rounded-2xl shadow-2xl"></video>
                            </div>

                            <div v-if="currentQ.passage.content" 
                                class="text-xl text-slate-700 leading-[2] font-serif text-justify ql-content rtl-support" 
                                v-html="currentQ.passage.content" dir="auto">
                            </div>
                        </div>

                        <!-- 2. Individual Question Media (Always check) -->
                        <div v-if="currentQ.image_url || currentQ.audio_url || currentQ.media_url || currentQ.image_path || currentQ.audio_path || currentQ.media_path" 
                            class="flex flex-col items-center justify-center py-12 space-y-8 h-full bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
                            
                            <!-- Question Specific Image -->
                            <div v-if="currentQ.image_url || currentQ.image_path" class="w-full max-w-xl px-6 animate-in zoom-in-95 duration-500">
                                <img :src="resolveUrl(currentQ.image_url || currentQ.image_path)" class="w-full h-auto rounded-3xl shadow-2xl border border-white" alt="Question Resource" />
                            </div>

                            <!-- Question Specific Audio -->
                            <div v-if="(currentQ.audio_url || currentQ.audio_path) && !hasListened" class="w-full max-w-md bg-white p-8 border border-slate-100 shadow-xl rounded-[2rem] space-y-4 animate-in fade-in duration-500">
                                <div class="flex items-center gap-3 mb-2">
                                    <i class="pi pi-microphone text-indigo-500"></i>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Question Audio Clip</span>
                                </div>
                                <audio ref="audioRef" :src="resolveUrl(currentQ.audio_url || currentQ.audio_path)" controls autoplay @play="isAudioPlaying = true" @pause="isAudioPlaying = false" @ended="hasListened = true" class="w-full h-12"></audio>
                            </div>

                            <!-- Question Specific Video -->
                            <div v-if="(currentQ.media_url || currentQ.media_path) && (currentQ.media_url || currentQ.media_path).includes('.mp4') && !hasListened" class="w-full max-w-xl px-6 animate-in fade-in duration-500">
                                <video :src="resolveUrl(currentQ.media_url || currentQ.media_path)" controls autoplay @ended="hasListened = true" class="w-full rounded-3xl shadow-2xl"></video>
                            </div>
                        </div>

                        <!-- 3. Placeholder (Only if NO passage AND NO media) -->
                        <div v-else-if="!currentQ.passage" class="flex flex-col items-center justify-center h-full space-y-6 py-20 bg-slate-50 border border-dashed border-slate-200 rounded transition-opacity duration-700">
                            <i class="pi pi-shield text-4xl text-slate-200"></i>
                            <div class="text-center space-y-2">
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Direct Engagement Protocol</p>
                                <p class="text-xs text-slate-300 font-medium italic">"Stand-alone evaluation phase. Focus on the prompt."</p>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Response -->
                <div v-if="shouldShowQuestion" class="lg:col-span-5 bg-white p-8 flex flex-col h-full border-l border-slate-200 shadow-inner animate-in slide-in-from-right-8 duration-700">
                    <div class="flex items-center space-x-2 mb-8 pb-4 border-b border-slate-100">
                        <i class="pi pi-pencil text-brand-primary"></i>
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Question Task</span>
                    </div>

                    <div class="flex-grow overflow-y-auto custom-scrollbar pr-4 space-y-8">
                        <div v-if="currentQ.content && !['fill_blank', 'drag_drop', 'word_selection', 'click_word', 'highlight', 'matching', 'ordering'].includes(currentQ.type)" 
                            class="text-2xl font-black text-slate-900 leading-tight ql-content rtl-support" 
                            v-html="currentQ.content" dir="auto">
                        </div>
                        <h3 v-else class="text-xl font-bold text-slate-900 leading-tight">
                            Academic Prompt Task
                        </h3>
                        <div class="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                            <div class="flex items-center gap-2 mb-1.5">
                                <i class="pi pi-question-circle text-brand-primary text-[10px]"></i>
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Task Instruction</span>
                            </div>
                            <p class="text-[11px] font-bold text-slate-600 leading-relaxed" dir="auto">
                                {{ currentQ.instructions || 'Carefully review the provided material and deliver your institutional response accordingly.' }}
                            </p>
                        </div>

                        <div class="pt-4 space-y-4">
                            <!-- MCQ -->
                            <div v-if="currentQ.type === 'mcq' || currentQ.type === 'true_false'" class="space-y-2">
                                <button v-for="(opt, oIdx) in currentQ.options" :key="opt.id"
                                    @click="answers[currentIndex].option_id = opt.id"
                                    :disabled="questionSubmitted"
                                    class="w-full p-6 rounded-[1.5rem] border-2 transition-all flex flex-row-reverse items-center gap-5 group"
                                    :class="answers[currentIndex].option_id === opt.id 
                                        ? 'border-brand-primary bg-indigo-50/30 ring-4 ring-indigo-500/5' 
                                        : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 bg-white shadow-sm'">
                                    
                                    <!-- Premium Radio Indicator (Now on the Right for RTL) -->
                                    <div class="w-10 h-10 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all shadow-sm"
                                        :class="answers[currentIndex].option_id === opt.id 
                                            ? 'bg-brand-primary border-brand-primary scale-110 shadow-lg shadow-indigo-200' 
                                            : 'bg-slate-50 border-slate-100 group-hover:border-slate-200'">
                                        <span v-if="answers[currentIndex].option_id !== opt.id" class="text-[10px] font-black text-slate-300">{{ String.fromCharCode(65 + oIdx) }}</span>
                                        <i v-else class="pi pi-check text-xs text-white"></i>
                                    </div>

                                    <span class="font-black text-slate-700 leading-snug text-lg grow text-right" dir="auto">{{ opt.option_text }}</span>

                                    <i v-if="answers[currentIndex].option_id === opt.id" class="pi pi-check-circle text-brand-primary animate-in zoom-in-50"></i>
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

                            <!-- Drag & Drop -->
                            <div v-if="currentQ.type === 'drag_drop'" class="space-y-8">
                                <div class="bg-slate-50 p-8 rounded-3xl border border-slate-200 leading-[2.8] text-lg font-medium text-slate-700 interactive-content-area rtl-support" dir="auto">
                                    <template v-for="(part, pIdx) in parsedDragDropContent(currentQ.content)" :key="pIdx">
                                        <span v-html="part"></span>
                                        <span v-if="pIdx < parsedDragDropContent(currentQ.content).length - 1"
                                            @dragover.prevent 
                                            @dragenter.prevent
                                            @drop="onDrop($event, pIdx, currentIndex)"
                                            class="inline-flex items-center justify-center min-w-[160px] h-11 mx-2 px-5 rounded-xl border-2 border-dashed transition-all relative top-2"
                                            :class="answers[currentIndex].drag_drop_answers[pIdx] 
                                                ? 'bg-indigo-50 border-brand-primary border-solid text-brand-primary font-black text-base shadow-sm' 
                                                : 'bg-white border-slate-300 shadow-inner text-2xl font-black text-slate-400 hover:border-brand-primary hover:bg-slate-50'">
                                            
                                            {{ answers[currentIndex].drag_drop_answers[pIdx] || '................' }}
                                            
                                            <button v-if="answers[currentIndex].drag_drop_answers[pIdx] && !questionSubmitted" 
                                                @click="clearSlot(pIdx, currentIndex)"
                                                class="absolute -top-2 -right-2 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[8px] shadow-sm">
                                                <i class="pi pi-times"></i>
                                            </button>
                                        </span>
                                    </template>
                                </div>

                                <div class="flex flex-wrap gap-3 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm">
                                    <div v-for="opt in currentQ.options" :key="opt.id"
                                        draggable="true" @dragstart="onDragStart($event, opt)"
                                        class="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-slate-600 cursor-grab active:cursor-grabbing hover:bg-brand-primary hover:text-white hover:border-brand-primary transition-all shadow-sm">
                                        {{ opt.option_text }}
                                    </div>
                                </div>
                            </div>

                            <!-- Word Selection -->
                            <div v-if="currentQ.type === 'word_selection' || currentQ.type === 'click_word'" class="space-y-6">
                                <div class="bg-white p-8 rounded-3xl border border-slate-100 flex flex-wrap gap-x-2 gap-y-1" dir="auto">
                                    <button v-for="(word, wIdx) in getWords(currentQ.content)" :key="wIdx"
                                        @click="toggleWord(word, currentIndex)"
                                        :disabled="questionSubmitted"
                                        class="px-1 py-0.5 rounded transition-all font-medium text-xl border-b-2"
                                        :class="answers[currentIndex].selected_words.includes(word)
                                            ? 'border-rose-500 text-rose-600 bg-rose-50'
                                            : 'border-transparent text-slate-700 hover:bg-slate-50 hover:border-slate-200'">
                                        {{ word }}
                                    </button>
                                </div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">
                                    "Select all elements that require institutional correction."
                                </p>
                            </div>

                            <!-- Fill in the Blank -->
                            <div v-if="currentQ.type === 'fill_blank'" class="space-y-6">
                                <div class="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200 leading-[2.8] text-xl font-medium text-slate-800 shadow-inner interactive-content-area rtl-support" dir="auto">
                                    <template v-for="(part, pIdx) in parsedFillBlankContent(currentQ.content)" :key="pIdx">
                                        <span v-html="part"></span>
                                        <input v-if="pIdx < parsedFillBlankContent(currentQ.content).length - 1"
                                            v-model="answers[currentIndex].fill_blank_answers[pIdx]"
                                            :disabled="questionSubmitted"
                                            type="text"
                                            class="inline-block w-36 h-9 mx-1 px-3 rounded-lg border-2 border-slate-200 bg-white focus:border-brand-primary outline-none transition-all text-brand-primary font-black text-center text-lg relative top-0.5 placeholder:text-slate-300 placeholder:text-xl"
                                            placeholder="...." />
                                    </template>
                                </div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">
                                    "Complete the technical passage with the correct academic terminology."
                                </p>
                            </div>

                            <!-- Matching -->
                            <div v-if="currentQ.type === 'matching'" class="space-y-10">
                                <div class="grid grid-cols-2 gap-10">
                                    <!-- Sources (Left Column) -->
                                    <div class="space-y-4">
                                        <div class="flex items-center gap-3 mb-6">
                                            <div class="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-black shadow-lg">1</div>
                                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Primary Matrix</h4>
                                        </div>
                                        <button v-for="opt in getMatchingLeft(currentQ)" :key="opt.id"
                                            @click="toggleMatchSource(opt.id)"
                                            :disabled="questionSubmitted"
                                            class="w-full p-5 rounded-2xl border-2 transition-all duration-300 text-base font-black text-slate-700 flex justify-between items-center group relative overflow-hidden"
                                            :class="selectedMatchSource === opt.id 
                                                ? 'border-brand-primary bg-indigo-50 shadow-xl shadow-indigo-100/50 -translate-y-1' 
                                                : (answers[currentIndex].matching_answers[opt.id] ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white hover:border-slate-300 hover:shadow-md')">
                                            
                                            <span class="relative z-10 text-right w-full" dir="auto">{{ opt.option_text }}</span>
                                            
                                            <div v-if="answers[currentIndex].matching_answers[opt.id]" class="shrink-0 ml-4 relative z-10 w-8 h-8 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-lg animate-in zoom-in-50">
                                                <i class="pi pi-check text-[10px]"></i>
                                            </div>
                                        </button>
                                    </div>

                                    <!-- Targets (Right Column) -->
                                    <div class="space-y-4">
                                        <div class="flex items-center gap-3 mb-6">
                                            <div class="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-[10px] font-black shadow-lg">2</div>
                                            <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Target Correlation</h4>
                                        </div>
                                        <button v-for="opt in getMatchingRight(currentQ)" :key="opt.id"
                                            @click="completeMatch(opt.id)"
                                            :disabled="questionSubmitted || !selectedMatchSource || isAlreadyMatched(opt.id)"
                                            class="w-full p-5 rounded-2xl border-2 transition-all duration-300 text-base font-black text-slate-700 text-right group"
                                            :class="isAlreadyMatched(opt.id) 
                                                ? 'bg-slate-50 border-slate-100 opacity-40 grayscale pointer-events-none' 
                                                : (selectedMatchSource ? 'border-brand-primary/30 bg-white hover:bg-brand-primary hover:text-white hover:border-brand-primary hover:-translate-y-1 shadow-sm' : 'border-slate-100 bg-white hover:border-slate-200')">
                                            <span dir="auto">{{ opt.option_text }}</span>
                                        </button>
                                    </div>
                                </div>

                                <!-- Connection Status Display -->
                                <div v-if="Object.keys(answers[currentIndex].matching_answers).length > 0" 
                                    class="p-8 bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div class="flex items-center justify-between mb-6">
                                        <div class="flex items-center gap-3">
                                            <i class="pi pi-link text-brand-primary"></i>
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Correspondences</span>
                                        </div>
                                        <span class="px-3 py-1 bg-brand-primary/20 text-brand-primary rounded-full text-[9px] font-black uppercase">
                                            {{ Object.keys(answers[currentIndex].matching_answers).length }} Linked
                                        </span>
                                    </div>
                                    <div class="flex flex-wrap gap-3">
                                        <div v-for="(targetId, sourceId) in answers[currentIndex].matching_answers" :key="sourceId"
                                            class="pl-4 pr-2 py-2 bg-slate-800/50 border border-slate-700 rounded-xl flex items-center gap-4 group hover:border-brand-primary/50 transition-colors">
                                            <span class="text-xs font-black text-white" dir="auto">{{ getOptionText(sourceId) }}</span>
                                            <i class="pi pi-arrow-right text-[8px] text-slate-600"></i>
                                            <span class="text-xs font-bold text-brand-primary" dir="auto">{{ getOptionText(targetId) }}</span>
                                            <button @click="removeMatch(sourceId)" v-if="!questionSubmitted" 
                                                class="w-6 h-6 rounded-lg flex items-center justify-center text-slate-500 hover:bg-rose-500 hover:text-white transition-all">
                                                <i class="pi pi-times text-[10px]"></i>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Ordering (Sentence/Paragraph Builder) -->
                            <div v-if="currentQ.type === 'ordering'" class="space-y-8">
                                <!-- Target Construction Area -->
                                <div class="bg-slate-50 p-8 rounded-[2.5rem] border-2 border-dashed border-slate-200 min-h-[160px] flex flex-wrap gap-3 items-center justify-center relative transition-all"
                                    :class="answers[currentIndex].ordering_answers.length > 0 ? 'bg-indigo-50/30 border-brand-primary/30' : ''">
                                    <div v-if="answers[currentIndex].ordering_answers.length === 0" class="text-slate-300 font-bold text-[10px] uppercase tracking-[0.2em] text-center">
                                        Tap words below to construct your response
                                    </div>
                                    <div class="flex flex-wrap gap-3 justify-center">
                                        <button v-for="(word, oIdx) in answers[currentIndex].ordering_answers" :key="oIdx"
                                            @click="removeFromOrdering(oIdx)"
                                            :disabled="questionSubmitted"
                                            class="px-5 py-3 bg-white border-2 border-brand-primary text-brand-primary font-black rounded-xl shadow-sm hover:bg-rose-50 hover:border-rose-200 hover:text-rose-500 transition-all animate-in zoom-in-75">
                                            {{ word }}
                                        </button>
                                    </div>
                                </div>

                                <!-- Word Bank (Scattered Words) -->
                                <div class="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm">
                                    <div class="flex items-center gap-3 mb-6">
                                        <i class="pi pi-th-large text-slate-300 text-xs"></i>
                                        <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Word Bank</h4>
                                    </div>
                                    <div class="flex flex-wrap gap-3 justify-center">
                                        <button v-for="(word, wIdx) in getAvailableWords(currentQ, currentIndex)" :key="wIdx"
                                            @click="addToOrdering(word)"
                                            :disabled="questionSubmitted"
                                            class="px-5 py-3 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-brand-primary hover:text-white hover:border-brand-primary hover:-translate-y-1 transition-all shadow-sm active:scale-95">
                                            {{ word }}
                                        </button>
                                    </div>
                                </div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">
                                    "Tap words in sequence to construct the institutional response."
                                </p>
                            </div>

                            <!-- Short Answer -->
                            <div v-if="currentQ.type === 'short_answer'" class="space-y-8 animate-in fade-in zoom-in-95 duration-500">
                                <div class="bg-white p-12 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col items-center gap-8">
                                    <div class="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg rotate-3 group-hover:rotate-0 transition-transform">
                                        <i class="pi pi-pencil text-white text-xl"></i>
                                    </div>
                                    <div class="text-center space-y-2">
                                        <h4 class="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Constructed Response</h4>
                                        <p class="text-slate-500 text-[11px] font-bold">Please provide a concise, accurate answer below.</p>
                                    </div>
                                    <div class="w-full max-w-md relative">
                                        <input v-model="answers[currentIndex].text_answer"
                                            :disabled="questionSubmitted"
                                            type="text"
                                            class="w-full px-8 py-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-xl font-black text-slate-800 text-center focus:bg-white focus:border-brand-primary focus:ring-4 focus:ring-brand-primary/10 outline-none transition-all placeholder:text-slate-200"
                                            placeholder="Type your answer here..."
                                            dir="auto" />
                                        <div class="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-white border border-slate-100 rounded-full text-[9px] font-black text-slate-400 shadow-sm uppercase tracking-widest">
                                            Alpha-Numeric Entry
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Highlight -->
                            <div v-if="currentQ.type === 'highlight'" class="space-y-6">
                                <div class="bg-white p-10 rounded-[2.5rem] border border-slate-100 leading-[2.2] text-xl font-medium text-slate-700 shadow-sm rtl-support" dir="auto">
                                    <template v-for="(word, wIdx) in getWords(currentQ.content)" :key="wIdx">
                                        <span @click="toggleHighlight(word, currentIndex)"
                                            :disabled="questionSubmitted"
                                            class="px-1 py-0.5 rounded cursor-pointer transition-all border-b border-transparent hover:border-slate-300"
                                            :class="answers[currentIndex].highlight_answers.includes(word)
                                                ? 'bg-yellow-200 text-slate-900 border-yellow-400 font-bold shadow-[0_2px_10px_rgba(253,224,71,0.4)]'
                                                : ''">
                                            {{ word }}
                                        </span>
                                        {{ ' ' }}
                                    </template>
                                </div>
                                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">
                                    "Identify and highlight the primary academic arguments within the passage."
                                </p>
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

.interactive-content-area :deep(*) {
    display: inline !important;
    margin: 0 !important;
    padding: 0 !important;
}
</style>

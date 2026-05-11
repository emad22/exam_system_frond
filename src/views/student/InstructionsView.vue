<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '@/services/api';
import StudentHeader from '@/components/StudentHeader.vue';

const route = useRoute();
const router = useRouter();
const examId = route.params.examId;
const skillId = route.params.skillId;
const levelId = route.params.levelId;

const skill = ref(null);
const isLoading = ref(true);

const fetchSkillData = async () => {
    isLoading.value = true;
    try {
        const res = await api.get(`/exams/${examId}`);
        const foundSkill = res.data.skills.find(s => String(s.id) === String(skillId));
        skill.value = foundSkill;
    } catch (err) {
        console.error('Failed to fetch skill instructions', err);
    } finally {
        isLoading.value = false;
    }
};

const startExam = () => {
    router.push({
        name: 'exam.setup',
        params: {
            examId,
            skillId,
            levelId
        }
    });
};

const goBack = () => {
    router.push('/skill-selection');
};

onMounted(fetchSkillData);

const skillMap = {
    'listening': 'Listening',
    'reading': 'Reading',
    'grammar': 'Structure',
    'structure': 'Structure',
    'writing': 'Writing',
    'speaking': 'Speaking'
};

const getSkillDisplayName = (name) => {
    if (!name) return 'Skill Assessment';
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(skillMap).find(key => lowerName.includes(key));
    return matchedKey ? skillMap[matchedKey] : name;
};

const SKILL_SPECIFIC_INSTRUCTIONS = {
    listening: {
        title: 'Listening Mastery',
        icon: 'pi-volume-up',
        rules: [
            {
                title: 'Audio Equipment',
                description: 'Use high-quality headphones for the best experience. Check your system volume now.',
                icon: 'pi-headphones'
            },
            {
                title: 'Single Playback',
                description: 'Most audio clips will play only once. Listen carefully and take notes if needed.',
                icon: 'pi-play'
            },
            {
                title: 'No Pausing',
                description: 'You cannot pause or rewind audio once it starts playing. Stay focused throughout.',
                icon: 'pi-lock'
            }
        ],
        tips: [
            'Read the questions before the audio starts.',
            'Focus on keywords and general meaning.',
            'Don\'t worry if you miss one word; keep listening.'
        ]
    },
    reading: {
        title: 'Reading Proficiency',
        icon: 'pi-book',
        rules: [
            {
                title: 'Passage Navigation',
                description: 'Scroll through the entire text. Questions may refer to any part of the passage.',
                icon: 'pi-arrows-v'
            },
            {
                title: 'Time Management',
                description: 'Don\'t spend too long on one difficult section. Move on and come back if possible.',
                icon: 'pi-clock'
            },
            {
                title: 'Context Clues',
                description: 'Use the surrounding text to understand unfamiliar vocabulary or complex ideas.',
                icon: 'pi-search'
            }
        ],
        tips: [
            'Skim the passage first to get the main idea.',
            'Read questions carefully to know what to look for.',
            'Look for synonyms of question keywords in the text.'
        ]
    },
    grammar: {
        title: 'Structure & Grammar',
        icon: 'pi-pencil',
        rules: [
            {
                title: 'Best Fit',
                description: 'Select the option that most naturally completes the sentence or fixes the error.',
                icon: 'pi-check-circle'
            },
            {
                title: 'Pace Yourself',
                description: 'Grammar questions are often shorter. Maintain a steady rhythm to save time.',
                icon: 'pi-bolt'
            },
            {
                title: 'Logical Review',
                description: 'Read the completed sentence to yourself to ensure it sounds grammatically correct.',
                icon: 'pi-refresh'
            }
        ],
        tips: [
            'Pay attention to subject-verb agreement.',
            'Identify the tense before choosing an answer.',
            'Eliminate obviously wrong options first.'
        ]
    },
    structure: {
        title: 'Structure & Grammar',
        icon: 'pi-pencil',
        rules: [
            {
                title: 'Best Fit',
                description: 'Select the option that most naturally completes the sentence or fixes the error.',
                icon: 'pi-check-circle'
            },
            {
                title: 'Pace Yourself',
                description: 'Grammar questions are often shorter. Maintain a steady rhythm to save time.',
                icon: 'pi-bolt'
            },
            {
                title: 'Logical Review',
                description: 'Read the completed sentence to yourself to ensure it sounds grammatically correct.',
                icon: 'pi-refresh'
            }
        ],
        tips: [
            'Pay attention to subject-verb agreement.',
            'Identify the tense before choosing an answer.',
            'Eliminate obviously wrong options first.'
        ]
    },
    writing: {
        title: 'Writing Excellence',
        icon: 'pi-file-edit',
        rules: [
            {
                title: 'Clear Structure',
                description: 'Organize your response with a clear introduction, body paragraphs, and conclusion.',
                icon: 'pi-list'
            },
            {
                title: 'Task Fulfillment',
                description: 'Ensure you address all parts of the prompt provided in the task description.',
                icon: 'pi-target'
            },
            {
                title: 'Final Proofread',
                description: 'Save 2-3 minutes at the end to check for spelling and punctuation errors.',
                icon: 'pi-eye'
            }
        ],
        tips: [
            'Plan your outline before you start typing.',
            'Use a variety of vocabulary and sentence structures.',
            'Stay within the recommended word count if provided.'
        ]
    },
    speaking: {
        title: 'Speaking Performance',
        icon: 'pi-microphone',
        rules: [
            {
                title: 'Environment Check',
                description: 'Ensure you are in a quiet room and your microphone is working correctly.',
                icon: 'pi-verified'
            },
            {
                title: 'Steady Delivery',
                description: 'Speak clearly and at a moderate pace. Do not rush your response.',
                icon: 'pi-volume-up'
            },
            {
                title: 'Recording Limits',
                description: 'Watch the timer. Your response must be completed before the recording ends.',
                icon: 'pi-stopwatch'
            }
        ],
        tips: [
            'Take a deep breath before starting.',
            'Use natural intonation and emphasis.',
            'If you make a mistake, just correct yourself and keep going.'
        ]
    },
    default: {
        title: 'Assessment Guidelines',
        icon: 'pi-info-circle',
        rules: [
            {
                title: 'Timed Environment',
                description: 'Each skill has a dedicated time limit. The timer starts when you click Begin.',
                icon: 'pi-clock'
            },
            {
                title: 'Honesty & Integrity',
                description: 'The system monitors activity. Please stay within the browser window.',
                icon: 'pi-eye'
            },
            {
                title: 'Progress Saving',
                description: 'Your answers are saved automatically as you progress through questions.',
                icon: 'pi-save'
            }
        ],
        tips: [
            'Read each question carefully.',
            'Manage your time wisely.',
            'Ensure a stable internet connection.'
        ]
    }
};

const getSkillSpecificInstructions = (name) => {
    if (!name) return SKILL_SPECIFIC_INSTRUCTIONS.default;
    const lowerName = name.toLowerCase();
    const matchedKey = Object.keys(SKILL_SPECIFIC_INSTRUCTIONS).find(key => lowerName.includes(key));
    return matchedKey ? SKILL_SPECIFIC_INSTRUCTIONS[matchedKey] : SKILL_SPECIFIC_INSTRUCTIONS.default;
};
</script>

<template>
    <div class="h-screen bg-[#F8FAFC] flex flex-col font-sans relative overflow-hidden">
        <StudentHeader />
        
        <!-- Decoration -->
        <div class="fixed inset-0 pointer-events-none">
            <div class="absolute -top-[10%] -left-[5%] w-[40%] h-[40%] bg-brand-primary/5 rounded-full blur-[120px]"></div>
            <div class="absolute bottom-[10%] -right-[5%] w-[30%] h-[30%] bg-brand-accent/5 rounded-full blur-[120px]"></div>
        </div>

        <main class="flex-grow flex items-center justify-center p-6 relative z-10 overflow-hidden">
            <div class="w-full max-w-5xl h-full max-h-[min(750px,calc(100vh-120px))] bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in fade-in zoom-in duration-700">
                <!-- Header Banner -->
                <div class="bg-slate-900 p-10 md:p-12 text-white relative overflow-hidden shrink-0">
                    <div class="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                    
                    <button @click="goBack" class="mb-6 flex items-center gap-2 text-white/60 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">
                        <i class="pi pi-arrow-left text-[8px]"></i> Back to Selection
                    </button>

                    <div class="flex items-center gap-6">
                        <div class="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-xl border border-white/10">
                            <i :class="['pi', getSkillSpecificInstructions(skill?.name).icon]"></i>
                        </div>
                        <div>
                            <h1 class="text-3xl font-black tracking-tight uppercase mb-1">{{ getSkillSpecificInstructions(skill?.name).title }}</h1>
                            <p class="text-white/50 font-bold text-[10px] uppercase tracking-widest">Crucial guidelines for your {{ getSkillDisplayName(skill?.name) }} assessment</p>
                        </div>
                    </div>
                </div>

                <!-- Instructions Content -->
                <div class="flex-grow p-10 md:p-12 overflow-y-auto custom-scrollbar">
                    <div v-if="isLoading" class="flex flex-col items-center py-12">
                        <div class="w-12 h-12 border-4 border-slate-100 border-t-brand-primary rounded-full animate-spin"></div>
                    </div>

                    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <!-- Left: Rules -->
                        <div class="space-y-8">
                            <div v-for="(rule, index) in getSkillSpecificInstructions(skill?.name).rules" :key="index" class="flex gap-6 animate-in slide-in-from-left duration-500" :style="{ animationDelay: `${index * 100}ms` }">
                                <div class="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center shrink-0">
                                    <i :class="['pi', rule.icon]"></i>
                                </div>
                                <div>
                                    <h3 class="text-xs font-black text-slate-800 uppercase tracking-tight mb-2">{{ rule.title }}</h3>
                                    <p class="text-[10px] font-medium text-slate-500 leading-relaxed uppercase">{{ rule.description }}</p>
                                </div>
                            </div>
                        </div>

                        <!-- Right: Tips -->
                        <div class="bg-slate-50/50 rounded-[2rem] p-8 border border-slate-100/50 animate-in slide-in-from-right duration-700">
                            <h3 class="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <i class="pi pi-sparkles"></i> Pro Tips for Success
                            </h3>
                            <ul class="space-y-4">
                                <li v-for="(tip, index) in getSkillSpecificInstructions(skill?.name).tips" :key="index" class="flex items-start gap-3">
                                    <div class="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-[8px] text-brand-primary border border-slate-100">
                                        {{ index + 1 }}
                                    </div>
                                    <p class="text-[10px] font-bold text-slate-600 uppercase leading-relaxed pt-0.5">
                                        {{ tip }}
                                    </p>
                                </li>
                            </ul>
                            
                            <div class="mt-10 p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                                <div class="flex items-center gap-3 mb-3">
                                    <div class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">System Ready</span>
                                </div>
                                <p class="text-[9px] font-bold text-slate-500 leading-relaxed uppercase">
                                    All technical requirements met. You are ready to start the {{ getSkillDisplayName(skill?.name) }} section.
                                </p>
                            </div>
                        </div>

                       
                    </div>
                </div>

                <!-- Footer Action -->
                <div class="p-10 md:p-12 border-t border-slate-50 bg-white shrink-0">
                    <div class="flex flex-col items-center">
                        <button @click="startExam"
                            class="group relative w-full max-w-md py-6 bg-brand-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.3em] shadow-2xl shadow-brand-primary/40 hover:bg-brand-primary/90 hover:shadow-brand-primary/60 hover:-translate-y-1 transition-all duration-300">
                            <span class="relative z-10 flex items-center justify-center gap-3">
                                Begin Assessment <i class="pi pi-play text-[10px] group-hover:translate-x-1 transition-transform"></i>
                            </span>
                        </button>
                        <p class="mt-4 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                            By clicking begin, you agree to the examination terms & conditions
                        </p>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}

.custom-scrollbar::-webkit-scrollbar {
    width: 4px;
}

.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}

.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #E2E8F0;
    border-radius: 10px;
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const route = useRoute();
const router = useRouter();
const attemptId = route.params.id;

const selectedAttempt = ref(null);
const loading = ref(true);

const fetchDetails = async () => {
    loading.value = true;
    try {
        const res = await api.get(`/admin/reports/${attemptId}`);
        selectedAttempt.value = res.data;
    } catch (err) {
        console.error('Failed to load attempt details', err);
    } finally {
        loading.value = false;
    }
};

const voidAttempt = async (id) => {
    if (!confirm('Are you sure you want to void this attempt? The student will be able to retake the exam.')) return;
    try {
        await api.post(`/admin/reports/${id}/reset`);
        alert('Attempt voided successfully.');
        router.push('/admin/reports');
    } catch (err) {
        alert('Failed to void attempt.');
    }
};

onMounted(fetchDetails);
</script>

<template>
  <AdminLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
            <div class="flex items-center gap-4">
                <Button icon="pi pi-arrow-left" text severity="secondary" @click="router.back()" class="rounded-xl bg-slate-50" />
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Student Journey Matrix</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Detailed level movement & response timeline</p>
                </div>
            </div>
            <div class="flex items-center space-x-3" v-if="selectedAttempt">
                 <Button label="Reset / Retry" severity="danger" outlined size="small" class="text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-xl" @click="voidAttempt(selectedAttempt.id)" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-40">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Fetching Identity Data...</p>
        </div>

        <div v-else-if="selectedAttempt" class="space-y-12">
            <!-- Summary Card -->
            <div class="bg-slate-900 rounded-[2.5rem] p-10 text-white grid grid-cols-1 md:grid-cols-3 gap-12 border border-slate-800 shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <i class="pi pi-chart-bar text-9xl"></i>
                </div>
                
                <div class="space-y-2">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Candidate Profile</p>
                    <p class="text-2xl font-black uppercase tracking-tight">
                        {{ selectedAttempt.student?.user?.first_name || selectedAttempt.user?.first_name || 'DEMO' }} 
                        {{ selectedAttempt.student?.user?.last_name || selectedAttempt.user?.last_name || 'USER' }}
                    </p>
                    <p class="text-[10px] font-bold text-slate-400 tracking-widest">{{ selectedAttempt.student?.student_code || 'STAFF_ACCOUNT' }}</p>
                </div>

                <div class="space-y-2">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Efficiency Index</p>
                    <div class="flex items-baseline gap-2">
                        <span class="text-5xl font-black italic tracking-tighter text-brand-primary">{{ selectedAttempt.overall_score }}</span>
                        <span class="text-xl font-black text-slate-500">%</span>
                    </div>
                </div>

                <div class="space-y-2">
                    <p class="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] mb-1">Execution Metrics</p>
                    <p class="text-xs font-black uppercase tracking-wider">{{ selectedAttempt.finished_at ? new Date(selectedAttempt.finished_at).toLocaleString() : 'N/A' }}</p>
                    <div class="mt-2">
                        <Tag :value="selectedAttempt.status" :severity="selectedAttempt.status === 'completed' ? 'success' : 'warning'" class="text-[9px] font-black uppercase px-3" />
                    </div>
                </div>
            </div>

            <!-- Detailed Skill Movement -->
            <div class="space-y-10">
                <div class="flex items-center gap-6">
                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Level Progression Matrix</h4>
                    <div class="flex-1 h-px bg-slate-100"></div>
                </div>
                
                <div v-for="skillResult in (selectedAttempt.attempt_skills || [])" :key="skillResult.id" class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm space-y-8">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-4">
                            <div class="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-sm border border-indigo-100">{{ skillResult.skill?.short_code || 'S' }}</div>
                            <div>
                                <h4 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ skillResult.skill?.name }}</h4>
                                <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Skill Domain Assessment</p>
                            </div>
                        </div>
                        <div class="text-right">
                             <div class="text-2xl font-black text-slate-800 italic">{{ skillResult.max_level_reached }}</div>
                             <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest">Peak Tier Reached</p>
                        </div>
                    </div>

                    <!-- Movement Timeline -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div v-for="log in (selectedAttempt.attempt_levels || []).filter(l => l.skill_id === skillResult.skill_id)" 
                            :key="log.id"
                            class="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 flex justify-between items-center transition-all hover:bg-white hover:shadow-md">
                            <div>
                                <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Level {{ log.level_number }}</p>
                                <div class="flex items-baseline gap-1">
                                    <span class="text-xl font-black italic" :class="log.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'">{{ log.score }}</span>
                                    <span class="text-[10px] font-black text-slate-400">%</span>
                                </div>
                            </div>
                            <div :class="log.status === 'passed' ? 'text-emerald-500 bg-emerald-100/50 border-emerald-100' : 'text-rose-500 bg-rose-100/50 border-rose-100'" 
                                 class="w-10 h-10 rounded-xl flex items-center justify-center text-sm border">
                                <i :class="log.status === 'passed' ? 'pi pi-check' : 'pi pi-times'"></i>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Detailed Response Timeline -->
            <div class="space-y-10 pt-10">
                <div class="flex items-center gap-6">
                    <h4 class="text-sm font-black text-slate-800 uppercase tracking-[0.2em]">Detailed Response Timeline</h4>
                    <div class="flex-1 h-px bg-slate-100"></div>
                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] bg-slate-50 px-4 py-2 rounded-full border border-slate-100">{{ selectedAttempt.answers?.length || 0 }} Questions Evaluated</span>
                </div>

                <div class="grid grid-cols-1 gap-6">
                    <div v-for="(answer, idx) in (selectedAttempt.answers || [])" :key="answer.id" 
                         class="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <div class="flex flex-col md:flex-row items-start gap-8">
                            <div class="w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-lg transition-transform group-hover:scale-110"
                                 :class="answer.is_correct ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-lg shadow-emerald-50' : 'bg-rose-50 text-rose-600 border border-rose-100 shadow-lg shadow-rose-50'">
                                {{ idx + 1 }}
                            </div>
                            <div class="grow space-y-6">
                                <div class="flex flex-col md:flex-row justify-between items-start gap-4">
                                    <div class="space-y-3">
                                        <div class="flex items-center gap-3">
                                            <Tag :value="answer.question?.skill?.name" class="text-[9px] font-black uppercase px-3 py-1 rounded-lg bg-slate-800 text-white border-none" />
                                            <Tag :value="answer.question?.type" severity="secondary" class="text-[9px] font-black uppercase px-3 py-1 rounded-lg" />
                                            <div v-if="answer.question?.passage" class="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100">
                                                <i class="pi pi-file text-[10px] text-indigo-500"></i>
                                                <span class="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Context: {{ answer.question.passage.title }}</span>
                                            </div>
                                        </div>
                                        <div class="text-base font-bold text-slate-700 leading-relaxed max-w-3xl" v-html="answer.question?.content"></div>
                                    </div>
                                    <div class="text-right flex-shrink-0 bg-slate-50 p-4 rounded-2xl border border-slate-100 min-w-[140px]">
                                        <div class="text-3xl font-black italic tracking-tighter" :class="answer.is_correct ? 'text-emerald-600' : 'text-rose-600'">
                                            +{{ answer.points_awarded }}
                                        </div>
                                        <div class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Efficiency Points</div>
                                    </div>
                                </div>

                                <!-- Comparison -->
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-50">
                                    <div class="p-6 rounded-3xl bg-slate-50 border border-slate-100 relative overflow-hidden">
                                        <div class="absolute top-0 right-0 p-4 opacity-5 text-4xl">
                                            <i class="pi pi-user"></i>
                                        </div>
                                        <p class="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mb-3">Student Input</p>
                                        <div class="text-sm font-black" :class="answer.is_correct ? 'text-emerald-700' : 'text-rose-700'">
                                            {{ answer.option?.option_text || answer.text_answer || 'â€”' }}
                                            <i v-if="answer.is_correct" class="pi pi-check-circle ml-2"></i>
                                            <i v-else class="pi pi-times-circle ml-2"></i>
                                        </div>
                                    </div>
                                    <div v-if="!answer.is_correct" class="p-6 rounded-3xl bg-emerald-50/50 border border-emerald-100 relative overflow-hidden">
                                        <div class="absolute top-0 right-0 p-4 opacity-10 text-4xl text-emerald-500">
                                            <i class="pi pi-key"></i>
                                        </div>
                                        <p class="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3">System Key</p>
                                        <div class="text-sm font-black text-emerald-800">
                                            {{ answer.question?.options?.find(o => o.is_correct)?.option_text || 'â€”' }}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-duration: 0.8s;
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
</style>

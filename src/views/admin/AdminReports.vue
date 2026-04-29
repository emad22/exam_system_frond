<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';

const attempts = ref([]);
const loading = ref(true);
const search = ref('');
const selectedAttempt = ref(null);
const showDetailModal = ref(false);
const detailLoading = ref(false);

const fetchReports = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/reports');
        attempts.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to load reports', err);
    } finally {
        loading.value = false;
    }
};

const viewDetails = async (id) => {
    detailLoading.value = true;
    showDetailModal.value = true;
    try {
        const res = await api.get(`/admin/reports/${id}`);
        selectedAttempt.value = res.data;
    } catch (err) {
        console.error('Failed to load attempt details', err);
    } finally {
        detailLoading.value = false;
    }
};

const voidAttempt = async (id) => {
    if (!confirm('Are you sure you want to void this attempt? The student will be able to retake the exam.')) return;
    try {
        await api.post(`/admin/reports/${id}/reset`);
        alert('Attempt voided successfully.');
        fetchReports();
        showDetailModal.value = false;
    } catch (err) {
        alert('Failed to void attempt.');
    }
};

const filtered = () => {
    if (!search.value) return attempts.value;
    const q = search.value.toLowerCase();
    return attempts.value.filter(a =>
        `${a.student?.user?.first_name} ${a.student?.user?.last_name}`.toLowerCase().includes(q) ||
        a.exam?.title?.toLowerCase().includes(q)
    );
};

const scoreColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
};

onMounted(fetchReports);
</script>

<template>
  <AdminLayout>
    <div class="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
        
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
            <div>
                <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Academic Registry</h1>
                <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Movement reports for completed evaluations</p>
            </div>
            <div class="flex items-center space-x-3">
                <span class="relative">
                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10 text-xs" />
                    <input v-model="search" type="text" placeholder="Filter identities..."
                        class="bg-slate-50 border border-slate-100 rounded-xl px-10 py-2.5 text-xs font-bold focus:bg-white transition-all w-64 outline-none">
                </span>
                <Button icon="pi pi-refresh" outlined severity="secondary" @click="fetchReports" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-40">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-8">Parsing Database History...</p>
        </div>

        <div v-else>
            <div v-if="filtered().length > 0" class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                <table class="w-full text-left">
                    <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[10px] font-black text-slate-400 tracking-wider">
                        <tr>
                            <th class="p-6">Institutional Identity</th>
                            <th class="p-6">Assessment Module</th>
                            <th class="p-6 text-center">Efficiency</th>
                            <th class="p-6 text-center">Status</th>
                            <th class="p-6 pr-8 text-right">Completion</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-50 text-sm">
                        <tr v-for="attempt in filtered()" :key="attempt.id" 
                            @click="viewDetails(attempt.id)"
                            class="hover:bg-slate-50/50 transition cursor-pointer group">
                            <td class="p-6 flex items-center gap-4">
                                <div class="w-11 h-11 rounded-2xl bg-brand-primary text-white flex items-center justify-center font-black text-xs shadow-lg shadow-rose-100 flex-shrink-0 group-hover:scale-110 transition-transform">
                                    {{ attempt.student?.user?.first_name?.[0] || 'S' }}
                                </div>
                                <div>
                                    <div class="font-black text-slate-800 uppercase tracking-tight">
                                        {{ attempt.student?.user?.first_name || attempt.user?.first_name || 'DEMO' }} 
                                        {{ attempt.student?.user?.last_name || attempt.user?.last_name || 'USER' }}
                                    </div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                        {{ attempt.student?.student_code || 'STAFF/DEMO' }}
                                    </div>
                                </div>
                            </td>
                            <td class="p-6">
                                <div class="font-bold text-slate-600">{{ attempt.exam?.title }}</div>
                                <div class="text-[9px] font-black text-brand-accent uppercase tracking-widest">Placement Protocol</div>
                            </td>
                            <td class="p-6 text-center">
                                <span :class="scoreColor(attempt.overall_score)" class="text-2xl font-black italic tracking-tighter">
                                    {{ attempt.overall_score !== null ? attempt.overall_score + '%' : 'â€”' }}
                                </span>
                            </td>
                            <td class="p-6 text-center">
                                <Tag :value="attempt.status" 
                                     :severity="attempt.status === 'completed' ? 'success' : 'warning'" 
                                     class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                            </td>
                            <td class="p-6 pr-8 text-right">
                                <div class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                    {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'PENDING' }}
                                </div>
                                <div class="text-[8px] font-bold text-emerald-500 uppercase tracking-tight" v-if="attempt.status === 'completed'">Validated Outcome</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div v-else class="bg-white rounded-[2.5rem] border border-slate-100 p-32 text-center shadow-sm">
                <div class="text-6xl mb-6 opacity-20 grayscale">📊</div>
                <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">No Evaluated Entities Found</h3>
                <p class="text-slate-400 font-bold mt-4 text-[10px] uppercase tracking-widest max-w-sm mx-auto">Reports will populate automatically upon successful completion of student placement assessments.</p>
            </div>
        </div>

        <!-- Detail Journey Modal -->
        <Dialog v-model:visible="showDetailModal" modal 
                class="rounded-[2.5rem] overflow-hidden border-none shadow-2xl"
                :style="{ width: '1000px' }">
            <template #header>
                <div class="flex flex-col">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Student Journey Matrix</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed level movement & response timeline</p>
                </div>
            </template>

            <div v-if="detailLoading" class="p-20 text-center flex flex-col items-center">
                <ProgressSpinner strokeWidth="4" />
                <p class="text-[10px] font-black text-slate-400 mt-8 uppercase tracking-widest">Fetching Identity Data...</p>
            </div>

            <div v-else-if="selectedAttempt" class="space-y-12 py-6">
                <!-- Summary Card -->
                <div class="bg-slate-900 rounded-3xl p-8 text-white grid grid-cols-2 md:grid-cols-4 gap-8">
                    <div>
                        <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Candidate</p>
                        <p class="text-xs font-black uppercase truncate">
                            {{ selectedAttempt.student?.user?.first_name || selectedAttempt.user?.first_name || 'DEMO' }} 
                            {{ selectedAttempt.student?.user?.last_name || selectedAttempt.user?.last_name || 'USER' }}
                        </p>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Efficiency Index</p>
                        <p class="text-xl font-black italic">{{ selectedAttempt.overall_score }}%</p>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Execution Date</p>
                        <p class="text-xs font-black uppercase">{{ selectedAttempt.finished_at ? new Date(selectedAttempt.finished_at).toLocaleString() : 'N/A' }}</p>
                    </div>
                    <div class="flex justify-end items-center">
                         <Button label="Reset / Retry" severity="danger" outlined size="small" class="text-[8px] font-black uppercase tracking-widest px-4" @click="voidAttempt(selectedAttempt.id)" />
                    </div>
                </div>

                <!-- Detailed Skill Movement -->
                <div class="space-y-10">
                    <div class="flex items-center gap-4">
                        <h4 class="text-sm font-black text-slate-800 uppercase tracking-wider">Level Progression Matrix</h4>
                        <div class="flex-1 h-px bg-slate-100"></div>
                    </div>
                    <div v-for="skillResult in (selectedAttempt.attempt_skills || [])" :key="skillResult.id" class="space-y-6">
                        <div class="flex items-center space-x-4">
                            <div class="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-black text-[10px]">{{ skillResult.skill?.short_code || 'S' }}</div>
                            <h4 class="text-xs font-black text-slate-600 uppercase tracking-wider">{{ skillResult.skill?.name }}</h4>
                            <Tag :value="'Max Level: ' + skillResult.max_level_reached" severity="secondary" class="text-[7px] font-black uppercase" />
                        </div>

                        <!-- Movement Timeline -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div v-for="log in (selectedAttempt.attempt_levels || []).filter(l => l.skill_id === skillResult.skill_id)" 
                                :key="log.id"
                                class="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-center transition-all">
                                <div>
                                    <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Level {{ log.level_number }}</p>
                                    <p class="text-sm font-black italic" :class="log.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'">{{ log.score }}%</p>
                                </div>
                                <div :class="log.status === 'passed' ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50'" 
                                     class="w-6 h-6 rounded-lg flex items-center justify-center text-[10px]">
                                    <i :class="log.status === 'passed' ? 'pi pi-check' : 'pi pi-times'"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Detailed Response Timeline -->
                <div class="space-y-8 pt-8 border-t border-slate-100">
                    <div class="flex items-center gap-4">
                        <h4 class="text-sm font-black text-slate-800 uppercase tracking-wider">Detailed Response Timeline</h4>
                        <div class="flex-1 h-px bg-slate-100"></div>
                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ selectedAttempt.answers?.length || 0 }} Questions Answered</span>
                    </div>

                    <div class="space-y-4">
                        <div v-for="(answer, idx) in (selectedAttempt.answers || [])" :key="answer.id" 
                             class="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                            <div class="flex items-start gap-6">
                                <div class="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center font-black text-xs"
                                     :class="answer.is_correct ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'">
                                    {{ idx + 1 }}
                                </div>
                                <div class="grow space-y-4">
                                    <div class="flex justify-between items-start">
                                        <div>
                                            <div class="flex items-center gap-2 mb-1">
                                                <Tag :value="answer.question?.type" severity="secondary" class="text-[8px] font-black uppercase px-2" />
                                                <span v-if="answer.question?.passage" class="text-[9px] font-black text-indigo-500 uppercase tracking-widest">Part of Passage: {{ answer.question.passage.title }}</span>
                                            </div>
                                            <div class="text-sm font-bold text-slate-700 leading-relaxed" v-html="answer.question?.content"></div>
                                        </div>
                                        <div class="text-right flex-shrink-0">
                                            <div class="text-lg font-black italic" :class="answer.is_correct ? 'text-emerald-600' : 'text-rose-600'">
                                                {{ answer.points_awarded }} Pts
                                            </div>
                                            <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest mt-1">Movement Index</div>
                                        </div>
                                    </div>

                                    <!-- Comparison -->
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                                        <div class="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Student Response</p>
                                            <div class="text-xs font-bold" :class="answer.is_correct ? 'text-emerald-700' : 'text-rose-700'">
                                                {{ answer.option?.option_text || answer.text_answer || 'â€”' }}
                                                <i v-if="answer.is_correct" class="pi pi-check-circle ml-1"></i>
                                                <i v-else class="pi pi-times-circle ml-1"></i>
                                            </div>
                                        </div>
                                        <div v-if="!answer.is_correct" class="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                                            <p class="text-[8px] font-black text-emerald-400 uppercase tracking-widest mb-2">Correct Key</p>
                                            <div class="text-xs font-bold text-emerald-800">
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
        </Dialog>
    </div>
  </AdminLayout>
</template>

<style scoped>
:deep(.p-dialog-content) {
    padding: 2rem;
}
</style>


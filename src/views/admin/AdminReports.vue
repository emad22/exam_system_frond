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
                                    <div class="font-black text-slate-800 uppercase tracking-tight">{{ attempt.student?.user?.first_name }} {{ attempt.student?.user?.last_name }}</div>
                                    <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ attempt.student?.student_code || 'UNCODED' }}</div>
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
                :style="{ width: '800px' }">
            <template #header>
                <div class="flex flex-col">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Student Journey Matrix</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Detailed level movement & exit points</p>
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
                        <p class="text-xs font-black uppercase truncate">{{ selectedAttempt.student?.user?.first_name }} {{ selectedAttempt.student?.user?.last_name }}</p>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Efficiency Index</p>
                        <p class="text-xl font-black italic">{{ selectedAttempt.overall_score }}%</p>
                    </div>
                    <div>
                        <p class="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Exit Point</p>
                        <p class="text-xs font-black uppercase">Level {{ selectedAttempt.attempt_skills?.[selectedAttempt.attempt_skills.length-1]?.max_level_reached || 'N/A' }}</p>
                    </div>
                    <div class="flex justify-end items-center">
                         <Button label="Reset / Retry" severity="danger" outlined size="small" class="text-[8px] font-black uppercase tracking-widest px-4" @click="voidAttempt(selectedAttempt.id)" />
                    </div>
                </div>

                <!-- Detailed Skill Movement -->
                <div class="space-y-10">
                    <div v-for="skillResult in selectedAttempt.attempt_skills" :key="skillResult.id" class="space-y-6">
                        <div class="flex items-center space-x-4">
                            <div class="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-black text-[10px]">{{ skillResult.skill?.short_code || 'S' }}</div>
                            <h4 class="text-sm font-black text-slate-800 uppercase tracking-wider">{{ skillResult.skill?.name }} Analysis</h4>
                            <div class="flex-1 h-px bg-slate-100"></div>
                            <Tag :value="'Level ' + skillResult.max_level_reached" severity="secondary" class="text-[8px] font-black uppercase" />
                        </div>

                        <!-- Movement Timeline -->
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div v-for="log in selectedAttempt.attempt_levels.filter(l => l.skill_id === skillResult.skill_id)" 
                                :key="log.id"
                                class="bg-slate-50 border border-slate-100 rounded-2xl p-5 group hover:bg-white hover:border-brand-primary/20 transition-all flex justify-between items-center">
                                <div>
                                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Level {{ log.level_number }}</p>
                                    <p class="text-base font-black italic" :class="log.status === 'passed' ? 'text-emerald-600' : 'text-rose-600'">{{ log.score }}%</p>
                                </div>
                                <div :class="log.status === 'passed' ? 'bg-emerald-500 shadow-emerald-100' : 'bg-rose-500 shadow-rose-100'" 
                                     class="w-8 h-8 rounded-xl flex items-center justify-center text-white shadow-lg text-[10px]">
                                    <i :class="log.status === 'passed' ? 'pi pi-check' : 'pi pi-times'"></i>
                                </div>
                            </div>
                            
                            <!-- Exit Indicator if failed -->
                            <div v-if="skillResult.status === 'failed'" 
                                 class="border-2 border-dashed border-rose-100 rounded-2xl p-5 flex flex-col items-center justify-center space-y-2 opacity-60">
                                <i class="pi pi-sign-out text-rose-300"></i>
                                <span class="text-[8px] font-black text-rose-400 uppercase tracking-widest">Exit Level {{ skillResult.max_level_reached }}</span>
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


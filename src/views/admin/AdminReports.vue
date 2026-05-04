<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import { useAdminStore } from '@/stores/admin';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();
const adminStore = useAdminStore();
const attempts = ref([]);
const loading = ref(true);
const search = ref('');

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

const viewDetails = (id) => {
    const isTeacher = adminStore.user?.role === 'teacher';
    const routeName = isTeacher ? 'teacher.reports.show' : 'admin.reports.show';
    
    router.push({ 
        name: routeName, 
        params: { id: id } 
    });
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
    </div>
  </AdminLayout>
</template>


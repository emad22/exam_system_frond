<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Card from 'primevue/card';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import Tabs from 'primevue/tabs';
import TabList from 'primevue/tablist';
import Tab from 'primevue/tab';
import TabPanels from 'primevue/tabpanels';
import TabPanel from 'primevue/tabpanel';

const route = useRoute();
const router = useRouter();

const loading = ref(true);
const selectedStudent = ref(null);
const skills = ref([]);
const packages = ref([]);
const studentId = route.params.id;

const loadData = async () => {
    loading.value = true;
    try {
        const [studentRes, pctRes, skillRes] = await Promise.all([
            api.get(`/admin/students/${studentId}`),
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ]);
        
        selectedStudent.value = studentRes.data;
        packages.value = pctRes.data;
        skills.value = skillRes.data;
    } catch (err) {
        console.error(err);
        alert('Failed to load student data');
        router.push('/admin/students');
    } finally {
        loading.value = false;
    }
};

const skillMastery = computed(() => {
    if (!selectedStudent.value?.attempts) return [];
    
    // Aggregate best results across all attempts
    const mastery = {};
    
    selectedStudent.value.attempts.forEach(attempt => {
        if (!attempt.attempt_skills) return;
        
        attempt.attempt_skills.forEach(as => {
            const skillId = as.skill_id;
            if (!mastery[skillId] || as.max_level_reached > mastery[skillId].max_level) {
                mastery[skillId] = {
                    name: as.skill?.name || 'Unknown',
                    short_code: as.skill?.short_code,
                    max_level: as.max_level_reached,
                    score: as.score,
                    status: as.status,
                    date: attempt.finished_at || attempt.created_at
                };
            }
        });
    });
    
    return Object.values(mastery);
});

const scoreColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-rose-600';
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <AdminLayout>
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
        </div>
        <div v-else class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4">
            
            <!-- Header section -->
            <div class="flex items-center justify-between bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/students')" />
                    <div>
                         <h1 class="text-2xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Institutional Identity</h1>
                         <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Unified performance view</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <Button icon="pi pi-pencil" label="Edit Profile" severity="secondary" outlined class="text-[10px] font-black uppercase tracking-widest px-6" @click="router.push(`/admin/students/${studentId}/edit`)" />
                    <Button icon="pi pi-refresh" label="Reload Data" text class="text-[10px] font-black uppercase tracking-widest" @click="loadData" />
                </div>
            </div>

            <Tabs value="0">
                <TabList class="bg-transparent border-none mb-8">
                    <Tab value="0" class="mr-4 group">
                        <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all group-aria-selected:bg-brand-primary group-aria-selected:text-white group-aria-selected:shadow-lg group-aria-selected:shadow-rose-100">
                            <i class="pi pi-user text-xs"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Registry Profile</span>
                        </div>
                    </Tab>
                    <Tab value="1" class="group">
                        <div class="flex items-center space-x-3 px-6 py-3 rounded-2xl transition-all group-aria-selected:bg-brand-primary group-aria-selected:text-white group-aria-selected:shadow-lg group-aria-selected:shadow-rose-100">
                            <i class="pi pi-chart-bar text-xs"></i>
                            <span class="text-[10px] font-black uppercase tracking-widest">Performance Matrix</span>
                        </div>
                    </Tab>
                </TabList>

                <TabPanels class="bg-transparent p-0">
                    <!-- Tab 1: Registry -->
                    <TabPanel value="0">
                        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div class="lg:col-span-2 space-y-8">
                                <Card class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden">
                                    <template #content>
                                        <div class="p-4 space-y-12">
                                            <!-- Core Info -->
                                            <div class="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-10 p-6 bg-slate-50/50 rounded-3xl border border-slate-100">
                                                <div class="w-24 h-24 rounded-3xl bg-slate-900 text-white flex items-center justify-center text-4xl font-black shadow-xl shrink-0">
                                                    {{ selectedStudent.user?.first_name?.[0] || 'S' }}
                                                </div>
                                                <div class="flex-1 space-y-4 text-center md:text-left">
                                                    <div class="space-y-1">
                                                        <p class="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">Candidate Name</p>
                                                        <h3 class="text-3xl font-black text-slate-800 tracking-tight uppercase">{{ selectedStudent.user?.first_name }} {{ selectedStudent.user?.last_name }}</h3>
                                                    </div>
                                                    <div class="flex flex-wrap items-center justify-center md:justify-start gap-4 pt-2">
                                                        <Tag :value="'CODE: ' + (selectedStudent.student_code || 'UNCODED')" severity="info" class="text-[8px] font-black uppercase tracking-widest px-3" />
                                                        <Tag :value="selectedStudent.user?.gender || 'N/A'" severity="secondary" class="text-[8px] font-black uppercase tracking-widest px-3" />
                                                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Born: {{ selectedStudent.user?.birth_date || 'Unknown' }}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <!-- Identity Grid -->
                                            <div class="grid grid-cols-1 md:grid-cols-2 gap-10 px-4">
                                                <div class="space-y-6">
                                                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                                        <i class="pi pi-phone mr-3"></i> Contact & Access
                                                    </h4>
                                                    <div class="grid grid-cols-1 gap-4">
                                                        <div v-for="(val, key) in { 'Digital Identifier': selectedStudent.user?.email, 'Contact Channel': selectedStudent.user?.phone || 'Not Configured', 'Parent Key': selectedStudent.parent_code || 'Direct Enrollment' }" :key="key" class="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                            <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{{ key }}</p>
                                                            <p class="text-xs font-bold text-slate-700 truncate" :title="val">{{ val }}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div class="space-y-6">
                                                    <h4 class="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                                                        <i class="pi pi-map-marker mr-3"></i> Localization
                                                    </h4>
                                                    <div class="bg-slate-50 p-6 rounded-2xl border border-slate-100 min-h-[140px] flex flex-col justify-center">
                                                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Registered Address</p>
                                                        <p class="text-sm font-bold text-slate-700 leading-relaxed">{{ selectedStudent.user?.address || 'Location data not available' }}</p>
                                                        <p class="text-xs font-black text-brand-primary uppercase mt-4 tracking-widest">{{ selectedStudent.user?.city || 'No City' }} / {{ selectedStudent.user?.country || 'Earth' }}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>

                            <div class="space-y-8">
                                <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden bg-slate-900 text-white">
                                    <template #content>
                                        <div class="p-6 space-y-8">
                                            <div class="flex items-center space-x-3">
                                                <div class="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white"><i class="pi pi-cog text-xs"></i></div>
                                                <h3 class="text-xs font-black uppercase tracking-widest">Configuration</h3>
                                            </div>
                                            <div class="space-y-4">
                                                <div v-for="(val, key) in { 'Curriculum': selectedStudent.package?.name || 'Standard', 'Protocol': selectedStudent.category?.name || 'Placement', 'Type': selectedStudent.student_type || 'Regular', 'Workflow': selectedStudent.not_adaptive ? 'Linear' : 'Adaptive' }" :key="key" class="flex justify-between items-center py-3 border-b border-white/10 last:border-0">
                                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">{{ key }}</span>
                                                    <span class="text-[10px] font-black uppercase text-indigo-300">{{ val }}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </template>
                                </Card>

                                <Card class="border border-slate-100 shadow-sm rounded-[2rem] overflow-hidden">
                                    <template #content>
                                        <div class="p-6 space-y-6">
                                            <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Enabled Modalities</p>
                                            <div class="flex flex-wrap gap-2">
                                                <Tag v-for="skillId in selectedStudent.assigned_skills" :key="skillId" :value="skills.find(s => s.id === skillId)?.name || skillId" severity="secondary" class="text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                                            </div>
                                        </div>
                                    </template>
                                </Card>
                            </div>
                        </div>
                    </TabPanel>

                    <!-- Tab 2: Performance (THE NEW DATA) -->
                    <TabPanel value="1">
                        <div class="space-y-12">
                            <!-- Skill Mastery Grid -->
                            <div class="space-y-6">
                                <div class="flex items-center justify-between px-4">
                                    <h4 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em] flex items-center">
                                        <i class="pi pi-verified-circle mr-3 text-emerald-500"></i> Skill Mastery Matrix
                                    </h4>
                                    <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Calculated exit points across all attempts</span>
                                </div>
                                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div v-for="mastery in skillMastery" :key="mastery.short_code" class="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm group hover:-translate-y-1 transition-all">
                                        <div class="flex justify-between items-start mb-6">
                                            <div class="w-10 h-10 rounded-xl bg-brand-primary/5 text-brand-primary flex items-center justify-center font-black text-xs">{{ mastery.short_code }}</div>
                                            <Tag :value="'Level ' + mastery.max_level" severity="info" class="text-[8px] font-black uppercase" />
                                        </div>
                                        <div class="space-y-1">
                                            <p class="text-lg font-black text-slate-800 tracking-tight uppercase leading-none">{{ mastery.name }}</p>
                                            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Highest Attainment</p>
                                        </div>
                                        <div class="mt-8 flex items-end justify-between">
                                            <span :class="scoreColor(mastery.score)" class="text-3xl font-black italic tracking-tighter">{{ mastery.score }}%</span>
                                            <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest text-right">
                                                Last Measured<br/>
                                                {{ new Date(mastery.date).toLocaleDateString() }}
                                            </div>
                                        </div>
                                    </div>
                                    <div v-if="!skillMastery.length" class="lg:col-span-4 bg-slate-50 rounded-3xl p-16 text-center border border-dashed border-slate-200">
                                         <p class="text-xs font-black text-slate-400 uppercase tracking-widest">No evaluation data recorded for this identity.</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Evaluation History Table -->
                            <div class="space-y-6">
                                <h4 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em] flex items-center px-4">
                                    <i class="pi pi-history mr-3 text-indigo-500"></i> Evaluation Session History
                                </h4>
                                <div class="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                    <table class="w-full text-left">
                                        <thead class="bg-slate-50/50 border-b border-slate-100 uppercase text-[9px] font-black text-slate-400 tracking-widest">
                                            <tr>
                                                <th class="p-6">Session ID</th>
                                                <th class="p-6">Assessment Module</th>
                                                <th class="p-6">Exit Points</th>
                                                <th class="p-6 text-center">Outcome</th>
                                                <th class="p-6 text-center">Status</th>
                                                <th class="p-6 pr-8 text-right">Completion Date</th>
                                            </tr>
                                        </thead>
                                        <tbody class="divide-y divide-slate-50 text-xs">
                                            <tr v-for="attempt in selectedStudent.attempts" :key="attempt.id" class="hover:bg-slate-50/50 transition cursor-default">
                                                <td class="p-6 font-black text-slate-400">#{{ attempt.id }}</td>
                                                <td class="p-6">
                                                    <div class="font-black text-slate-800 uppercase tracking-tight">{{ attempt.exam?.title }}</div>
                                                    <div class="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Placement Protocol</div>
                                                </td>
                                                <td class="p-6">
                                                    <div class="flex flex-wrap gap-2">
                                                        <Tag v-for="as in attempt.attempt_skills" :key="as.id" 
                                                            :value="`${as.skill?.short_code}: L${as.max_level_reached}`" 
                                                            severity="secondary" class="text-[7px] font-black px-2" />
                                                    </div>
                                                </td>
                                                <td class="p-6 text-center">
                                                    <span :class="scoreColor(attempt.overall_score)" class="text-xl font-black italic">
                                                        {{ attempt.overall_score !== null ? attempt.overall_score + '%' : 'â€”' }}
                                                    </span>
                                                </td>
                                                <td class="p-6 text-center">
                                                    <Tag :value="attempt.status" 
                                                         :severity="attempt.status === 'completed' ? 'success' : (attempt.status === 'voided' ? 'danger' : 'warning')" 
                                                         class="text-[8px] font-black uppercase tracking-widest px-3" />
                                                </td>
                                                <td class="p-6 pr-8 text-right font-black text-slate-400">
                                                    {{ attempt.finished_at ? new Date(attempt.finished_at).toLocaleDateString('en-GB') : 'Incomplete' }}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </TabPanel>
                </TabPanels>
            </Tabs>
        </div>
    </AdminLayout>
</template>

<style scoped>
:deep(.p-tab) {
    padding: 0;
    border: none;
    background: transparent;
}
:deep(.p-tab-list) {
    border: none;
}
:deep(.p-tabpanels) {
    padding: 0;
}
</style>


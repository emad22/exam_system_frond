<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Select from 'primevue/select';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Textarea from 'primevue/textarea';
import Toast from 'primevue/toast';
import Card from 'primevue/card';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';
import { useToast } from 'primevue/usetoast';

const route = useRoute();
const router = useRouter();
const toast = useToast();

const skills = ref([]);
const levels = ref([]);
const loading = ref(true);
const selectedSkill = ref(null);
const searchQuery = ref('');

// Form / Modal State
const showLevelModal = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);
const editingLevel = ref({
    skill_id: null,
    name: '',
    level_number: 1,
    min_score: 0,
    max_score: 100,
    pass_threshold: 70,
    instructions: '',
    is_active: true
});

const fetchData = async () => {
    loading.value = true;
    try {
        // Fetch skills and levels in parallel
        const [skillRes, levelRes] = await Promise.all([
            api.get('/admin/skills-with-levels'),
            api.get('/admin/levels')
        ]);
        
        skills.value = skillRes.data || [];
        levels.value = levelRes.data || [];

        // Auto-select skill if ID provided in route
        if (route.params.id) {
            const found = skills.value.find(s => s.id == route.params.id);
            if (found) selectedSkill.value = found;
        }
    } catch (err) {
        console.error('Failed to load data', err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to load levels data.' });
    } finally {
        loading.value = false;
    }
};

const getSkill = (skillId) => {
    return skills.value.find(s => s.id === skillId) || { name: 'Unknown', icon: '🧠' };
};

const filteredLevels = computed(() => {
    let result = levels.value;
    
    if (selectedSkill.value) {
        result = result.filter(l => l.skill_id === selectedSkill.value.id);
    }
    
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(l => {
            const skillName = getSkill(l.skill_id).name.toLowerCase();
            return l.name.toLowerCase().includes(query) || skillName.includes(query);
        });
    }
    
    return result;
});

const openAddModal = () => {
    isEditing.value = false;
    const skillId = selectedSkill.value?.id || null;
    const nextNum = skillId ? (filteredLevels.value.length + 1) : 1;
    
    editingLevel.value = {
        skill_id: skillId,
        name: `Level ${nextNum}`,
        level_number: nextNum,
        min_score: (nextNum - 1) * 10,
        max_score: nextNum * 10,
        pass_threshold: 70,
        instructions: '',
        is_active: true
    };
    showLevelModal.value = true;
};

const openEditModal = (level) => {
    isEditing.value = true;
    editingLevel.value = { ...level };
    showLevelModal.value = true;
};

const saveLevel = async () => {
    if (!editingLevel.value.skill_id) {
        toast.add({ severity: 'warn', summary: 'Required', detail: 'Please select a skill.' });
        return;
    }
    
    isSaving.value = true;
    try {
        if (isEditing.value) {
            await api.patch(`/admin/levels/${editingLevel.value.id}`, editingLevel.value);
            toast.add({ severity: 'success', summary: 'Updated', detail: 'Level updated successfully.' });
        } else {
            await api.post('/admin/levels', editingLevel.value);
            toast.add({ severity: 'success', summary: 'Created', detail: 'Level created successfully.' });
        }
        
        // Refresh levels list
        const levelRes = await api.get('/admin/levels');
        levels.value = levelRes.data;
        showLevelModal.value = false;
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to save level.' });
    } finally {
        isSaving.value = false;
    }
};

const deleteLevel = async (id) => {
    if (!confirm('Are you sure you want to delete this level globally?')) return;
    
    try {
        await api.delete(`/admin/levels/${id}`);
        levels.value = levels.value.filter(l => l.id !== id);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Level removed.' });
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete level.' });
    }
};

onMounted(fetchData);

// Update URL when skill changes to maintain deep linking if necessary, 
// but since this is a global page we can just reactive filter
watch(selectedSkill, (newVal) => {
    if (newVal) {
        // router.push(`/admin/skills/${newVal.id}/levels`); // Optional: update URL
    }
});
</script>

<template>
  <AdminLayout>
    <div class="animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
        <div class="flex flex-col md:flex-row items-start md:items-center justify-between mb-8">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Adaptive Level Manager</h1>
                 <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure difficulty matrices and mastery thresholds</p>
            </div>
            <div class="flex items-center space-x-3 mt-4 md:mt-0">
                <Button label="Initialize Level" icon="pi pi-plus" size="small" @click="openAddModal" />
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Level Matrix...</p>
        </div>

        <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
            <template #content>
            <DataTable :value="filteredLevels" 
                       stripedRows 
                       responsiveLayout="scroll" 
                       class="p-datatable-sm text-sm"
                       :paginator="true" :rows="10">
                
                <template #header>
                    <div class="flex flex-col md:flex-row justify-between items-center gap-4 p-2 pb-4">
                        <div class="flex items-center space-x-4 w-full md:w-auto">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest flex-shrink-0">Filter Skill</span>
                            <Select v-model="selectedSkill" :options="skills" optionLabel="name" placeholder="All Skills" 
                                     class="w-full md:w-64 shadow-sm rounded-xl border-slate-100" showClear />
                        </div>
                        <div class="w-full md:w-80">
                            <span class="relative">
                                <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                <InputText v-model="searchQuery" placeholder="Search level metadata..." class="pl-10 w-full shadow-sm rounded-xl border-slate-100" />
                            </span>
                        </div>
                    </div>
                </template>

                <Column field="level_number" header="#" style="width: 60px">
                    <template #body="slotProps">
                        <span class="font-black text-slate-400">#{{ slotProps.data.level_number }}</span>
                    </template>
                </Column>
                <Column header="Identity Module" style="min-width: 200px">
                    <template #body="slotProps">
                        <div class="flex items-center space-x-4">
                             <div class="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-xl shadow-sm border border-slate-100/50">
                                 {{ getSkill(slotProps.data.skill_id).icon }}
                             </div>
                             <div>
                                 <div class="font-black text-slate-700 uppercase tracking-tight">{{ getSkill(slotProps.data.skill_id).name }}</div>
                                 <div class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skill Association</div>
                             </div>
                        </div>
                    </template>
                </Column>
                <Column field="name" header="Designation" style="min-width: 150px">
                    <template #body="slotProps">
                        <span class="font-bold text-slate-600 tracking-tight">{{ slotProps.data.name }}</span>
                    </template>
                </Column>
                <Column header="Precision Range" style="width: 150px">
                    <template #body="slotProps">
                        <div class="flex items-center space-x-2">
                             <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black border border-indigo-100">{{ slotProps.data.min_score }}</span>
                             <span class="text-slate-200">/</span>
                             <span class="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-black border border-indigo-100">{{ slotProps.data.max_score }}</span>
                        </div>
                    </template>
                </Column>
                <Column header="Mastery Threshold" style="width: 150px">
                    <template #body="slotProps">
                        <div class="space-y-1.5">
                             <div class="flex justify-between items-center px-1">
                                 <span class="text-[9px] font-black text-indigo-400 uppercase">{{ slotProps.data.pass_threshold }}%</span>
                             </div>
                             <div class="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden p-0.5 border border-slate-50">
                                  <div class="bg-indigo-500 h-full rounded-full" :style="{ width: slotProps.data.pass_threshold + '%' }"></div>
                             </div>
                        </div>
                    </template>
                </Column>
                <Column header="Status" style="width: 100px">
                    <template #body="slotProps">
                        <Tag :value="slotProps.data.is_active ? 'Active' : 'Deactivated'"
                             :severity="slotProps.data.is_active ? 'success' : 'secondary'"
                             class="text-[9px] uppercase tracking-wider" />
                    </template>
                </Column>
                <Column header="Actions" style="width: 140px">
                    <template #body="slotProps">
                        <div class="flex items-center space-x-2">
                             <Button icon="pi pi-pencil" severity="warning" outlined rounded size="small" @click="openEditModal(slotProps.data)" />
                             <Button icon="pi pi-trash" severity="danger" outlined rounded size="small" @click="deleteLevel(slotProps.data.id)" />
                        </div>
                    </template>
                </Column>

                <template #empty>
                    <div class="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No configuration matrix found.</div>
                </template>
            </DataTable>
            </template>
        </Card>

        <!-- Level Editor Modal -->
        <Dialog v-model:visible="showLevelModal" :header="isEditing ? 'Modify Level Configuration' : 'Initialize New Level'" 
                class="max-w-xl w-full" modal>
            <div class="space-y-8 p-6">
                <div class="grid grid-cols-1 gap-6">
                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Skill Module</label>
                        <Select v-model="editingLevel.skill_id" :options="skills" optionValue="id" optionLabel="name" 
                                class="w-full text-sm font-bold" placeholder="Select Skill" />
                    </div>

                    <div class="grid grid-cols-2 gap-6">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                            <InputText v-model="editingLevel.name" class="w-full font-bold" />
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Level Number</label>
                            <InputNumber v-model="editingLevel.level_number" class="w-full" inputClass="font-black" />
                        </div>
                    </div>

                    <div class="grid grid-cols-3 gap-6">
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Score</label>
                            <InputNumber v-model="editingLevel.min_score" class="w-full" inputClass="font-bold" />
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Score</label>
                            <InputNumber v-model="editingLevel.max_score" class="w-full" inputClass="font-bold" />
                        </div>
                        <div class="space-y-2">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pass %</label>
                            <InputNumber v-model="editingLevel.pass_threshold" suffix="%" class="w-full" inputClass="font-black text-indigo-600" />
                        </div>
                    </div>

                    <div class="space-y-2">
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instructions</label>
                        <Textarea v-model="editingLevel.instructions" rows="3" class="w-full resize-none text-sm" placeholder="Guidance for student..." />
                    </div>

                    <div class="flex items-center space-x-4 pt-4 border-t border-slate-50">
                        <input type="checkbox" v-model="editingLevel.is_active" class="w-5 h-5 rounded">
                        <span class="text-xs font-black text-slate-600 uppercase tracking-widest">Active in Assessment Matrix</span>
                    </div>
                </div>

                <div class="pt-6 border-t border-slate-50 flex space-x-4">
                    <Button label="Cancel" severity="secondary" outlined class="flex-1" @click="showLevelModal = false" />
                    <Button :label="isSaving ? 'Saving...' : 'Commit Changes'" :loading="isSaving" class="flex-1" @click="saveLevel" />
                </div>
            </div>
        </Dialog>

        <Toast />
    </div>
  </AdminLayout>
</template>

<style scoped>
:deep(.p-datatable-thead > tr > th) {
    background: #f8fafc;
    color: #64748b;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: 1.5rem 1rem;
}

:deep(.p-datatable-tbody > tr) {
    transition: all 0.3s ease;
}

:deep(.p-datatable-tbody > tr:hover) {
    background: #f1f5f9 !important;
}

.premium-card {
    background: white;
    border-radius: 2.5rem;
    border: 1px solid #f1f5f9;
    box-shadow: 0 20px 25px -5px rgb(0 0 0 / 0.05), 0 8px 10px -6px rgb(0 0 0 / 0.05);
}
</style>

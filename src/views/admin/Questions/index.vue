<script setup>
import { ref, onMounted, computed } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import Tag from 'primevue/tag';
import Dialog from 'primevue/dialog';
import ProgressSpinner from 'primevue/progressspinner';
import Textarea from 'primevue/textarea';

const questions = ref([]);
const loading = ref(true);
const filterSkill = ref('');
const filterType = ref('');
const searchQuery = ref('');
const skills = ref([]);
const showInstructionsModal = ref(false);
const selectedSkillForInst = ref(null);
const selectedLevelForInst = ref(null);
const instructionsText = ref('');
const instructionsAudioFile = ref(null);
const isSavingInst = ref(false);
const skillsWithLevels = ref([]);

const deleteItem = async (id) => {
    if (!confirm('Are you certain you wish to purge this cognitive asset from the registry?')) return;
    try {
        await api.delete(`/admin/questions/${id}`);
        fetchData();
    } catch (err) {
        console.error('Purge failure', err);
    }
};

const fetchData = async () => {
    loading.value = true;
    try {
        const [qRes, sRes, slRes] = await Promise.all([
            api.get('/admin/questions'),
            api.get('/admin/skills'),
            api.get('/admin/skills-with-levels')
        ]);
        questions.value = qRes.data.data || qRes.data;
        skills.value = sRes.data;
        skillsWithLevels.value = slRes.data;
    } catch (err) {
        console.error('Failed to load', err);
    } finally {
        loading.value = false;
    }
};

const openInstructions = () => {
    showInstructionsModal.value = true;
    if (skillsWithLevels.value.length > 0) {
        selectedSkillForInst.value = skillsWithLevels.value[0];
        if (selectedSkillForInst.value.levels.length > 0) {
            selectLevel(selectedSkillForInst.value.levels[0]);
        }
    }
};

const selectLevel = (level) => {
    selectedLevelForInst.value = level;
    instructionsText.value = level.instructions || '';
    instructionsAudioFile.value = null;
};

const handleAudioUpload = (e) => {
    instructionsAudioFile.value = e.target.files[0];
};

const saveInstructions = async () => {
    if (!selectedLevelForInst.value) return;
    
    isSavingInst.value = true;
    const formData = new FormData();
    formData.append('_method', 'PATCH');
    formData.append('instructions', instructionsText.value);
    if (instructionsAudioFile.value) {
        formData.append('instructions_audio', instructionsAudioFile.value);
    }

    try {
        await api.post(`/admin/levels/${selectedLevelForInst.value.id}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert('Instructions saved successfully!');
        fetchData();
    } catch (err) {
        console.error('Failed to save instructions', err);
    } finally {
        isSavingInst.value = false;
    }
};

const getDifficultySeverity = (level) => {
    if (level <= 2) return 'success';
    if (level <= 4) return 'info';
    if (level <= 6) return 'warn';
    return 'danger';
};

const isAudio = (url) => {
    if (!url) return false;
    return url.match(/\.(mp3|wav|ogg|m4a)$/i);
};

const isImage = (url) => {
    if (!url) return false;
    return url.match(/\.(jpeg|png|jpg|gif|svg|webp)$/i);
};

const filteredQuestions = computed(() => {
    let filtered = questions.value;
    if (filterSkill.value) {
        filtered = filtered.filter(q => q.skill?.name === filterSkill.value);
    }
    if (filterType.value) {
        filtered = filtered.filter(q => q.type === filterType.value);
    }
    if (searchQuery.value) {
        const query = searchQuery.value.toLowerCase();
        filtered = filtered.filter(q => 
            q.content.toLowerCase().includes(query) || 
            (q.instructions && q.instructions.toLowerCase().includes(query)) ||
            (q.passage && q.passage.title && q.passage.title.toLowerCase().includes(query))
        );
    }
    return filtered;
});

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">
        
        <!-- Header Section -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">Item Foundry</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Registry of all cognitive assessment items</p>
            </div>
            <div class="flex items-center space-x-3">
                <Button label="Level Guides" icon="pi pi-cog" severity="secondary" outlined class="text-[10px] font-black uppercase tracking-widest px-6" @click="openInstructions" />
                <Button label="Batch Upload" icon="pi pi-file-excel" severity="secondary" outlined class="text-[10px] font-black uppercase tracking-widest px-6" />
                <Button label="Fabricate Item" icon="pi pi-plus" class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100 transition-all hover:-translate-y-1" @click="$router.push('/admin/questions/create')" />
            </div>
        </div>

        <!-- Filter HUD -->
        <div class="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-wrap gap-8 items-end">
             <!-- Search -->
             <div class="flex-1 min-w-[300px] space-y-3">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Content Filter</label>
                <div class="relative">
                    <i class="pi pi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 z-10"></i>
                    <InputText v-model="searchQuery" placeholder="Search by content fragments..." class="w-full pl-12 rounded-2xl bg-slate-50/50 focus:bg-white border-slate-100 font-bold" />
                </div>
             </div>

             <div class="flex items-center gap-6">
                <div class="flex flex-col space-y-3">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cognitive Skill</label>
                      <Select v-model="filterSkill" 
                            :options="[{name:'All Domains', value:''}, ...skills.map(s => ({name:s.name, value:s.name}))]" 
                            optionLabel="name" 
                            optionValue="value" 
                            class="w-44 rounded-2xl bg-slate-50/50 border-slate-100 font-bold text-xs" />
                </div>
                
                <div class="flex flex-col space-y-3">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Format Type</label>
                      <Select v-model="filterType" 
                            :options="[
                                {label:'All Modalities', value:''}, 
                                {label:'Choice (MCQ)', value:'mcq'}, 
                                {label:'True/False', value:'true_false'}, 
                                {label:'Constructed', value:'short_answer'},
                                {label:'Writing', value:'writing'},
                                {label:'Speaking', value:'speaking'},
                                {label:'Upload', value:'upload'}
                            ]" 
                            optionLabel="label" 
                            optionValue="value" 
                            class="w-48 rounded-2xl bg-slate-50/50 border-slate-100 font-bold text-xs" />
                </div>
             </div>
             
             <div class="ml-auto bg-slate-50 px-4 py-2 rounded-xl border border-slate-100">
                  <span class="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em]">Live Registry: {{ filteredQuestions.length }} Units</span>
             </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <ProgressSpinner />
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Question Matrix...</p>
        </div>

        <Card v-else class="border border-slate-100 shadow-sm rounded-[2.5rem] overflow-hidden mt-6">
            <template #content>
                <DataTable :value="filteredQuestions" dataKey="id" paginator :rows="10" 
                    class="p-datatable-sm text-sm" responsiveLayout="scroll">

                    <Column header="Institutional Asset" style="min-width: 500px">
                        <template #body="{ data }">
                            <div class="flex items-start space-x-6 py-5">
                                 <div class="flex flex-col items-center space-y-2 shrink-0">
                                     <div class="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center font-black border border-slate-100 shadow-sm text-xs">
                                         #{{ data.id }}
                                     </div>
                                     <div class="flex items-center space-x-1">
                                         <i v-if="data.passage" class="pi pi-book text-[10px] text-amber-500" title="Part of Passage"></i>
                                         <i v-if="data.media_url" class="pi pi-paperclip text-[10px] text-blue-500" title="Has Media"></i>
                                     </div>
                                 </div>
                                 <div class="space-y-4 flex-1">
                                      <div class="flex items-center gap-2 flex-wrap">
                                          <div v-if="data.passage" class="flex items-center gap-2 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">
                                              <span class="text-[8px] font-black text-amber-600 uppercase tracking-widest">Passage: {{ data.passage.title || 'Untitled' }}</span>
                                          </div>
                                          <Tag v-if="data.media_url && !isImage(data.media_url) && !isAudio(data.media_url)" value="DOCUMENT" icon="pi pi-file" severity="info" class="text-[8px] font-black px-2 py-0.5 rounded-full" />
                                      </div>
                                      
                                      <div class="flex items-start gap-4">
                                          <div v-if="data.media_url && isImage(data.media_url)" class="w-24 h-24 rounded-xl overflow-hidden border border-slate-100 shadow-sm shrink-0">
                                              <img :src="data.media_url" class="w-full h-full object-cover" />
                                          </div>
                                          <div class="space-y-2">
                                              <p class="font-black text-slate-800 tracking-tight leading-tight line-clamp-3 text-lg uppercase first-letter:capitalize">{{ data.content }}</p>
                                              <div v-if="data.media_url && isAudio(data.media_url)" class="pt-2">
                                                  <audio :src="data.media_url" controls class="h-6 w-48 opacity-80"></audio>
                                              </div>
                                          </div>
                                      </div>

                                      <p v-if="data.instructions" class="text-[10px] text-slate-400 font-bold italic line-clamp-1 border-l-2 border-slate-100 pl-3">"{{ data.instructions }}"</p>
                                      
                                      <div class="flex items-center space-x-3">
                                          <div class="flex items-center space-x-2 bg-slate-50 text-slate-500 px-3 py-1 rounded-lg border border-slate-100">
                                              <i class="pi pi-bookmark text-[10px]"></i>
                                              <span class="text-[9px] font-black uppercase tracking-widest">{{ data.skill?.name || 'GENERAL' }}</span>
                                          </div>
                                      </div>
                                 </div>
                            </div>
                        </template>
                    </Column>

                    <Column header="Precision Type" style="width: 150px">
                        <template #body="{ data }">
                            <Tag :value="data.type" severity="secondary" class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                        </template>
                    </Column>

                    <Column header="Mastery Rank" style="width: 140px">
                        <template #body="{ data }">
                            <div class="flex items-center">
                                <span :class="(data.level?.level_number || data.level_id) <= 3 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : ((data.level?.level_number || data.level_id) <= 6 ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-brand-primary border-brand-primary/10')" 
                                      class="px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm">
                                    L{{ data.level?.level_number || data.level_id }}
                                </span>
                            </div>
                        </template>
                    </Column>

                    <Column header="Weight" style="width: 100px" class="text-center">
                        <template #body="{ data }">
                             <div class="flex flex-col items-center">
                                 <div class="font-black text-slate-800 text-lg tracking-tighter">{{ data.points }}</div>
                                 <div class="text-[8px] font-black text-slate-300 uppercase tracking-widest">Score</div>
                             </div>
                        </template>
                    </Column>

                    <Column :exportable="false" style="width: 120px" class="text-right">
                        <template #body="{ data }">
                            <div class="flex items-center justify-end space-x-1">
                                <Button icon="pi pi-pencil" text severity="secondary" v-tooltip.top="'Modify Asset'" @click="$router.push(`/admin/questions/${data.id}/edit`)" />
                                <Button icon="pi pi-trash" text severity="danger" v-tooltip.top="'Purge from Registry'" @click="deleteItem(data.id)" />
                            </div>
                        </template>
                    </Column>
                    
                </DataTable>
            </template>
        </Card>

        <!-- Dynamic Registry Guide Modal -->
        <Dialog v-model:visible="showInstructionsModal" :header="'Operational Guide Protocols'" :style="{ width: '85vw', height: '85vh' }" maximizable modal class="rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
              <template #header>
                    <div class="flex flex-col">
                        <h3 class="text-2xl font-black text-slate-800 uppercase tracking-tight">Institutional Protocols</h3>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure automated guidance for mastery levels</p>
                    </div>
              </template>

              <div class="flex flex-col md:flex-row h-full w-full pt-4">
                  <!-- Sidebar Matrix -->
                  <div class="w-full md:w-72 bg-slate-50/50 border-r border-slate-50 flex flex-col p-8 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar rounded-3xl">
                       <div class="space-y-8">
                             <div v-for="skill in skillsWithLevels" :key="skill.id" class="space-y-4">
                                  <div class="flex items-center space-x-3">
                                      <div class="w-1.5 h-4 bg-brand-primary rounded-full"></div>
                                      <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">{{ skill.name }}</span>
                                  </div>
                                  <div class="grid grid-cols-3 gap-2">
                                       <button v-for="level in skill.levels" :key="level.id"
                                               @click="selectedSkillForInst = skill; selectLevel(level)"
                                               :class="selectedLevelForInst?.id === level.id ? 'bg-brand-primary text-white shadow-lg shadow-rose-100 scale-105' : 'bg-white text-slate-400 hover:bg-white hover:text-brand-primary hover:shadow-sm'"
                                               class="h-10 rounded-xl font-black text-[10px] transition-all border border-slate-50 shadow-sm flex items-center justify-center uppercase tracking-tighter">
                                           LV{{ level.level_number }}
                                       </button>
                                  </div>
                             </div>
                       </div>
                  </div>

                  <!-- Protocol Configuration Panel -->
                  <div class="flex-1 flex flex-col min-h-0 bg-white p-10 space-y-10 overflow-y-auto w-full no-scrollbar">
                       <div v-if="selectedLevelForInst" class="animate-in fade-in duration-500">
                            <div class="flex items-center justify-between mb-10 pb-6 border-b border-slate-50">
                                 <div>
                                      <h2 class="text-3xl font-black text-slate-800 tracking-tight uppercase leading-none">{{ selectedSkillForInst?.name }} • LV{{ selectedLevelForInst.level_number }} MATRIX</h2>
                                      <p class="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest italic opacity-80">Synchronizing operational metadata for this domain tier</p>
                                 </div>
                                 <div class="w-16 h-16 rounded-[1.5rem] bg-brand-primary/5 border border-brand-primary/10 flex items-center justify-center text-brand-primary">
                                     <i class="pi pi-cog text-2xl animate-spin-slow"></i>
                                 </div>
                            </div>

                            <div class="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                 <!-- Text Protocols -->
                                 <div class="space-y-4">
                                      <label class="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center ml-1">
                                          <i class="pi pi-align-left mr-3 text-brand-primary"></i> Textual Guidance Matrix
                                      </label>
                                      <Textarea v-model="instructionsText" autoResize rows="8" 
                                              placeholder="Initialize textual guidance protocols..." 
                                              class="w-full rounded-[2rem] border-slate-100 bg-slate-50/50 p-6 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-rose-50/50 focus:border-brand-primary/20 transition-all outline-none" />
                                 </div>

                                 <!-- Audio/Sonic Protocols -->
                                 <div class="space-y-4">
                                      <label class="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center ml-1">
                                          <i class="pi pi-volume-up mr-3 text-brand-accent"></i> Sonic Feedback Array
                                      </label>
                                      <div class="space-y-6">
                                           <div v-if="selectedLevelForInst.instructions_audio_url" class="p-6 bg-emerald-50/50 rounded-2xl flex flex-col space-y-4 border border-emerald-100/50 shadow-sm">
                                                <div class="flex items-center space-x-3">
                                                     <div class="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white"><i class="pi pi-check"></i></div>
                                                     <span class="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Active Sonic Asset Attached</span>
                                                </div>
                                                <audio :src="selectedLevelForInst.instructions_audio_url" controls class="h-10 w-full rounded-full bg-white"></audio>
                                           </div>
                                           <div class="relative group">
                                               <input type="file" @change="handleAudioUpload" accept="audio/*" 
                                                      class="block w-full text-[10px] font-black uppercase text-slate-400 file:mr-6 file:py-4 file:px-10 file:rounded-2xl file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-[0.2em] file:bg-brand-primary file:text-white hover:file:bg-brand-secondary transition-all cursor-pointer bg-slate-50 border border-slate-100 rounded-2xl" />
                                               <div class="mt-4 flex items-center space-x-2 px-2">
                                                   <i class="pi pi-info-circle text-[10px] text-slate-300"></i>
                                                   <p class="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-loose italic">Uploading a new sonic asset will overwrite the existing protocol in the institutional cloud.</p>
                                               </div>
                                           </div>
                                      </div>
                                 </div>
                            </div>
                       </div>
                  </div>
              </div>

              <template #footer>
                <div class="flex justify-end p-8 border-t border-slate-50 space-x-4 bg-slate-50/30">
                    <Button label="Discard Sessions" text severity="secondary" class="text-[10px] font-black uppercase tracking-widest" @click="showInstructionsModal = false" />
                    <Button label="Persist Configurations" :loading="isSavingInst" :disabled="!selectedLevelForInst" 
                            class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-10 shadow-lg shadow-rose-100" @click="saveInstructions" />
                </div>
              </template>
        </Dialog>
    </div>
  </AdminLayout>
</template>

<style scoped>
.animate-in {
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
}
:deep(.p-datatable-thead > tr > th) {
    background: #fbfcfe;
    border-bottom: 2px solid #f1f5f9;
    padding: 1.5rem 1rem;
    color: #94a3b8;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.2em;
}
:deep(.p-datatable-tbody > tr:hover) {
    background: #fbfcfe;
}
.animate-spin-slow {
    animation: rotate 8s linear infinite;
}
@keyframes rotate {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
</style>

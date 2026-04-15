<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Button from 'primevue/button';

const router = useRouter();

const currentPackage = ref({
    name: '',
    skills_count: 3,
    description: '',
    wp_package_id: '',
    exam_id: null,
    skills: []
});

const exams = ref([]);
const availableSkills = ref([]);
const isSaving = ref(false);

const fetchExamsAndSkills = async () => {
    try {
        const [examsRes, skillsRes] = await Promise.all([
            api.get('/admin/exams'),
            api.get('/admin/skills')
        ]);
        exams.value = examsRes.data.data ? examsRes.data.data : examsRes.data;
        availableSkills.value = skillsRes.data;
    } catch (err) {
        console.error('Failed to load data', err);
    }
};

const savePackage = async () => {
    if (!currentPackage.value.name) return;
    isSaving.value = true;
    try {
        await api.post('/admin/packages', currentPackage.value);
        router.push('/admin/packages');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to save package.');
    } finally {
        isSaving.value = false;
    }
};

onMounted(() => {
    fetchExamsAndSkills();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4 md:px-12 mt-6">
            <!-- Header -->
            <div class="flex items-center space-x-6">
                <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded @click="router.push('/admin/packages')" />
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight uppercase">Initialize New Package</h1>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure skill bundles</p>
                </div>
            </div>

            <div class="bg-white rounded-[3rem] p-10 shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100">
                <form @submit.prevent="savePackage" class="space-y-8">
                    <div class="grid grid-cols-1 gap-8">
                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Package Designation</label>
                            <InputText v-model="currentPackage.name" required
                                      placeholder="e.g. Adult Elite / Trial Plan" 
                                      class="w-full h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-700 uppercase px-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400" />
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Skill Capacity</label>
                                <InputNumber v-model="currentPackage.skills_count" 
                                            :min="1" :max="5" showButtons 
                                            buttonLayout="horizontal"
                                            class="w-full"
                                            pt:pcInput:class="h-14 w-full text-center bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-700 px-6 focus:ring-4 focus:ring-indigo-500/10" />
                            </div>
                            <div class="space-y-3">
                                <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">WP Integration Key</label>
                                <InputText v-model="currentPackage.wp_package_id" 
                                          placeholder="WooProductID" 
                                          class="w-full h-14 bg-slate-50 border-slate-100 rounded-2xl font-black text-slate-500 px-6 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400" />
                            </div>
                        </div>

                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Assigned Skills</label>
                            <div class="bg-slate-50 border border-slate-100 rounded-2xl p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                <div v-for="skill in availableSkills" :key="skill.id" class="flex items-center space-x-3">
                                    <input type="checkbox" :id="'skill-'+skill.id" :value="skill.id" v-model="currentPackage.skills" class="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500">
                                    <label :for="'skill-'+skill.id" class="text-xs font-bold text-slate-700 uppercase tracking-tight cursor-pointer">{{ skill.name }}</label>
                                </div>
                            </div>
                        </div>

                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Link Assessment Matrix (Exam)</label>
                            <select v-model="currentPackage.exam_id" class="w-full h-14 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 px-6 uppercase text-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-400 transition-all outline-none">
                                <option :value="null">No Linked Exam (Independent)</option>
                                <option v-for="exam in exams" :key="exam.id" :value="exam.id">
                                    [{{ exam.exam_type }}] {{ exam.title }}
                                </option>
                            </select>
                        </div>

                        <div class="space-y-3">
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Extended Narrative (Description)</label>
                            <textarea v-model="currentPackage.description" 
                                      rows="5"
                                      class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-6 text-xs text-slate-600 font-medium focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                                      placeholder="Describe the purpose of this skill bundle..."></textarea>
                        </div>
                    </div>

                    <div class="pt-8 border-t border-slate-50 flex justify-end space-x-4">
                        <Button label="Discard" outlined severity="secondary" @click="router.push('/admin/packages')" class="px-8 font-black text-[10px] uppercase tracking-widest" />
                        <Button :label="isSaving ? 'PERSISTING...' : 'INITIALIZE PACKAGE'" 
                                :loading="isSaving"
                                type="submit"
                                class="px-10 bg-indigo-600 border-none font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100 hover:-translate-y-1 transition-all" />
                    </div>
                </form>
            </div>
        </div>
    </AdminLayout>
</template>

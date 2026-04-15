<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Dialog from 'primevue/dialog';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Tag from 'primevue/tag';
import ProgressSpinner from 'primevue/progressspinner';

const router = useRouter();

const students = ref([]);
const packages = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const selectedStudents = ref([]);
const searchQuery = ref('');

// Bulk Skills State
const showBulkSkillsModal = ref(false);
const bulkEmails = ref('');
const bulkSkills = ref('');
const bulkFile = ref(null);
const fileInput = ref(null);
const isBulkSaving = ref(false);

const filteredStudents = computed(() => {
    if (!searchQuery.value) return students.value;
    const query = searchQuery.value.toLowerCase();
    return students.value.filter(s => {
        const name = `${s.user?.first_name || ''} ${s.user?.last_name || ''}`.toLowerCase();
        const email = (s.user?.email || '').toLowerCase();
        const code = (s.student_code || '').toLowerCase();
        return name.includes(query) || email.includes(query) || code.includes(query);
    });
});



const fetchStudents = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/students');
        students.value = res.data.data || res.data;
    } catch (err) {
        console.error('Failed to load students', err);
    } finally {
        loading.value = false;
    }
};

const fetchSkills = async () => {
    try {
        const res = await api.get('/admin/skills');
        skills.value = res.data;
    } catch (err) {
        console.error('Failed to load skills', err);
    }
};

const fetchPackages = async () => {
    try {
        const res = await api.get('/admin/packages');
        packages.value = res.data;
    } catch (err) {
        console.error('Failed to load packages', err);
    }
};

const openView = (student) => {
    router.push(`/admin/students/${student.id}/show`);
};

const openEdit = (student) => {
    router.push(`/admin/students/${student.id}/edit`);
};

const deleteStudent = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    if (!confirm(`Are you sure you want to permanently delete student: ${fullName}? This will also delete their User account and all exam history.`)) return;

    try {
        await api.delete(`/admin/students/${student.id}`);
        students.value = students.value.filter(s => s.id !== student.id);
        alert('Student successfully purged from system.');
    } catch (err) {
        alert('Failed to delete student.');
    }
};

const bulkDelete = async () => {
    if (!selectedStudents.value.length) return;
    if (!confirm(`Are you sure you want to delete ${selectedStudents.value.length} selected students? This action cannot be undone.`)) return;

    try {
        const ids = selectedStudents.value.map(s => s.id);
        await api.post('/admin/students/bulk-delete', { ids });
        students.value = students.value.filter(s => !ids.includes(s.id));
        selectedStudents.value = [];
        alert('Selected identities successfully deleted.');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to bulk delete students.');
    }
};





const handleFileUpload = (e) => {
    bulkFile.value = e.target.files[0];
};

const downloadExcelTemplate = async () => {
    try {
        const response = await api.get('/admin/students/bulk-skills-export', { responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'students_skills_template.xlsx');
        document.body.appendChild(link);
        link.click();
    } catch (err) {
        console.error('Download error:', err);
        alert('Failed to download template.');
    }
};

const submitBulkSkills = async () => {
    if (bulkFile.value) {
        // Upload via Excel
        const formData = new FormData();
        formData.append('file', bulkFile.value);
        isBulkSaving.value = true;
        
        try {
            const res = await api.post('/admin/students/bulk-skills-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert(res.data.message || 'Skills updated successfully from file.');
            showBulkSkillsModal.value = false;
            bulkFile.value = null;
            if (fileInput.value) fileInput.value.value = '';
            fetchStudents();
        } catch (err) {
            console.error('Import error:', err);
            alert(err.response?.data?.message || err.response?.data?.error || 'Failed to import file.');
        } finally {
            isBulkSaving.value = false;
        }
    } else {
        // Text based update
        if (!bulkEmails.value || !bulkSkills.value) {
            alert('Please provide either an Excel file OR emails and short codes.');
            return;
        }
        
        const emailsArray = bulkEmails.value.split(/[\s,]+/).map(e => e.trim()).filter(e => e);
        const skillsArray = bulkSkills.value.split(/[\s,]+/).map(s => s.trim().toLowerCase()).filter(s => s);

        if (emailsArray.length === 0 || skillsArray.length === 0) {
            alert('Invalid input format for emails or skills.');
            return;
        }

        isBulkSaving.value = true;
        try {
            const res = await api.post('/admin/students/bulk-skills', {
                emails: emailsArray,
                skills: skillsArray
            });
            
            alert(res.data.message || 'Skills updated successfully.');
            showBulkSkillsModal.value = false;
            bulkEmails.value = '';
            bulkSkills.value = '';
            fetchStudents();
        } catch (err) {
            console.error('Bulk skill error:', err);
            alert(err.response?.data?.message || err.response?.data?.error || 'Failed to update skills.');
        } finally {
            isBulkSaving.value = false;
        }
    }
};

const getSourceStyles = (source) => {
    switch (source) {
        case 'wordpress': return 'bg-blue-50 text-blue-600 border-blue-100';
        case 'batch': return 'bg-purple-50 text-purple-600 border-purple-100';
        default: return 'bg-slate-50 text-slate-500 border-slate-100';
    }
};

onMounted(() => {
    fetchStudents();
    fetchPackages();
    fetchSkills();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Students</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Lifecycle management
                        for registered entities</p>
                </div>
                <div class="flex items-center space-x-3">
                    <Button v-if="selectedStudents.length > 0" label="Delete Selected" :badge="selectedStudents.length.toString()" badgeSeverity="danger" icon="pi pi-trash" severity="danger" outlined size="small" @click="bulkDelete" />
                    <Button label="Bulk Skills" icon="pi pi-tags" severity="secondary" outlined size="small" @click="showBulkSkillsModal = true" />
                    <Button label="Bulk Import (XLS)" icon="pi pi-file-excel" severity="secondary" outlined size="small" @click="router.push('/admin/students/batch')" />
                    <Button label="Register Entity" icon="pi pi-plus" size="small" @click="router.push('/admin/students/create')" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database...</p>
            </div>

            <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredStudents" v-model:selection="selectedStudents" dataKey="id" paginator :rows="10" 
                        class="p-datatable-sm text-sm" responsiveLayout="scroll" :globalFilterFields="['user.first_name', 'user.email', 'student_code']">
                        
                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Search identities..." class="pl-10 w-full md:w-80 shadow-sm rounded-xl" />
                                </span>
                            </div>
                        </template>

                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>
                        
                        <Column header="Identity Info" style="min-width: 250px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                    <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center font-bold">
                                        {{ data.user?.first_name ? data.user.first_name[0] : 'S' }}
                                    </div>
                                    <div>
                                        <div @click="openView(data)" class="font-bold text-slate-700 hover:text-indigo-600 cursor-pointer">
                                            {{ data.user?.first_name }} {{ data.user?.last_name }}
                                        </div>
                                        <div class="text-xs text-slate-400 mt-0.5">
                                            {{ data.user?.email }} • {{ data.student_code || 'UNCODED' }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Subscription" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag v-if="data.package" :value="data.package.name" severity="info" class="text-[10px] uppercase tracking-wider" />
                                <span v-else class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Custom Asset</span>
                            </template>
                        </Column>

                        <Column header="Logic Mode (Category)" style="min-width: 140px">
                            <template #body="{ data }">
                                <Tag :value="data.category?.name || 'General'" 
                                     :severity="data.category?.slug === 'adult' ? 'success' : 'info'" 
                                     class="text-[10px] uppercase tracking-wider mb-1" />
                                <div v-if="data.not_adaptive" class="text-[9px] font-bold text-amber-500 uppercase tracking-tighter">Non-Adaptive</div>
                            </template>
                        </Column>

                        <Column header="Status" style="min-width: 120px">
                            <template #body="{ data }">
                                <Tag :value="data.registration_source" severity="secondary" rounded class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column header="Active" style="min-width: 100px">
                            <template #body="{ data }">
                                <Tag :value="data.user?.is_active ? 'Active' : 'Inactive'" :severity="data.user?.is_active ? 'success' : 'danger'" class="text-[10px] uppercase tracking-wider" />
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-2">
                                    <Button icon="pi pi-eye" outlined rounded severity="info" size="small" @click="openView(data)" />
                                    <Button icon="pi pi-pencil" outlined rounded severity="warning" size="small" @click="openEdit(data)" />
                                    <Button icon="pi pi-trash" outlined rounded severity="danger" size="small" @click="deleteStudent(data)" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div class="p-8 text-center text-slate-400">No identities found.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Modals Extracted -->

        <!-- Bulk Skills Modal -->
        <Dialog v-model:visible="showBulkSkillsModal" 
                header="BULK SKILL ASSIGNMENT" 
                class="max-w-xl w-full" 
                modal 
                pt:header:class="border-b border-slate-50 p-8"
                pt:content:class="p-8">
            <div class="space-y-6">
                
                <div class="bg-indigo-50 text-indigo-600 p-4 rounded-xl text-xs font-medium border border-indigo-100 flex gap-3">
                    <i class="pi pi-info-circle mt-0.5"></i>
                    <div>
                        Update module assignments either by pasting emails manually, OR by downloading the template, editing fields, and uploading it here.
                    </div>
                </div>

                <!-- File Upload Approach -->
                <div class="space-y-3 p-5 rounded-2xl border border-slate-200 bg-white">
                    <div class="flex items-center justify-between border-b border-slate-50 pb-3">
                        <label class="block text-[10px] font-black text-slate-800 uppercase tracking-widest">Excel Synced Update</label>
                        <Button label="Download Master Sheet" icon="pi pi-download" size="small" severity="info" outlined @click="downloadExcelTemplate" class="text-[10px] uppercase font-black" />
                    </div>
                    <div class="flex items-center space-x-4">
                        <div class="w-full relative">
                            <input type="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls,.csv"
                                class="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 transition-all border border-slate-100 rounded-xl bg-slate-50">
                        </div>
                    </div>
                    <p class="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
                        If a file is chosen, it overrides manual inputs below. Make sure columns match the exported template.
                    </p>
                </div>

                <div class="flex items-center space-x-4 w-full">
                    <div class="h-px bg-slate-100 w-full"></div>
                    <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest flex-shrink-0">OR PUSH MANUALLY</span>
                    <div class="h-px bg-slate-100 w-full"></div>
                </div>

                <div class="space-y-2 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Emails</label>
                    <textarea v-model="bulkEmails" 
                        class="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        placeholder="john@example.com, sara@example.com&#10;(comma, space, or newline separated)"></textarea>
                </div>

                <div class="space-y-2 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Module Mapping Keys (Short Codes)</label>
                    <input v-model="bulkSkills" type="text"
                        class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase text-indigo-600 focus:bg-white focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none"
                        placeholder="R, W, G (comma separated)">
                </div>

                <div class="pt-6 border-t border-slate-50 flex justify-end space-x-3">
                    <Button label="Cancel" outlined severity="secondary" @click="showBulkSkillsModal = false" class="px-8 font-black text-[10px] uppercase tracking-widest" />
                    <Button :label="isBulkSaving ? 'COMPILING...' : 'COMMIT BULK ASSIGNMENT'" 
                            :loading="isBulkSaving"
                            @click="submitBulkSkills" 
                            class="px-10 bg-indigo-600 border-none font-black text-[10px] uppercase tracking-widest" />
                </div>
            </div>
        </Dialog>

    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>

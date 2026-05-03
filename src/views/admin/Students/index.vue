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
    } catch (err) {
        alert('Failed to delete student.');
    }
};

const resetProgress = async (student) => {
    const fullName = `${student.user?.first_name} ${student.user?.last_name}`;
    if (!confirm(`CAUTION: Are you sure you want to reset all exam progress for ${fullName}? This will permanently delete their previous attempts and allow them to start fresh******.`)) return;

    try {
        await api.post(`/admin/students/${student.id}/reset`);
        alert('Candidate progress has been successfully reset.');
        fetchStudents();
    } catch (err) {
        alert(err.response?.data?.error || 'Failed to reset progress.');
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
        const formData = new FormData();
        formData.append('file', bulkFile.value);
        isBulkSaving.value = true;
        try {
            const res = await api.post('/admin/students/bulk-skills-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            showBulkSkillsModal.value = false;
            fetchStudents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to import file.');
        } finally {
            isBulkSaving.value = false;
        }
    } else {
        if (!bulkEmails.value || !bulkSkills.value) return;
        const emailsArray = bulkEmails.value.split(/[\s,]+/).map(e => e.trim()).filter(e => e);
        const skillsArray = bulkSkills.value.split(/[\s,]+/).map(s => s.trim().toLowerCase()).filter(s => s);
        isBulkSaving.value = true;
        try {
            await api.post('/admin/students/bulk-skills', {
                emails: emailsArray,
                skills: skillsArray
            });
            showBulkSkillsModal.value = false;
            fetchStudents();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update skills.');
        } finally {
            isBulkSaving.value = false;
        }
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
        <div class="space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-24 mt-8 px-4 md:px-12">

            <!-- Standardized Header -->
            <div
                class="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight lowercase first-letter:uppercase">
                        Candidate Registry</h1>
                    <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Lifecycle management
                        for registered entities</p>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <Button v-if="selectedStudents.length > 0" label="Purge Selected" icon="pi pi-trash"
                        severity="danger" class="text-[10px] font-black uppercase tracking-widest px-6"
                        @click="bulkDelete" />
                    <Button label="Bulk Skills" icon="pi pi-tags" severity="secondary" outlined
                        class="text-[10px] font-black uppercase tracking-widest px-6"
                        @click="showBulkSkillsModal = true" />
                    <Button label="Matrix Import" icon="pi pi-file-excel" severity="secondary" outlined
                        class="text-[10px] font-black uppercase tracking-widest px-6"
                        @click="router.push('/admin/students/batch')" />
                    <Button label="Register Entity" icon="pi pi-plus"
                        class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100 transition-all hover:-translate-y-1"
                        @click="router.push('/admin/students/create')" />
                </div>
            </div>

            <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
                <ProgressSpinner />
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Querying Database Matrix...
                </p>
            </div>

            <!-- Registry Table Card -->
            <Card v-else class="border border-slate-100 shadow-sm rounded-3xl overflow-hidden mt-6">
                <template #content>
                    <DataTable :value="filteredStudents" v-model:selection="selectedStudents" dataKey="id" paginator
                        :rows="10" class="p-datatable-sm text-sm" responsiveLayout="scroll">

                        <template #header>
                            <div class="flex justify-end p-2 pb-4">
                                <span class="relative">
                                    <i
                                        class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" />
                                    <InputText v-model="searchQuery" placeholder="Search identities..."
                                        class="pl-10 w-full md:w-80 shadow-sm rounded-xl border-slate-100 font-bold" />
                                </span>
                            </div>
                        </template>

                        <Column selectionMode="multiple" headerStyle="width: 3rem"></Column>

                        <Column header="Institutional Identity" style="min-width: 280px">
                            <template #body="{ data }">
                                <div class="flex items-center space-x-4">
                                    <div
                                        class="w-11 h-11 rounded-2xl bg-slate-50 text-brand-primary flex items-center justify-center font-black border border-slate-100">
                                        {{ data.user?.first_name ? data.user.first_name[0].toUpperCase() : 'S' }}
                                    </div>
                                    <div>
                                        <div @click="openView(data)"
                                            class="font-black text-slate-800 hover:text-brand-primary cursor-pointer uppercase tracking-tight transition-colors">
                                            {{ data.user?.first_name }} {{ data.user?.last_name }}
                                        </div>
                                        <div
                                            class="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">
                                            {{ data.user?.username || 'NO USERNAME' }} • {{ data.user?.email }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                        </Column>

                        <Column header="Subscription" style="min-width: 150px">
                            <template #body="{ data }">
                                <Tag v-if="data.package" :value="data.package.name" severity="info"
                                    class="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg" />
                                <span v-else
                                    class="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em] italic">Custom
                                    Asset</span>
                            </template>
                        </Column>

                        <Column header="Category" style="min-width: 150px">
                            <template #body="{ data }">
                                <div class="flex flex-col space-y-1">

                                    <div v-if="data.not_adaptive"
                                        class="text-[8px] font-black text-brand-accent uppercase tracking-tighter">
                                        Non-Adaptive</div>
                                </div>
                            </template>
                        </Column>



                        <Column header="Active" style="min-width: 100px" class="text-center">
                            <template #body="{ data }">
                                <i :class="data.user?.is_active ? 'pi pi-check-circle text-emerald-500' : 'pi pi-times-circle text-rose-300'"
                                    class="text-lg"></i>
                            </template>
                        </Column>

                        <Column :exportable="false" style="min-width: 180px" class="text-right">
                            <template #body="{ data }">
                                <div class="flex items-center justify-end space-x-2">
                                    <Button icon="pi pi-eye" text severity="info" size="small" @click="openView(data)"
                                        v-tooltip.top="'View Profile'" />
                                    <Button icon="pi pi-refresh" text severity="danger" size="small"
                                        @click="resetProgress(data)" v-tooltip.top="'Reset Exam Progress'" />
                                    <Button icon="pi pi-pencil" text severity="warning" size="small"
                                        @click="openEdit(data)" v-tooltip.top="'Edit Details'" />
                                    <Button icon="pi pi-trash" text severity="danger" size="small"
                                        @click="deleteStudent(data)" v-tooltip.top="'Delete Identity'" />
                                </div>
                            </template>
                        </Column>

                        <template #empty>
                            <div
                                class="p-12 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">
                                No candidate identities discovered.</div>
                        </template>
                    </DataTable>
                </template>
            </Card>
        </div>

        <!-- Bulk Skills Modal - Institutional Light mode -->
        <Dialog v-model:visible="showBulkSkillsModal" :header="'Institutional Sync • Bulk Mapping'"
            :style="{ width: '500px' }" modal class="rounded-[2.5rem] overflow-hidden border-none shadow-2xl">
            <template #header>
                <div class="flex flex-col">
                    <h3 class="text-xl font-black text-slate-800 uppercase tracking-tight">Institutional Sync</h3>
                    <p class="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Bulk module mapping
                        protocol</p>
                </div>
            </template>

            <div class="pt-6 space-y-8">

                <div
                    class="bg-rose-50/50 border border-brand-primary/10 p-5 rounded-2xl text-[10px] font-bold text-brand-primary leading-relaxed uppercase tracking-wider">
                    <i class="pi pi-info-circle mr-2"></i>
                    Update module assignments either by pasting emails or usernames manually, OR by uploading the master sheet.
                </div>

                <div class="space-y-6">
                    <div
                        class="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex flex-col items-center space-y-4">
                        <Button label="Master Sheet Template" icon="pi pi-download" size="small" text
                            @click="downloadExcelTemplate"
                            class="text-[10px] uppercase font-black tracking-widest text-brand-primary" />
                        <input type="file" ref="fileInput" @change="handleFileUpload" accept=".xlsx,.xls,.csv"
                            class="w-full text-[10px] font-black uppercase text-slate-400 file:bg-brand-primary file:text-white file:border-none file:rounded-xl file:px-4 file:py-2 file:mr-4 file:cursor-pointer">
                    </div>

                    <div class="relative flex items-center justify-center">
                        <div class="absolute inset-0 flex items-center px-4">
                            <div class="w-full border-t border-slate-100"></div>
                        </div>
                        <span
                            class="relative bg-white px-4 text-[9px] font-black text-slate-300 uppercase tracking-widest">Manual
                            Override</span>
                    </div>

                    <div class="space-y-4">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Access (Emails or Usernames)</label>
                            <textarea v-model="bulkEmails" 
                                class="w-full h-24 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none no-scrollbar shadow-sm"
                                placeholder="E.G. JOHN@DOMAIN.COM OR USERNAME123..."></textarea>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mapping
                                Short
                                Codes</label>
                            <input v-model="bulkSkills" type="text"
                                class="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-black uppercase text-brand-primary focus:bg-white focus:border-brand-primary/20 focus:ring-4 focus:ring-rose-50/50 transition-all outline-none shadow-sm"
                                placeholder="E.G. R, W, G">
                        </div>
                    </div>
                </div>
            </div>

            <template #footer>
                <div class="flex justify-end pt-6 border-t border-slate-50 space-x-3">
                    <Button label="Discard" outlined severity="secondary"
                        class="text-[10px] font-black uppercase tracking-widest px-8"
                        @click="showBulkSkillsModal = false" />
                    <Button :label="isBulkSaving ? 'SYNCING...' : 'COMMIT SYNC'" :loading="isBulkSaving"
                        class="bg-brand-primary border-none text-[10px] font-black uppercase tracking-widest px-8 shadow-lg shadow-rose-100"
                        @click="submitBulkSkills" />
                </div>
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
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
</style>

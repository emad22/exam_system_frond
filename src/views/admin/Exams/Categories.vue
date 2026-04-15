<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';
import Button from 'primevue/button';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Tag from 'primevue/tag';
import ToggleSwitch from 'primevue/toggleswitch';
import { useToast } from 'primevue/usetoast';
import Toast from 'primevue/toast';

const toast = useToast();
const categories = ref([]);
const loading = ref(true);
const showModal = ref(false);
const isEditing = ref(false);
const isSaving = ref(false);

const form = ref({
    id: null,
    name: '',
    description: '',
    is_active: true
});

const fetchCategories = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/exam-categories');
        categories.value = res.data;
    } catch (err) {
        console.error('Failed to load categories', err);
        toast.add({ severity: 'error', summary: 'Error', detail: 'Could not load categories.' });
    } finally {
        loading.value = false;
    }
};

const openAddModal = () => {
    isEditing.value = false;
    form.value = { id: null, name: '', description: '', is_active: true };
    showModal.value = true;
};

const openEditModal = (cat) => {
    isEditing.value = true;
    form.value = { ...cat };
    showModal.value = true;
};

const saveCategory = async () => {
    if (!form.value.name) return;
    
    isSaving.value = true;
    try {
        if (isEditing.value) {
            await api.patch(`/admin/exam-categories/${form.value.id}`, form.value);
            toast.add({ severity: 'success', summary: 'Updated', detail: 'Category updated successfully.' });
        } else {
            await api.post('/admin/exam-categories', form.value);
            toast.add({ severity: 'success', summary: 'Created', detail: 'New category added.' });
        }
        showModal.value = false;
        fetchCategories();
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Error', detail: err.response?.data?.message || 'Operation failed.' });
    } finally {
        isSaving.value = false;
    }
};

const deleteCategory = async (id) => {
    if (!confirm('Are you sure you want to delete this category? This will fail if exams are linked to it.')) return;
    
    try {
        await api.delete(`/admin/exam-categories/${id}`);
        toast.add({ severity: 'success', summary: 'Deleted', detail: 'Category removed.' });
        fetchCategories();
    } catch (err) {
        console.error(err);
        toast.add({ severity: 'error', summary: 'Deletion Failed', detail: err.response?.data?.message || 'Check for linked exams.' });
    }
};

onMounted(fetchCategories);
</script>

<template>
    <AdminLayout>
        <Toast />
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
            <!-- Header -->
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                    <h1 class="text-3xl font-black text-slate-800 tracking-tight">Exam Categories</h1>
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Manage educational tiers and age groups</p>
                </div>
                <Button label="Add Category" icon="pi pi-plus" size="small" @click="openAddModal" />
            </div>

            <!-- Table Card -->
            <div class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_32px_120px_rgba(0,0,0,0.02)] overflow-hidden">
                <DataTable :value="categories" :loading="loading" class="p-datatable-sm" responsiveLayout="scroll">
                    <Column field="name" header="NAME" style="min-width: 200px">
                        <template #body="{ data }">
                            <div class="flex items-center space-x-3">
                                <div class="w-2 h-8 bg-indigo-600 rounded-full"></div>
                                <span class="font-black text-slate-700 uppercase tracking-tight">{{ data.name }}</span>
                            </div>
                        </template>
                    </Column>
                    <Column field="slug" header="SLUG" class="font-mono text-[10px] text-slate-400 uppercase"></Column>
                    <Column field="description" header="DESCRIPTION">
                        <template #body="{ data }">
                            <span class="text-xs text-slate-500 font-medium italic">{{ data.description || 'No description provided.' }}</span>
                        </template>
                    </Column>
                    <Column field="is_active" header="STATUS" class="text-center">
                        <template #body="{ data }">
                            <Tag :value="data.is_active ? 'ACTIVE' : 'INACTIVE'" 
                                 :severity="data.is_active ? 'success' : 'secondary'" 
                                 class="text-[9px] font-black tracking-widest px-3" />
                        </template>
                    </Column>
                    <Column header="EXAMS COUNT" class="text-center">
                        <template #body="{ data }">
                            <span class="font-black text-slate-700">{{ data.exams_count || 0 }}</span>
                        </template>
                    </Column>
                    <Column header="ACTIONS" class="text-right pr-6">
                        <template #body="{ data }">
                            <div class="flex justify-end space-x-2">
                                <Button icon="pi pi-pencil" severity="warning" text rounded size="small" @click="openEditModal(data)" />
                                <Button icon="pi pi-trash" severity="danger" text rounded size="small" @click="deleteCategory(data.id)" />
                            </div>
                        </template>
                    </Column>
                    <template #empty>
                        <div class="p-20 text-center">
                            <p class="text-xs font-black text-slate-300 uppercase tracking-widest">No categories discovered in system</p>
                        </div>
                    </template>
                </DataTable>
            </div>
        </div>

        <!-- Create/Edit Modal -->
        <Dialog v-model:visible="showModal" 
                :header="isEditing ? 'Edit Category' : 'Register Category'" 
                modal class="max-w-xl w-full mx-4"
                :pt="{
                    root: { class: 'rounded-[2rem] overflow-hidden border-none shadow-2xl' },
                    header: { class: 'bg-slate-50 p-8 border-b border-slate-100' },
                    content: { class: 'p-8' },
                    footer: { class: 'bg-slate-50 p-6 border-t border-slate-100 flex justify-end space-x-3' }
                }">
            <div class="space-y-8">
                <div class="space-y-3">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Category Name</label>
                    <InputText v-model="form.name" class="premium-input text-sm font-bold uppercase" placeholder="E.G. ADULT_PROFESSIONAL" />
                </div>
                
                <div class="space-y-3">
                    <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Descriptive Context</label>
                    <Textarea v-model="form.description" rows="3" class="premium-input text-sm" placeholder="Provide strategic context for this tier..." />
                </div>

                <div class="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                    <div>
                        <p class="text-xs font-black text-slate-700 uppercase">Availability Status</p>
                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Allow exams to be linked to this category</p>
                    </div>
                    <ToggleSwitch v-model="form.is_active" />
                </div>
            </div>

            <template #footer>
                <Button label="Discard" severity="secondary" text size="small" @click="showModal = false" />
                <Button :label="isSaving ? 'SYNCING...' : 'COMMIT CHANGES'" 
                        :loading="isSaving" 
                        icon="pi pi-check" 
                        size="small" 
                        @click="saveCategory" />
            </template>
        </Dialog>
    </AdminLayout>
</template>

<style scoped>
.premium-input {
    width: 100%;
    padding: 1.25rem 1.5rem;
    border-radius: 1.25rem;
    border: 1px solid #f1f5f9;
    background: #f8fafc;
    transition: all 0.3s ease;
}

.premium-input:focus {
    background: white;
    border-color: #6366f1;
    box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.1);
    outline: none;
}
</style>

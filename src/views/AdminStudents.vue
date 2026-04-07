<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const students = ref([]);
const packages = ref([]);
const loading = ref(true);
const isSaving = ref(false);
const skills = ref([]);

const showModal = ref(false);
const selectedStudent = ref(null);

const editForm = ref({
    first_name: '',
    last_name: '',
    email: '',
    package_id: '',
    exam_type: '',
    assigned_skills: [],
    password: '',
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

const openProfile = (student) => {
    selectedStudent.value = student;
    editForm.value = {
        first_name: student.first_name,
        last_name: student.last_name,
        email: student.user?.email || '',
        package_id: student.package_id || '',
        exam_type: student.exam_type || '',
        language_level: student.language_level || '',
        assigned_skills: student.assigned_skills || [],
        password: '',
    };
    showModal.value = true;
};

const onPackageChange = () => {
    const selected = packages.value.find(p => p.id === editForm.value.package_id);
    if (selected && selected.skills) {
        editForm.value.assigned_skills = selected.skills.map(s => s.id);
    }
};

const saveStudent = async () => {
    isSaving.value = true;
    try {
        const res = await api.patch(`/admin/students/${selectedStudent.value.id}`, editForm.value);
        const index = students.value.findIndex(s => s.id === selectedStudent.value.id);
        if (index !== -1) {
            students.value[index] = res.data.student;
        }
        showModal.value = false;
        alert('Identity profile updated successfully.');
    } catch (err) {
        alert(err.response?.data?.message || 'Failed to update identity.');
    } finally {
        isSaving.value = false;
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
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Student Directory</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage all registered students</p>
            </div>
            <div class="flex items-center space-x-4">
                <router-link to="/admin/students/batch" class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                    Bulk Import (XLS)
                </router-link>
                <router-link to="/admin/students/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                    Register Student +
                </router-link>
            </div>
        </div>

        <!-- Student Analytics / List -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading students...</p>
        </div>

        <div v-else class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
            <div class="overflow-x-auto">
                 <table class="w-full text-left">
                     <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                         <tr>
                             <th class="px-10 py-8">STUDENT INFO</th>
                             <th class="px-10 py-8">PACKAGE</th>
                             <th class="px-10 py-8">CATEGORY</th>
                             <th class="px-10 py-8">SOURCE</th>
                             <th class="px-10 py-8 text-right">ACTIONS</th>
                         </tr>
                     </thead>
                     <tbody class="divide-y divide-slate-50 text-sm">
                         <tr v-for="student in students" :key="student.id" class="hover:bg-slate-50/50 transition-colors group">
                             <td class="px-10 py-6">
                                 <div class="flex items-center space-x-4">
                                      <div class="w-12 h-12 rounded-2xl bg-slate-100 text-slate-300 flex items-center justify-center font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-all transform group-hover:rotate-6">
                                          {{ student.first_name ? student.first_name[0] : 'S' }}
                                      </div>
                                      <div>
                                           <div class="font-black text-slate-700 text-lg tracking-tight leading-tight">{{ student.first_name }} {{ student.last_name }}</div>
                                           <div class="flex items-center space-x-2 mt-1">
                                                <span class="text-[10px] font-bold text-slate-300 tracking-wider font-mono">{{ student.user?.email }}</span>
                                                <span class="w-1 h-1 bg-slate-200 rounded-full"></span>
                                                <span class="text-[10px] font-black text-indigo-400 uppercase">{{ student.parent_code }}</span>
                                           </div>
                                      </div>
                                 </div>
                             </td>
                             <td class="px-10 py-6">
                                 <div v-if="student.package" class="bg-indigo-50 text-indigo-600 border border-indigo-100 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest inline-block">
                                     {{ student.package.name }}
                                 </div>
                                 <div v-else class="text-[10px] font-black text-slate-200 uppercase tracking-widest">No assigned package</div>
                             </td>
                             <td class="px-10 py-6">
                                 <span v-if="student.exam_type" :class="student.exam_type === 'adult' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-orange-50 text-orange-600 border-orange-100'" class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                     {{ student.exam_type }}
                                 </span>
                                 <span v-else class="text-[8px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded border border-amber-100 uppercase">Awaiting Class</span>
                             </td>
                             <td class="px-10 py-6">
                                 <span :class="getSourceStyles(student.registration_source)" class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                     {{ student.registration_source }}
                                 </span>
                             </td>
                             <td class="px-10 py-6 text-right">
                                 <button @click="openProfile(student)" class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                     EDIT STUDENT
                                 </button>
                             </td>
                         </tr>
                         <tr v-if="students.length === 0">
                             <td colspan="5" class="py-32 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-xs">No students registered yet.</td>
                         </tr>
                     </tbody>
                 </table>
            </div>
        </div>
    </div>

    <!-- Edit Student Profile Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md">
        <div class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.2)] w-full max-w-xl overflow-hidden animate-in zoom-in duration-300">
            <div class="px-10 py-8 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
                <div>
                     <h3 class="text-2xl font-black text-slate-800 tracking-tight">Edit Student</h3>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest">Update student details</p>
                </div>
                <button @click="showModal = false" class="w-10 h-10 rounded-full bg-white border border-slate-100 text-slate-400 hover:text-red-500 flex items-center justify-center transition-colors shadow-sm">✕</button>
            </div>
            
            <div class="p-10 space-y-8 overflow-y-auto max-h-[70vh] no-scrollbar">
                <!-- Status Indicators -->
                <div class="grid grid-cols-2 gap-4">
                     <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                          <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Parent Code</label>
                          <p class="text-sm font-black text-slate-800 mt-1">{{ selectedStudent.parent_code }}</p>
                     </div>
                     <div class="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                          <label class="text-[9px] font-black text-slate-400 uppercase tracking-widest">Registration Source</label>
                          <p class="mt-1"><span :class="getSourceStyles(selectedStudent.registration_source)" class="px-2 py-0.5 rounded text-[8px] font-black uppercase border">{{ selectedStudent.registration_source }}</span></p>
                     </div>
                </div>

                <!-- Input Fields -->
                <div class="space-y-6">
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Assigned Package</label>
                        <select v-model="editForm.package_id" @change="onPackageChange" class="premium-input text-xs uppercase tracking-widest">
                            <option value="">No Package (Custom Skills)</option>
                            <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
                                {{ pkg.name }} ({{ pkg.skills_count }} Skills)
                            </option>
                        </select>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-6">
                        <div>
                             <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Exam Category</label>
                             <select v-model="editForm.exam_type" class="premium-input text-xs uppercase tracking-widest">
                                 <option value="adult">Adult</option>
                                 <option value="children">Children</option>
                             </select>
                        </div>
                        <div>
                             <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-4">Password</label>
                             <input v-model="editForm.password" type="password" placeholder="New Password (Optional)"
                                    class="premium-input font-mono text-xs tracking-widest">
                        </div>
                    </div>

                    <!-- Skills Selection -->
                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 ml-4">Assigned Skills</label>
                        <div class="grid grid-cols-2 gap-3">
                            <label v-for="skill in skills" :key="skill.id" 
                                   :class="editForm.assigned_skills.includes(skill.id) ? 'border-indigo-400 bg-indigo-50/50 shadow-sm' : 'border-slate-50 bg-slate-50/50'"
                                   class="flex items-center p-4 rounded-2xl border cursor-pointer hover:border-indigo-200 transition-all duration-300 group">
                                <div class="relative flex items-center">
                                     <input 
                                         type="checkbox" 
                                         :value="skill.id" 
                                         v-model="editForm.assigned_skills"
                                         class="w-5 h-5 text-indigo-600 rounded-lg border-slate-200 focus:ring-0 focus:ring-offset-0 bg-white"
                                     >
                                </div>
                                <span :class="editForm.assigned_skills.includes(skill.id) ? 'text-indigo-600 font-black' : 'text-slate-500 font-bold'" class="ml-3 text-[10px] uppercase tracking-wider transition-colors">
                                     {{ skill.name }}
                                </span>
                            </label>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer -->
            <div class="p-10 bg-slate-50/50 border-t border-slate-50 flex justify-end space-x-4">
                <button @click="showModal = false" class="px-8 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition">Cancel</button>
                <button @click="saveStudent" :disabled="isSaving" class="bg-indigo-600 text-white font-black px-10 py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                    {{ isSaving ? 'Saving...' : 'Save Changes' }}
                </button>
            </div>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const router = useRouter();

// Generate a random 6-character alphanumeric password suggestion
const generatePassword = () => {
    return Math.random().toString(36).slice(-6).toUpperCase();
};

const packages = ref([]);
const skills = ref([]);
const form = ref({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    gender: 'male',
    password: generatePassword(),
    package_id: '',
    exam_type: 'adult',
    assigned_skills: []
});

const isSubmitting = ref(false);
const errorMsg = ref('');

onMounted(async () => {
    try {
        const [pkgRes, skillRes] = await Promise.all([
            api.get('/admin/packages'),
            api.get('/admin/skills')
        ]);
        packages.value = pkgRes.data;
        skills.value = skillRes.data;
        
        if (packages.value.length > 0) form.value.package_id = packages.value[0].id;
        
        // Default skills (Listening, Reading Comprehension, Structure)
        form.value.assigned_skills = skills.value
            .filter(s => ['Listening', 'Reading Comprehension', 'Structure'].includes(s.name))
            .map(s => s.id);
    } catch (err) {
        console.error('Failed to load prerequisites', err);
    }
});

const addStudent = async () => {
    isSubmitting.value = true;
    errorMsg.value = '';
    
    try {
        await api.post('/admin/students', form.value);
        alert('Student successfully registered! Parent Code was auto-generated.');
        router.push('/admin/students');
    } catch (err) {
        console.error(err);
        errorMsg.value = err.response?.data?.message || 'Failed to add student. Ensure email is unique.';
    } finally {
        isSubmitting.value = false;
    }
};

const onPackageChange = () => {
    const selected = packages.value.find(p => p.id === form.value.package_id);
    if (selected && selected.skills) {
        // Auto-select skills from the package
        form.value.assigned_skills = selected.skills.map(s => s.id);
    }
};
</script>

<template>
  <AdminLayout>
    <div class="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        <!-- Header -->
        <div class="flex items-center space-x-6">
            <router-link to="/admin/students" class="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-slate-400 hover:text-indigo-600 hover:shadow-md transition-all border border-slate-100 group">
                <svg class="w-5 h-5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M15 19l-7-7 7-7"/></svg>
            </router-link>
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Register Entity</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manual Identity Provisioning</p>
            </div>
        </div>

        <div class="premium-card p-10 md:p-16 relative overflow-hidden">
            <!-- Decorative Accent -->
            <div class="absolute -right-24 -top-24 w-64 h-64 bg-indigo-50/30 rounded-full blur-3xl"></div>

            <form @submit.prevent="addStudent" class="relative z-10 space-y-10">
                
                <div v-if="errorMsg" class="bg-rose-50 border border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest p-5 rounded-2xl animate-in slide-in-from-top-2">
                    ⚠️ PROVISIONING_ERROR: {{ errorMsg }}
                </div>

                <!-- Basic Info Segment -->
                <div class="space-y-8">
                    <div class="flex items-center space-x-4 mb-4">
                         <div class="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                         <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Core Identity</h3>
                    </div>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Given Name</label>
                            <input v-model="form.first_name" type="text" required class="premium-input uppercase text-sm" placeholder="ALI_DOE">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Family Name</label>
                            <input v-model="form.last_name" type="text" required class="premium-input uppercase text-sm" placeholder="HASSAN_DOE">
                        </div>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Contact Phone</label>
                            <input v-model="form.phone" type="text" class="premium-input text-sm" placeholder="+20 123 456 789">
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Gender Profile</label>
                            <select v-model="form.gender" class="premium-input text-[10px] uppercase tracking-widest cursor-pointer">
                                <option value="male">MALE_IDENTITY</option>
                                <option value="female">FEMALE_IDENTITY</option>
                                <option value="other">NON_BINARY/OTHER</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Network Identifier (Email)</label>
                        <input v-model="form.email" type="email" required class="premium-input font-bold text-sm tracking-wide" placeholder="IDENTITY@ARABACADEMY.COM">
                    </div>
                </div>

                <!-- Logic & Subscription Segment -->
                <div class="space-y-8">
                    <div class="flex items-center space-x-4 mb-4">
                         <div class="w-1.5 h-6 bg-purple-600 rounded-full"></div>
                         <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Subscription & Assessment Logic</h3>
                    </div>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Subscription Package</label>
                            <select v-model="form.package_id" @change="onPackageChange" class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                <option value="">-- CUSTOM_ASSETS --</option>
                                <option v-for="pkg in packages" :key="pkg.id" :value="pkg.id">
                                    {{ pkg.name }} ({{ pkg.skills_count }} MODULES)
                                </option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4">Operational Category</label>
                            <select v-model="form.exam_type" required class="premium-input text-xs uppercase tracking-widest cursor-pointer">
                                <option value="adult">ADULT_MODE (18+)</option>
                                <option value="children">CHILD_MODE (YOUNG LEARNERS)</option>
                            </select>
                        </div>
                    </div>

                    <!-- Skill Selection Grid -->
                    <div class="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
                        <div class="flex items-center justify-between mb-8">
                             <label class="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center">
                                 <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> 
                                 Cognitive Module Assignment
                             </label>
                             <span class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Active Pool</span>
                        </div>
                        
                        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <label v-for="skill in skills" :key="skill.id" 
                                   :class="form.assigned_skills.includes(skill.id) ? 'border-indigo-600 bg-white ring-4 ring-indigo-50 shadow-sm' : 'border-slate-50 bg-white/50'"
                                   class="flex items-center p-5 rounded-2xl border-2 cursor-pointer hover:border-indigo-200 transition-all duration-300 group">
                                <input 
                                    type="checkbox" 
                                    :value="skill.id" 
                                    v-model="form.assigned_skills"
                                    class="w-5 h-5 text-indigo-600 rounded-lg border-slate-200 focus:ring-0 focus:ring-offset-0 bg-white"
                                >
                                <span :class="form.assigned_skills.includes(skill.id) ? 'text-indigo-600 font-black' : 'text-slate-400 font-bold'" class="ml-4 text-[10px] uppercase tracking-wider transition-colors truncate">
                                     {{ skill.name }}
                                </span>
                            </label>
                        </div>
                        <p class="text-[9px] text-slate-300 mt-6 font-black uppercase tracking-[0.2em] text-center">Protocol Defaults Applied (Listening, Reading, Structure)</p>
                    </div>
                </div>

                <!-- Security Segment -->
                <div class="space-y-8">
                    <div class="flex items-center space-x-4 mb-4">
                         <div class="w-1.5 h-6 bg-emerald-500 rounded-full"></div>
                         <h3 class="text-xs font-black text-slate-800 uppercase tracking-[0.2em]">Access Security</h3>
                    </div>

                    <div>
                        <label class="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 ml-4 flex justify-between items-center">
                            <span>Initial Session Key</span>
                            <button type="button" @click="form.password = generatePassword()" class="text-[9px] text-indigo-600 hover:text-indigo-800 font-black uppercase tracking-widest focus:outline-none bg-indigo-50 px-3 py-1 rounded-lg">Regenerate Key</button>
                        </label>
                        <input v-model="form.password" type="text" required minlength="6" 
                               class="premium-input bg-indigo-50 border-indigo-100 text-indigo-600 font-mono font-black text-lg tracking-[0.3em] uppercase text-center focus:bg-white transition-all">
                        <p class="text-[10px] text-slate-400 mt-3 font-bold uppercase tracking-widest text-center">Secure key auto-suggested above. Manual override authorized.</p>
                    </div>
                </div>

                <!-- Final Commit -->
                <div class="pt-10 border-t border-slate-50 flex flex-col md:flex-row items-center justify-between space-y-6 md:space-y-0">
                    <div class="flex items-center space-x-3 opacity-30">
                         <div class="w-2 h-2 bg-slate-400 rounded-full"></div>
                         <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Endorsed by System Authority</span>
                    </div>
                    <button type="submit" :disabled="isSubmitting" 
                            class="w-full md:w-auto bg-indigo-600 text-white font-black py-5 px-16 rounded-[2rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 text-xs uppercase tracking-[0.3em]">
                        {{ isSubmitting ? 'PROVISIONING...' : 'COMMIT IDENTITY ➜' }}
                    </button>
                </div>
            </form>
        </div>
    </div>
  </AdminLayout>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
    display: none;
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const exams = ref([]);
const loading = ref(true);

const fetchExams = async () => {
    loading.value = true;
    try {
        const res = await api.get('/admin/exams');
        exams.value = res.data;
    } catch (err) {
        console.error('Failed to load exams', err);
    } finally {
        loading.value = false;
    }
};

const getCategoryStyles = (type) => {
    switch(type) {
        case 'adult': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
        case 'children': return 'bg-orange-50 text-orange-600 border-orange-100';
        default: return 'bg-slate-50 text-slate-400 border-slate-100';
    }
}

onMounted(fetchExams);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header -->
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
            <div>
                 <h1 class="text-3xl font-black text-slate-800 tracking-tight">Manage Exams</h1>
                 <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">View and configure exam templates</p>
            </div>
            <div class="flex items-center space-x-4">
                <router-link to="/admin/exams/import" class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                    Import Exam (Folders)
                </router-link>
                <router-link to="/admin/exams/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                    Create Exam +
                </router-link>
            </div>
        </div>

        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading exams...</p>
        </div>

        <div v-else>
            <div v-if="exams.length > 0" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-10 py-8">EXAM TITLE</th>
                                <th class="px-10 py-8">CATEGORY</th>
                                <th class="px-10 py-8">LANGUAGE</th>
                                <th class="px-10 py-8">TYPE</th>
                                <th class="px-10 py-8 text-center">ATTEMPTS</th>
                                <th class="px-10 py-8 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm">
                            <tr v-for="exam in exams" :key="exam.id" class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-4">
                                         <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                                             <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                         </div>
                                         <div>
                                              <div class="font-black text-slate-700 tracking-tight leading-none mb-1 uppercase text-sm">{{ exam.title }}</div>
                                              <div class="text-[10px] text-slate-300 font-bold uppercase tracking-widest line-clamp-1 italic">{{ exam.description || 'No description' }}</div>
                                         </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="getCategoryStyles(exam.exam_type)" 
                                          class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                        {{ exam.exam_type || 'General' }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                    <div class="flex items-center space-x-2">
                                         <span class="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                         <span class="text-[10px] font-black text-slate-500 uppercase tracking-widest">{{ exam.language?.name || 'Universal' }}</span>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span :class="exam.is_adaptive ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100'"
                                        class="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border">
                                        {{ exam.is_adaptive ? 'Adaptive' : 'Standard' }}
                                    </span>
                                </td>
                                <td class="px-10 py-6 text-center">
                                     <div class="font-black text-slate-800 text-lg tracking-tighter">{{ exam.attempts_count || 0 }}</div>
                                     <div class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Attempts</div>
                                </td>
                                <td class="px-10 py-6 text-right">
                                    <router-link :to="`/admin/exams/${exam.id}/edit`" class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
                                        EDIT
                                    </router-link>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Empty State -->
            <div v-else class="bg-white rounded-[3rem] shadow-[0_32px_120px_rgba(0,0,0,0.02)] border border-slate-100 p-24 text-center group">
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">📑</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Exams Found</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Create your first exam template to start evaluating students.
                </p>
                <router-link to="/admin/exams/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Create First Exam ➜
                </router-link>
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

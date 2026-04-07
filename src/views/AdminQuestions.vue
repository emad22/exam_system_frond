<script setup>
import { ref, onMounted } from 'vue';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

const questions = ref([]);
const loading = ref(true);
const filterSkill = ref('');
const filterType = ref('');
const skills = ref([]);

const fetchData = async () => {
    loading.value = true;
    try {
        const [qRes, sRes] = await Promise.all([
            api.get('/admin/questions'),
            api.get('/admin/skills')
        ]);
        questions.value = qRes.data.data || qRes.data;
        skills.value = sRes.data;
    } catch (err) {
        console.error('Failed to load', err);
    } finally {
        loading.value = false;
    }
};

const getDifficultyStyles = (level) => {
    if (level <= 3) return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    if (level <= 6) return 'bg-amber-50 text-amber-600 border-amber-100';
    return 'bg-rose-50 text-rose-600 border-rose-100';
};

const filteredQuestions = () => {
    let filtered = questions.value;
    if (filterSkill.value) {
        filtered = filtered.filter(q => q.skill?.name === filterSkill.value);
    }
    if (filterType.value) {
        filtered = filtered.filter(q => q.type === filterType.value);
    }
    return filtered;
};

onMounted(fetchData);
</script>

<template>
  <AdminLayout>
    <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <!-- Header & HUD Filter Bar -->
        <div class="flex flex-col space-y-8">
            <div class="flex flex-col md:flex-row justify-between items-start md:items-center space-y-6 md:space-y-0">
                <div>
                     <h1 class="text-3xl font-black text-slate-800 tracking-tight">Questions Bank</h1>
                     <p class="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-1">Manage all exam questions</p>
                </div>
                <div class="flex items-center space-x-4">
                    <button class="bg-white border border-slate-200 text-slate-500 font-black text-[10px] tracking-widest uppercase px-6 py-3.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm">
                        Import Batch (CSV)
                    </button>
                    <router-link to="/admin/questions/create" class="bg-indigo-600 text-white font-black text-[10px] tracking-widest uppercase px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
                        Add Question +
                    </router-link>
                </div>
            </div>

            <!-- Filter HUD -->
            <div class="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-wrap gap-6 items-center">
                 <div class="flex items-center space-x-4">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill</label>
                      <select v-model="filterSkill" class="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition uppercase">
                          <option value="">All Skills</option>
                          <option v-for="skill in skills" :key="skill.id" :value="skill.name">{{ skill.name }}</option>
                      </select>
                 </div>
                 <div class="w-px h-6 bg-slate-100 hidden md:block"></div>
                 <div class="flex items-center space-x-4">
                      <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Question Type</label>
                      <select v-model="filterType" class="bg-white border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-slate-700 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition uppercase">
                          <option value="">All Types</option>
                          <option value="mcq">Multiple Choice</option>
                          <option value="true_false">True / False</option>
                          <option value="short_answer">Short Text</option>
                      </select>
                 </div>
                 <div class="ml-auto text-[9px] font-black text-slate-300 uppercase tracking-widest">
                      Displaying {{ filteredQuestions().length }} Questions
                 </div>
            </div>
        </div>

        <!-- Data Grid -->
        <div v-if="loading" class="flex flex-col items-center justify-center py-32 space-y-4">
            <div class="w-12 h-12 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Loading questions...</p>
        </div>

        <div v-else>
            <div v-if="filteredQuestions().length > 0" class="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.02)] overflow-hidden">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50/50 text-slate-300 text-[10px] uppercase font-black tracking-[0.2em]">
                            <tr>
                                <th class="px-10 py-8">QUESTION</th>
                                <th class="px-10 py-8">TYPE</th>
                                <th class="px-10 py-8">TAG / GROUP</th>
                                <th class="px-10 py-8 text-center">DIFFICULTY</th>
                                <th class="px-10 py-8 text-center">POINTS</th>
                                <th class="px-10 py-8 text-right">ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-50 text-sm">
                            <tr v-for="q in filteredQuestions()" :key="q.id" class="hover:bg-slate-50/50 transition-colors group">
                                <td class="px-10 py-6 max-w-md">
                                    <div class="flex items-start space-x-4">
                                         <div class="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center font-black group-hover:bg-indigo-600 group-hover:text-white transition-all transform group-hover:rotate-6 mt-1 shrink-0">
                                             #{{ q.id }}
                                         </div>
                                         <div>
                                              <p class="font-black text-slate-700 tracking-tight leading-relaxed line-clamp-2 uppercase text-sm">{{ q.content }}</p>
                                              <div class="flex items-center space-x-3 mt-2">
                                                   <span class="text-[9px] font-black text-indigo-500 uppercase tracking-widest px-2 py-0.5 bg-indigo-50 rounded border border-indigo-100">{{ q.skill?.name || 'General' }}</span>
                                                   <span v-if="q.media_path" class="flex items-center text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                                                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21c-4.418 0-8-3.582-8-8s3.582-8 8-8 8 3.582 8 8-3.582 8-8 8zm0-2c3.314 0 6-2.686 6-6s-2.686-6-6-6-6 2.686-6 6 2.686 6 6 6zM9 13l6-4v8l-6-4z"/></svg> Media
                                                   </span>
                                              </div>
                                         </div>
                                    </div>
                                </td>
                                <td class="px-10 py-6">
                                    <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-100 px-3 py-1.5 rounded-lg bg-slate-50">
                                        {{ q.type }}
                                    </span>
                                </td>
                                <td class="px-10 py-6">
                                    <span v-if="q.group_tag" class="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono uppercase tracking-widest border border-slate-200">
                                        {{ q.group_tag }}
                                    </span>
                                    <span v-else class="text-[10px] text-slate-200 font-bold uppercase tracking-widest italic">No Tag</span>
                                </td>
                                <td class="px-10 py-6 text-center">
                                    <span :class="getDifficultyStyles(q.difficulty_level)" class="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border">
                                        Level {{ q.difficulty_level }}
                                    </span>
                                </td>
                                <td class="px-10 py-6 text-center">
                                     <div class="font-black text-slate-800 text-lg tracking-tighter">{{ q.points }}</div>
                                     <div class="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Points</div>
                                </td>
                                <td class="px-10 py-6 text-right">
                                    <router-link :to="`/admin/questions/${q.id}/edit`" class="bg-white border border-slate-200 text-slate-500 font-black text-[9px] tracking-widest uppercase px-5 py-2.5 rounded-xl hover:border-indigo-100 hover:text-indigo-600 transition shadow-sm active:scale-95">
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
                <div class="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 text-5xl group-hover:rotate-12 transition-transform duration-500">📥</div>
                <h3 class="text-3xl font-black text-slate-800 mb-4 tracking-tight uppercase">No Questions Found</h3>
                <p class="text-slate-400 font-medium max-w-sm mx-auto mb-12 text-sm leading-relaxed italic">
                    Your question bank is empty. Start adding questions or import from CSV.
                </p>
                <router-link to="/admin/questions/create" class="inline-block bg-indigo-600 text-white font-black py-5 px-12 rounded-2xl shadow-xl shadow-indigo-100 hover:shadow-indigo-200 hover:bg-indigo-700 transition transform hover:-translate-y-1 active:scale-95 uppercase tracking-widest text-xs">
                    Add First Question ➜
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

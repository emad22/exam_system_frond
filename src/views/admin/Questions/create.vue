<script setup>
import { ref, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import AdminLayout from '@/components/AdminLayout.vue';
import api from '@/services/api';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Select from 'primevue/select';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Message from 'primevue/message';
import InputNumber from 'primevue/inputnumber';
import ToggleSwitch from 'primevue/toggleswitch';
import Slider from 'primevue/slider';

const router = useRouter();
const route = useRoute();
const skills = ref([]);
const exams = ref([]);
const passages = ref([]);
const levels = ref([]);
const isSubmitting = ref(false);
const errorMsg = ref('');

const qFileInput = ref(null);
const qMediaPreview = ref(null);

const pFileInput = ref(null);
const pMediaPreview = ref(null);

const form = ref({
    skill_id: '',
    exam_id: '',
    level_id: 5,
    type: 'mcq',
    content: '',
    instructions: '',
    points: 1,

    // Passage Logic
    passage_mode: 'none', // none, existing, new
    passage_id: '',
    passage_type: 'text',
    passage_title: '',
    passage_content: '',
    passage_questions_limit: null,
    passage_is_random: false,

    q_media: null,
    p_media: null,

    min_words: null,
    max_words: null,

    options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false }
    ]
});

const loadInitialData = async () => {
    try {
        const [resSkills, resExams, resPassages] = await Promise.all([
            api.get('/admin/skills'),
            api.get('/admin/exams'),
            api.get('/admin/passages').catch(() => ({ data: [] }))
        ]);
        skills.value = resSkills.data;
        exams.value = resExams.data;
        passages.value = resPassages.data;

        // Try load levels if endpoint exists
        try {
            const resLevels = await api.get('/admin/levels');
            levels.value = resLevels.data;
        } catch (e) {
            console.log('Levels endpoint not available or empty.');
        }

        if (route.query.skill_id) form.value.skill_id = Number(route.query.skill_id);
        else if (skills.value.length > 0) form.value.skill_id = skills.value[0].id;

        if (route.query.exam_id) form.value.exam_id = Number(route.query.exam_id);
    } catch (err) {
        console.error('Failed to load initial data', err);
    }
};

const handleQFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.q_media = file;
    qMediaPreview.value = { url: URL.createObjectURL(file), type: file.type };
};

const handlePFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    form.value.p_media = file;
    pMediaPreview.value = { url: URL.createObjectURL(file), type: file.type };
};

const addOption = () => {
    form.value.options.push({ option_text: '', is_correct: false });
};

const removeOption = (index) => {
    if (form.value.options.length <= 2) return;
    form.value.options.splice(index, 1);
};

const setCorrect = (idx) => {
    form.value.options.forEach((opt, i) => {
        opt.is_correct = (i === idx);
    });
};

const handleTypeChange = () => {
    if (form.value.type === 'true_false') {
        form.value.options = [
            { option_text: 'True', is_correct: true },
            { option_text: 'False', is_correct: false }
        ];
    } else if (['writing', 'speaking', 'upload'].includes(form.value.type)) {
        form.value.options = [];
    } else if (form.value.type === 'short_answer') {
        form.value.options = [{ option_text: '', is_correct: true }];
    } else {
        if (form.value.options.length < 2) {
            form.value.options = [
                { option_text: '', is_correct: true },
                { option_text: '', is_correct: false }
            ];
        }
    }
};

const saveQuestion = async () => {
    if (!form.value.content.trim() && !['upload'].includes(form.value.type)) {
        errorMsg.value = 'Question content is required.';
        return;
    }

    if (form.value.passage_mode === 'new' && !form.value.passage_content && !form.value.p_media) {
        errorMsg.value = 'New passage requires either content text or media file.';
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const fd = new FormData();

        fd.append('skill_id', form.value.skill_id);
        if (form.value.exam_id) fd.append('exam_id', form.value.exam_id);
        if (form.value.level_id) fd.append('level_id', form.value.level_id);
        fd.append('type', form.value.type);
        fd.append('content', form.value.content);
        if (form.value.instructions) fd.append('instructions', form.value.instructions);
        fd.append('points', form.value.points);

        if (form.value.min_words) fd.append('min_words', form.value.min_words);
        if (form.value.max_words) fd.append('max_words', form.value.max_words);

        if (form.value.q_media) fd.append('q_media_file', form.value.q_media);

        // Passage Handle
        fd.append('passage_mode', form.value.passage_mode);
        if (form.value.passage_mode === 'existing') {
            fd.append('passage_id', form.value.passage_id);
        } else if (form.value.passage_mode === 'new') {
            fd.append('passage_type', form.value.passage_type);
            if (form.value.passage_title) fd.append('passage_title', form.value.passage_title);
            if (form.value.passage_content) fd.append('passage_content', form.value.passage_content);
            if (form.value.passage_questions_limit) fd.append('passage_questions_limit', form.value.passage_questions_limit);
            fd.append('passage_is_random', form.value.passage_is_random ? 1 : 0);
            if (form.value.p_media) fd.append('p_media_file', form.value.p_media);
        }

        form.value.options.forEach((opt, index) => {
            fd.append(`options[${index}][option_text]`, opt.option_text);
            fd.append(`options[${index}][is_correct]`, opt.is_correct ? 1 : 0);
        });

        await api.post('/admin/questions', fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        router.push('/admin/questions');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to save question.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(() => {
    loadInitialData();
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 mt-6 px-4 md:px-12">
            <!-- Header -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded
                        @click="router.push('/admin/questions')" />
                    <div>
                        <h1 class="text-3xl font-black text-slate-800 tracking-tight">Add New Question</h1>
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            Comprehensive Question Entry
                        </p>
                    </div>
                </div>
            </div>

            <form @submit.prevent="saveQuestion" class="space-y-8">
                <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}</Message>

                <!-- Section 1: General Info -->
                <Card class="border border-slate-100 shadow-sm rounded-[2rem]">
                    <template #title>
                        <div class="flex items-center mb-2">
                            <span class="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">1</span>
                            <span class="text-lg font-bold text-slate-800">General Info</span>
                        </div>
                    </template>
                    <template #content>
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 px-2">
                            <div class="flex flex-col">
                                <label class="text-xs font-bold text-slate-500 mb-2">Question Type</label>
                                <Select v-model="form.type" @change="handleTypeChange"
                                    :options="[
                                        { label: 'Multiple Choice (MCQ)', value: 'mcq' }, 
                                        { label: 'True / False', value: 'true_false' }, 
                                        { label: 'Short Answer', value: 'short_answer' }, 
                                        { label: 'Writing Prompt', value: 'writing' }, 
                                        { label: 'Speaking Prompt', value: 'speaking' },
                                        { label: 'File Upload', value: 'upload' }
                                    ]" optionLabel="label" optionValue="value" class="w-full rounded-xl" />
                            </div>
                            <div class="flex flex-col">
                                <label class="text-xs font-bold text-slate-500 mb-2">Skill</label>
                                <Select v-model="form.skill_id" :options="skills" optionLabel="name" optionValue="id"
                                    placeholder="Select Skill" class="w-full rounded-xl" />
                            </div>
                            <div class="flex flex-col">
                                <label class="text-xs font-bold text-slate-500 mb-2">Exam </label>
                                <Select v-model="form.exam_id" :options="exams" optionLabel="title" optionValue="id"
                                    placeholder="Select Exam" class="w-full rounded-xl" showClear />
                            </div>
                            <div class="flex flex-col">
                                <label class="text-xs font-bold text-slate-500 mb-3 block">Level ({{ form.level_id }})</label>
                                <Slider v-model="form.level_id" :min="1" :max="9" :step="1" class="w-full mb-3" />
                                <div class="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    <span>Beginner</span>
                                    <span>Expert</span>
                                </div>
                            </div>
                            <div class="flex flex-col">
                                <label class="text-xs font-bold text-slate-500 mb-2">Points</label>
                                <InputNumber v-model="form.points" :min="1" showButtons class="w-full rounded-xl" />
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Section 2: Passage (القطعة) -->
                <Card class="border border-slate-100 shadow-sm rounded-[2rem]">
                    <template #title>
                        <div class="flex items-center mb-2">
                            <span class="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">2</span>
                            <span class="text-lg font-bold text-slate-800">Passage Integration (القطعة)</span>
                        </div>
                    </template>
                    <template #content>
                        <div class="px-2 space-y-6">
                            <div class="flex gap-4">
                                <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 border p-3 rounded-xl hover:bg-slate-100 transition" :class="{'border-indigo-500 ring-1 ring-indigo-500': form.passage_mode === 'none'}">
                                    <input type="radio" v-model="form.passage_mode" value="none" class="hidden" />
                                    <i class="pi pi-ban text-slate-500"></i>
                                    <span class="text-sm font-bold">No Passage</span>
                                </label>
                                <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 border p-3 rounded-xl hover:bg-slate-100 transition" :class="{'border-indigo-500 ring-1 ring-indigo-500': form.passage_mode === 'existing'}">
                                    <input type="radio" v-model="form.passage_mode" value="existing" class="hidden" />
                                    <i class="pi pi-search text-slate-500"></i>
                                    <span class="text-sm font-bold">Select Existing</span>
                                </label>
                                <label class="flex items-center space-x-2 cursor-pointer bg-slate-50 border p-3 rounded-xl hover:bg-slate-100 transition" :class="{'border-indigo-500 ring-1 ring-indigo-500': form.passage_mode === 'new'}">
                                    <input type="radio" v-model="form.passage_mode" value="new" class="hidden" />
                                    <i class="pi pi-plus-circle text-slate-500"></i>
                                    <span class="text-sm font-bold">Create New Passage</span>
                                </label>
                            </div>

                            <div v-if="form.passage_mode === 'existing'" class="w-full md:w-1/2">
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Choose an existing passage</label>
                                <Select v-model="form.passage_id" :options="passages" optionLabel="title" optionValue="id"
                                    placeholder="Search Passages" class="w-full rounded-xl" filter />
                            </div>

                            <div v-if="form.passage_mode === 'new'" class="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-6">
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="flex flex-col">
                                        <label class="text-xs font-bold text-slate-500 mb-2">Passage Type</label>
                                        <Select v-model="form.passage_type" 
                                            :options="[{label: 'Text', value: 'text'}, {label: 'Image', value: 'image'}, {label: 'Audio', value: 'audio'}, {label: 'Video', value: 'video'}]"
                                            optionLabel="label" optionValue="value" class="w-full rounded-xl" />
                                    </div>
                                    <div class="flex flex-col">
                                        <label class="text-xs font-bold text-slate-500 mb-2">Internal Title (Optional)</label>
                                        <InputText v-model="form.passage_title" placeholder="E.g. Reading Comprehension Part 1" class="w-full rounded-xl" />
                                    </div>
                                </div>

                                <div v-if="form.passage_type === 'text'" class="flex flex-col">
                                    <label class="text-xs font-bold text-slate-500 mb-2">Passage Text Content</label>
                                    <Textarea v-model="form.passage_content" rows="6" placeholder="Write the passage here..." class="w-full rounded-xl" autoResize />
                                </div>
                                
                                <div v-else class="flex flex-col">
                                    <label class="text-xs font-bold text-slate-500 mb-2">Upload Passage Media ({{form.passage_type}})</label>
                                    <input type="file" ref="pFileInput" class="hidden" @change="handlePFileChange" accept="image/*,audio/*,video/*" />
                                    <Button type="button" icon="pi pi-upload" label="Choose File" class="w-fit" @click="pFileInput.click()" severity="secondary" />
                                    <div v-if="pMediaPreview" class="mt-4 p-2 bg-white rounded-xl shadow-sm inline-block">
                                        <img v-if="pMediaPreview.type.startsWith('image/')" :src="pMediaPreview.url" class="rounded-xl max-h-40" />
                                        <audio v-if="pMediaPreview.type.startsWith('audio/')" :src="pMediaPreview.url" controls></audio>
                                        <video v-if="pMediaPreview.type.startsWith('video/')" :src="pMediaPreview.url" controls class="rounded-xl max-h-60"></video>
                                    </div>
                                </div>

                                <div class="border-t border-slate-200 pt-6 mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div class="flex flex-col">
                                        <label class="text-xs font-bold text-slate-500 mb-2">Questions Limit (e.g. choose 5 out of 10) - Optional</label>
                                        <InputNumber v-model="form.passage_questions_limit" :min="1" placeholder="Empty = Show all" class="w-full rounded-xl" />
                                    </div>
                                    <div class="flex flex-col items-start justify-center">
                                        <label class="text-xs font-bold text-slate-500 mb-2">Randomize Chosen Questions?</label>
                                        <div class="flex items-center space-x-3">
                                            <ToggleSwitch v-model="form.passage_is_random" />
                                            <span class="text-sm font-bold text-slate-700">{{ form.passage_is_random ? 'Yes, random subset' : 'No, keep order' }}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Section 3: Question Setup -->
                <Card class="border border-slate-100 shadow-sm rounded-[2rem]">
                    <template #title>
                        <div class="flex items-center mb-2">
                            <span class="w-8 h-8 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">3</span>
                            <span class="text-lg font-bold text-slate-800">Question Definition</span>
                        </div>
                    </template>
                    <template #content>
                        <div class="px-2 space-y-6">
                            
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div class="flex flex-col">
                                    <label class="text-xs font-bold text-slate-500 mb-2">Instructions (تعليمات السؤال)</label>
                                    <Textarea v-model="form.instructions" rows="2" placeholder="e.g. Select the correct answer from the choices below..." class="w-full rounded-xl" autoResize />
                                </div>
                                <div class="flex flex-col">
                                    <label class="text-xs font-bold text-slate-500 mb-2">Question Text (نص السؤال)</label>
                                    <Textarea v-model="form.content" rows="2" placeholder="e.g. What is the main idea of the paragraph?" class="w-full rounded-xl" autoResize />
                                </div>
                            </div>

                            <div class="flex flex-col border-t border-slate-100 pt-6">
                                <label class="text-xs font-bold text-slate-500 mb-2">Question Media Integration (Optional)</label>
                                <p class="text-[10px] text-slate-400 mb-4">Attach an image or audio clip explicitly to this question.</p>

                                <div class="flex items-center gap-4">
                                    <input type="file" ref="qFileInput" class="hidden" @change="handleQFileChange" accept="image/*,audio/*,video/*" />
                                    <Button type="button" icon="pi pi-image" label="Add Media to Question" @click="qFileInput.click()" severity="secondary" outlined rounded />
                                </div>

                                <div v-if="qMediaPreview" class="mt-4 p-2 border border-slate-100 rounded-xl inline-block shadow-sm">
                                    <img v-if="qMediaPreview.type.startsWith('image/')" :src="qMediaPreview.url" class="rounded-xl max-h-40" />
                                    <audio v-if="qMediaPreview.type.startsWith('audio/')" :src="qMediaPreview.url" controls></audio>
                                    <video v-if="qMediaPreview.type.startsWith('video/')" :src="qMediaPreview.url" controls class="rounded-xl max-h-60"></video>
                                </div>
                            </div>

                        </div>
                    </template>
                </Card>

                <!-- Section 4: Options & Answers -->
                <Card v-if="!['speaking', 'upload'].includes(form.type)" class="border border-slate-100 shadow-sm rounded-[2rem]">
                    <template #title>
                        <div class="flex items-center justify-between mb-2 w-full">
                            <div class="flex items-center">
                                <span class="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mr-3 text-sm font-black">4</span>
                                <span class="text-lg font-bold text-slate-800">Answers / Options</span>
                            </div>
                            <Button v-if="['mcq', 'short_answer'].includes(form.type)" type="button" @click="addOption" icon="pi pi-plus" :label="'Add ' + (form.type === 'short_answer' ? 'Variation' : 'Option')" text rounded />
                        </div>
                    </template>
                    <template #content>
                        <div class="px-2">
                            <!-- Writing Words Limit -->
                            <div v-if="form.type === 'writing'" class="grid grid-cols-2 gap-6 w-full md:w-1/2">
                                <div class="flex flex-col">
                                    <label class="text-xs font-bold text-slate-500 mb-2">Min Words Limit</label>
                                    <InputNumber v-model="form.min_words" placeholder="e.g. 50" class="w-full rounded-xl" />
                                </div>
                                <div class="flex flex-col">
                                    <label class="text-xs font-bold text-slate-500 mb-2">Max Words Limit</label>
                                    <InputNumber v-model="form.max_words" placeholder="e.g. 200" class="w-full rounded-xl" />
                                </div>
                            </div>

                            <!-- MCQ / Short Answer / True False -->
                            <div v-if="['mcq', 'short_answer', 'true_false'].includes(form.type)" class="space-y-4">
                                <div v-for="(option, idx) in form.options" :key="idx" class="flex items-center space-x-4 p-4 rounded-xl border bg-slate-50/50 group transition-all" :class="option.is_correct ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100'">
                                    
                                    <div v-if="form.type !== 'short_answer'" class="flex-shrink-0">
                                        <button type="button" @click="setCorrect(idx)" :class="option.is_correct ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-white border-slate-200 text-transparent'" class="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all">
                                            <i class="pi pi-check text-xs"></i>
                                        </button>
                                    </div>

                                    <div class="flex-grow">
                                        <InputText v-model="option.option_text" :disabled="form.type === 'true_false'" :placeholder="form.type === 'short_answer' ? 'Type an acceptable answer variation...' : 'Option Content'" class="w-full bg-white shadow-sm rounded-xl font-bold" />
                                    </div>

                                    <div v-if="['mcq', 'short_answer'].includes(form.type)" class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition">
                                        <Button v-if="form.options.length > 1" type="button" @click="removeOption(idx)" icon="pi pi-times" severity="danger" text rounded />
                                    </div>
                                </div>
                            </div>

                            <!-- Context Help -->
                            <div v-if="form.type === 'mcq' || form.type === 'true_false'" class="mt-6 flex items-center text-xs p-4 bg-sky-50 text-sky-700 rounded-xl font-bold">
                                <i class="pi pi-info-circle mr-3 text-lg"></i> Mark the correct answer using the check circle.
                            </div>
                            <div v-if="form.type === 'short_answer'" class="mt-6 flex items-center text-xs p-4 bg-emerald-50 text-emerald-700 rounded-xl font-bold">
                                <i class="pi pi-info-circle mr-3 text-lg"></i> Provide all possible correct string matches (case-insensitive checks later).
                            </div>
                        </div>
                    </template>
                </Card>

                <!-- Submit Section -->
                <div class="flex justify-end pt-4">
                    <Button type="submit" :loading="isSubmitting" :label="isSubmitting ? 'Processing...' : 'Save Complete Setup'" icon="pi pi-check-circle" size="large" class="shadow-xl rounded-2xl px-12 py-4 font-black tracking-widest uppercase hover:scale-105 transition-transform" />
                </div>
            </form>
        </div>
    </AdminLayout>
</template>

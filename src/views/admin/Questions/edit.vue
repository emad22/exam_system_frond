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
import Slider from 'primevue/slider';
import InputNumber from 'primevue/inputnumber';

const router = useRouter();
const route = useRoute();

const skills = ref([]);
const exams = ref([]);
const isSubmitting = ref(false);
const errorMsg = ref('');
const loading = ref(true);

const fileInput = ref(null);
const mediaPreview = ref(null);
const isImage = ref(false);
const isAudio = ref(false);
const isVideo = ref(false);

const questionId = route.params.id;

const form = ref({
    skill_id: '',
    exam_id: '',
    media: null,
    type: 'mcq',
    content: '',
    difficulty_level: 5,
    points: 1,
    group_tag: '',
    options: []
});

const fetchSkills = async () => {
    const res = await api.get('/admin/skills');
    skills.value = res.data;
};

const fetchExams = async () => {
    const res = await api.get('/admin/exams');
    exams.value = res.data;
};

const detectMediaType = (url) => {
    if (!url) return;
    const clean = url.split('?')[0];
    const ext = clean.split('.').pop().toLowerCase();

    isImage.value = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
    isAudio.value = ['mp3', 'wav', 'ogg', 'mpeg'].includes(ext);
    isVideo.value = ['mp4', 'webm', 'ogg'].includes(ext);
};

const fetchQuestion = async () => {
    try {
        const res = await api.get(`/admin/questions/${questionId}`);
        const q = res.data;

        form.value.skill_id = q.skill_id;
        form.value.exam_id = q.exam_id;
        form.value.type = q.type;
        form.value.content = q.content;
        form.value.difficulty_level = q.difficulty_level;
        form.value.points = q.points;

        if (q.media_url) {
            mediaPreview.value = q.media_url;
            detectMediaType(q.media_url);
        }

        if (q.options && q.options.length) {
            form.value.options = q.options.map(o => ({
                option_text: o.option_text,
                is_correct: !!o.is_correct
            }));
        } else {
            form.value.options = [];
        }

        loading.value = false;
    } catch (err) {
        errorMsg.value = 'Failed to load question';
    }
};

const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    form.value.media = file;

    const url = URL.createObjectURL(file);
    mediaPreview.value = url;

    isImage.value = file.type.startsWith('image/');
    isAudio.value = file.type.startsWith('audio/');
    isVideo.value = file.type.startsWith('video/');
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
    } else if (['writing', 'speaking'].includes(form.value.type)) {
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

const updateQuestion = async () => {
    if (!form.value.content.trim()) {
        errorMsg.value = 'Question content is required.';
        return;
    }

    isSubmitting.value = true;
    errorMsg.value = '';

    try {
        const fd = new FormData();

        fd.append('_method', 'PUT');
        fd.append('skill_id', form.value.skill_id);
        fd.append('exam_id', form.value.exam_id);
        fd.append('type', form.value.type);
        fd.append('content', form.value.content);
        fd.append('difficulty_level', form.value.difficulty_level);
        fd.append('points', form.value.points);

        if (form.value.media) {
            fd.append('media_file', form.value.media);
        }

        form.value.options.forEach((opt, index) => {
            fd.append(`options[${index}][option_text]`, opt.option_text);
            fd.append(`options[${index}][is_correct]`, opt.is_correct ? 1 : 0);
        });

        await api.post(`/admin/questions/${questionId}`, fd, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        router.push('/admin/questions');

    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Failed to update question.';
    } finally {
        isSubmitting.value = false;
    }
};

onMounted(async () => {
    await Promise.all([fetchSkills(), fetchExams(), fetchQuestion()]);
});
</script>

<template>
    <AdminLayout>
        <div class="space-y-10 pb-20 mt-6 px-4 md:px-12">

            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-6">
                    <Button icon="pi pi-arrow-left" severity="secondary" outlined rounded
                        @click="router.push('/admin/questions')" />
                    <div>
                        <h1 class="text-3xl font-black text-slate-800">Edit Question</h1>
                        <p class="text-[10px] font-black text-slate-400 uppercase">Update existing question</p>
                    </div>
                </div>
            </div>

            <Message v-if="errorMsg" severity="error" :closable="false">{{ errorMsg }}</Message>

            <form v-if="!loading" @submit.prevent="updateQuestion" class="space-y-8">

                <!-- BASIC SETTINGS -->
                <Card>
                    <template #content>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">

                            <div>
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Exam</label>
                                <Select v-model="form.exam_id" :options="exams" optionLabel="title" optionValue="id"
                                    placeholder="Select exam" class="w-full" />
                            </div>

                            <div>
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Skill</label>
                                <Select v-model="form.skill_id" :options="skills" optionLabel="name" optionValue="id"
                                    placeholder="Select skill" class="w-full" />
                            </div>

                            <div>
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Type</label>
                                <Select v-model="form.type" @change="handleTypeChange" :options="[
                                    { label: 'MCQ', value: 'mcq' },
                                    { label: 'True/False', value: 'true_false' },
                                    { label: 'Short Answer', value: 'short_answer' },
                                    { label: 'Writing', value: 'writing' },
                                    { label: 'Speaking', value: 'speaking' }
                                ]" optionLabel="label" optionValue="value" class="w-full" />
                            </div>

                            <div>
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Difficulty Level ({
                                    form.difficulty_level })</label>
                                <Slider v-model="form.difficulty_level" :min="1" :max="9" />
                            </div>

                            <div>
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Points</label>
                                <InputNumber v-model="form.points" :min="1" class="w-full" />
                            </div>

                            <div>
                                <label class="text-xs font-bold text-slate-500 mb-2 block">Media</label>
                                <input type="file" ref="fileInput" class="hidden" @change="handleFileChange" />
                                <Button label="Upload Media" @click="fileInput.click()" class="w-full" />

                                <div v-if="mediaPreview" class="mt-3 space-y-2">
                                    <div class="text-xs font-bold text-slate-500">Current Media</div>
                                    <img v-if="isImage" :src="mediaPreview" class="max-h-40 rounded-xl" />
                                    <audio v-if="isAudio" :src="mediaPreview" controls class="w-full" />
                                    <video v-if="isVideo" :src="mediaPreview" controls class="max-h-60 w-full" />
                                </div>
                            </div>

                        </div>
                    </template>
                </Card>

                <!-- CONTENT -->
                <Card>
                    <template #content>
                        <div>
                            <label class="text-xs font-bold text-slate-500 mb-2 block">Question Text</label>
                            <Textarea v-model="form.content" rows="4" class="w-full" />
                        </div>
                    </template>
                </Card>

                <!-- OPTIONS -->
                <Card v-if="!['writing', 'speaking'].includes(form.type)">
                    <template #content>
                        <div class="space-y-4">

                            <div v-for="(opt, idx) in form.options" :key="idx" class="flex gap-3 items-center">

                                <button type="button" @click="setCorrect(idx)">
                                    {{ opt.is_correct ? '✔' : '○' }}
                                </button>

                                <InputText v-model="opt.option_text" class="w-full" />

                                <Button v-if="form.options.length > 1" icon="pi pi-times" text
                                    @click="removeOption(idx)" />

                            </div>

                            <Button label="Add Option" @click="addOption" />

                        </div>
                    </template>
                </Card>

                <div class="flex justify-end">
                    <Button type="submit" :loading="isSubmitting" label="Update Question" />
                </div>

            </form>

            <div v-else>Loading...</div>

        </div>
    </AdminLayout>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
    question: {
        type: Object,
        required: true
    },
    answer: {
        type: Object,
        required: true
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:answer']);

const selectedWords = computed({
    get: () => props.answer.selected_words || [],
    set: (val) => emit('update:answer', { ...props.answer, selected_words: val })
});

const currentWords = computed(() => {
    const text = props.question.content || "";
    return text.match(/[\w'-]+|[^\w\s]/g) || [];
});

const toggleWord = (word) => {
    if (props.disabled) return;
    const newAnswers = [...selectedWords.value];
    const index = newAnswers.indexOf(word);
    if (index === -1) newAnswers.push(word);
    else newAnswers.splice(index, 1);
    selectedWords.value = newAnswers;
};
</script>

<template>
    <div class="space-y-4">
        <div class="bg-white p-6 rounded-2xl border border-slate-100 flex flex-wrap gap-x-2 gap-y-1" dir="auto">
            <button v-for="(word, wIdx) in currentWords" :key="wIdx"
                @click="toggleWord(word)" :disabled="disabled"
                class="px-1 py-0.5 rounded transition-all font-medium text-lg border-b-2"
                :class="selectedWords.includes(word) ? 'border-rose-500 text-rose-600 bg-rose-50' : 'border-transparent text-slate-700 hover:bg-slate-50'">
                {{ word }}
            </button>
        </div>
    </div>
</template>

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

const highlightAnswers = computed({
    get: () => props.answer.highlight_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, highlight_answers: val })
});

const currentWords = computed(() => {
    const text = props.question.content || "";
    return text.match(/[\w'-]+|[^\w\s]/g) || [];
});

const toggleHighlight = (word) => {
    if (props.disabled) return;
    const newAnswers = [...highlightAnswers.value];
    const index = newAnswers.indexOf(word);
    if (index === -1) newAnswers.push(word);
    else newAnswers.splice(index, 1);
    highlightAnswers.value = newAnswers;
};
</script>

<template>
    <div class="space-y-4">
        <div class="bg-white p-8 rounded-3xl border border-slate-100 leading-[2.2] text-lg font-medium text-slate-700 shadow-sm rtl-support"
            dir="auto">
            <template v-for="(word, wIdx) in currentWords" :key="wIdx">
                <span @click="toggleHighlight(word)"
                    :disabled="disabled"
                    class="px-1 py-0.5 rounded cursor-pointer transition-all border-b border-transparent hover:border-slate-300"
                    :class="highlightAnswers.includes(word) ? 'bg-yellow-200 text-slate-900 border-yellow-400 font-bold shadow-md' : ''">
                    {{ word }}
                </span>
                {{ ' ' }}
            </template>
        </div>
    </div>
</template>

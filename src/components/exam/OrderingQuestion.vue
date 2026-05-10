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

const orderingAnswers = computed({
    get: () => props.answer.ordering_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, ordering_answers: val })
});

const currentAvailableWords = computed(() => {
    let available = [...(props.question.options?.map(o => o.option_text) || [])];
    orderingAnswers.value.forEach(word => {
        const idx = available.indexOf(word);
        if (idx !== -1) available.splice(idx, 1);
    });
    return available;
});

const addToOrdering = (word) => {
    if (props.disabled) return;
    const newAnswers = [...orderingAnswers.value];
    newAnswers.push(word);
    orderingAnswers.value = newAnswers;
};

const removeFromOrdering = (idx) => {
    if (props.disabled) return;
    const newAnswers = [...orderingAnswers.value];
    newAnswers.splice(idx, 1);
    orderingAnswers.value = newAnswers;
};
</script>

<template>
    <div class="space-y-6">
        <div class="bg-slate-50 p-4 rounded-2xl border-2 border-dashed border-slate-200 min-h-[100px] flex flex-wrap gap-2 items-center justify-center">
            <button v-for="(word, oIdx) in orderingAnswers" :key="oIdx" 
                @click="removeFromOrdering(oIdx)" :disabled="disabled"
                class="px-3 py-2 bg-white border-2 border-brand-primary text-brand-primary font-black rounded-lg text-sm shadow-sm animate-in zoom-in-75">
                {{ word }}
            </button>
        </div>
        <div class="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-wrap gap-2 justify-center">
            <button v-for="(word, wIdx) in currentAvailableWords" :key="wIdx"
                @click="addToOrdering(word)" :disabled="disabled"
                class="px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-brand-primary hover:text-white transition-all shadow-sm">
                {{ word }}
            </button>
        </div>
    </div>
</template>

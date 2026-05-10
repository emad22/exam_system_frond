<script setup>
import { ref, computed } from 'vue';

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

const matchingAnswers = computed({
    get: () => props.answer.matching_answers || {},
    set: (val) => emit('update:answer', { ...props.answer, matching_answers: val })
});

const selectedMatchSource = ref(null);

const toggleMatchSource = (sourceId) => {
    if (selectedMatchSource.value === sourceId) selectedMatchSource.value = null;
    else selectedMatchSource.value = sourceId;
};

const isAlreadyMatched = (targetText) => {
    return Object.values(matchingAnswers.value).includes(targetText);
};

const completeMatch = (targetText) => {
    if (!selectedMatchSource.value || isAlreadyMatched(targetText) || props.disabled) return;
    const newAnswers = { ...matchingAnswers.value };
    newAnswers[selectedMatchSource.value] = targetText;
    matchingAnswers.value = newAnswers;
    selectedMatchSource.value = null;
};

const currentMatchingLeft = computed(() => {
    return props.question.options.filter(o => o.option_text.includes('|')).map(o => ({
        id: o.id,
        option_text: o.option_text.split('|')[0].trim()
    }));
});

const currentMatchingRight = computed(() => {
    const targets = [];
    props.question.options.forEach(o => {
        if (o.option_text.includes('|')) {
            targets.push(o.option_text.split('|')[1].trim());
        } else {
            targets.push(o.option_text.trim());
        }
    });
    return [...new Set(targets)].map(t => ({ id: t, option_text: t }));
});
</script>

<template>
    <div class="space-y-6">
        <div class="grid grid-cols-2 gap-6">
            <div class="space-y-2">
                <button v-for="opt in currentMatchingLeft" :key="opt.id"
                    @click="toggleMatchSource(opt.id)" :disabled="disabled"
                    class="w-full p-3 rounded-xl border-2 transition-all text-sm font-black text-slate-700 flex justify-between items-center"
                    :class="selectedMatchSource === opt.id ? 'border-brand-primary bg-indigo-50 shadow-md' : (matchingAnswers[opt.id] ? 'border-emerald-100 bg-emerald-50/30' : 'border-slate-100 bg-white')">
                    <span class="text-right w-full" dir="auto">{{ opt.option_text }}</span>
                </button>
            </div>
            <div class="space-y-2">
                <button v-for="opt in currentMatchingRight" :key="opt.id"
                    @click="completeMatch(opt.id)"
                    :disabled="disabled || !selectedMatchSource || isAlreadyMatched(opt.id)"
                    class="w-full p-3 rounded-xl border-2 transition-all text-sm font-black text-slate-700 text-right"
                    :class="isAlreadyMatched(opt.id) ? 'bg-slate-50 opacity-40' : (selectedMatchSource ? 'border-brand-primary/30 bg-white hover:bg-brand-primary hover:text-white' : 'border-slate-100 bg-white')">
                    <span dir="auto">{{ opt.option_text }}</span>
                </button>
            </div>
        </div>
    </div>
</template>

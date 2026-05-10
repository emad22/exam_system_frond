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

const selectedOptionId = computed({
    get: () => props.answer.option_id,
    set: (val) => emit('update:answer', { ...props.answer, option_id: val })
});
</script>

<template>
    <div class="space-y-1.5">
        <button v-for="(opt, oIdx) in question.options" :key="opt.id"
            @click="selectedOptionId = opt.id" 
            :disabled="disabled"
            class="w-full p-3.5 rounded-xl border-2 transition-all flex flex-row-reverse items-center gap-4 group"
            :class="selectedOptionId === opt.id
                ? 'border-brand-primary bg-indigo-50/30 ring-2 ring-indigo-500/5'
                : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50 bg-white shadow-sm'">
            <div class="w-8 h-8 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all shadow-sm"
                :class="selectedOptionId === opt.id
                    ? 'bg-brand-primary border-brand-primary scale-105 shadow-md shadow-indigo-200'
                    : 'bg-slate-50 border-slate-100 group-hover:border-slate-200'">
                <span v-if="selectedOptionId !== opt.id"
                    class="text-[9px] font-black text-slate-300">{{ String.fromCharCode(65 + oIdx) }}</span>
                <i v-else class="pi pi-check text-[10px] text-white"></i>
            </div>
            <span class="font-black text-slate-700 leading-snug text-base grow text-right"
                dir="auto">{{ opt.option_text }}</span>
        </button>
    </div>
</template>

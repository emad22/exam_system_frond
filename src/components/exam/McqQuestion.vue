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
    <div class="space-y-1 py-1" dir="rtl">
        <button v-for="(opt, oIdx) in question.options" :key="opt.id" @click="selectedOptionId = opt.id"
            :disabled="disabled"
            class="w-[calc(100%-20px)] p-4 rounded-2xl border-2 transition-all duration-300 flex flex-row-reverse items-center gap-4 group relative overflow-hidden"
            :class="selectedOptionId === opt.id
                ? 'border-brand-primary bg-indigo-50/40 ring-4 ring-indigo-500/5 shadow-md'
                : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 bg-white shadow-sm hover:shadow-md'">

            <!-- Selection Indicator Dot (Top Right) -->
            <div v-if="selectedOptionId === opt.id"
                class="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-brand-primary animate-pulse">
            </div>



            <!-- Option Content -->
            <div class="flex flex-col items-start grow text-right">
                <span class="font-bold tracking-tight leading-snug text-lg transition-colors duration-300"
                    :class="selectedOptionId === opt.id ? 'text-indigo-950' : 'text-slate-700 group-hover:text-slate-900'"
                    dir="auto">{{ opt.option_text }}</span>
            </div>

            <!-- Hover Effect Background -->
            <div
                class="absolute inset-0 bg-gradient-to-r from-transparent via-indigo-50/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 pointer-events-none">
            </div>
        </button>
    </div>
</template>

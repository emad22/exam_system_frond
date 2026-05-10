<script setup>
import { ref, computed } from 'vue';
import VirtualKeyboard from '@/components/VirtualKeyboard.vue';
import { useVirtualKeyboard } from '@/composables/useVirtualKeyboard';

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

const fillBlankAnswers = computed({
    get: () => props.answer.fill_blank_answers || [],
    set: (val) => emit('update:answer', { ...props.answer, fill_blank_answers: val })
});

const parsedFillBlankContent = (content) => {
    if (!content) return [];
    return content.split(/\[\s*input\s*\]|\[\s*\]/gi);
};

const focusedInputIndex = ref(0);
const { keyboardLayout, showVirtualKeyboard, toggleKeyboardLayout } = useVirtualKeyboard();
</script>

<template>
    <div class="space-y-4">
        <div class="bg-slate-50 p-8 rounded-3xl border border-slate-200 leading-[2.6] text-lg font-medium text-slate-800 shadow-inner interactive-content-area rtl-support"
            dir="auto">
            <template v-for="(part, pIdx) in parsedFillBlankContent(question.content)" :key="pIdx">
                <span v-html="part"></span>
                <input v-if="pIdx < parsedFillBlankContent(question.content).length - 1"
                    v-model="fillBlankAnswers[pIdx]" @focus="focusedInputIndex = pIdx" :disabled="disabled"
                    type="text"
                    class="inline-block w-28 h-8 mx-1 px-2 rounded border-2 border-slate-200 bg-white focus:border-brand-primary outline-none transition-all text-brand-primary font-black text-center text-base relative top-0.5"
                    placeholder="..." />
            </template>
        </div>

        <div class="flex items-center gap-4 w-full justify-center">
            <button @click="toggleKeyboardLayout" class="text-[10px] font-black uppercase tracking-widest px-3 py-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 text-slate-500 transition-all">
                {{ keyboardLayout === 'arabic' ? 'English Keyboard' : 'العربية' }}
            </button>
            <button @click="showVirtualKeyboard = !showVirtualKeyboard" class="w-10 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-slate-200 transition-all" :title="showVirtualKeyboard ? 'Hide Keyboard' : 'Show Keyboard'">
                <svg viewBox="0 0 24 24" class="w-5 h-5 transition-colors" :class="showVirtualKeyboard ? 'text-brand-primary' : 'text-slate-400'" fill="currentColor">
                    <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                </svg>
            </button>
        </div>

        <VirtualKeyboard v-if="showVirtualKeyboard && !disabled" 
            v-model="fillBlankAnswers[focusedInputIndex]" 
            :layout="keyboardLayout" 
            class="w-full" />
    </div>
</template>

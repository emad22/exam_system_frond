<script setup>
import { computed } from 'vue';
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

const textAnswer = computed({
    get: () => props.answer.text_answer || '',
    set: (val) => emit('update:answer', { ...props.answer, text_answer: val })
});

const wordCount = computed(() => {
    const text = textAnswer.value || '';
    return text.trim() ? text.trim().split(/\s+/).length : 0;
});

const { keyboardLayout, showVirtualKeyboard, toggleKeyboardLayout } = useVirtualKeyboard();
</script>

<template>
    <div class="space-y-3" dir="rtl">
        <textarea v-model="textAnswer" :disabled="disabled"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm font-medium focus:border-brand-primary transition-all min-h-[180px] outline-none"
            placeholder="اكتب إجابتك هنا..."></textarea>
        <div class="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
            <div class="flex items-center gap-4">
                <span>عدد الكلمات: {{ wordCount }}</span>
                <span>المطلوب: {{ question.min_words || 0 }} - {{ question.max_words || '∞' }}</span>
            </div>
            <div class="flex items-center gap-2">
                <button @click="toggleKeyboardLayout" class="px-2 py-1 bg-slate-100 rounded hover:bg-slate-200 text-slate-600 transition-colors">
                    {{ keyboardLayout === 'arabic' ? 'English Keyboard' : 'لوحة مفاتيح عربية' }}
                </button>
                <button @click="showVirtualKeyboard = !showVirtualKeyboard" class="w-10 h-8 flex items-center justify-center bg-slate-100 rounded-lg hover:bg-slate-200 transition-all" :title="showVirtualKeyboard ? 'Hide Keyboard' : 'Show Keyboard'">
                    <svg viewBox="0 0 24 24" class="w-5 h-5 transition-colors" :class="showVirtualKeyboard ? 'text-brand-primary' : 'text-slate-400'" fill="currentColor">
                        <path d="M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z"/>
                    </svg>
                </button>
            </div>
        </div>

        <VirtualKeyboard v-if="showVirtualKeyboard && !disabled" 
            v-model="textAnswer" 
            :layout="keyboardLayout" />
    </div>
</template>

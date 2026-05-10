<script setup>
import AudioRecorder from '@/components/AudioRecorder.vue';

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

const handleRecording = (blob) => {
    emit('update:answer', { ...props.answer, recorded_file: blob });
};
</script>

<template>
    <div class="space-y-4">
        <AudioRecorder @recorded="handleRecording"
            class="!bg-slate-50 !border-slate-200" :disabled="disabled" />
    </div>
</template>

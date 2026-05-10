import { ref, onUnmounted } from 'vue';
// @ts-ignore
import api from '@/services/api';

export function useAntiCheat(attemptId: any, options: { onFinalWarning: () => void }) {
    const cheatWarnings = ref(0);
    const showCheatModal = ref(false);
    const showFinalCheatModal = ref(false);
    const isIntentionallyLeaving = ref(false);

    const handleVisibilityChange = async (isStarting: boolean, showTimeoutModal: boolean) => {
        if (document.visibilityState === 'hidden' && !isStarting && !showTimeoutModal && !isIntentionallyLeaving.value) {
            cheatWarnings.value++;

            try {
                const res = await api.post(`/attempts/${attemptId.value}/warnings`);

                if (res.data.should_terminate_skill) {
                    showFinalCheatModal.value = true;
                    options.onFinalWarning();
                    return;
                }
            } catch (err) {
                console.error('Failed to log cheat warning', err);
            }

            if (cheatWarnings.value >= 3) {
                showFinalCheatModal.value = true;
                options.onFinalWarning();
            } else {
                showCheatModal.value = true;
            }
        }
    };

    const preventCopyPaste = (e: Event) => {
        e.preventDefault();
        return false;
    };

    const setupAntiCheat = () => {
        document.addEventListener('copy', preventCopyPaste);
        document.addEventListener('paste', preventCopyPaste);
        document.addEventListener('contextmenu', preventCopyPaste);
    };

    const destroyAntiCheat = () => {
        document.removeEventListener('copy', preventCopyPaste);
        document.removeEventListener('paste', preventCopyPaste);
        document.removeEventListener('contextmenu', preventCopyPaste);
    };

    onUnmounted(() => {
        destroyAntiCheat();
    });

    return {
        cheatWarnings,
        showCheatModal,
        showFinalCheatModal,
        isIntentionallyLeaving,
        handleVisibilityChange,
        setupAntiCheat,
        destroyAntiCheat
    };
}

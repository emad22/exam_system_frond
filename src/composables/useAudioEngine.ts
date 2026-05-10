import { ref } from 'vue';

export function useAudioEngine() {
    const audioRef = ref<HTMLAudioElement | null>(null);
    const isAudioPlaying = ref(false);
    const audioProgress = ref(0);
    const audioCurrentTime = ref('0:00');
    const audioDuration = ref('0:00');
    const autoplayFailed = ref(false);

    const formatAudioTime = (seconds: number) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const syncAudioState = () => {
        if (audioRef.value) isAudioPlaying.value = !audioRef.value.paused;
    };

    const updateAudioProgress = () => {
        if (!audioRef.value) return;
        const current = audioRef.value.currentTime;
        const total = audioRef.value.duration;
        if (total) {
            audioProgress.value = (current / total) * 100;
            audioCurrentTime.value = formatAudioTime(current);
            audioDuration.value = formatAudioTime(total);
        }
    };

    const toggleAudioManual = async () => {
        if (!audioRef.value) return;
        try {
            if (audioRef.value.paused) await audioRef.value.play();
            else audioRef.value.pause();
        } catch (err) {
            console.error('Audio playback failed:', err);
            autoplayFailed.value = true;
        }
        syncAudioState();
    };

    const onAudioError = (e: any) => {
        console.error('Audio element error:', e);
        isAudioPlaying.value = false;
    };

    const playStimulusAudio = async (url: string) => {
        if (!audioRef.value) return;
        audioRef.value.src = url;
        audioRef.value.load();
        try {
            await audioRef.value.play();
            autoplayFailed.value = false;
        } catch (err) {
            console.warn('Autoplay blocked:', err);
            autoplayFailed.value = true;
        }
    };

    return {
        audioRef,
        isAudioPlaying,
        audioProgress,
        audioCurrentTime,
        audioDuration,
        autoplayFailed,
        syncAudioState,
        updateAudioProgress,
        toggleAudioManual,
        onAudioError,
        playStimulusAudio
    };
}

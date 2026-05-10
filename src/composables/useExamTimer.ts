import { ref, computed, onUnmounted } from 'vue';

export function useExamTimer() {
    const timeLeftSeconds = ref(0);
    const timerInterval = ref<any>(null);
    const isTimeLow = computed(() => timeLeftSeconds.value > 0 && timeLeftSeconds.value <= 60);

    const formattedTime = computed(() => {
        if (timeLeftSeconds.value <= 0) return "00:00:00";
        const h = Math.floor(timeLeftSeconds.value / 3600);
        const m = Math.floor((timeLeftSeconds.value % 3600) / 60);
        const s = timeLeftSeconds.value % 60;
        if (h > 0) {
            return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    });

    const stopTimer = () => {
        if (timerInterval.value) {
            clearInterval(timerInterval.value);
            timerInterval.value = null;
        }
    };

    const startTimer = (config: { skillDuration: number, skillStartedAt: string } | null, onTimeout: () => void) => {
        stopTimer();

        if (!config || !config.skillDuration || !config.skillStartedAt) return;

        let createdStr = config.skillStartedAt;
        if (!createdStr.endsWith('Z') && !createdStr.match(/[+-]\d{2}:\d{2}$/)) {
            createdStr += 'Z';
        }

        const startTime = new Date(createdStr).getTime();
        const limitMs = config.skillDuration * 60 * 1000;

        const updateTime = () => {
            const now = new Date().getTime();
            const elapsed = now - startTime;
            const remaining = Math.max(0, Math.floor((limitMs - elapsed) / 1000));

            timeLeftSeconds.value = remaining;

            if (remaining <= 0) {
                stopTimer();
                onTimeout();
            }
        };

        updateTime();
        timerInterval.value = setInterval(updateTime, 1000);
    };

    onUnmounted(() => {
        stopTimer();
    });

    return {
        timeLeftSeconds,
        formattedTime,
        isTimeLow,
        startTimer,
        stopTimer
    };
}

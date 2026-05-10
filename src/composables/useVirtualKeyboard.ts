import { ref } from 'vue';

export function useVirtualKeyboard() {
    const keyboardLayout = ref('arabic');
    const showVirtualKeyboard = ref(true);

    const toggleKeyboardLayout = () => {
        keyboardLayout.value = keyboardLayout.value === 'arabic' ? 'english' : 'arabic';
    };

    return {
        keyboardLayout,
        showVirtualKeyboard,
        toggleKeyboardLayout
    };
}

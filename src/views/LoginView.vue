<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';

const router = useRouter();
const isLogin = ref(true);
const isLoading = ref(false);
const errorMsg = ref('');

const form = ref({
    email: '',
    password: '',
    username: ''
});

const handleLogin = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        const res = await api.post('/login', {
            email: form.value.email,
            password: form.value.password
        });

        localStorage.setItem('token', res.data.token);
        
        if (res.data.role === 'admin' || res.data.role === 'teacher') {
            router.push('/admin');
        } else {
            router.push('/dashboard');
        }
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Invalid credentials. Please try again.';
    } finally {
        isLoading.value = false;
    }
};

const handleRegister = async () => {
    isLoading.value = true;
    errorMsg.value = '';
    try {
        await api.post('/register', form.value);
        isLogin.value = true;
        alert('Registration successful! Please login.');
    } catch (err) {
        errorMsg.value = err.response?.data?.message || 'Registration failed.';
    } finally {
        isLoading.value = false;
    }
};
</script>

<template>
  <div class="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden font-sans">
    <!-- Premium Background Decor -->
    <div class="absolute inset-0 overflow-hidden pointer-events-none">
        <div class="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[150px] animate-pulse"></div>
        <div class="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] animate-pulse" style="animation-delay: 3s"></div>
        <div class="absolute top-[30%] left-[40%] w-[20%] h-[20%] bg-purple-600/5 rounded-full blur-[100px]"></div>
    </div>

    <!-- Login Container -->
    <div class="relative z-10 w-full max-w-md animate-in fade-in zoom-in duration-700">
        <div class="bg-white/5 backdrop-blur-3xl p-12 rounded-[3.5rem] border border-white/10 shadow-[0_32px_120px_rgba(0,0,0,0.4)] overflow-hidden relative group">
            
            <!-- Logo Section -->
            <div class="flex flex-col items-center justify-center mb-12">
                <div class="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white text-3xl font-black shadow-2xl shadow-indigo-600/20 mb-4 transform group-hover:rotate-6 transition-transform duration-500">
                    <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <h1 class="text-2xl font-black text-white tracking-tight uppercase">ArabAcademy<span class="text-indigo-500">.</span></h1>
                <p class="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-1">Excellence in Assessment</p>
            </div>

            <div class="relative z-10">
                <div class="mb-10 text-center">
                    <h2 class="text-3xl font-black text-white tracking-tight mb-2">
                        {{ isLogin ? 'Login' : 'Register' }}
                    </h2>
                    <p class="text-white/40 text-xs font-bold uppercase tracking-widest">
                        {{ isLogin ? 'Welcome back' : 'Create your account' }}
                    </p>
                </div>

                <form @submit.prevent="isLogin ? handleLogin() : handleRegister()" class="space-y-6">
                    <div v-if="errorMsg" class="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest py-4 rounded-2xl text-center animate-in slide-in-from-top-2">
                        ⚠️ {{ errorMsg }}
                    </div>

                    <div v-if="!isLogin" class="space-y-1.5">
                        <label class="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-4">Username</label>
                        <input v-model="form.username" type="text" placeholder="e.g. johndoe" required
                               class="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-mono text-sm tracking-widest uppercase">
                    </div>

                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-4">Email</label>
                        <input v-model="form.email" type="email" placeholder="email@example.com" required
                               class="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold text-sm tracking-wide">
                    </div>

                    <div class="space-y-1.5">
                        <label class="block text-[10px] font-black text-white/30 uppercase tracking-[0.2em] ml-4">Password</label>
                        <input v-model="form.password" type="password" placeholder="••••••••" required
                               class="w-full bg-white/5 border border-white/5 rounded-2xl px-6 py-4 text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:bg-white/10 transition-all font-bold text-sm tracking-widest">
                    </div>

                    <div class="pt-4">
                        <button type="submit" :disabled="isLoading"
                                class="w-full bg-indigo-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-indigo-600/20 hover:shadow-indigo-600/40 hover:-translate-y-1 active:scale-95 transition-all duration-300 disabled:opacity-50 uppercase tracking-[0.2em] text-xs">
                            {{ isLoading ? 'Loading...' : (isLogin ? 'Login' : 'Register') }}
                        </button>
                    </div>
                </form>

                <div class="mt-10 text-center">
                    <button @click="isLogin = !isLogin" class="text-white/30 text-[10px] font-black uppercase tracking-[0.15em] hover:text-indigo-400 transition-colors duration-300">
                        {{ isLogin ? "Don't have an account? " : "Already have an account? " }}
                        <span class="text-indigo-500 underline underline-offset-8 decoration-indigo-500/20">
                            {{ isLogin ? "Register" : "Login" }}
                        </span>
                    </button>
                </div>
            </div>
        </div>

        <!-- System Footer -->
        <div class="mt-16 text-center space-y-4">
            <p class="text-white/10 text-[9px] font-black uppercase tracking-[0.5em] leading-relaxed">
                Automated • Adaptive • ACTFL Compliant
            </p>
            <div class="flex justify-center space-x-2">
                 <div class="w-1.5 h-1.5 bg-indigo-600/40 rounded-full"></div>
                 <div class="w-1.5 h-1.5 bg-indigo-600/20 rounded-full"></div>
                 <div class="w-1.5 h-1.5 bg-indigo-600/10 rounded-full"></div>
            </div>
        </div>
    </div>
  </div>
</template>

<style scoped>
.animate-in {
    animation: fade-in 0.8s ease-out;
}
@keyframes fade-in {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}
</style>
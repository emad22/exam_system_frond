import { computed } from 'vue';

export function useMediaUrl() {
    const resolveUrl = (path) => {
        if (!path) return null;

        // If it's already a full URL
        if (/^https?:\/\//.test(path)) {
            const isLocalPath = path.includes('localhost') || path.includes('127.0.0.1');
            const isLocalBrowser = ['localhost', '127.0.0.1'].includes(window.location.hostname);

            // If the path is local but the browser is online, we must fix it
            if (isLocalPath && !isLocalBrowser) {
                // Extract the path after the origin
                try {
                    const url = new URL(path);
                    const pathPart = url.pathname + url.search;
                    return getCorrectBase() + pathPart;
                } catch (e) {
                    return path;
                }
            }
            return path;
        }

        // It's a relative path, resolve it
        const base = getCorrectBase();
        
        // Ensure path starts correctly and isn't double-prefixed
        const cleanPath = path.replace(/^(storage\/|public\/)/, '').replace(/^\/+/, '');
        
        return `${base}/storage/${cleanPath}`;
    };

    const getCorrectBase = () => {
        let baseUrl = import.meta.env.VITE_API_BASE_URL;

        if (!baseUrl) {
            const isLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
            baseUrl = isLocal
                ? 'http://localhost:8000/api'
                : `${window.location.origin}/api`;
        }

        try {
            // Get the origin (e.g., https://alpt.arabacademy.com)
            return new URL(baseUrl).origin;
        } catch (e) {
            return window.location.origin;
        }
    };

    return {
        resolveUrl
    };
}

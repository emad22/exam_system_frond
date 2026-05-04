import { defineStore } from 'pinia';
import api from '@/services/api';

export const useAdminStore = defineStore('admin', {
  state: () => ({
    user: null,
    notifications: [],
    lastFetched: 0
  }),
  actions: {
    async fetchUser() {
      if (this.user) return this.user;
      try {
        const res = await api.get('/user');
        this.user = res.data;
        return this.user;
      } catch (err) {
        console.error('Auth check failed', err);
        throw err;
      }
    },
    async fetchNotifications() {
      try {
        const res = await api.get('/admin/notifications');
        this.notifications = res.data;
      } catch (err) {
        console.error('Notifications fetch failed', err);
      }
    },
    clearNotifications() {
      this.notifications = [];
    }
  }
});

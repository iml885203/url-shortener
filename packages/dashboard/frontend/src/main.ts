import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import PrimeVue from 'primevue/config';
import './ui/theme';
import { refreshAuth } from './auth';
import './style.css';

// Lazy-loaded views
const Login = () => import('./views/Login.vue');
const DashboardHome = () => import('./views/DashboardHome.vue');
const LinkList = () => import('./views/LinkList.vue');
const CreateLink = () => import('./views/CreateLink.vue');
const EditLink = () => import('./views/EditLink.vue');
const LinkStats = () => import('./views/LinkStats.vue');

const router = createRouter({
  history: createWebHistory('/dashboard/'),
  routes: [
    { path: '/', redirect: '/overview' },
    { path: '/login', component: Login, meta: { public: true } },
    { path: '/overview', component: DashboardHome },
    { path: '/links', component: LinkList },
    { path: '/links/new', component: CreateLink },
    { path: '/links/:id/edit', component: EditLink },
    { path: '/links/:id/stats', component: LinkStats },
  ],
});

// Auth guard
router.beforeEach(async (to) => {
  const valid = await refreshAuth();
  if (!to.meta.public && !valid) return '/login';
  if (to.path === '/login' && valid) return '/overview';
});

const app = createApp(App);
app.use(PrimeVue, { unstyled: true });
app.use(router);
app.mount('#app');

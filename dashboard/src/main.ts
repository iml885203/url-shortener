import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import App from './App.vue';
import './style.css';

// Lazy-loaded views
const Login = () => import('./views/Login.vue');
const LinkList = () => import('./views/LinkList.vue');
const CreateLink = () => import('./views/CreateLink.vue');
const EditLink = () => import('./views/EditLink.vue');
const LinkStats = () => import('./views/LinkStats.vue');

const router = createRouter({
  history: createWebHistory('/dashboard/'),
  routes: [
    { path: '/', redirect: '/links' },
    { path: '/login', component: Login, meta: { public: true } },
    { path: '/links', component: LinkList },
    { path: '/links/new', component: CreateLink },
    { path: '/links/:id/edit', component: EditLink },
    { path: '/links/:id/stats', component: LinkStats },
  ],
});

// Auth guard
router.beforeEach((to) => {
  const key = localStorage.getItem('api_key');
  if (!to.meta.public && !key) {
    return '/login';
  }
});

const app = createApp(App);
app.use(router);
app.mount('#app');

import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';
import { useUniverseStore } from './stores/universe.store';
import './styles/global.scss';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

app.config.errorHandler = (error) => {
  const store = useUniverseStore();
  const message = error instanceof Error ? error.message : '应用发生未知错误。';
  store.setError({
    code: 'VUE_RUNTIME_ERROR',
    message,
    recoverable: true,
    source: 'main',
  });
};

app.mount('#app');

import '@egov-moldova/mud/tokens/core.tokens.css';
import '@egov-moldova/mud/styles.css';

import { Mud } from '@egov-moldova/mud-vue';
import { createApp } from 'vue';

import App from './App.vue';

// The documented asset step copies the core's `dist/components/assets` to `mud/assets` in
// the served output (see vite.config.ts); `assetPath` is the URL of the folder that holds it.
createApp(App)
  .use(Mud, { assetPath: `${import.meta.env.BASE_URL}mud/` })
  .mount('#app');

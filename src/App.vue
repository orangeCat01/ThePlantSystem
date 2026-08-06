<script setup lang="ts">
import { RouterView } from 'vue-router';
import ErrorNotice from '@/components/feedback/ErrorNotice.vue';
import LoadingScreen from '@/components/feedback/LoadingScreen.vue';
</script>

<template>
  <div class="app-shell">
    <RouterView />
    <LoadingScreen />
    <ErrorNotice />
  </div>
</template>

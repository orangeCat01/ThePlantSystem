<script setup lang="ts">
import { useUniverseStore } from '@/stores/universe.store';

const store = useUniverseStore();
</script>

<template>
  <div v-if="store.error" class="error-notice" role="alert">
    <div>
      <strong>{{ store.error.code }}</strong>
      <p>{{ store.error.message }}</p>
    </div>
    <button type="button" @click="store.setError(null)">关闭</button>
  </div>
</template>

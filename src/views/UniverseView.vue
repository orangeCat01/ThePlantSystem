<script setup lang="ts">
import { RouterView } from 'vue-router';
import AppHeader from '@/components/layout/AppHeader.vue';
import SceneViewport from '@/components/layout/SceneViewport.vue';
import OperationGuide from '@/components/universe/OperationGuide.vue';
import SceneSwitch from '@/components/universe/SceneSwitch.vue';
import PlanetPanel from '@/components/planet/PlanetPanel.vue';
</script>

<template>
  <main class="universe-view">
    <AppHeader />
    <section class="universe-view__grid">
      <div class="universe-view__stage">
        <SceneViewport />
        <RouterView />
      </div>
      <aside class="universe-view__controls">
        <SceneSwitch />
        <PlanetPanel />
        <OperationGuide />
      </aside>
    </section>
  </main>
</template>

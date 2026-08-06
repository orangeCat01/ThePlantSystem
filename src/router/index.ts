import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';

export const ROUTE_NAMES = {
  UNIVERSE: 'universe',
  SOLAR: 'universe-solar',
  GALAXY: 'universe-galaxy',
} as const;

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/universe/solar',
  },
  {
    path: '/universe',
    name: ROUTE_NAMES.UNIVERSE,
    component: () => import('@/views/UniverseView.vue'),
    redirect: '/universe/solar',
    children: [
      {
        path: 'solar',
        name: ROUTE_NAMES.SOLAR,
        component: () => import('@/views/SolarSystemView.vue'),
        meta: { sceneName: 'solar', title: '太阳系探索' },
      },
      {
        path: 'galaxy',
        name: ROUTE_NAMES.GALAXY,
        component: () => import('@/views/GalaxyView.vue'),
        meta: { sceneName: 'galaxy', title: '银河系探索' },
      },
    ],
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/universe/solar',
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.afterEach((to) => {
  const title = typeof to.meta.title === 'string' ? to.meta.title : '太阳系探索';
  document.title = `${title} - 银河系科普探索站`;
});

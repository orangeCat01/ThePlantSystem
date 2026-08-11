import { fileURLToPath, URL } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import vue from '@vitejs/plugin-vue';

/**
 * 兜底插件：确保 .bin 资源始终以 application/octet-stream 返回，
 * 且绝不携带 Content-Disposition（防止任何环境/中间件差异导致
 * 浏览器将 GLTF 外部 buffer 当作附件下载，或 GLTFLoader fetch 失败）。
 */
const gltfBinHeaderPlugin: Plugin = {
  name: 'gltf-bin-headers',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? '';
      if (url.includes('.bin')) {
        res.setHeader('Content-Type', 'application/octet-stream');
        res.removeHeader('Content-Disposition');
      }
      next();
    });
  },
};

export default defineConfig({
  plugins: [vue(), gltfBinHeaderPlugin],
  // 将 .bin 显式声明为静态资源：保证 GLTF 分离资源的 buffer 文件
  // 在任何 vite 资源处理路径下都被正确对待（不被当作源码模块）。
  base: '/plant/',
  assetsInclude: ['**/*.bin'],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});

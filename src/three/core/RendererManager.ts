import { Camera, Scene, SRGBColorSpace, WebGLRenderer } from 'three';

export class RendererManager {
  private renderer: WebGLRenderer | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private container: HTMLElement | null = null;
  private readonly maxPixelRatio = 2;
  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
  };
  private readonly handleContextRestored = (): void => {
    const width = this.container?.clientWidth ?? 1;
    const height = this.container?.clientHeight ?? 1;
    this.resize(width, height);
  };

  initialize(container: HTMLElement): WebGLRenderer {
    if (this.renderer) {
      return this.renderer;
    }

    const canvas = document.createElement('canvas');
    canvas.className = 'scene-viewport__canvas';
    canvas.addEventListener('webglcontextlost', this.handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', this.handleContextRestored, false);

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      canvas,
      powerPreference: 'high-performance',
    });

    renderer.outputColorSpace = SRGBColorSpace;
    renderer.setClearColor(0x050816, 1);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.maxPixelRatio));

    this.container = container;
    this.canvas = canvas;
    this.renderer = renderer;
    container.appendChild(canvas);
    this.resize(container.clientWidth, container.clientHeight);

    return renderer;
  }

  getRenderer(): WebGLRenderer {
    if (!this.renderer) {
      throw new Error('RendererManager has not been initialized.');
    }

    return this.renderer;
  }

  resize(width: number, height: number): void {
    if (!this.renderer) {
      return;
    }

    this.renderer.setSize(Math.max(width, 1), Math.max(height, 1), false);
  }

  render(scene: Scene, camera: Camera): void {
    this.renderer?.render(scene, camera);
  }

  destroy(): void {
    if (!this.renderer) {
      return;
    }

    this.canvas?.removeEventListener('webglcontextlost', this.handleContextLost, false);
    this.canvas?.removeEventListener('webglcontextrestored', this.handleContextRestored, false);
    this.renderer.dispose();
    this.canvas?.remove();
    this.renderer = null;
    this.canvas = null;
    this.container = null;
  }
}

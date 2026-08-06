import { BufferGeometry, Material, Texture, WebGLRenderTarget } from 'three';

interface Disposable {
  dispose(): void;
}

type ResourceEntry = Disposable | Material[];

const hasDispose = (resource: unknown): resource is Disposable => {
  return typeof resource === 'object' && resource !== null && 'dispose' in resource && typeof resource.dispose === 'function';
};

export class ResourceManager {
  private readonly groups = new Map<string, Set<ResourceEntry>>();
  private readonly disposed = new WeakSet<object>();

  registerGroup(groupName: string): void {
    if (!this.groups.has(groupName)) {
      this.groups.set(groupName, new Set<ResourceEntry>());
    }
  }

  registerDisposable(groupName: string, resource: ResourceEntry): void {
    this.registerGroup(groupName);
    this.groups.get(groupName)?.add(resource);
  }

  releaseGroup(groupName: string): void {
    const group = this.groups.get(groupName);
    if (!group) {
      return;
    }

    group.forEach((resource) => this.disposeResource(resource));
    group.clear();
    this.groups.delete(groupName);
  }

  releaseAll(): void {
    Array.from(this.groups.keys()).forEach((groupName) => this.releaseGroup(groupName));
  }

  destroy(): void {
    this.releaseAll();
  }

  private disposeResource(resource: ResourceEntry): void {
    if (Array.isArray(resource)) {
      resource.forEach((material) => this.disposeOnce(material));
      return;
    }

    if (
      resource instanceof BufferGeometry ||
      resource instanceof Material ||
      resource instanceof Texture ||
      resource instanceof WebGLRenderTarget ||
      hasDispose(resource)
    ) {
      this.disposeOnce(resource);
    }
  }

  private disposeOnce(resource: Disposable): void {
    if (this.disposed.has(resource)) {
      return;
    }

    resource.dispose();
    this.disposed.add(resource);
  }
}

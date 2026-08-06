import type { AppLifecycleTarget } from './app.types';

export class AppLifecycle {
  private registered = false;

  constructor(private readonly target: AppLifecycleTarget) {}

  register(): void {
    if (this.registered) {
      return;
    }

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    this.registered = true;
  }

  unregister(): void {
    if (!this.registered) {
      return;
    }

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.registered = false;
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.target.pause();
      return;
    }

    this.target.resume();
  };

  private readonly handleBeforeUnload = (): void => {
    this.target.destroy();
    this.unregister();
  };
}

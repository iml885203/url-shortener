export const config = {
  get baseUrl(): string {
    return (window as any).__CONFIG__?.baseUrl ?? window.location.origin;
  },
};

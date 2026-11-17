export const config = {
  get baseUrl(): string {
    return (window as Window & { __CONFIG__?: { baseUrl?: string } }).__CONFIG__?.baseUrl ?? window.location.origin;
  },
};

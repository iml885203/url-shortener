export type ThemePreference = 'system' | 'light' | 'dark';
export function initTheme(storageKey: string): {
  readonly preference: ThemePreference;
  setPreference(value: ThemePreference): void;
  dispose(): void;
};

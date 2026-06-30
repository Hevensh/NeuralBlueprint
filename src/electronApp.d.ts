export {};

declare global {
  interface Window {
    neuralBlueprintApp?: {
      quit: () => Promise<void>;
    };
  }
}

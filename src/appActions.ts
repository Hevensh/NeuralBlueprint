export function exitApplication() {
  const closePage = () => {
    window.close();
    window.setTimeout(() => {
      if (!window.closed) window.location.href = 'about:blank';
    }, 120);
  };

  if (window.neuralBlueprintApp) {
    void window.neuralBlueprintApp.quit().finally(closePage);
    return;
  }

  void fetch('/__neural-blueprint-exit', { method: 'POST' }).finally(closePage);
}

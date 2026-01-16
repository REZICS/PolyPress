import {webUtils} from 'electron';

declare global {
  interface Window {
    __polypressNativeDropInstalled?: boolean;
  }
}

export async function nativeDropEventHandler() {
  // Avoid installing duplicate listeners if multiple components call this.
  if (window.__polypressNativeDropInstalled) return;
  window.__polypressNativeDropInstalled = true;

  // Required to allow dropping and to prevent the browser from navigating.
  window.addEventListener('dragover', (event) => {
    event.preventDefault();
  });

  window.addEventListener('drop', (event) => {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    const paths: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const p = webUtils.getPathForFile(file);
        if (p) paths.push(p);
      } catch {
        // Ignore files we can't resolve.
      }
    }

    window.dispatchEvent(new CustomEvent('native-drop', {detail: paths}));
  });
}

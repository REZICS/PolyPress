import { BrowserView, BrowserWindow } from 'electron';

import { Menu } from 'electron';

import { compileInject } from '../script/compileInject';

import { dirname, join } from 'node:path';

let updateWindow: BrowserWindow | null = null;
let updateView: BrowserView | null = null;

let detachMainWindowSync: (() => void) | null = null;

export type OpenPublicationUpdateWindowArgs = {
  /**
   * The window whose size/position should be mirrored.
   * If omitted, we will try to use the currently focused window.
   */
  mainWindow?: BrowserWindow | null;

  /**
   * Optional URL to load in the BrowserView.
   * Defaults to about:blank.
   */
  url?: string;

  /**
   * Optional window title.
   */
  title?: string;

  /**
   * update content text
   */
  contentText: string;
};

function ensureUpdateWindow(mainWindow: BrowserWindow | null): BrowserWindow {
  if (updateWindow && !updateWindow.isDestroyed()) return updateWindow;

  const ref = mainWindow ?? BrowserWindow.getFocusedWindow() ?? null;
  const bounds = ref?.getBounds() ?? {
    x: undefined,
    y: undefined,
    width: 1200,
    height: 900,
  };

  updateWindow = new BrowserWindow({
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    show: true,
    // alwaysOnTop: true,
    title: 'Updating…',
    // autoHideMenuBar: true,
    webPreferences: {
      // The window itself doesn't render web content; the BrowserView does.
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // updateWindow.setAlwaysOnTop(true, 'screen-saver');
  updateWindow.setVisibleOnAllWorkspaces(true);

  updateWindow.on('closed', () => {
    updateWindow = null;
    updateView = null;
    if (detachMainWindowSync) {
      detachMainWindowSync();
      detachMainWindowSync = null;
    }
  });

  return updateWindow;
}

function attachDevMenu(win: BrowserWindow) {
  const menu = Menu.buildFromTemplate([
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle DevTools',
          accelerator: 'CmdOrCtrl+Alt+I',
          click: () => {
            // ⚠️ DevTools 要开在 BrowserView 的 webContents 上
            win.getBrowserView()?.webContents.openDevTools({ mode: 'detach' });
          },
        },
        { role: 'reload' },
      ],
    },
  ]);

  win.setMenu(menu);
}

function ensureBrowserView(win: BrowserWindow): BrowserView {
  if (updateView) return updateView;

  updateView = new BrowserView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.setBrowserView(updateView);
  const syncViewBounds = () => {
    const [width, height] = win.getSize();
    updateView?.setBounds({ x: 0, y: 0, width, height });
  };
  syncViewBounds();

  win.on('resize', syncViewBounds);

  return updateView;
}

export function openPublicationUpdateWindow(
  args: OpenPublicationUpdateWindowArgs,
) {
  const mainWindow =
    args.mainWindow ?? BrowserWindow.getFocusedWindow() ?? null;
  const win = ensureUpdateWindow(mainWindow);
  attachDevMenu(win);

  if (args.title) win.setTitle(args.title);
  win.show();
  win.focus();

  const view = ensureBrowserView(win);
  const targetUrl = String(args.url ?? '').trim() || 'about:blank';
  
  const scriptDir = 'D:/ICS/Projects/PolyPress/src/main/src/script/'

  // When the page finishes loading, inject the marker UI.
  const injectOnce = async () => {
    try {
      const noticeComponentJS = await compileInject(join(scriptDir, 'noticeComponent.ts'));
      await view.webContents.executeJavaScript(noticeComponentJS);
      const updatePenanaJS = await compileInject(join(scriptDir, 'updatePenana.ts'));
      await view.webContents.executeJavaScript(
        updatePenanaJS,
      );
      await view.webContents.executeJavaScript(
        `window.__updatePenana__(${JSON.stringify({
          text: args.contentText,
        })});`,
      );
    } catch (e) {
      console.error('[publication:updateWindow] inject failed', e);
    }
  };

  // For about:blank this fires quickly; for remote sites it will wait.
  view.webContents.once('did-finish-load', () => {
    void injectOnce();
  });

  // Load the target page.
  void view.webContents.loadURL(targetUrl);
}

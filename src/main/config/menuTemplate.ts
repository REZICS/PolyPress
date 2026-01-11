import { shell } from "electron";

export const menuTemplate: Electron.MenuItemConstructorOptions[] = [
  {
    label: 'File',
    submenu: [
      {
        label: 'Exit',
        role: 'quit',
      },
    ],
  },
  {
    label: 'Edit',
    submenu: [
      {role: 'undo'},
      {role: 'redo'},
      {type: 'separator'},
      {role: 'cut'},
      {role: 'copy'},
      {role: 'paste'},
    ],
  },
  {
    label: 'View',
    submenu: [
      {role: 'reload'},
      {role: 'forceReload'},
      {role: 'toggleDevTools'},
      {type: 'separator'},
      {role: 'resetZoom'},
      {role: 'zoomIn'},
      {role: 'zoomOut'},
      {type: 'separator'},
      {role: 'minimize'},
      {role: 'togglefullscreen'},
    ],
  },
  {
    label: 'Help',
    submenu: [
      {
        label: 'Github',
        click: () => {
          shell.openExternal("https://github.com/REZICS/PolyPress");
        },
      },
    ],
  },
];

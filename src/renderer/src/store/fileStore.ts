import { create } from "zustand";

interface FileState {
  fileText: string;
  setFileText: (text: string) => void;
}

export const fileStore = create<FileState>((set) => ({
  fileText: '',
  setFileText: (text) => set({ fileText: text }),
}));

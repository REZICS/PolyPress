export {}

declare global {
  interface Window {
    api: {
      // 这里写你真正暴露的内容
      ping(): Promise<string>
    }
  }
}

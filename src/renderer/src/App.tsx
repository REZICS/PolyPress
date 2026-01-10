import React from 'react'

export default function App() {
  const versions = window.api?.versions

  return (
    <div className="container">
      <header className="header">
        <h1>PolyPress</h1>
        <p className="subtitle">electron-vite + electron-builder + React</p>
      </header>

      <section className="card">
        <h2>Runtime Versions</h2>
        <ul className="kv">
          <li>
            <span className="k">Electron</span>
            <span className="v">{versions?.electron ?? '-'}</span>
          </li>
          <li>
            <span className="k">Chromium</span>
            <span className="v">{versions?.chrome ?? '-'}</span>
          </li>
          <li>
            <span className="k">Node.js</span>
            <span className="v">{versions?.node ?? '-'}</span>
          </li>
        </ul>
        <p className="hint">
          这些数据来自 preload（<code>contextBridge</code>），渲染进程不启用 Node 集成。
        </p>
      </section>
    </div>
  )
}


function noticeComponent() {
  const ID = '__polypress_injected_banner__';
  const EVENT = '__polypress_banner_update__';

  let el = document.getElementById(ID);
  if (!el) {
    el = document.createElement('div');
    el.id = ID;
    el.style.position = 'fixed';
    el.style.top = '16px';
    el.style.right = '16px';
    el.style.zIndex = '2147483647';
    el.style.background = 'rgba(17, 24, 39, 0.92)';
    el.style.color = '#fff';
    el.style.padding = '10px 12px';
    el.style.borderRadius = '10px';
    el.style.fontSize = '12px';
    el.style.fontFamily =
      'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
    el.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.35)';
    el.style.pointerEvents = 'none';
    el.textContent = 'PolyPress 注入成功';

    document.documentElement.appendChild(el);
  }

  // 监听自定义事件
  window.addEventListener(EVENT, (e: any) => {
    const detail = e.detail || {};
    if (typeof detail.text === 'string') {
      el.textContent = detail.text;
    }

    if (detail.visible === false) {
      el.style.display = 'none';
    } else if (detail.visible === true) {
      el.style.display = 'block';
    }

    if (detail.style && typeof detail.style === 'object') {
      Object.assign(el.style, detail.style);
    }
  });
}

export type WindowDispatchEventOptions = {
  text?: string;
  visible?: boolean;
  style?: {
    background?: string;
  };
};

export function windowDispatchEvent(options: WindowDispatchEventOptions) {
  const { text, visible, style } = options;
  window.dispatchEvent(
    new CustomEvent('__polypress_banner_update__', {
      detail: {
        text: text ?? 'Default Notice',
        visible: visible ?? true,
        style: {
          background: style?.background ?? 'rgba(59, 130, 246, 0.9)',
        },
      },
    }),
  );
}


noticeComponent()

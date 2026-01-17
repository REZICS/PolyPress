import { waitForSelector } from './util/waitForSelector';
import { windowDispatchEvent } from './noticeComponent';

const CONTENT_SELECTOR = '#content';
const UPDATE_BUTTON_SELECTOR = '#updatedraft';
const UPDATE_CONFIRM_SELECTOR = '.qtip-yes.qtip-yes-ok';

async function onInit(init) {
  if (init) {
    console.log('init', init);
    windowDispatchEvent({ text: '自动更新脚本初始化成功' });
  }
}

async function injectContent(content: string) {
  const el = document.querySelector(CONTENT_SELECTOR);
  if (!el) return;
  (el as HTMLElement).focus();
  el.innerHTML = '';
  const text = content;
  document.execCommand('insertText', false, text);
}

async function onSubmit() {
  const el = document.querySelector(UPDATE_BUTTON_SELECTOR);
  if (!el) return;
  (el as HTMLElement).click();
  windowDispatchEvent({ text: '提交中' });
}

async function onConfirm() {
  const el = document.querySelector(UPDATE_CONFIRM_SELECTOR);
  if (!el) return;
  (el as HTMLElement).click();
  windowDispatchEvent({ text: '确认提交' });
}

async function updatePenana(init?: { text?: string }) {
  await onInit(init);
  await waitForSelector(CONTENT_SELECTOR);
  await injectContent(init?.text ?? '');
  await onSubmit();
  await waitForSelector(UPDATE_CONFIRM_SELECTOR);
  await onConfirm();
}

; (window as any).__updatePenana__ = updatePenana

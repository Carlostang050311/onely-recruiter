// 静态模式 fetch 遮罩：模块加载时（早于任何组件 effect）替换 window.fetch，
// 使页面代码在静态/服务端两种模式下保持零改动。
import { handleApi } from './clientApi';

declare global {
  interface Window {
    __onelyStaticFetchInstalled?: boolean;
  }
}

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_STATIC === '1' && !window.__onelyStaticFetchInstalled) {
  window.__onelyStaticFetchInstalled = true;
  const real = window.fetch.bind(window);
  window.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const m = url.match(/\/api\/(.*)$/);
    if (!m) return real(input, init);
    return handleApi(m[1], (init ?? {}) as RequestInit);
  }) as typeof window.fetch;
}

export {};

import { describe, expect, it } from 'vitest';
import { blobWorkerErlaubtNachCsp } from './taktgeber';

describe('blobWorkerErlaubtNachCsp', () => {
  it('erlaubt ohne CSP-Angabe', () => {
    expect(blobWorkerErlaubtNachCsp(null)).toBe(true);
    expect(blobWorkerErlaubtNachCsp(undefined)).toBe(true);
    expect(blobWorkerErlaubtNachCsp('')).toBe(true);
  });

  it('erlaubt, wenn worker-src blob: enthält', () => {
    expect(blobWorkerErlaubtNachCsp("worker-src 'self' blob:")).toBe(true);
  });

  it('verweigert, wenn worker-src ohne blob: gesetzt ist', () => {
    expect(blobWorkerErlaubtNachCsp("worker-src 'self'")).toBe(false);
  });

  it('fällt ohne worker-src auf script-src zurück - wie Browser es tun', () => {
    expect(blobWorkerErlaubtNachCsp("script-src 'unsafe-inline'")).toBe(false);
    expect(blobWorkerErlaubtNachCsp("script-src 'unsafe-inline' blob:")).toBe(true);
  });

  it('fällt ohne worker-src/script-src auf default-src zurück', () => {
    expect(blobWorkerErlaubtNachCsp("default-src 'none'")).toBe(false);
    expect(blobWorkerErlaubtNachCsp("default-src 'self' blob:")).toBe(true);
  });

  it('worker-src hat Vorrang vor script-src', () => {
    expect(blobWorkerErlaubtNachCsp("script-src 'unsafe-inline' blob:; worker-src 'self'")).toBe(
      false,
    );
  });

  it('erlaubt bei Wildcard-Quelle', () => {
    expect(blobWorkerErlaubtNachCsp('worker-src *')).toBe(true);
  });

  it('kommt mit mehreren, durch Semikolon getrennten Richtlinien klar', () => {
    expect(
      blobWorkerErlaubtNachCsp("default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'"),
    ).toBe(false);
  });
});

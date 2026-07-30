import { describe, expect, it } from 'vitest';
import { erzeugeLokalenTransport } from './lokalerTransport';
import type { SitzungsNachricht } from './protokoll';

describe('erzeugeLokalenTransport', () => {
  it('meldet "verbunden", sobald der Kanal steht - synchron, ohne Handshake', () => {
    const stati: string[] = [];
    const transport = erzeugeLokalenTransport(
      'TESTA',
      () => {},
      (status) => stati.push(status),
    );
    expect(stati).toEqual(['verbunden']);
    transport.schliessen();
  });

  it('stellt eine gesendete Nachricht einem zweiten Transport mit demselben Code zu', async () => {
    const empfangen: SitzungsNachricht[] = [];
    const a = erzeugeLokalenTransport('TESTB', () => {});
    const b = erzeugeLokalenTransport('TESTB', (nachricht) => empfangen.push(nachricht));

    a.senden({ typ: 'verlassen', spielerId: 's-1' });
    await new Promise((resolve) => setTimeout(resolve, 10));

    expect(empfangen).toEqual([{ typ: 'verlassen', spielerId: 's-1' }]);
    a.schliessen();
    b.schliessen();
  });
});

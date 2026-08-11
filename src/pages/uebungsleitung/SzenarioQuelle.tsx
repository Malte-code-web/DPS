import { lazy, Suspense } from 'react';
import { BaukastenGenerator } from './BaukastenGenerator';
import type { Szenario } from '../../domain/types';

/**
 * Erst beim Umschalten auf "Sprachmodell" geladen: `KiGenerator` zieht das
 * Anthropic-SDK nach sich (→ `ki.client`), das sonst im Bundle **jedes**
 * Spielers landet - obwohl es nur die Übungsleitung beim Szenario-Bauen je
 * braucht. Das sind rund 300 kB, die niemand im Einsatz herunterlädt.
 */
const KiGenerator = lazy(() =>
  import('./KiGenerator').then((modul) => ({ default: modul.KiGenerator })),
);

/**
 * @anker ui.szenarioquelle Zwei Wege zu einer neuen Lage - kostenfrei oder per Modell
 *
 * Der Baukasten steht vorn und ist voreingestellt: Er kostet nichts, braucht
 * keinen Zugang und läuft auch offline. Das Sprachmodell daneben kann dafür
 * eine frei beschriebene Lage umsetzen, die im Baukasten nicht vorgesehen ist.
 */
export type Quelle = 'baukasten' | 'modell';

interface Props {
  onEntwurf: (szenario: Szenario) => void;
  onMeldung: (text: string) => void;
  /**
   * Die Wahl liegt eine Ebene höher: Beim Öffnen des Editors verschwindet diese
   * Karte, und wer gerade über das Modell gebaut hat, soll danach nicht wieder
   * auf dem Baukasten stehen.
   */
  quelle: Quelle;
  onQuelle: (quelle: Quelle) => void;
}

export function SzenarioQuelle({ onEntwurf, onMeldung, quelle, onQuelle }: Props) {
  return (
    <section className="karte ki-karte">
      <h3>Szenario erzeugen lassen</h3>

      <div className="quelle-wahl" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={quelle === 'baukasten'}
          className={quelle === 'baukasten' ? 'quelle-aktiv' : ''}
          onClick={() => onQuelle('baukasten')}
        >
          Baukasten
          <span className="quelle-marke">kostenfrei, offline</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={quelle === 'modell'}
          className={quelle === 'modell' ? 'quelle-aktiv' : ''}
          onClick={() => onQuelle('modell')}
        >
          Sprachmodell
          <span className="quelle-marke">freie Lage, kostenpflichtig</span>
        </button>
      </div>

      {quelle === 'baukasten' ? (
        <BaukastenGenerator onEntwurf={onEntwurf} onMeldung={onMeldung} />
      ) : (
        <Suspense fallback={<p className="hinweis">Modell-Anbindung wird geladen …</p>}>
          <KiGenerator onEntwurf={onEntwurf} onMeldung={onMeldung} />
        </Suspense>
      )}
    </section>
  );
}

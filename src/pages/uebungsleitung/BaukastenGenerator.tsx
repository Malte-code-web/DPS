import { useState } from 'react';
import { erzeugeSzenarioLokal, LAGEN_LISTE } from '../../domain/szenarioGenerator';
import type { GeneratorWunsch, LageId } from '../../domain/szenarioGenerator';
import type { Szenario } from '../../domain/types';

/**
 * @anker ui.baukasten Kostenfrei erzeugen - ohne Schlüssel, ohne Netz
 *
 * Zwei Auswahlfelder und ein Knopf. Weil der Baukasten die Verlaufswerte aus
 * der Zielminute zurückrechnet, entsteht das Szenario ohne Wartezeit und ohne
 * Nachbesserungsschleife - es besteht den Probelauf bereits.
 *
 * Die Saat macht das Ergebnis wiederholbar: dieselbe Zahl ergibt dieselbe Lage.
 * Damit lässt sich eine Übung an einem anderen Tag oder auf einem anderen Gerät
 * exakt wiederholen, ohne die Datei weiterzugeben.
 */
interface Props {
  onEntwurf: (szenario: Szenario) => void;
  onMeldung: (text: string) => void;
}

const neueSaat = () => Math.floor(Math.random() * 100000);

export function BaukastenGenerator({ onEntwurf, onMeldung }: Props) {
  const [wunsch, setWunsch] = useState<GeneratorWunsch>({
    lage: 'verkehr',
    anzahl: 8,
    saat: neueSaat(),
  });

  const baue = (mitSaat: number) => {
    const szenario = erzeugeSzenarioLokal({ ...wunsch, saat: mitSaat });
    setWunsch({ ...wunsch, saat: mitSaat });
    onEntwurf(szenario);
    onMeldung(`"${szenario.titel}" gebaut - jetzt ansehen, anpassen und sichern.`);
  };

  return (
    <>
      <p className="hinweis">
        Aus einem Vorrat an Verletzungsmustern, direkt im Browser. Kostenfrei, ohne Zugang und
        ohne Internet. Die Verläufe werden aus der gewünschten Todesminute zurückgerechnet - jedes
        Szenario besteht den Probelauf von vornherein.
      </p>

      <div className="editor-zeile">
        <label>
          Lage
          <select
            value={wunsch.lage}
            onChange={(e) => setWunsch({ ...wunsch, lage: e.target.value as LageId })}
          >
            {LAGEN_LISTE.map((lage) => (
              <option key={lage.id} value={lage.id}>
                {lage.titel}
              </option>
            ))}
          </select>
        </label>
        <label>
          Betroffene
          <input
            type="number"
            min={3}
            max={30}
            value={wunsch.anzahl}
            onChange={(e) => setWunsch({ ...wunsch, anzahl: Number(e.target.value) })}
          />
        </label>
        <label>
          Saat
          <input
            type="number"
            value={wunsch.saat}
            onChange={(e) => setWunsch({ ...wunsch, saat: Number(e.target.value) })}
          />
        </label>
      </div>

      <p className="hinweis">
        Gleiche Saat, gleiche Lage: Notiere die Zahl, um dieselbe Übung später erneut zu bauen.
      </p>

      <div className="editor-aktionen">
        <button type="button" className="primaer" onClick={() => baue(wunsch.saat)}>
          Szenario bauen
        </button>
        <button type="button" onClick={() => baue(neueSaat())}>
          Neu würfeln
        </button>
      </div>
    </>
  );
}

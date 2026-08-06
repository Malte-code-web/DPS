import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  fehler: Error | null;
  info: ErrorInfo | null;
  kopiert: boolean;
}

/**
 * @anker ui.fehlergrenze Fängt Renderfehler ab, statt die Seite weiß werden zu lassen
 *
 * Ohne Error Boundary reißt ein einzelner unerwarteter Renderfehler die
 * gesamte Anwendung ab - React zeigt dann nur noch eine weiße Seite, ohne
 * Erklärung und ohne Weg zurück. Für ein Werkzeug, das live während einer
 * laufenden Übung auf dem Gerät der Übungsleitung läuft, ist das kein
 * kosmetischer Fehler: Ein einzelner unerwarteter Zustand reißt die ganze
 * Übung ab, für alle Teilnehmenden gleichzeitig.
 *
 * Bewusst nur ein Weg zurück - Neuladen - statt eines "Weiter versuchen":
 * Ein erneutes Rendern desselben Zustands crasht im Regelfall wieder, ein
 * vorgetäuschter Ausweg wäre schlimmer als der klare Neustart. Die
 * technischen Details sind zum Melden gedacht, nicht zum Selbstbehandeln -
 * Fehlerursachen im gerenderten Zustand lassen sich hier nicht reparieren.
 *
 * Muss eine Klassenkomponente sein: `getDerivedStateFromError` und
 * `componentDidCatch` haben keine Hook-Entsprechung.
 */
export class Fehlergrenze extends Component<Props, State> {
  state: State = { fehler: null, info: null, kopiert: false };

  static getDerivedStateFromError(fehler: Error): Pick<State, 'fehler'> {
    return { fehler };
  }

  componentDidCatch(fehler: Error, info: ErrorInfo) {
    console.error('Unerwarteter Renderfehler:', fehler, info.componentStack);
    this.setState({ info });
  }

  private kopiereDetails = () => {
    const text = `${this.state.fehler?.stack ?? this.state.fehler?.message ?? ''}\n${
      this.state.info?.componentStack ?? ''
    }`.trim();
    void navigator.clipboard
      ?.writeText(text)
      .then(() => {
        this.setState({ kopiert: true });
        setTimeout(() => this.setState({ kopiert: false }), 2000);
      })
      .catch(() => {});
  };

  render() {
    const { fehler, info, kopiert } = this.state;
    if (!fehler) return this.props.children;

    return (
      <main className="fehlergrenze">
        <div className="fehlergrenze-karte">
          <h1>Unerwarteter Fehler</h1>
          <p>
            Hier ist etwas schiefgelaufen, das die Anwendung nicht mehr sicher darstellen kann.
            Der aktuelle Stand der Übung geht dabei verloren - am schnellsten geht es mit einem
            Neuladen der Seite weiter.
          </p>
          <button type="button" className="primaer" onClick={() => window.location.reload()}>
            Seite neu laden
          </button>
          <details className="fehlergrenze-details">
            <summary>Technische Details</summary>
            <pre>{fehler.stack ?? fehler.message}</pre>
            {info && <pre>{info.componentStack}</pre>}
            <button type="button" onClick={this.kopiereDetails}>
              {kopiert ? 'Kopiert' : 'Details kopieren'}
            </button>
          </details>
        </div>
      </main>
    );
  }
}

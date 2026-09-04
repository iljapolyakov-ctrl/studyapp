# StudyApp (Web) – Setup-Anleitung

Eine Progressive Web App für **iPhone + Windows/Surface Studio**, läuft im Browser auf
beiden Geräten identisch, speichert direkt in deinem **OneDrive**. Kein Xcode, kein Mac,
kein eigener Server nötig.

## Funktionsübersicht (Stand v2)

- **Aufgaben**: Tabelle mit Fach/Projekt (inkl. "+ Neu" direkt im Formular) → Auftrag
  (inkl. Link/Datei-Anhang) → Zuständige Person → Deadline → Erledigt-Kästchen ganz rechts.
  Erledigte Aufgaben rutschen automatisch ans Ende, offene sind nach Deadline sortiert oben.
- **Notizen**: eine Seite pro Notiz, **Freihand und Text gemischt auf derselben Fläche**
  (grosse Zeichenfläche, zoombar per Mausrad/Pinch-Geste, verschiebbar), im Vollbild.
- **Stundenplan**: echte Wochenansicht mit Stunden auf der Y-Achse, Wochentagen als Spalten,
  wöchentlich wiederkehrenden Vorlesungsblöcken in Fach-Farbe, Wochen-Navigation (‹ › Heute),
  und Deadlines aus den Aufgaben als farbige Chips am jeweiligen Tag.
- **Fächer / Projekte**: Gesamtübersicht — pro Fach alle zugehörigen Notizen, Aufgaben
  (inkl. verlinkter Dateien) und Stundenplan-Einträge, mit Filter auf ein einzelnes Fach.
- **Mini-Kalender** oben rechts: Monatsansicht, Tage mit Deadlines farbig markiert,
  anklickbar für eine Liste der fälligen Aufgaben, Monate vor/zurück navigierbar.
- **Reiter oben** (Aufgaben/Notizen/Stundenplan/Fächer) sind per Ziehen (Maus oder Touch)
  in eine persönliche Reihenfolge bringbar — wird gespeichert und synchronisiert.
- **Backup**: ⬇/⬆-Symbole oben rechts exportieren bzw. importieren alle Daten als JSON-Datei
  — unabhängig von OneDrive, für den Fall, dass du mal einen Stand sichern willst.

## Was du brauchst

- Ein GitHub-Konto (kostenlos) – oder eine andere Möglichkeit, statische Dateien zu hosten
- Deinen normalen Microsoft-Account (den, mit dem du OneDrive nutzt)
- Zugriff auf portal.azure.com für eine kostenlose App-Registrierung

## 1. Azure App-Registrierung (einmalig)

Siehe die ausführliche Klick-für-Klick-Anleitung, die wir im Chat bereits durchgegangen sind
(Suche "App registrations" im Azure-Portal, Kontotyp "Personal Microsoft accounts only",
Redirect-URI-Typ **"Single-page application (SPA)"**, Berechtigungen
`Files.ReadWrite.AppFolder` + `User.Read`).

## 2. Konfiguration eintragen

`js/config.js` öffnen (z. B. in VS Code, **nicht** per Doppelklick im Explorer öffnen — das
startet den Windows Script Host, nicht den Code) und die `clientId` aus Azure eintragen.

## 3. Lokal testen (bevor du hochlädst)

VS Code → Ordner öffnen → Erweiterung "Live Server" installieren → Rechtsklick auf
`index.html` → "Open with Live Server". Läuft dann unter `http://localhost:5500` — das
muss als Redirect-URI in Azure hinterlegt sein.

## 4. Auf deine Geräte bringen (nach dem lokalen Test)

Der lokale Live-Server läuft nur auf deinem Surface Studio, solange VS Code offen ist —
das iPhone kann diese Adresse nicht erreichen. Um die App auf **beiden** Geräten dauerhaft
nutzbar zu machen, muss sie unter einer echten, dauerhaft erreichbaren Adresse im Internet
liegen. Das nennt man "hosten" — dafür brauchst du keinen eigenen Server, ein kostenloser
statischer Hosting-Dienst reicht:

1. **GitHub-Repository anlegen**: auf github.com ein neues (gerne privates) Repository
   erstellen, z. B. `studyapp`
2. **Dateien hochladen**: den ganzen Ordnerinhalt (`index.html`, `manifest.json`, `sw.js`,
   `css/`, `js/`, `icons/`) per Drag & Drop im Browser ins Repository ziehen und committen
   — oder falls du Git schon kennst, per `git push`
3. **GitHub Pages aktivieren**: Repository → Settings → Pages → Branch `main`,
   Ordner `/ (root)` → Speichern. Nach 1–2 Minuten ist die App live unter
   `https://deinname.github.io/studyapp/`
4. **Diese echte Adresse in Azure nachtragen**: App-Registrierung → Authentication →
   bei "Single-page application" die GitHub-Pages-URL **zusätzlich** zu `localhost:5500`
   eintragen (beide können gleichzeitig drinstehen)
5. **Auf dem iPhone installieren**: die GitHub-Pages-URL in Safari öffnen → Teilen-Symbol →
   "Zum Home-Bildschirm" → verhält sich danach wie eine normale App (eigenes Icon)
6. **Auf dem Surface Studio installieren**: dieselbe URL in Edge öffnen → in der
   Adressleiste auf das Installieren-Symbol klicken → erscheint als eigenständige App
   im Startmenü
7. **Anmelden**: auf beiden Geräten mit demselben Microsoft-Konto anmelden — danach
   synchronisieren beide über deinen OneDrive-App-Ordner

**Alternative zu GitHub Pages:** Netlify (app.netlify.com) — dort kannst du den Ordner
einfach per Drag & Drop hochladen, ganz ohne Git/GitHub-Kenntnisse. Funktionsweise sonst
identisch (Schritt 4–7 bleiben gleich, nur die URL sieht anders aus).

## Wie die Synchronisation funktioniert

- Jede Änderung wird sofort lokal gespeichert (funktioniert auch offline)
- Nach kurzer Inaktivität wird zusätzlich `studyapp-data.json` in deinem OneDrive
  (`Apps/StudyApp/`) geschrieben — die App hat **keinen** Zugriff auf den Rest deines OneDrives
- Öffnest du die App auf dem zweiten Gerät mit demselben Microsoft-Konto, wird dieser Stand
  geladen

## Bewusste Einschränkungen (ehrlich, nicht schöngeredet)

- **Kein echtes Konflikt-Management.** Schreiben beide Geräte offline gleichzeitig, gewinnt
  beim nächsten Sync die zuletzt gespeicherte Version komplett. Für den Alltag als
  Einzelnutzer i. d. R. kein Problem.
- **Notiz-Canvas ist eine eigene, funktionierende Annäherung an OneNote** — kein
  Bild-Einfügen, keine Handschrifterkennung, keine echte unendliche Seite (aber eine
  grosse, mehrere Bildschirme umfassende Fläche von 4000×3000 Punkten).
  Kein Layer-Undo pro Element, nur ein globales "letztes Element rückgängig machen".
- **Stundenplan ist "wöchentlich wiederkehrend" von Natur aus** (kein Outlook-Feature-Umfang
  wie Ausnahmen, Serientermine mit Enddatum, Einladungen). Einmalige Termine (z. B. eine
  Prüfung an einem bestimmten Datum) gehören als Aufgabe mit Deadline erfasst, nicht in
  den Stundenplan.
- **Datei-Anhänge**: einfacher Upload funktioniert bis 4 MB. Grössere Dateien: in OneDrive
  normal ablegen und den Freigabe-Link über die "Link"-Option bei der Aufgabe eintragen.
- **Kein Teilen mit anderen Personen**, keine Push-Benachrichtigungen. Das JSON-Backup
  (⬇/⬆ oben rechts) ersetzt kein Teilen, ist aber eine einfache Sicherheitskopie.

## Nächste sinnvolle Schritte

1. Azure-Registrierung + `config.js` ausfüllen, lokal testen, dann hosten (siehe oben)
2. Auf beiden Geräten öffnen, anmelden, prüfen ob eine auf dem Surface erstellte Aufgabe
   auf dem iPhone erscheint (und umgekehrt)
3. Icons in `icons/` durch ein eigenes Design ersetzen (aktuell nur Platzhalter)
4. Bei Bedarf: Web-Push-Benachrichtigungen für Deadlines, Volltextsuche

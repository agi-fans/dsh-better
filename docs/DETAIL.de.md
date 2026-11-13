![Live-Demo von /better in dsh-better](demo.gif)

# Prompt-Vertiefer (`dsh-better`)

`dsh-better` bringt codebasierte Prompt-Vertiefung (`/better`) und die Prüfung von Subagent-Briefings aus [`pi-better`](https://github.com/nicobailon/pi-better) in DeepSeek Harness.

1. `/better <Entwurf>` starten — das Eingabefeld bleibt sofort nutzbar, während ein schreibgeschützter Helfer im Hintergrund das Repository prüft.
2. `Erkunden → Erfassen → Vertiefen → Schärfen` verfolgen — das Depth-Panel zeigt aktive Tool-Badges und Streaming-Fortschritt bei voller KV-Cache-Wiederverwendung.
3. Vor dem Senden prüfen — der vertiefte Prompt landet direkt im Eingabefeld mit Ein-Klick-Option **Original wiederherstellen** und wird erst mit `Enter` gesendet.

## Einstellungsreferenz (abgeleitet von `pi-better`)

Im ursprünglichen `pi-better` liegen die Optionen unter `"better"` mit `model` und `thinking`. `dsh-better` bietet volle Parität plus Subagent-Steuerung:

| Einstellung | Standard | Beschreibung |
| --- | --- | --- |
| `model` | `null` (Sitzung erben) | Modellroute (`provider/model`) oder Routing-Gruppe für `/better`. Das Erben des aktiven Gesprächsmodells nutzt den KV-Prompt-Cache weiter; ein anderes Modell wählt gezielt Qualität oder geringere Kosten. |
| `reasoningEffort` | `null` (`low` · schnell Standard) | Entspricht `thinking` in `pi-better` (`none`, `off`, `low`, `medium`, `high`, `max` oder `inherit`). Standardmäßig schnelles `low` (bei vollem KV-Cache-Erhalt), automatisch an das Zielmodell angepasst. |
| `checkSubagents` | `true` | Aktiviert oder deaktiviert die Vorabprüfung von Subagent-Prompts mit dem Präfix `/better`. |
| `briefModel` | `null` (wie `model`) | Optionales separates Modell ausschließlich für Subagent-`/better`-Prüfungen. |
| `briefReasoningEffort` | `null` (wie `reasoningEffort`) | Optionaler separater Denkaufwand ausschließlich für Subagent-`/better`-Prüfungen. |

## Konfiguration in DeepSeek Harness

1. **Einstellungsdialog**: Öffnen Sie unten links **Einstellungen → Prompt-Vertiefung** (Änderungen werden automatisch gespeichert).
2. **Plugins-Seite**: Öffnen Sie **Plugins → Prompt-Vertiefer (`@agi-fans/dsh-better`)** (oder die Zeile `@agi-fans/dsh-better#dsh-better`).
3. **Slash-Befehl (`/better-model`)**: Direkt im Chat oder in der CLI prüfen und ändern:
   - `/better-model` — aktuelle Einstellungen und verfügbare Modelle anzeigen
   - `/better-model <provider/model> [effort]` — Modell und optionalen Denkaufwand festlegen
   - `/better-model effort <level|inherit>` — nur den Denkaufwand ändern
   - `/better-model brief <same|inherit|<provider/model>> [effort]` — Modell für Subagent-Prüfungen festlegen
   - `/better-model subagents <on|off>` — Subagent-Prüfung live ein-/ausschalten
   - `/better-model reset [all]` — auf Sitzungsvererbung zurücksetzen (oder alle Felder zurücksetzen)

Änderungen über die GUI und `/better-model` werden atomar in `dsh-better.settings.json` des aktiven Profils gespeichert und gelten sofort ohne Neustart. Basis-Standardwerte stehen in `cordis.patch.yml`.

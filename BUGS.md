# Offene Punkte / Restfehler

## 1) Live-Verifikation des externen BAFE-Endpunktes in dieser Laufumgebung nicht möglich
- Ein direkter Laufzeit-Check gegen `https://bafe-production.up.railway.app` war in dieser Umgebung wegen Netzwerkfehler (`ENETUNREACH`) nicht möglich.
- Die Endpoint-Schema-Prüfung wurde daher statisch anhand der Request-Payloads im Code durchgeführt.

**Auswirkung:**
- Konkrete Serverantworten/Schemaänderungen auf Produktionsseite konnten nicht gegen den aktuellen Commit end-to-end verifiziert werden.

**Empfohlene nachhaltige Lösung:**
1. CI-Contract-Tests gegen erreichbare Staging-Instanz ergänzen.
2. OpenAPI/JSON-Schema des BAFE-Backends versioniert einbinden und Requests/Responses automatisiert validieren.

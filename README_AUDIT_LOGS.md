# Audit logs ready maken

## Wat is aangepast
- `/api/audit-logs` geeft nu echte logs terug.
- Create, update, deactivate en delete van Entra ID users schrijven automatisch een audit log.
- Standaard worden logs in JSON opgeslagen.
- Later kun je met `AUDIT_STORAGE=mysql` overschakelen naar MySQL.

## JSON mode
Gebruik bijvoorbeeld:

```env
AUDIT_STORAGE=json
AUDIT_LOG_FILE=/tmp/fonteyn_audit_logs.json
```

Let op: `/tmp` is prima voor een demo, maar niet permanent na container restart. Voor permanente cloud-opslag gebruik je later MySQL of een mounted volume.

## MySQL mode later
Gebruik:

```env
AUDIT_STORAGE=mysql
DB_HOST=...
DB_USER=...
DB_PASSWORD=...
DB_NAME=fonteyn_hr
```

De tabel `audit_logs` wordt automatisch aangemaakt.

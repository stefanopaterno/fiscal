# Data Model: Guide agli adempimenti

Nessuna tabella nel database. Tipi nel codice (`src/engine/regole/guide-adempimenti/tipi.ts`).

## Guida

| Campo | Tipo | Note |
|---|---|---|
| id | string | stabile, `[a-z0-9-]+`, usato in `/home/?guida=<id>` |
| gruppo | `apertura` \| `fattura` \| `versamenti` \| `dichiarazioni` \| `particolari` | FR-002 |
| titolo | string | ≤ 60 caratteri |
| riga | string | una riga di spiegazione, ≤ 120 |
| frequenza | `una_volta` \| `ogni_fattura` \| `ogni_trimestre` \| `ogni_mese` \| `ogni_anno` \| `se_serve` | |
| paroleChiave | string[] | sinonimi per la ricerca (es. «740», «Unico», «delega») |
| pertinenza | `sempre` \| `iva` \| `bollo` \| `sts` | etichetta «solo se…» quando non è `sempre` |
| inBreve | Testo | obbligatoria |
| quando | Testo | obbligatoria; può citare scadenze con segnaposto |
| doveSiFa | Testo | obbligatoria |
| cosaTiServe | Testo[] | facoltativa |
| passi | Passo[] | obbligatoria, ≥ 2 |
| campi | Campo[] | facoltativa («Cosa scrivere») |
| errori | Testo[] | facoltativa |
| parere | Testo | facoltativa: quando conviene un professionista (FR-013) |
| fonti | { nome, url, ufficiale }[] | ≥ 1, `https://` |
| ultimoControllo | `AAAA-MM-GG` | FR-008, FR-015 |
| stato | `verificata` \| `da_verificare` | |
| daVerificare | string[] | motivi delle parti incerte |
| apriInFiscal | { href, testo } | facoltativa (FR-010) |
| disegno | Disegno | facoltativa (FR-009) |

## Testo e segnaposto

`Testo` = stringa con segnaposto `{{chiave}}`. Chiavi ammesse:

- `{{f24.<chiave>}}` → codice tributo dal set F24 in vigore (014);
- `{{scadenza.<chiave>}}` → data della scadenza dell'anno in corso, spostata al primo giorno lavorativo (004);
- `{{fattura.<campo>}}` → aliquote e soglie di fatturazione in vigore oggi (percentuali ed euro formattati);
- `{{adempimenti.<chiave>}}` → valori del nuovo set (ATECO, natura N4, giorni per l'iscrizione ENPAP, soglia bollo);
- `{{enpap.<campo>}}` → aliquote ENPAP dell'anno.

Risoluzione: `componi(testo, { anno, oggi })` → `{ testo, daVerificare: string[] }`. Un segnaposto sconosciuto è un
errore di test (mai mostrato all'utente). Se la regola citata è «da verificare», la guida lo mostra accanto al valore.

## Passo

`numero` (1…n), `testo: Testo`, `casella?: string` (id della casella del disegno), `avvertenza?: Testo`.

## Campo («Cosa scrivere»)

`modulo` (es. «F24, sezione Erario»), `campo` (es. «codice tributo»), `valore: Testo` (spesso un segnaposto),
`aiuto: Testo` (il «?»).

## Disegno

`modulo`: `f24` \| `redditi` \| `inizio_attivita` \| `fattura`; `caselle: { id, etichetta, numeroPasso }[]`. Il disegno
è un componente per modulo; i dati dicono quali caselle evidenziare e con quale numero.

## Spunte (solo dispositivo)

`localStorage['fiscal.guide.spunte']` = `{ [idGuida]: number[] }` (numeri dei passi fatti). Nessun dato personale.

## Regole nuove

- `src/engine/regole/adempimenti/index.ts`: `RegoleAdempimenti = { anno, codiceAteco: Regola<{codice, descrizione}>,
  naturaEsente: Regola<string>, giorniIscrizioneEnpap: Regola<number>, sogliaAccorpamentoBollo: Regola<number> }`.
- `src/engine/regole/f24/base.ts`: chiavi `bollo_sanzione`, `bollo_interessi`, `ravv_irpef_sanzione`,
  `ravv_irpef_interessi`, `ravv_add_regionale_sanzione`, `ravv_add_regionale_interessi`,
  `ravv_add_comunale_sanzione`, `ravv_add_comunale_interessi` (stati in research.md R-03).
- Catalogo 014: chiavi `adempimenti.codice_ateco` (codice), `adempimenti.natura_esente` (codice),
  `adempimenti.giorni_iscrizione_enpap` (intero 30–365), `adempimenti.soglia_accorpamento_bollo` (euro); tutte per data.

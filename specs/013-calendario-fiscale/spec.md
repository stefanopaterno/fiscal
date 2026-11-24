# Feature Specification: Calendario fiscale (disegno informativo in home)

**Feature Branch**: `013-calendario-fiscale`

**Created**: 2026-11-24

**Status**: Implemented

**Input**: User description: "Sulla home un disegno a diagramma di flusso con i blocchi di tutti i controlli e adempimenti, le frecce che si seguono e le scadenze a partire dal 2027. Si apre come layer sopra a tutto, è solo informativo."

## Clarifications

### Session 2026-11-24

- Q: Dati veri o solo informativo? → A: solo informativo. Nessun dato dell'utente, nessun calcolo, nessuna cifra: è la rotta tipica dell'assetto dell'utente (psicologo ENPAP, regime ordinario, dipendente in cumulo, P.IVA da gennaio 2027). Le cifre esatte restano compito del resto dell'app.
- Q: Come si apre? → A: come layer (dialog modale) sopra a tutto, da un pulsante in home; si chiude e si torna alla home senza cambiare pagina.
- Q: Le date? → A: dal 2027 (apertura P.IVA) fino al regime, con le due scadenze F24 del 2028 in evidenza (30 giugno, 30 novembre). Le date 2028 valgono salvo proroghe; il punto ENPAP del primo anno è segnato «da verificare».

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Capire la sequenza di adempimenti e scadenze (Priority: P1)

Dalla home l'utente apre un disegno che spiega, a colpo d'occhio, come scorrono controlli, contributi e scadenze dal giorno in cui apre la partita IVA fino al regime: cosa succede a ogni fattura, quando si accantona, quando (e cosa) si versa. Serve a chi è al primo anno e non ha ancora in testa il calendario fiscale.

**Why this priority**: il primo anno di partita IVA l'ordine delle scadenze è la cosa più disorientante (si paga l'anno dopo, il primo anno non ha acconti); un disegno chiaro riduce l'ansia e gli errori di pianificazione.

**Independent Test**: dalla home, aprendo il calendario, compaiono le fasi dal 2027 al regime, i due punti-decisione (prestazione sanitaria/non sanitaria; IVA sì/no), le due scadenze del 2028 (30 giugno e 30 novembre) e la nota «niente acconti nel 2027»; chiudendo si torna alla home.

**Acceptance Scenarios**:

1. **Given** l'utente è in home, **When** tocca «Calendario fiscale», **Then** si apre un layer sopra a tutto con il diagramma dal 2027 al regime.
2. **Given** il calendario è aperto, **When** l'utente lo legge, **Then** vede le scadenze F24 del 30 giugno 2028 e del 30 novembre 2028 e la nota che nel 2027 non ci sono acconti.
3. **Given** il calendario è aperto, **When** l'utente tocca «Chiudi» (o fuori dal layer), **Then** il layer si chiude e resta sulla home.

### Edge Cases

- Il contenuto è statico: funziona anche senza rete e senza dati inseriti.
- Non mostra né richiede alcun importo o dato personale dell'utente.
- Le voci non confermate (ENPAP primo anno) sono marcate «da verificare», coerenti con il principio II della costituzione.

## Requirements *(mandatory)*

- **FR-001**: La home MUST offrire un pulsante che apre il calendario fiscale come layer (dialog modale) sopra al resto, con chiusura che riporta alla home senza navigare.
- **FR-002**: Il calendario MUST mostrare il flusso dal 2027 (apertura P.IVA) fino al regime, con blocchi, frecce di scorrimento e le fasi: apertura, durante l'anno, inizio 2028, versamenti 2028, regime.
- **FR-003**: Il calendario MUST evidenziare le scadenze F24 del 30 giugno 2028 e del 30 novembre 2028 e la nota «niente acconti nel 2027» (primo anno senza storico).
- **FR-004**: Il calendario MUST mostrare i due punti-decisione (prestazione sanitaria esente vs non sanitaria con IVA; solo esenti vs anche imponibili) con i rispettivi effetti (bollo, STS, SDI, liquidazioni IVA).
- **FR-005**: Il calendario MUST essere solo informativo: nessun dato dell'utente, nessun calcolo, nessuna cifra personale; le voci non confermate MUST essere marcate «da verificare».
- **FR-006**: Il calendario MUST rispettare il principio VI (Fluent UI 9, tema chiaro/scuro, nessuno scroll orizzontale dai 360 px, aree toccabili da 44 px) e il testo in italiano semplice.

## Success Criteria *(mandatory)*

- **SC-001**: Dalla home, in un tocco, l'utente apre il calendario e in un secondo tocco lo chiude.
- **SC-002**: Il calendario mostra, senza inserire alcun dato, l'intera sequenza dal 2027 al regime con le due scadenze del 2028 in evidenza.
- **SC-003**: Nessuna cifra o dato personale dell'utente compare nel disegno.

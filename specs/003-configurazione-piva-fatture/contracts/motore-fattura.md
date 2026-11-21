# Contratto: motore fiscale della fattura

**Piano**: [../plan.md](../plan.md) | **Ricerca**: [../research.md](../research.md) (R-01, R-02, R-03, R-09)

Modulo TypeScript puro in `src/engine/` (nessun import di UI, rete, browser). Importi in centesimi interi.

## `regolePerAnno(anno: number): RegoleFatturazione`

```ts
type Regola<T> = { valore: T; fonte: string; stato: 'verificata' | 'da_verificare' };
type RegoleFatturazione = {
  anno: number;
  aliquotaIntegrativo: Regola<number>;  // es. 0.04 nel 2027
  aliquotaIva: Regola<number>;          // 0.22
  sogliaBollo: Regola<number>;          // 7747 centesimi (strettamente maggiore)
  importoBollo: Regola<number>;         // 200 centesimi
  aliquotaRitenuta: Regola<number>;     // 0.20
  diciture: { esenzione: string; bollo: string; opposizioneSts: string };
};
```
Errore esplicito se l'anno non ha regole (mai valori inventati).

## `calcolaFattura(input): RisultatoFattura`

```ts
type RigaInput = { compenso: number; quantita?: number; natura: 'esente_sanitaria' | 'imponibile' };
type InputFattura = {
  anno: number;
  righe: RigaInput[];
  sostitutoImposta: boolean;
  bolloACarico: 'paziente' | 'professionista';
  opposizioneSts?: boolean;
};
type RisultatoFattura = {
  righe: Array<RigaInput & { totaleCompenso: number; integrativo: number }>;
  totaleCompensi: number; totaleIntegrativo: number;
  imponibileIva: number; iva: number; importoEsente: number;
  bollo: number; bolloAddebitato: boolean; ritenuta: number;
  totale: number; netto: number;
  diciture: string[];
  spiegazioni: string[];          // una frase semplice per ogni voce (principio II)
  regoleDaVerificare: string[];   // nomi delle regole usate non ancora verificate
};
```

Invarianti verificate dai test:
- `totale = imponibileIva + iva + importoEsente + (bolloAddebitato ? bollo : 0)`
- `netto = totale − ritenuta`; `ritenuta = 0` se `!sostitutoImposta`
- bollo solo se `importoEsente > sogliaBollo`
- integrativo e IVA mai negativi; righe vuote rifiutate.

## `quotaImponibile({ imponibili, esenti }): { quota: number; prorata: number }`

`quota` in percentuale con 2 decimali; `prorata` intero: arrotondato all'unità superiore solo se la
parte decimale supera 0,5 (art. 19-bis).

## Validatori

- `codiceFiscaleValido(cf: string): boolean` — struttura, mesi, giorni, omocodie, carattere di controllo.
- `partitaIvaValida(piva: string): boolean` — 11 cifre e cifra di controllo.

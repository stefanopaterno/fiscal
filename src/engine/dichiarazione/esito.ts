import type { RisultatoAnno } from '../irpef/anno';
import { formattaEuro as e } from '../importi';

/**
 * Esito della dichiarazione (specifica 004, US7, FR-020, FR-021): dall'imposta lorda al saldo finale, voce per
 * voce, con di quanto ogni detrazione o credito riduce quello che paghi. Con il Modello Redditi il vantaggio è
 * anzitutto un saldo di giugno più basso; solo l'eccedenza è un vero credito.
 */
export type VoceEsito = { voce: string; importo: number; segno: '+' | '−' | '='; spiegazione: string };

export type Esito = {
  voci: VoceEsito[];
  /** Positivo = da versare a giugno, negativo = credito. */
  saldo: number;
  credito: number;
  incapienza: number;
  messaggio: string;
};

export function esitoDichiarazione(r: RisultatoAnno, creditoAnnoPrima: number): Esito {
  const detrazioni = r.detrazioneLavoro + r.ulterioreDetrazione + r.altreDetrazioni;
  const add = r.addizionali ? r.addizionali.regionale.conguaglio + r.addizionali.comunale.conguaglio : 0;
  const voci: VoceEsito[] = [
    { voce: 'IRPEF lorda', importo: r.irpefLorda.totale, segno: '+', spiegazione: 'Imposta per scaglioni sul reddito imponibile (stipendio più partita IVA).' },
  ];
  if (r.detrazioneLavoro) voci.push({ voce: 'Detrazione per lavoro dipendente', importo: r.detrazioneLavoro, segno: '−', spiegazione: `Abbassa il saldo di ${e(r.detrazioneLavoro)}.` });
  if (r.ulterioreDetrazione) voci.push({ voce: 'Ulteriore detrazione', importo: r.ulterioreDetrazione, segno: '−', spiegazione: `Abbassa il saldo di ${e(r.ulterioreDetrazione)}.` });
  if (r.altreDetrazioni)
    voci.push({ voce: 'Altre detrazioni (spese sanitarie, familiari, …)', importo: r.altreDetrazioni, segno: '−', spiegazione: `Con il 730 arrivavano in busta paga; ora abbassano il saldo di giugno di ${e(r.altreDetrazioni)}.` });
  voci.push({ voce: 'IRPEF netta', importo: r.irpefNetta, segno: '=', spiegazione: detrazioni > r.irpefLorda.totale ? 'Le detrazioni superano l\'imposta: la parte in più si perde (incapienza).' : 'Imposta dovuta dopo le detrazioni.' });
  if (r.ritenute) voci.push({ voce: 'Ritenute già trattenute (busta paga e clienti)', importo: r.ritenute, segno: '−', spiegazione: 'Le hai già pagate: si scalano.' });
  if (r.accontiVersati) voci.push({ voce: 'Acconti versati', importo: r.accontiVersati, segno: '−', spiegazione: 'Già pagati a giugno e novembre: si scalano.' });
  if (creditoAnnoPrima) voci.push({ voce: "Credito dell'anno prima riportato", importo: creditoAnnoPrima, segno: '−', spiegazione: 'Il credito che avevi scelto di tenere in compensazione.' });
  if (add) voci.push({ voce: 'Addizionali regionale e comunale (conguaglio)', importo: Math.abs(add), segno: add >= 0 ? '+' : '−', spiegazione: add >= 0 ? 'Addizionali dovute oltre quelle trattenute.' : 'Addizionali trattenute in più.' });
  const saldo = r.conguaglioTotale - creditoAnnoPrima;
  voci.push({ voce: saldo >= 0 ? 'Saldo da versare' : 'Credito', importo: Math.abs(saldo), segno: '=', spiegazione: saldo >= 0 ? 'Si versa a giugno insieme al primo acconto.' : 'Eccedenza: puoi tenerla in compensazione o chiederla a rimborso.' });
  return {
    voci,
    saldo,
    credito: Math.max(0, -saldo),
    incapienza: r.incapienza,
    messaggio:
      saldo >= 0
        ? `Detrazioni e crediti non arrivano come rimborso: abbassano il saldo di giugno, che resta di ${e(saldo)}.`
        : `Dopo aver scalato tutto resta un credito di ${e(-saldo)}: è un vero credito, da usare in compensazione o chiedere a rimborso.`,
  };
}

/**
 * Credito d'imposta (FR-022, FR-023, FR-024): con la compensazione si usa sui versamenti successivi; con il
 * rimborso arriva dall'Agenzia delle Entrate, con tempi non garantiti. Finché non è incassato o usato non
 * conta come liquidità.
 */
export type StatoCredito = 'disponibile' | 'richiesto' | 'incassato' | 'utilizzato';
export const SCELTE_CREDITO = {
  compensazione: {
    titolo: 'Tenerlo in compensazione',
    effetto: 'Lo usi per pagare meno nei versamenti successivi (per esempio il secondo acconto di novembre) con l\'F24. È il modo più veloce.',
    vincoli: 'Oltre certe soglie servono il visto di conformità e l\'F24 con i servizi telematici dell\'Agenzia: chiedi al commercialista.',
  },
  rimborso: {
    titolo: 'Chiederlo a rimborso',
    effetto: 'L\'Agenzia delle Entrate lo accredita sul tuo conto. I tempi non sono garantiti: spesso alcuni mesi, a volte di più.',
    vincoli: 'Sopra una certa cifra l\'Agenzia può fare controlli prima di pagare. Fino all\'accredito non contarlo come soldi disponibili.',
  },
} as const;

export function creditoDisponibile(c: { credito: number; scelta: 'compensazione' | 'rimborso' | null; stato: StatoCredito | null; usato: number }): {
  residuo: number;
  liquido: number;
} {
  if (c.credito <= 0) return { residuo: 0, liquido: 0 };
  if (c.scelta === 'rimborso') return { residuo: c.stato === 'incassato' ? 0 : c.credito, liquido: c.stato === 'incassato' ? c.credito : 0 };
  return { residuo: Math.max(0, c.credito - c.usato), liquido: 0 };
}

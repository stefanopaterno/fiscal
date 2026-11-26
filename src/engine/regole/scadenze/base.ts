import type { Regola } from '../tipi';

/**
 * Scadenze fiscali e previdenziali per anno solare (specifica 004, FR-008, FR-009, FR-019): date, descrizione,
 * fonte e stato di verifica stanno qui, mai nella logica. Le date cadono nell'anno indicato; il motore le
 * sposta al primo giorno lavorativo se cadono di sabato, domenica o festivo (FR-011).
 *
 * `pertinenza` dice quando la scadenza riguarda l'utente (FR-031): sempre, con la partita IVA attiva, solo con
 * operazioni IVA imponibili, solo con bollo sulle fatture, solo con fatture al Sistema Tessera Sanitaria.
 * `importo` dice da quale calcolo prendere l'importo stimato (FR-012).
 */
export type Pertinenza = 'sempre' | 'partita_iva' | 'iva' | 'bollo' | 'sts' | 'primo_anno';
export type FonteImporto = 'giugno' | 'novembre' | 'enpap' | 'bollo_t1' | 'bollo_t2' | 'bollo_t3' | 'bollo_t4' | null;

export type ScadenzaRegola = {
  chiave: string;
  /** mese-giorno nell'anno della scadenza. */
  data: string;
  titolo: string;
  descrizione: string;
  categoria: 'dichiarazione' | 'versamento' | 'enpap' | 'iva' | 'sts' | 'documenti';
  pertinenza: Pertinenza;
  importo: FonteImporto;
  /** Anno a cui si riferisce rispetto all'anno della scadenza (−1 = redditi dell'anno prima). */
  riferimento: 0 | -1;
};

const v = (valore: ScadenzaRegola, fonte: string, stato: Regola<ScadenzaRegola>['stato'] = 'verificata'): Regola<ScadenzaRegola> => ({
  valore,
  fonte,
  stato,
});

const MESI_STS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const fineMese = (m: number) => ['01-31', '02-28', '03-31', '04-30', '05-31', '06-30', '07-31', '08-31', '09-30', '10-31', '11-30', '12-31'][m - 1]!;

/** Scadenze base (senza aggiornamenti importati): uguali per ogni anno solare. */
export function scadenzeBase(): Regola<ScadenzaRegola>[] {
  const out: Regola<ScadenzaRegola>[] = [
    v(
      { chiave: 'cu_rilascio', data: '03-16', titolo: 'Arriva la CU del datore di lavoro', descrizione: "Il datore di lavoro consegna la Certificazione Unica dell'anno prima: inseriscila in Tasse → Dati dell'anno.", categoria: 'documenti', pertinenza: 'sempre', importo: null, riferimento: -1 },
      'Art. 4, c. 6-quater DPR 322/1998: consegna della CU entro il 16 marzo',
    ),
    v(
      { chiave: 'iva_saldo', data: '03-16', titolo: 'Saldo IVA annuale', descrizione: "Versamento dell'IVA a debito dell'anno prima (si può rinviare al 30 giugno con maggiorazione).", categoria: 'iva', pertinenza: 'iva', importo: null, riferimento: -1 },
      'Art. 6 DPR 542/1999: saldo IVA entro il 16 marzo',
    ),
    v(
      { chiave: 'iva_dichiarazione', data: '04-30', titolo: 'Dichiarazione IVA', descrizione: 'Solo se hai fatto operazioni con IVA: chi fa solo prestazioni sanitarie esenti è esonerato.', categoria: 'iva', pertinenza: 'iva', importo: null, riferimento: -1 },
      'Art. 8 DPR 322/1998: dichiarazione IVA dal 1° febbraio al 30 aprile; esonero per chi fa solo operazioni esenti (art. 10)',
    ),
    v(
      { chiave: 'iva_t1', data: '05-16', titolo: 'IVA del primo trimestre', descrizione: 'Liquidazione trimestrale con la maggiorazione dell\'1%.', categoria: 'iva', pertinenza: 'iva', importo: null, riferimento: 0 },
      'Art. 7 DPR 542/1999: liquidazioni trimestrali entro il 16 del secondo mese successivo',
    ),
    v(
      { chiave: 'iva_t2', data: '08-20', titolo: 'IVA del secondo trimestre', descrizione: 'Liquidazione trimestrale (proroga di agosto al 20).', categoria: 'iva', pertinenza: 'iva', importo: null, riferimento: 0 },
      'Art. 7 DPR 542/1999 e art. 3-quater DL 16/2012: versamenti di agosto al 20',
    ),
    v(
      { chiave: 'iva_t3', data: '11-16', titolo: 'IVA del terzo trimestre', descrizione: 'Liquidazione trimestrale con la maggiorazione dell\'1%.', categoria: 'iva', pertinenza: 'iva', importo: null, riferimento: 0 },
      'Art. 7 DPR 542/1999',
    ),
    v(
      { chiave: 'iva_acconto', data: '12-27', titolo: 'Acconto IVA', descrizione: "Acconto dell'IVA dell'ultimo trimestre.", categoria: 'iva', pertinenza: 'iva', importo: null, riferimento: 0 },
      'Art. 6 L. 405/1990: acconto IVA entro il 27 dicembre',
    ),
    v(
      { chiave: 'bollo_t4', data: '02-28', titolo: 'Bollo delle fatture del quarto trimestre', descrizione: "Imposta di bollo sulle fatture elettroniche esenti di ottobre–dicembre dell'anno prima (F24 codice 2524).", categoria: 'versamento', pertinenza: 'bollo', importo: 'bollo_t4', riferimento: -1 },
      'Art. 6 DM 17/6/2014 come modificato dal DL 73/2022: bollo virtuale sulle fatture elettroniche, versamento trimestrale',
      'da_verificare',
    ),
    v(
      { chiave: 'bollo_t1', data: '05-31', titolo: 'Bollo delle fatture del primo trimestre', descrizione: 'Se il bollo del trimestre è sotto la soglia di legge si può pagare insieme a quello del secondo, entro il 30 settembre.', categoria: 'versamento', pertinenza: 'bollo', importo: 'bollo_t1', riferimento: 0 },
      'Art. 6 DM 17/6/2014 come modificato dal DL 73/2022',
      'da_verificare',
    ),
    v(
      { chiave: 'bollo_t2', data: '09-30', titolo: 'Bollo delle fatture del secondo trimestre', descrizione: 'Imposta di bollo sulle fatture elettroniche di aprile–giugno.', categoria: 'versamento', pertinenza: 'bollo', importo: 'bollo_t2', riferimento: 0 },
      'Art. 6 DM 17/6/2014 come modificato dal DL 73/2022',
      'da_verificare',
    ),
    v(
      { chiave: 'bollo_t3', data: '11-30', titolo: 'Bollo delle fatture del terzo trimestre', descrizione: 'Imposta di bollo sulle fatture elettroniche di luglio–settembre.', categoria: 'versamento', pertinenza: 'bollo', importo: 'bollo_t3', riferimento: 0 },
      'Art. 6 DM 17/6/2014 come modificato dal DL 73/2022',
      'da_verificare',
    ),
    v(
      { chiave: 'precompilata', data: '04-30', titolo: 'Dichiarazione precompilata disponibile', descrizione: "L'Agenzia delle Entrate rende disponibile la precompilata: utile per controllare oneri e spese sanitarie.", categoria: 'documenti', pertinenza: 'sempre', importo: null, riferimento: -1 },
      'Agenzia delle Entrate: precompilata disponibile dalla fine di aprile (data indicativa)',
      'da_verificare',
    ),
    v(
      { chiave: 'saldo_acconto', data: '06-30', titolo: 'Saldo e primo acconto', descrizione: "Saldo IRPEF e addizionali dell'anno prima e primo acconto dell'anno in corso (dal 1° al 30 luglio con lo 0,40% in più).", categoria: 'versamento', pertinenza: 'partita_iva', importo: 'giugno', riferimento: -1 },
      'Art. 17 DPR 435/2001: versamento del saldo e del primo acconto entro il 30 giugno; differimento al 30 luglio con maggiorazione dello 0,40%',
    ),
    v(
      { chiave: 'enpap', data: '10-01', titolo: 'Contributi ENPAP', descrizione: "Comunicazione dei redditi e saldo dei contributi soggettivo, integrativo e maternità dell'anno prima.", categoria: 'enpap', pertinenza: 'partita_iva', importo: 'enpap', riferimento: -1 },
      "ENPAP: saldo sui redditi dell'anno prima entro il 1° ottobre (enpap.it); rateizzazioni e acconti da verificare per il primo anno",
      'da_verificare',
    ),
    v(
      { chiave: 'redditi_invio', data: '10-31', titolo: 'Invio del Modello Redditi', descrizione: "Invio telematico della dichiarazione dei redditi dell'anno prima (di solito lo fa il commercialista).", categoria: 'dichiarazione', pertinenza: 'partita_iva', importo: null, riferimento: -1 },
      'Art. 2 DPR 322/1998: invio telematico entro il 31 ottobre',
    ),
    v(
      { chiave: 'secondo_acconto', data: '11-30', titolo: 'Secondo acconto', descrizione: "Secondo acconto IRPEF dell'anno in corso, calcolato nella dichiarazione dell'anno prima.", categoria: 'versamento', pertinenza: 'partita_iva', importo: 'novembre', riferimento: -1 },
      'Art. 17 c. 3 DPR 435/2001 e art. 58 D.Lgs. 1/2024: secondo acconto entro il 30 novembre',
    ),
    v(
      { chiave: 'documenti_commercialista', data: '05-15', titolo: 'Documenti al commercialista', descrizione: 'Data suggerita per consegnare il prospetto dell\'anno: c\'è tempo per controllare prima del 30 giugno.', categoria: 'documenti', pertinenza: 'primo_anno', importo: null, riferimento: -1 },
      'Suggerimento di Fiscal, non è una scadenza di legge',
    ),
  ];
  // Sistema Tessera Sanitaria: invio delle spese sanitarie entro la fine del mese dopo
  MESI_STS.forEach((m, i) => {
    const mese = i + 1;
    const scad = mese === 12 ? 1 : mese + 1;
    out.push(
      v(
        {
          chiave: `sts_${m}`,
          data: fineMese(scad),
          titolo: `Tessera Sanitaria: fatture di ${['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'][i]}`,
          descrizione: 'Invio al Sistema Tessera Sanitaria delle fatture sanitarie del mese (Adempimenti in Fiscal).',
          categoria: 'sts',
          pertinenza: 'sts',
          importo: null,
          riferimento: mese === 12 ? -1 : 0,
        },
        'DM MEF 8/2/2024 e successivi: trasmissione mensile entro la fine del mese successivo (cadenza da verificare ogni anno)',
        'da_verificare',
      ),
    );
  });
  return out;
}


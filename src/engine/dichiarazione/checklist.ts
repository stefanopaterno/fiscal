/**
 * Checklist della dichiarazione (specifica 004, US1, FR-001, FR-002, FR-007, FR-034): cosa serve per il Modello
 * Redditi dell'anno, cosa c'è già (derivato dai dati dell'app) e cosa manca. L'utente può segnare un elemento
 * come completato o non applicabile; i non applicabili non contano nel progresso.
 */
export type StatoElemento = 'disponibile' | 'da_fornire' | 'completato' | 'non_applicabile';

export type Elemento = {
  chiave: string;
  titolo: string;
  spiegazione: string;
  stato: StatoElemento;
  derivato: boolean;
  collegamento: string;
  avviso: string | null;
};

export type DatiChecklist = {
  anno: number;
  partitaIva: boolean;
  primoAnno: boolean;
  cu: { quante: number; incoerenze: string[] };
  annoPartenza: boolean;
  aliquoteVerificate: boolean;
  incassi: number;
  spese: number;
  senzaGiustificativo: number;
  versamentiEnpap: number;
  oneri: number;
  impostazioniFamiliari: boolean;
  stsDaInviare: number;
  cuInArchivio: boolean;
  manuali: Map<string, 'completato' | 'non_applicabile'>;
};

export function checklist(d: DatiChecklist): { elementi: Elemento[]; percentuale: number; mancanti: number } {
  const el: Omit<Elemento, 'stato'>[] = [];
  const stati = new Map<string, StatoElemento>();
  const metti = (e: Omit<Elemento, 'stato'>, stato: StatoElemento) => {
    el.push(e);
    stati.set(e.chiave, stato);
  };

  metti(
    {
      chiave: 'cu',
      titolo: `Certificazione Unica ${d.anno}`,
      spiegazione: 'Reddito, ritenute e addizionali trattenute dal datore di lavoro: la base di tutto il calcolo.',
      derivato: false,
      collegamento: `/tasse/dati/?anno=${d.anno}`,
      avviso: d.cu.incoerenze.length ? d.cu.incoerenze.join(' ') : null,
    },
    d.cu.quante > 0 && d.cu.incoerenze.length === 0 ? 'completato' : 'da_fornire',
  );
  if (d.primoAnno)
    metti(
      {
        chiave: 'anno_partenza',
        titolo: `Dati dell'ultimo 730 (${d.anno - 1})`,
        spiegazione: "Imposta, acconti e credito dell'anno prima: servono per gli acconti del primo anno di partita IVA.",
        derivato: false,
        collegamento: `/dichiarazione/partenza/?anno=${d.anno - 1}`,
        avviso: null,
      },
      d.annoPartenza ? 'completato' : 'da_fornire',
    );
  metti(
    {
      chiave: 'addizionali',
      titolo: 'Aliquote delle addizionali di regione e comune',
      spiegazione: "Servono per il conguaglio delle addizionali: inseriscile e segnale «verificate».",
      derivato: false,
      collegamento: `/tasse/dati/?anno=${d.anno}`,
      avviso: null,
    },
    d.aliquoteVerificate ? 'completato' : 'da_fornire',
  );
  if (d.partitaIva) {
    metti(
      {
        chiave: 'compensi',
        titolo: 'Compensi incassati',
        spiegazione: 'Dalle fatture e dagli incassi registrati (principio di cassa).',
        derivato: true,
        collegamento: '/fatture/',
        avviso: null,
      },
      d.incassi > 0 ? 'disponibile' : 'da_fornire',
    );
    metti(
      {
        chiave: 'spese',
        titolo: 'Spese professionali',
        spiegazione: 'Dalle spese registrate, con la parte deducibile.',
        derivato: true,
        collegamento: `/spese/?anno=${d.anno}`,
        avviso: d.senzaGiustificativo > 0 ? `${d.senzaGiustificativo} ${d.senzaGiustificativo === 1 ? 'spesa' : 'spese'} senza giustificativo.` : null,
      },
      d.spese > 0 ? 'disponibile' : 'da_fornire',
    );
    metti(
      {
        chiave: 'enpap',
        titolo: 'Contributi ENPAP versati',
        spiegazione: "Soggettivo e maternità versati nell'anno sono deducibili.",
        derivato: true,
        collegamento: `/tasse/versamenti/?anno=${d.anno}`,
        avviso: null,
      },
      d.versamentiEnpap > 0 ? 'disponibile' : 'da_fornire',
    );
    metti(
      {
        chiave: 'sts',
        titolo: 'Invii al Sistema Tessera Sanitaria',
        spiegazione: 'Le fatture sanitarie dell\'anno devono risultare inviate.',
        derivato: true,
        collegamento: '/adempimenti/',
        avviso: d.stsDaInviare > 0 ? `${d.stsDaInviare} da inviare.` : null,
      },
      d.stsDaInviare === 0 ? 'completato' : 'da_fornire',
    );
    metti(
      {
        chiave: 'conservazione',
        titolo: 'Conservazione a norma delle fatture elettroniche',
        spiegazione: "Adesione al servizio gratuito dell'Agenzia delle Entrate (Fatture e Corrispettivi) o a un conservatore: l'archivio di Fiscal non basta da solo.",
        derivato: false,
        collegamento: '/documenti/',
        avviso: null,
      },
      'da_fornire',
    );
  }
  metti(
    {
      chiave: 'oneri',
      titolo: 'Spese personali deducibili e detraibili',
      spiegazione: 'Spese sanitarie, previdenza complementare, interessi del mutuo e altre: dalla precompilata o dalle ricevute.',
      derivato: true,
      collegamento: `/spese/oneri/?anno=${d.anno}`,
      avviso: null,
    },
    d.oneri > 0 ? 'disponibile' : 'da_fornire',
  );
  metti(
    {
      chiave: 'familiari',
      titolo: 'Familiari a carico',
      spiegazione: 'Solo il minimo: quanti figli a carico e in che percentuale.',
      derivato: false,
      collegamento: '/impostazioni/spese/',
      avviso: null,
    },
    d.impostazioniFamiliari ? 'completato' : 'da_fornire',
  );
  metti(
    {
      chiave: 'cu_archivio',
      titolo: 'PDF della CU nell\'archivio',
      spiegazione: 'Come prova, insieme alle ricevute degli oneri.',
      derivato: true,
      collegamento: '/documenti/',
      avviso: null,
    },
    d.cuInArchivio ? 'completato' : 'da_fornire',
  );

  const elementi: Elemento[] = el.map((e) => {
    const auto = stati.get(e.chiave)!;
    const m = d.manuali.get(e.chiave);
    return { ...e, stato: m ?? auto };
  });
  const contano = elementi.filter((e) => e.stato !== 'non_applicabile');
  const fatti = contano.filter((e) => e.stato === 'completato' || e.stato === 'disponibile').length;
  return {
    elementi,
    percentuale: contano.length ? Math.round((fatti / contano.length) * 100) : 100,
    mancanti: contano.length - fatti,
  };
}

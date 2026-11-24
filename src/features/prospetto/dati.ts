import { codiceCliente, controlli, generaPacchetto, type Avviso, type CodiceSezione, type DatiPacchetto, type Sezione } from '@/engine/prospetto/contenuto';
import { generaPassword, zipCifrato, type FileZip } from '@/engine/prospetto/zip-aes';
import { regoleAperte } from '@/engine/novita/regole-aperte';
import { categoria, regoleSpesePerAnno, voceOnere } from '@/engine/regole/spese';
import { pianoAmmortamento } from '@/engine/spese/ammortamento';
import { totaleSpeseAnno } from '@/engine/spese/deducibilita';
import { nomeCliente } from '@/engine/validazioni/cliente';
import { quadroDichiarazione, quadroScadenze } from '@/features/dichiarazione/dati';
import { leggiDocumenti, scaricaFile, type Documento } from '@/features/documenti/dati';
import { scaricaGiustificativo } from '@/features/spese/dati';
import { improntaSezioni, type Impronte } from '@/engine/prospetto/confronto';
import {
  ErroreFatturazione,
  leggiClienti,
  leggiFatture,
  leggiIncassi,
  leggiRighe,
  type Metadati,
} from '@/features/fatturazione/dati';
import { leggiBeni, leggiOneri, leggiSpese } from '@/features/spese/dati';
import { leggiCu, leggiVersamentiImposte, leggiVersamentiPrevidenza, raccogliAnno } from '@/features/tasse/dati';
import { getSupabase } from '@/lib/supabase/client';
import { oggiIso } from '@/lib/oggi';

export { nuovoId, salva, spiegaErrore } from '@/features/fatturazione/dati';

/**
 * Dati della specifica 009 (data-model.md): storico dei pacchetti, richieste del commercialista e modelli; raccolta
 * dei dati del periodo per il motore (src/engine/prospetto/). Il file e la password non si salvano mai.
 */
export type PacchettoRiga = Metadati & {
  periodo_da: string;
  periodo_a: string;
  sezioni: CodiceSezione[];
  usa_codici: boolean;
  allegati: number;
  destinatario: string | null;
  avvisi: number;
  regole: string;
  totali: Record<string, number[]>;
  /** Impronte delle righe per il confronto riga per riga (mai contenuti). */
  impronte: Impronte;
  giustificativi: number;
  creato_il: string;
};
export type Richiesta = Metadati & { data: string; testo: string; stato: 'aperta' | 'chiusa'; chiusa_il: string | null; pacchetto_id: string | null };
export type Modello = Metadati & { nome: string; sezioni: CodiceSezione[]; usa_codici: boolean; allegati: boolean };

function controlla<T>(r: { data: T; error: { message: string; details?: string | null } | null }): T {
  if (r.error) throw new ErroreFatturazione(r.error.message, r.error.details ?? undefined);
  return r.data;
}

export async function leggiPacchetti(): Promise<PacchettoRiga[]> {
  return controlla(await getSupabase().from('pacchetti').select('*').order('creato_il', { ascending: false })) as PacchettoRiga[];
}
export async function leggiRichieste(): Promise<Richiesta[]> {
  return controlla(await getSupabase().from('richieste_commercialista').select('*').order('data', { ascending: false })) as Richiesta[];
}
export async function leggiModelli(): Promise<Modello[]> {
  return controlla(await getSupabase().from('modelli_pacchetto').select('*').order('nome')) as Modello[];
}
export async function eliminaModello(id: string): Promise<void> {
  controlla(await getSupabase().from('modelli_pacchetto').delete().eq('id', id));
}

export type Opzioni = { da: string; a: string; sezioni: CodiceSezione[]; usaCodici: boolean; allegati: boolean };

export type Preparazione = {
  dati: DatiPacchetto;
  avvisi: Avviso[];
  documenti: Documento[];
  /** Spese del periodo con giustificativo, da allegare se richiesto (T007). */
  giustificativi: { id: string; data: string; categoria: string }[];
  anteprima: Sezione[];
};

const anniTra = (da: string, a: string) => {
  const out: number[] = [];
  for (let x = Number(da.slice(0, 4)); x <= Number(a.slice(0, 4)); x++) out.push(x);
  return out;
};

/** Raccoglie i dati del periodo e fa i controlli (US1, US2). */
export async function prepara(o: Opzioni): Promise<Preparazione> {
  const anni = anniTra(o.da, o.a);
  const anno = anni[anni.length - 1]!;
  const [fatture, incassi, clienti, spese, beni, oneri, versPrev, versImp, cuPerAnno, documenti] = await Promise.all([
    leggiFatture(),
    leggiIncassi(),
    leggiClienti(),
    leggiSpese(),
    leggiBeni(),
    leggiOneri(),
    leggiVersamentiPrevidenza(),
    leggiVersamentiImposte(),
    Promise.all(anni.map((a) => leggiCu(a).catch(() => []))),
    o.allegati ? leggiDocumenti().catch(() => [] as Documento[]) : Promise.resolve([] as Documento[]),
  ]);
  const nel = (d: string) => d >= o.da && d <= o.a;
  const righe = await leggiRighe(fatture.filter((f) => nel(f.data) && f.stato !== 'bozza').map((f) => f.id)).catch(() => []);

  // clienti: nome e codice fiscale come in fattura, oppure il codice stabile
  const perCliente = new Map(clienti.map((c) => [c.id, c]));
  const codici = new Map<string, string>();
  if (o.usaCodici) for (const c of clienti) codici.set(c.id, await codiceCliente(c.id));
  const cliente = (id: string) => {
    const c = perCliente.get(id);
    if (!c) return { nome: '—', codiceFiscale: '' };
    if (o.usaCodici && c.tipo === 'persona_fisica') return { nome: codici.get(id)!, codiceFiscale: '' };
    return { nome: nomeCliente(c), codiceFiscale: c.codice_fiscale ?? c.partita_iva ?? '' };
  };

  // spese, categorie e beni con i motori della 008
  let regoleSpese: ReturnType<typeof regoleSpesePerAnno> | null = null;
  try {
    regoleSpese = regoleSpesePerAnno(anno);
  } catch {
    regoleSpese = null;
  }
  const nomeCategoria = (c: string) => (regoleSpese ? (categoria(regoleSpese, c)?.nome ?? c) : c);
  const speseNel = spese.filter((s) => nel(s.data));
  let speseCategorie: DatiPacchetto['speseCategorie'] = [];
  if (regoleSpese) {
    const raccolti = await raccogliAnno(anno).catch(() => null);
    const tot = totaleSpeseAnno(
      (raccolti?.registrati.spese ?? []).filter((s) => nel(s.data)),
      raccolti?.registrati.beni ?? [],
      { anno, compensi: raccolti?.cassa.compensi ?? 0 },
    );
    speseCategorie = tot.perCategoria.map((c) => ({ nome: c.nome, speso: c.speso, deducibile: c.deducibile }));
    if (tot.ammortamenti) speseCategorie.push({ nome: 'Ammortamenti dei beni', speso: 0, deducibile: tot.ammortamenti });
  }
  const beniDati = beni
    .filter((b) => b.data_acquisto <= o.a)
    .map((b) => {
      let quota = 0;
      try {
        quota = pianoAmmortamento({ costo: b.costo, dataAcquisto: b.data_acquisto, categoria: b.categoria, coefficiente: b.coefficiente, dataDismissione: b.data_dismissione })
          .quote.filter((q) => anni.includes(q.anno))
          .reduce((t, q) => t + q.quota, 0);
      } catch {
        quota = 0;
      }
      return { descrizione: b.descrizione, categoria: b.categoria, costo: b.costo, data_acquisto: b.data_acquisto, quota };
    });

  // calcolo stimato e scadenze dell'ultimo anno del periodo
  const q = await quadroDichiarazione(anno).catch(() => null);
  const calcolo = q?.esito ? q.esito.voci.map((v) => ({ voce: `${v.segno === '=' ? '' : `${v.segno} `}${v.voce}`, importo: v.importo })) : [];
  const sc = await quadroScadenze(anno + 1).catch(() => null);
  const scadenze = sc
    ? sc.voci
        .filter((v) => v.pertinente && v.stato !== 'fatta')
        .map((v) => ({ data: v.data, titolo: v.titolo, importo: v.importo ? (sc.importi.get(v.importo)?.importo ?? null) : null }))
    : [];

  const aperte = regoleAperte().filter((r) => anni.includes(r.anno)).length;
  const incassatoPer = new Map<string, number>();
  for (const i of incassi) incassatoPer.set(i.fattura_id, (incassatoPer.get(i.fattura_id) ?? 0) + i.importo);
  const persone = clienti.filter((c) => c.tipo === 'persona_fisica');
  const avvisi = controlli({
    da: o.da,
    a: o.a,
    spese: spese.map((s) => ({ id: s.id, data: s.data, descrizione: s.descrizione, ha_giustificativo: s.ha_giustificativo })),
    fatture,
    incassatoPer,
    anniConCu: anni.filter((_, i) => cuPerAnno[i]!.length > 0),
    regoleDaVerificare: aperte,
    provvisorio: q?.risultato?.provvisorio ?? false,
    testiLiberi: [
      ...righe.map((r) => {
        const f = fatture.find((x) => x.id === r.fattura_id);
        return { testo: r.descrizione, dove: `Fattura ${f?.numero ?? ''}/${f?.anno ?? ''}`, collegamento: `/fatture/dettaglio/?id=${r.fattura_id}` };
      }),
      ...speseNel.filter((s) => s.descrizione).map((s) => ({ testo: s.descrizione!, dove: `Spesa del ${s.data.split('-').reverse().join('/')}`, collegamento: `/spese/scheda/?id=${s.id}` })),
    ],
    nomiClienti: persone.map((c) => nomeCliente(c)),
  });

  const dati: DatiPacchetto = {
    da: o.da,
    a: o.a,
    generatoIl: oggiIso(),
    regole: `${anni.join(', ')}${aperte ? `, ${aperte} regole da verificare` : ', regole verificate'}`,
    usaCodici: o.usaCodici,
    cliente,
    fatture,
    incassi,
    spese: speseNel.map((s) => ({
      data: s.data,
      categoria: nomeCategoria(s.categoria),
      descrizione: s.descrizione,
      fornitore: s.fornitore,
      importo: s.importo,
      ha_giustificativo: s.ha_giustificativo,
      modalita: s.modalita,
    })),
    speseCategorie,
    beni: beniDati,
    enpap: versPrev.map((v) => ({ data: v.data, tipo: `${v.tipo} (${v.cassa === 'enpap' ? 'ENPAP' : 'Gestione separata'})`, anno_reddito: v.anno_reddito, importo: v.importo })),
    cu: cuPerAnno.flat().map((c) => ({
      anno: c.anno,
      sostituto: c.sostituto,
      reddito: c.reddito_lavoro,
      ritenute: c.ritenute_irpef,
      regionale: c.addizionale_regionale,
      comunale: c.addizionale_comunale_acconto + c.addizionale_comunale_saldo,
    })),
    oneri: oneri.map((x) => ({ data: x.data, voce: regoleSpese ? (voceOnere(regoleSpese, x.voce)?.nome ?? x.voce) : x.voce, importo: x.importo })),
    versamenti: versImp.map((v) => ({ data: v.data, voce: v.voce.replace(/_/g, ' '), anno: v.anno_imposta, importo: v.importo })),
    calcolo,
    scadenze,
    sezioni: o.sezioni,
    avvisi,
  };
  const docs = documenti.filter((d) => !d.eliminato_il && d.data != null && nel(d.data));
  const giustificativi = o.allegati
    ? speseNel.filter((x) => x.ha_giustificativo).map((x) => ({ id: x.id, data: x.data, categoria: x.categoria }))
    : [];
  return { dati, avvisi, documenti: docs, giustificativi, anteprima: generaPacchetto(dati).sezioni };
}

/** Genera lo ZIP cifrato con PDF, Excel ed eventuali allegati; restituisce file e password (mostrata una volta). */
export async function genera(p: Preparazione, destinatario: string | null): Promise<{ zip: Uint8Array; password: string; nome: string; riga: PacchettoRiga }> {
  const g = generaPacchetto(p.dati);
  const file: FileZip[] = [
    { nome: 'prospetto.pdf', dati: g.pdf },
    { nome: 'dati.xlsx', dati: g.xlsx },
  ];
  for (const d of p.documenti) {
    try {
      file.push({ nome: `allegati/${d.file_nome}`, dati: await scaricaFile(d.file_percorso) });
    } catch {
      /* un allegato non scaricabile non blocca il pacchetto: si salta e il conteggio degli allegati lo riflette */
    }
  }
  let giustificativi = 0;
  for (const [i, x] of p.giustificativi.entries()) {
    try {
      const f = await scaricaGiustificativo(x.id);
      const ext = /pdf/.test(f.tipo) ? 'pdf' : /png/.test(f.tipo) ? 'png' : /heic/.test(f.tipo) ? 'heic' : /webp/.test(f.tipo) ? 'webp' : 'jpg';
      // nome dato da Fiscal: data, categoria e numero, mai il nome originale del file
      file.push({ nome: `giustificativi/${x.data}-${x.categoria.replace(/[^a-z0-9_]/g, '')}-${i + 1}.${ext}`, dati: f.dati });
      giustificativi += 1;
    } catch {
      /* un giustificativo non scaricabile non blocca il pacchetto: il conteggio lo riflette */
    }
  }
  const password = generaPassword();
  const zip = await zipCifrato(file, password);
  const riga: PacchettoRiga = {
    id: crypto.randomUUID(),
    versione: 0,
    periodo_da: p.dati.da,
    periodo_a: p.dati.a,
    sezioni: p.dati.sezioni,
    usa_codici: p.dati.usaCodici,
    allegati: file.length - 2 - giustificativi,
    giustificativi,
    impronte: (await improntaSezioni(g.sezioni)).impronte,
    destinatario: destinatario?.trim() || null,
    avvisi: p.avvisi.length,
    regole: p.dati.regole.slice(0, 120),
    totali: g.totali,
    creato_il: new Date().toISOString(),
  };
  return { zip, password, nome: `prospetto-${p.dati.da}_${p.dati.a}.zip`, riga };
}

/** Differenze principali tra due pacchetti (US4): totali delle sezioni in comune. */
export function differenze(nuovo: PacchettoRiga, vecchio: PacchettoRiga): string[] {
  const out: string[] = [];
  for (const [k, v] of Object.entries(nuovo.totali)) {
    const w = vecchio.totali[k];
    if (!w) continue;
    const a = v.at(-1) ?? 0;
    const b = w.at(-1) ?? 0;
    if (a !== b) out.push(k);
  }
  return out;
}

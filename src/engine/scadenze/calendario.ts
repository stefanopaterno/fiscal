import { regoleScadenze, type FonteImporto, type Pertinenza, type ScadenzaRegola } from '../regole/scadenze';

/**
 * Calendario delle scadenze (specifica 004, FR-008…FR-013, FR-030…FR-033): date dalle regole dell'anno,
 * slittamento al primo giorno lavorativo, stato, giorni mancanti, pertinenza, promemoria ed esportazione
 * in un file di calendario senza dati sensibili.
 */
const due = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getUTCFullYear()}-${due(d.getUTCMonth() + 1)}-${due(d.getUTCDate())}`;
const utc = (s: string) => new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))));

/** Pasqua (algoritmo di Gauss/Meeus), per il lunedì dell'Angelo. */
function pasqua(anno: number): Date {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anno, mese - 1, giorno));
}

/** Festività nazionali (L. 260/1949 e successive). */
export function festivi(anno: number): Set<string> {
  const fissi = ['01-01', '01-06', '04-25', '05-01', '06-02', '08-15', '11-01', '12-08', '12-25', '12-26'];
  const p = pasqua(anno);
  const lunedi = new Date(p.getTime() + 86_400_000);
  return new Set([...fissi.map((x) => `${anno}-${x}`), iso(p), iso(lunedi)]);
}

/** Primo giorno lavorativo dalla data (sabato, domenica e festivi slittano: art. 7 DL 70/2011). */
export function lavorativo(data: string): string {
  let d = utc(data);
  const f = festivi(d.getUTCFullYear());
  while (d.getUTCDay() === 0 || d.getUTCDay() === 6 || f.has(iso(d))) d = new Date(d.getTime() + 86_400_000);
  return iso(d);
}

export type Contesto = {
  partitaIvaDal: number | null;
  conIva: boolean;
  conBollo: boolean;
  conSts: boolean;
};

export function pertinente(p: Pertinenza, annoRiferimento: number, c: Contesto): boolean {
  const attiva = c.partitaIvaDal != null && annoRiferimento >= c.partitaIvaDal;
  switch (p) {
    case 'sempre':
      return true;
    case 'partita_iva':
      return attiva;
    case 'iva':
      return attiva && c.conIva;
    case 'bollo':
      return attiva && c.conBollo;
    case 'sts':
      return attiva && c.conSts;
    case 'primo_anno':
      return attiva;
    case 'dopo_primo_anno':
      return attiva && annoRiferimento > c.partitaIvaDal!;
  }
}

export type StatoUtente = { chiave: string; anno: number; fatta_il: string | null; data: string | null; titolo: string | null; esporta: boolean | null };

export type VoceCalendario = {
  chiave: string;
  anno: number;
  data: string;
  /** Data della regola prima dello slittamento (se diversa). */
  dataOriginale: string | null;
  titolo: string;
  descrizione: string;
  categoria: ScadenzaRegola['categoria'] | 'personale';
  fonte: string;
  daVerificare: boolean;
  pertinente: boolean;
  importo: FonteImporto;
  annoRiferimento: number;
  stato: 'fatta' | 'scaduta' | 'da_fare';
  fattaIl: string | null;
  giorni: number;
  personale: boolean;
  /** Prorogata dall'utente. */
  prorogata: boolean;
  esporta: boolean;
};

const giorniTra = (da: string, a: string) => Math.round((utc(a).getTime() - utc(da).getTime()) / 86_400_000);

export function calendarioAnno(anno: number, oggi: string, contesto: Contesto, stati: StatoUtente[]): VoceCalendario[] {
  const perChiave = new Map(stati.filter((s) => s.anno === anno).map((s) => [s.chiave, s]));
  const voci: VoceCalendario[] = regoleScadenze(anno).scadenze.map((r) => {
    const s = r.valore;
    const u = perChiave.get(s.chiave);
    const regola = `${anno}-${s.data}`;
    const spostata = lavorativo(regola);
    const data = u?.data ?? spostata;
    const rif = anno + s.riferimento;
    const pert = pertinente(s.pertinenza, rif, contesto);
    return {
      chiave: s.chiave,
      anno,
      data,
      dataOriginale: u?.data ? regola : spostata !== regola ? regola : null,
      titolo: s.titolo,
      descrizione: s.descrizione,
      categoria: s.categoria,
      fonte: r.fonte,
      daVerificare: r.stato === 'da_verificare',
      pertinente: pert,
      importo: s.importo,
      annoRiferimento: rif,
      stato: u?.fatta_il ? 'fatta' : data < oggi ? 'scaduta' : 'da_fare',
      fattaIl: u?.fatta_il ?? null,
      giorni: giorniTra(oggi, data),
      personale: false,
      prorogata: u?.data != null,
      esporta: u?.esporta ?? pert,
    };
  });
  // scadenze personali (FR-033)
  for (const u of stati.filter((s) => s.anno === anno && s.chiave.startsWith('personale_') && s.data && s.titolo)) {
    voci.push({
      chiave: u.chiave,
      anno,
      data: u.data!,
      dataOriginale: null,
      titolo: u.titolo!,
      descrizione: 'Scadenza personale',
      categoria: 'personale',
      fonte: 'Inserita da te',
      daVerificare: false,
      pertinente: true,
      importo: null,
      annoRiferimento: anno,
      stato: u.fatta_il ? 'fatta' : u.data! < oggi ? 'scaduta' : 'da_fare',
      fattaIl: u.fatta_il,
      giorni: giorniTra(oggi, u.data!),
      personale: true,
      prorogata: false,
      esporta: u.esporta ?? true,
    });
  }
  return voci.sort((a, b) => a.data.localeCompare(b.data) || a.titolo.localeCompare(b.titolo));
}

/** Promemoria (FR-010): scadenze pertinenti non fatte entro l'anticipo, più quelle scadute. */
export function promemoria(voci: VoceCalendario[], anticipo: number): VoceCalendario[] {
  return voci.filter((v) => v.pertinente && v.stato !== 'fatta' && v.giorni <= anticipo && (v.stato === 'scaduta' || v.giorni >= 0));
}

const escIcs = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

/**
 * File di calendario (FR-030): eventi di un giorno con promemoria, senza importi né nomi. Le righe seguono
 * RFC 5545 (CRLF, campi con escape).
 */
export function fileCalendario(voci: VoceCalendario[], anticipo: number, generatoIl: string): string {
  const stamp = `${generatoIl.replace(/-/g, '')}T000000Z`;
  const righe = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Fiscal//Scadenze//IT', 'CALSCALE:GREGORIAN'];
  for (const v of voci) {
    const g = v.data.replace(/-/g, '');
    const dopo = iso(new Date(utc(v.data).getTime() + 86_400_000)).replace(/-/g, '');
    righe.push(
      'BEGIN:VEVENT',
      `UID:${v.chiave}-${v.anno}@fiscal.soarlyai.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${g}`,
      `DTEND;VALUE=DATE:${dopo}`,
      `SUMMARY:${escIcs(v.titolo)}`,
      `DESCRIPTION:${escIcs(v.personale ? 'Scadenza personale (Fiscal)' : `${v.descrizione} (Fiscal)`)}`,
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escIcs(v.titolo)}`,
      `TRIGGER:-P${anticipo}D`,
      'END:VALARM',
      'END:VEVENT',
    );
  }
  righe.push('END:VCALENDAR');
  return righe.join('\r\n') + '\r\n';
}

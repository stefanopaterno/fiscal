import { describe, expect, it } from 'vitest';
import { CATALOGO } from '@/engine/parametri/catalogo';
import { generaRichiesta } from '@/engine/parametri/richiesta';

// Specifica 014, T017 (FR-004..FR-008, SC-007): struttura della richiesta e nessun dato personale.
describe('richiesta per Claude', () => {
  const testo = generaRichiesta({ oggi: '2026-11-26', anni: [2027] });

  it('sezioni 1–5 nell\'ordine del contratto', () => {
    const titoli = [...testo.matchAll(/^## (\d)\./gm)].map((m) => m[1]);
    expect(titoli).toEqual(['1', '2', '3', '4', '5']);
    expect(testo).toMatch(/Rispondi con \*\*solo\*\* il file JSON/);
    expect(testo).toMatch(/```json\n\{/);
  });

  it('priorità: i valori «da verificare» o mancanti in cima', () => {
    const sezione2 = testo.slice(testo.indexOf('## 2.'), testo.indexOf('## 3.'));
    expect(sezione2).toMatch(/`irpef.scaglioni` \| 2027/);
    expect(sezione2).toMatch(/`enpap.minimo_soggettivo` \| 2027 \| — \(mancante\)/);
    expect(sezione2).not.toMatch(/`fattura.aliquota_iva`/); // verificata
  });

  it('catalogo con le unità del file (percentuali e euro)', () => {
    expect(testo).toMatch(/`fattura.importo_bollo` \| euro .* \| data \| 2 \| verificata/);
    expect(testo).toMatch(/`fattura.aliquota_iva` \| percentuale .* \| data \| 22 \| verificata/);
    expect(testo).toMatch(/`enpap.aliquota_soggettivo` \| percentuale .* \| anno \| 12 \| da verificare/);
    for (const p of CATALOGO.filter((x) => x.insieme !== 'addizionali')) expect(testo).toContain(`\`${p.chiave}\``);
  });

  it('solo gli anni scelti', () => {
    const due = generaRichiesta({ oggi: '2026-11-26', anni: [2026, 2027] });
    expect(due).toMatch(/### Anno 2026/);
    expect(due).toMatch(/### Anno 2027/);
    expect(testo).not.toMatch(/### Anno 2026/);
  });

  it('addizionali solo con regione e comune indicati', () => {
    expect(testo).not.toMatch(/addizionali\./);
    const con = generaRichiesta({
      oggi: '2026-11-26',
      anni: [2027],
      ambito: { regione: 'Regione di prova', comune: 'Comune di prova' },
      addizionali: { 2027: { regionale: [{ finoA: null, aliquota: 0.0123 }], comunale: { aliquota: 0.008, soglia: null }, verificate: false } },
    });
    expect(con).toMatch(/Addizionali \(Regione di prova, comune di Comune di prova\)/);
    expect(con).toMatch(/`addizionali.comunale.aliquota` \| percentuale .* \| anno \| 0.8 \| da verificare/);
    expect(con).toMatch(/"ambito"/);
  });

  it('nessun dato personale: niente codici fiscali, partite IVA, e-mail, IBAN', () => {
    expect(testo).not.toMatch(/\b[A-Z]{6}\d{2}[A-Z]\d{2}[A-Z]\d{3}[A-Z]\b/); // codice fiscale
    expect(testo).not.toMatch(/\b\d{11}\b/); // partita IVA
    expect(testo).not.toMatch(/@[a-z0-9-]+\.[a-z]/i); // e-mail
    expect(testo).not.toMatch(/\bIT\d{2}[A-Z]\d{10}/); // IBAN
  });
});

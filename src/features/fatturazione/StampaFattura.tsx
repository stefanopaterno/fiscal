'use client';

import { Button, makeStyles, MessageBar, MessageBarBody, Spinner, tokens } from '@fluentui/react-components';
import { ArrowLeft20Regular, Print20Regular } from '@fluentui/react-icons';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formattaEuro } from '@/engine/importi';
import { nomeCliente, type DatiCliente } from '@/engine/validazioni/cliente';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { leggiFattura, type Fattura, type RigaFattura } from '@/features/fatturazione/dati';
import { dataItaliana, titoloDocumento } from '@/features/fatturazione/DettaglioFattura';

/**
 * Documento stampabile della fattura (T016, FR-016, research R-07): A4, solo dati della fotografia
 * salvata all'emissione. "Stampa → Salva come PDF" del browser produce il PDF. Nessuna libreria.
 * Contenuto minimo dell'art. 21 DPR 633/1972 più diciture di esenzione, bollo e opposizione STS.
 */
type Professionista = {
  nome?: string;
  cognome?: string;
  codice_fiscale?: string;
  partita_iva?: string;
  indirizzo?: string;
  cap?: string;
  comune?: string;
  provincia?: string;
  pec?: string;
  iban?: string;
  albo_ordine?: string;
  albo_numero?: string;
};

const useStili = makeStyles({
  sfondo: {
    minHeight: '100vh',
    backgroundColor: tokens.colorNeutralBackground3,
    padding: tokens.spacingHorizontalL,
    boxSizing: 'border-box',
    '@media print': { backgroundColor: 'white', padding: 0 },
  },
  comandi: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    flexWrap: 'wrap',
    maxWidth: '210mm',
    margin: `0 auto ${tokens.spacingVerticalL}`,
    '@media print': { display: 'none' },
  },
  pulsante: { minHeight: '44px' },
  foglio: {
    backgroundColor: 'white',
    color: '#1a1a1a',
    maxWidth: '210mm',
    minHeight: '297mm',
    margin: '0 auto',
    padding: '18mm 16mm',
    boxSizing: 'border-box',
    fontFamily: 'Georgia, "Times New Roman", serif',
    fontSize: '10.5pt',
    lineHeight: 1.45,
    boxShadow: tokens.shadow16,
    overflowWrap: 'anywhere',
    '@media (max-width: 600px)': { padding: '8mm 6mm', minHeight: 'auto' },
    '@media print': { boxShadow: 'none', padding: 0, minHeight: 'auto', maxWidth: 'none' },
  },
  intestazione: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8mm',
    flexWrap: 'wrap',
    borderBottom: '1.5pt solid #1a1a1a',
    paddingBottom: '5mm',
    marginBottom: '6mm',
  },
  nome: { fontSize: '15pt', fontWeight: 700, margin: 0 },
  documento: { textAlign: 'right', fontSize: '13pt', fontWeight: 700, margin: 0 },
  blocchi: { display: 'flex', gap: '8mm', flexWrap: 'wrap', marginBottom: '6mm' },
  blocco: { flex: '1 1 220px', minWidth: 0 },
  etichetta: {
    fontSize: '8.5pt',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: '#555',
    margin: '0 0 1mm',
  },
  p: { margin: 0 },
  tabella: { width: '100%', borderCollapse: 'collapse', marginBottom: '6mm' },
  th: { textAlign: 'left', borderBottom: '1pt solid #1a1a1a', padding: '1.5mm 1mm', fontSize: '9pt' },
  td: { borderBottom: '0.5pt solid #ccc', padding: '1.5mm 1mm', verticalAlign: 'top' },
  num: { textAlign: 'right', whiteSpace: 'nowrap' },
  totali: {
    marginLeft: 'auto',
    width: '100%',
    maxWidth: '85mm',
    borderCollapse: 'collapse',
    marginBottom: '6mm',
  },
  totale: { fontWeight: 700, borderTop: '1pt solid #1a1a1a' },
  note: { fontSize: '9pt', color: '#333', display: 'flex', flexDirection: 'column', gap: '1.5mm' },
});

export function StampaFattura({ id }: { id: string }) {
  const s = useStili();
  const router = useRouter();
  const [dati, setDati] = useState<{ f: Fattura; righe: RigaFattura[] } | null>(null);
  const [errore, setErrore] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    leggiFattura(id)
      .then((r) => {
        if (!vivo) return;
        if (!r) setErrore('Fattura non trovata.');
        else if (r.fattura.stato === 'bozza') setErrore('Una bozza non si stampa: prima emettila.');
        else setDati({ f: r.fattura, righe: r.righe });
      })
      .catch(() => vivo && setErrore('Non riesco a leggere la fattura. Controlla la connessione.'));
    return () => {
      vivo = false;
    };
  }, [id]);

  if (errore)
    return (
      <div className={s.sfondo}>
        <MessageBar intent="error">
          <MessageBarBody>{errore}</MessageBarBody>
        </MessageBar>
      </div>
    );
  if (!dati) return <Spinner label="Un momento…" />;

  const { f, righe } = dati;
  const p = (f.fotografia.professionista ?? {}) as Professionista;
  const c = (f.fotografia.cliente ?? {}) as DatiCliente & { pagato_da?: string | null };
  const rif = f.fotografia.fattura_stornata as { numero: number; anno: number; data: string } | undefined;
  const aliquotaIntegrativo = (f.fotografia.regole as { aliquota_integrativo?: number } | undefined)
    ?.aliquota_integrativo;
  const segno = f.tipo === 'nota_credito' ? '−' : '';
  const euro = (v: number) => `${segno}${formattaEuro(v)}`;
  const sede = (x: {
    indirizzo?: string | null;
    cap?: string | null;
    comune?: string | null;
    provincia?: string | null;
  }) =>
    [x.indirizzo, [x.cap, x.comune, x.provincia ? `(${x.provincia})` : ''].filter(Boolean).join(' ')]
      .filter(Boolean)
      .join(', ');

  return (
    <div className={s.sfondo}>
      <div className={s.comandi}>
        <Button className={s.pulsante} icon={<ArrowLeft20Regular />} onClick={() => router.back()}>
          Indietro
        </Button>
        <Button
          appearance="primary"
          className={s.pulsante}
          icon={<Print20Regular />}
          onClick={() => window.print()}
        >
          Stampa o salva in PDF
        </Button>
        <ConAiuto
          allineamento="centro"
          aiuto={{
            argomento: 'salvare in PDF',
            testo:
              "Premi «Stampa o salva in PDF» e, come stampante, scegli «Salva come PDF» (su iPhone: Condividi → Salva su File). Il PDF lo puoi mandare al paziente o all'ente.",
            perche:
              'Ai pazienti basta la copia in PDF o cartacea. Agli enti e alle aziende va mandata anche la fattura elettronica (vedi Adempimenti).',
          }}
        >
          <span />
        </ConAiuto>
      </div>

      <article className={s.foglio} aria-label={titoloDocumento(f)}>
        <header className={s.intestazione}>
          <div>
            <p className={s.nome}>
              {p.nome} {p.cognome}
            </p>
            <p className={s.p}>Psicologo{p.albo_numero ? ` · Iscr. Albo n. ${p.albo_numero}` : ''}</p>
            {p.albo_ordine ? <p className={s.p}>{p.albo_ordine}</p> : null}
            <p className={s.p}>{sede(p)}</p>
            <p className={s.p}>
              C.F. {p.codice_fiscale} · P.IVA {p.partita_iva}
            </p>
            {p.pec ? <p className={s.p}>PEC {p.pec}</p> : null}
          </div>
          <div>
            <p className={s.documento}>{titoloDocumento(f)}</p>
            <p className={s.p} style={{ textAlign: 'right' }}>
              Data {dataItaliana(f.data)}
            </p>
          </div>
        </header>

        <div className={s.blocchi}>
          <div className={s.blocco}>
            <p className={s.etichetta}>Intestata a</p>
            <p className={s.p}>
              <strong>{nomeCliente(c)}</strong>
            </p>
            <p className={s.p}>{sede(c)}</p>
            {c.nazione && c.nazione !== 'IT' ? <p className={s.p}>{c.nazione}</p> : null}
            {c.partita_iva ? <p className={s.p}>P.IVA {c.partita_iva}</p> : null}
            {c.codice_fiscale ? <p className={s.p}>C.F. {c.codice_fiscale}</p> : null}
          </div>
          {rif ? (
            <div className={s.blocco}>
              <p className={s.etichetta}>Riferimento</p>
              <p className={s.p}>
                Nota di credito a storno totale della fattura n. {rif.numero}/{rif.anno} del{' '}
                {dataItaliana(rif.data)}
              </p>
            </div>
          ) : null}
        </div>

        <table className={s.tabella}>
          <thead>
            <tr>
              <th className={s.th}>Descrizione</th>
              <th className={`${s.th} ${s.num}`}>Q.tà</th>
              <th className={`${s.th} ${s.num}`}>Prezzo</th>
              <th className={`${s.th} ${s.num}`}>IVA</th>
              <th className={`${s.th} ${s.num}`}>Importo</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r) => (
              <tr key={r.id}>
                <td className={s.td}>{r.descrizione}</td>
                <td className={`${s.td} ${s.num}`}>{r.quantita}</td>
                <td className={`${s.td} ${s.num}`}>{formattaEuro(r.compenso)}</td>
                <td className={`${s.td} ${s.num}`}>{r.natura === 'imponibile' ? '22%' : 'Esente'}</td>
                <td className={`${s.td} ${s.num}`}>{euro(r.compenso * r.quantita)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table className={s.totali}>
          <tbody>
            <Riga etichetta="Totale compensi" valore={euro(f.totale_compensi)} s={s} />
            <Riga
              etichetta={`Contributo integrativo ENPAP${aliquotaIntegrativo ? ` ${Math.round(aliquotaIntegrativo * 100)}%` : ''}`}
              valore={euro(f.totale_integrativo)}
              s={s}
            />
            {f.imponibile_iva > 0 ? (
              <>
                <Riga etichetta="Imponibile IVA" valore={euro(f.imponibile_iva)} s={s} />
                <Riga etichetta="IVA 22%" valore={euro(f.iva)} s={s} />
              </>
            ) : null}
            {f.importo_esente > 0 ? (
              <Riga etichetta="Esente IVA (art. 10 n. 18)" valore={euro(f.importo_esente)} s={s} />
            ) : null}
            {f.bollo > 0 && f.bollo_addebitato ? (
              <Riga etichetta="Imposta di bollo" valore={euro(f.bollo)} s={s} />
            ) : null}
            <Riga etichetta="Totale documento" valore={euro(f.totale)} s={s} forte />
            {f.ritenuta > 0 ? (
              <>
                <Riga etichetta="Ritenuta d'acconto 20%" valore={`− ${formattaEuro(f.ritenuta)}`} s={s} />
                <Riga etichetta="Netto a pagare" valore={euro(f.netto)} s={s} forte />
              </>
            ) : null}
          </tbody>
        </table>

        <footer className={s.note}>
          {(f.dicitura ?? '')
            .split('\n')
            .filter(Boolean)
            .map((d) => (
              <p key={d} className={s.p}>
                {d}
              </p>
            ))}
          {f.bollo > 0 && !f.bollo_addebitato ? (
            <p className={s.p}>Imposta di bollo assolta dall&apos;emittente.</p>
          ) : null}
          {f.ritenuta > 0 ? (
            <p className={s.p}>
              Contributo integrativo ENPAP escluso dalla base della ritenuta d&apos;acconto.
            </p>
          ) : null}
          <p className={s.p}>Regime fiscale ordinario.</p>
          {c.pagato_da ? <p className={s.p}>Pagato da: {c.pagato_da}</p> : null}
          {p.iban && f.tipo === 'fattura' ? (
            <p className={s.p}>Pagamento con bonifico: IBAN {p.iban}</p>
          ) : null}
        </footer>
      </article>
    </div>
  );
}

function Riga(props: { etichetta: string; valore: string; forte?: boolean; s: ReturnType<typeof useStili> }) {
  const { s } = props;
  return (
    <tr className={props.forte ? s.totale : undefined}>
      <td className={s.td}>{props.etichetta}</td>
      <td className={`${s.td} ${s.num}`}>{props.valore}</td>
    </tr>
  );
}

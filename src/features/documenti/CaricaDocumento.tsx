'use client';

import { Button, makeStyles, MessageBar, MessageBarBody, Text, tokens } from '@fluentui/react-components';
import { useState } from 'react';
import { sembraClinico } from '@/engine/documenti/nomi';
import type { TipoDocumento } from '@/engine/regole/documenti';
import { CampoEuro } from '@/features/tasse/componenti';
import { oggiIso } from '@/lib/oggi';
import { CampoData, CampoScelta, CampoSiNo, CampoTesto, Griglia, Scheda } from '@/ui/Moduli';
import { ETICHETTA_TIPO } from './etichette';
import { caricaDocumento, importaFatture, riduciFoto } from './dati';

/**
 * Caricamento di uno o più documenti (US1, FR-001, FR-002, FR-011, FR-012): stessi dati per tutti i file
 * scelti; le fatture elettroniche (XML, P7M) passano dall'importazione delle fatture ricevute.
 */
const useStili = makeStyles({
  azioni: { display: 'flex', gap: tokens.spacingHorizontalM, flexWrap: 'wrap' },
  pulsante: { minHeight: '44px' },
});

const eFattura = (f: File) => /\.(xml|p7m)$/i.test(f.name);

export function CaricaDocumento(props: {
  file: File[];
  onFatto: () => void | Promise<void>;
  onAnnulla: () => void;
}) {
  const s = useStili();
  const [tipo, setTipo] = useState<TipoDocumento>('scontrino');
  const [data, setData] = useState(oggiIso());
  const [emittente, setEmittente] = useState('');
  const [importo, setImporto] = useState<number | null>(null);
  const [descrizione, setDescrizione] = useState('');
  const [scadenza, setScadenza] = useState('');
  const [originale, setOriginale] = useState(false);
  const [messaggio, setMessaggio] = useState<{ ok: boolean; testo: string } | null>(null);
  const [inCorso, setInCorso] = useState(false);

  const fatture = props.file.filter(eFattura);
  const altri = props.file.filter((f) => !eFattura(f));
  const foto = altri.some((f) => f.type.startsWith('image/'));
  const clinico = sembraClinico(`${descrizione} ${altri.map((f) => f.name).join(' ')}`);

  async function carica() {
    setInCorso(true);
    setMessaggio(null);
    try {
      let ok = 0;
      let doppioni = 0;
      for (const f of altri) {
        const contenuto = originale
          ? {
              byte: new Uint8Array(await f.arrayBuffer()),
              tipo: f.type || 'application/octet-stream',
              estensione: f.name.split('.').pop() ?? 'bin',
            }
          : await riduciFoto(f);
        const r = await caricaDocumento({
          byte: contenuto.byte,
          tipoFile: contenuto.tipo,
          estensione: contenuto.estensione,
          tipo,
          data: data || null,
          emittente: emittente.trim() || null,
          importo,
          descrizione: descrizione.trim() || null,
          scadenza: scadenza || null,
        });
        if (r.esito === 'ok') ok += 1;
        else doppioni += 1;
      }
      const imp = fatture.length ? await importaFatture(fatture) : null;
      if (doppioni || imp?.gia || imp?.scartate.length)
        setMessaggio({
          ok: false,
          testo: `Caricati ${ok + (imp?.importate ?? 0)}, già presenti ${doppioni + (imp?.gia ?? 0)}${imp?.scartate.length ? `, scartati ${imp.scartate.length}` : ''}.`,
        });
      await props.onFatto();
    } catch (e) {
      setMessaggio({ ok: false, testo: e instanceof Error ? e.message : 'Caricamento non riuscito.' });
    } finally {
      setInCorso(false);
    }
  }

  return (
    <Scheda
      titolo={props.file.length === 1 ? 'Carica il documento' : `Carica ${props.file.length} documenti`}
      aiuto={{
        argomento: 'carica documento',
        testo:
          'Scontrini, ricevute, polizze, contratti, la CU. Il file resta nel tuo archivio privato con un nome dato da Fiscal (mai quello originale, che potrebbe contenere il nome di un paziente).',
      }}
      azioni={
        <div className={s.azioni}>
          <Button
            appearance="primary"
            className={s.pulsante}
            disabled={inCorso}
            onClick={() => void carica()}
          >
            {inCorso ? 'Carico…' : 'Carica'}
          </Button>
          <Button className={s.pulsante} onClick={props.onAnnulla}>
            Annulla
          </Button>
        </div>
      }
    >
      {fatture.length ? (
        <Text>
          {fatture.length === 1 ? 'Una fattura elettronica' : `${fatture.length} fatture elettroniche`}: la
          leggo e la metto tra le fatture ricevute da classificare.
        </Text>
      ) : null}
      {altri.length ? (
        <Griglia>
          <CampoScelta
            etichetta="Tipo"
            valore={tipo}
            onChange={setTipo}
            opzioni={(Object.keys(ETICHETTA_TIPO) as TipoDocumento[]).map((t) => ({
              valore: t,
              etichetta: ETICHETTA_TIPO[t],
            }))}
            aiuto={{
              argomento: 'tipo di documento',
              testo: 'Serve a ritrovarlo e a sapere quanto conservarlo.',
            }}
          />
          <CampoData
            etichetta="Data"
            valore={data}
            onChange={setData}
            aiuto={{ argomento: 'data del documento', testo: 'La data scritta sul documento.' }}
          />
          <CampoTesto
            etichetta="Chi l'ha emesso"
            lunghezzaMax={120}
            valore={emittente}
            onChange={setEmittente}
            suggerimento="Facoltativo"
            aiuto={{
              argomento: 'emittente',
              testo: 'Negozio, fornitore, assicurazione… Mai il nome di un paziente.',
            }}
          />
          <CampoEuro
            etichetta="Importo"
            facoltativo
            valore={importo}
            onChange={setImporto}
            aiuto={{ argomento: 'importo', testo: 'Se il documento ha un importo.' }}
          />
          <CampoTesto
            etichetta="Descrizione"
            lunghezzaMax={200}
            valore={descrizione}
            onChange={setDescrizione}
            suggerimento="Facoltativa"
            aiuto={{
              argomento: 'descrizione',
              testo: 'Due parole per ritrovarlo. Niente dati dei pazienti.',
            }}
          />
          {tipo === 'polizza' || tipo === 'certificato' || tipo === 'contratto' ? (
            <CampoData
              etichetta="Scade il"
              valore={scadenza}
              onChange={setScadenza}
              aiuto={{ argomento: 'scadenza', testo: 'Ti avviso un mese prima.' }}
            />
          ) : null}
        </Griglia>
      ) : null}
      {foto ? (
        <CampoSiNo
          etichetta="Conserva la foto originale"
          valore={originale}
          onChange={setOriginale}
          aiuto={{
            argomento: 'foto originale',
            testo:
              'Di solito riduco la foto mantenendo il testo leggibile, per occupare meno spazio. Attivalo se ti serve la foto intera.',
          }}
        />
      ) : null}
      {clinico.length ? (
        <MessageBar intent="warning">
          <MessageBarBody>
            Sembra un documento con dati clinici ({clinico.join(', ')}): l&apos;archivio di Fiscal è per i
            documenti fiscali, non metterci referti o informazioni sui pazienti.
          </MessageBarBody>
        </MessageBar>
      ) : null}
      {messaggio ? (
        <MessageBar intent={messaggio.ok ? 'success' : 'warning'}>
          <MessageBarBody>{messaggio.testo}</MessageBarBody>
        </MessageBar>
      ) : null}
    </Scheda>
  );
}

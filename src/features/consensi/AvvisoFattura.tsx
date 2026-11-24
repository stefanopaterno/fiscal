'use client';

import { MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useEffect, useState } from 'react';
import { ETICHETTE_STATO, type EsitoPaziente } from '@/engine/consensi/stato';
import { Collegamento } from '@/ui/Moduli';
import { statiConsensi } from './dati';

/**
 * Avviso in fattura (specifica 005, FR-011): se il paziente non ha un consenso valido lo segnala, senza bloccare
 * l'emissione. Gli enti non hanno consensi. Senza rete l'avviso semplicemente non compare.
 */
export function AvvisoConsensoFattura({ clienteId, persona }: { clienteId: string; persona: boolean }) {
  const [stati, setStati] = useState<Map<string, EsitoPaziente> | null>(null);
  useEffect(() => {
    void statiConsensi().then(setStati);
  }, []);
  const e = stati?.get(clienteId);
  if (!persona || !clienteId || !e || e.stato === 'presente') return null;
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        Consenso informato: {ETICHETTE_STATO[e.stato].toLowerCase()}. {e.motivo} Puoi emettere la fattura lo stesso.{' '}
        <Collegamento href={`/consensi/paziente/?id=${clienteId}`} inLinea>
          Sistema il consenso
        </Collegamento>
      </MessageBarBody>
    </MessageBar>
  );
}

/**
 * Promemoria dei consensi (specifica 005, FR-012, SC-007): in home e nelle scadenze, quanti pazienti hanno un
 * consenso mancante, incompleto, revocato o da rinnovare, e chi compie 18 anni a breve. Un tocco porta all'elenco.
 */
export function PromemoriaConsensi() {
  const [stati, setStati] = useState<Map<string, EsitoPaziente> | null>(null);
  useEffect(() => {
    let vivo = true;
    void statiConsensi().then((s) => vivo && setStati(s));
    return () => {
      vivo = false;
    };
  }, []);
  if (!stati) return null;
  const tutti = [...stati.values()];
  const daSistemare = tutti.filter((e) => e.stato !== 'presente').length;
  const diciotto = tutti.filter((e) => e.diciottoVicini).length;
  if (!daSistemare && !diciotto) return null;
  const pezzi = [
    daSistemare ? `${daSistemare} ${daSistemare === 1 ? 'paziente ha' : 'pazienti hanno'} il consenso da sistemare` : '',
    diciotto ? `${diciotto} ${diciotto === 1 ? 'diventa maggiorenne' : 'diventano maggiorenni'} entro 60 giorni` : '',
  ].filter(Boolean);
  return (
    <MessageBar intent="warning" layout="multiline">
      <MessageBarBody>
        Consensi: {pezzi.join('; ')}.{' '}
        <Collegamento href="/consensi/" inLinea>
          Apri i consensi
        </Collegamento>
      </MessageBarBody>
    </MessageBar>
  );
}

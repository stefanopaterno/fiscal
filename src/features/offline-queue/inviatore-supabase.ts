import type { SupabaseClient } from '@supabase/supabase-js';
import type { EsitoInvio, Inviatore, VoceCoda } from './tipi';

/**
 * Invio delle voci a Supabase (T053):
 * - inserimento idempotente: "insert … on conflict (id) do nothing";
 * - modifica solo se la riga è ancora alla versione che l'utente vedeva, altrimenti conflitto.
 */
const erroreDiRete = (e: unknown) =>
  e instanceof TypeError || (typeof navigator !== 'undefined' && navigator.onLine === false);

export function inviatoreSupabase(supabase: SupabaseClient): Inviatore {
  return {
    async invia(voce: VoceCoda): Promise<EsitoInvio> {
      try {
        if (voce.operazione === 'inserisci') {
          const { error } = await supabase
            .from(voce.tabella)
            .upsert({ ...voce.payload, id: voce.id }, { onConflict: 'id', ignoreDuplicates: true });
          if (!error) return { esito: 'ok' };
          return erroreDiRete(error) || error.message?.includes('Failed to fetch')
            ? { esito: 'rete' }
            : { esito: 'errore' };
        }
        const { data, error } = await supabase
          .from(voce.tabella)
          .update(voce.payload)
          .eq('id', voce.id)
          .eq('versione', voce.versioneBase ?? -1)
          .select('id');
        if (error)
          return error.message?.includes('Failed to fetch') ? { esito: 'rete' } : { esito: 'errore' };
        if ((data ?? []).length === 1) return { esito: 'ok' };
        const attuale = await supabase.from(voce.tabella).select('*').eq('id', voce.id).maybeSingle();
        return {
          esito: 'conflitto',
          versioneServer: (attuale.data as { versione?: number } | null)?.versione ?? 0,
          datiServer: attuale.data,
        };
      } catch (e) {
        return erroreDiRete(e) ? { esito: 'rete' } : { esito: 'errore' };
      }
    },
  };
}

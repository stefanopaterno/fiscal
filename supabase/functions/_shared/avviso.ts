// Avviso via e-mail (T065, research D-07): quando parte un ripristino con la frase.
// Usa l'SMTP indicato nei segreti delle funzioni (porta 465 consigliata: Supabase blocca 25 e 587).
// Il testo non contiene mai dati fiscali né personali oltre all'indirizzo di destinazione.
// Se l'SMTP non è configurato si lancia ErroreAvviso: il ripristino NON parte (meglio nessun
// ripristino che un ripristino silenzioso).

import nodemailer from 'nodemailer';
import { ambiente } from './http.ts';

export class ErroreAvviso extends Error {}

export async function inviaAvviso(
  destinatario: string | undefined,
  oggetto: string,
  testo: string,
): Promise<void> {
  const host = ambiente('AVVISO_SMTP_HOST');
  if (!host || !destinatario) throw new ErroreAvviso('Avviso non configurato');
  const utente = ambiente('AVVISO_SMTP_USER');
  const trasporto = nodemailer.createTransport({
    host,
    port: Number(ambiente('AVVISO_SMTP_PORT') || 465),
    secure: ambiente('AVVISO_SMTP_SECURE') !== 'false',
    auth: utente ? { user: utente, pass: ambiente('AVVISO_SMTP_PASS') } : undefined,
    connectionTimeout: 10000,
  });
  try {
    await trasporto.sendMail({
      from: ambiente('AVVISO_MITTENTE') || utente || 'fiscal@localhost',
      to: destinatario,
      subject: oggetto,
      text: testo,
    });
  } catch (e) {
    // Nel registro delle funzioni solo il tipo di errore, mai indirizzi o contenuti.
    const codice = (e as { code?: string; name?: string })?.code ?? (e as Error)?.name ?? 'sconosciuto';
    console.error(`avviso: invio non riuscito (${codice})`);
    throw new ErroreAvviso('Invio non riuscito');
  }
}

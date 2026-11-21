/**
 * Messaggi dell'interfaccia in italiano semplice (T025, principio VI).
 * Regola: gli errori di accesso non dicono mai se un'e-mail esiste o no.
 */
export const messaggi = {
  accesso: {
    credenzialiErrate: 'E-mail o password non corrette.',
    troppiTentativi: 'Troppi tentativi. Aspetta qualche minuto e riprova.',
    codiceErrato: 'Il codice non è giusto. Controlla l\'app di autenticazione e riprova.',
    codiceScaduto: 'Il codice è cambiato nel frattempo. Scrivi quello che vedi adesso.',
    orologioSbagliato:
      'Se il codice viene rifiutato anche quando è giusto, controlla che data e ora del telefono siano impostate in automatico.',
    sessioneScaduta: 'Per sicurezza devi accedere di nuovo. Quello che stavi scrivendo non è andato perso.',
  },
  rete: {
    assente: 'Sei senza connessione. Puoi continuare a inserire dati: partiranno appena torna la rete.',
    inAttesa: 'In attesa di invio',
    inviato: 'Inviato',
    inConflitto: 'Da controllare: questo dato è stato cambiato anche da un altro dispositivo.',
  },
  generico: {
    errore: 'Qualcosa non ha funzionato. Riprova tra poco.',
    caricamento: 'Un momento…',
    stime: 'Sono stime: non sostituiscono il commercialista.',
  },
  configurazione: {
    errore: 'L\'app non è configurata correttamente. Controlla le impostazioni di Supabase.',
  },
} as const;

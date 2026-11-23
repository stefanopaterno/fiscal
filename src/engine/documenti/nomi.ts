/**
 * Nomi dei file e controlli sui dati clinici (specifica 010, FR-011, FR-012).
 * L'app dà sempre un nome suo ai file: il nome originale potrebbe contenere il nome di un paziente.
 */
const minuscoloSenzaAccenti = (t: string) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function nomeFileSicuro(p: {
  tipo: string;
  data: string | null;
  emittente: string | null;
  estensione: string;
}): string {
  const pezzi = [p.tipo.replace(/_/g, '-'), p.data ?? '', p.emittente ?? '']
    .map((x) =>
      minuscoloSenzaAccenti(x)
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean);
  const base = pezzi.join('-').slice(0, 80).replace(/-$/, '');
  const ext = p.estensione.replace(/[^a-z0-9.]/gi, '').toLowerCase();
  return `${base}.${ext}`;
}

/** Parole che fanno pensare a dati clinici: l'archivio non deve contenerli (FR-012). */
const PAROLE_CLINICHE = [
  'diagnosi',
  'anamnesi',
  'referto',
  'terapia',
  'terapie',
  'cartella clinica',
  'sintomi',
  'patologia',
  'farmaci',
  'test psicologico',
  'colloquio clinico',
];

export function sembraClinico(testo: string): string[] {
  const t = minuscoloSenzaAccenti(testo);
  return PAROLE_CLINICHE.filter((p) => t.includes(p)).sort((a, b) => t.indexOf(a) - t.indexOf(b));
}

export const estensioneDi = (nome: string): string => {
  const m = /\.([a-z0-9]+(\.p7m)?)$/i.exec(nome);
  return m ? m[1]!.toLowerCase() : 'bin';
};

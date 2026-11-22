'use client';

import { makeStyles, Tab, TabList, tokens } from '@fluentui/react-components';
import { usePathname, useRouter } from 'next/navigation';
import { regoleSpesePerAnno, type CategoriaSpesa, type RegoleSpese } from '@/engine/regole/spese';
import type { ModalitaPagamento } from '@/engine/spese/deducibilita';

/** Pezzi comuni delle pagine Spese (specifica 008). */

const SEZIONI = [
  { href: '/spese/', etichetta: 'Spese' },
  { href: '/spese/beni/', etichetta: 'Beni durevoli' },
  { href: '/spese/oneri/', etichetta: 'Spese personali' },
  { href: '/spese/consigli/', etichetta: 'Consigli' },
];

const useStili = makeStyles({
  schede: { overflowX: 'auto', minWidth: 0 },
  scheda: { minHeight: '44px', flexShrink: 0 },
});

/** Sotto-menu della sezione Spese (schede di Fluent). */
export function MenuSpese() {
  const s = useStili();
  const router = useRouter();
  const p = usePathname() ?? '';
  const attiva =
    [...SEZIONI].reverse().find((x) => p.endsWith(x.href) || p.startsWith(x.href))?.href ?? '/spese/';
  return (
    <div className={s.schede}>
      <TabList
        selectedValue={attiva}
        onTabSelect={(_, d) => router.push(String(d.value))}
        aria-label="Sezioni delle spese"
      >
        {SEZIONI.map((x) => (
          <Tab key={x.href} value={x.href} className={s.scheda}>
            {x.etichetta}
          </Tab>
        ))}
      </TabList>
    </div>
  );
}

export const ETICHETTA_MODALITA: Record<ModalitaPagamento, string> = {
  carta: 'Carta o bancomat',
  bonifico: 'Bonifico',
  contanti: 'Contanti',
  altro: 'Altro (PayPal, app)',
};

/** Regole delle spese dell'anno, o di quello più vicino se mancano (solo per nomi ed etichette). */
export function regoleOVicine(anno: number): RegoleSpese {
  try {
    return regoleSpesePerAnno(anno);
  } catch {
    return regoleSpesePerAnno(2027);
  }
}

/** Categorie da proporre: quelle attive di default più quelle che l'utente ha attivato. */
export function categorieAttive(r: RegoleSpese, attivate: string[]): CategoriaSpesa[] {
  return r.categorie.filter((c) => c.attivaDiDefault || attivate.includes(c.codice));
}

export const percento = (x: number) => `${Math.round(x * 1000) / 10}%`.replace('.', ',');

export const spazio = tokens.spacingVerticalL;

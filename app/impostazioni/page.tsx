'use client';

import { makeStyles, Text, Title1, Title3, tokens } from '@fluentui/react-components';
import { ChevronRight20Regular } from '@fluentui/react-icons';
import NextLink from 'next/link';
import { useEsci } from '@/features/auth/useSessione';
import { ConAiuto } from '@/ui/AiutoContestuale';
import { ProtectedPage } from '@/ui/ProtectedPage';
import { Shell } from '@/ui/Shell';

/** /app/impostazioni/ — indice delle impostazioni. */
const useStili = makeStyles({
  colonna: { display: 'flex', flexDirection: 'column', gap: tokens.spacingVerticalL },
  voce: {
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusXLarge,
    boxShadow: tokens.shadow2,
    padding: tokens.spacingHorizontalXL,
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalM,
    color: tokens.colorNeutralForeground1,
    textDecoration: 'none',
    minHeight: '44px',
    ':hover': { boxShadow: tokens.shadow8 },
  },
  testo: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    flexGrow: 1,
    minWidth: 0,
  },
  titolo: { margin: 0 },
  esci: {
    alignSelf: 'flex-start',
    minHeight: '44px',
    background: 'none',
    border: 'none',
    padding: 0,
    color: tokens.colorBrandForegroundLink,
    cursor: 'pointer',
    fontSize: tokens.fontSizeBase300,
  },
});

const VOCI = [
  {
    href: '/impostazioni/attivita/',
    titolo: 'Partita IVA e attività',
    testo: 'I tuoi dati per le fatture, la sede, il bollo e le attività che svolgi.',
  },
  {
    href: '/impostazioni/modalita/',
    titolo: 'Prova e produzione',
    testo: 'Fai prove e cancellale; quando sei pronto passi alle fatture vere (senza ritorno).',
  },
  {
    href: '/impostazioni/sicurezza/',
    titolo: 'Sicurezza',
    testo: 'Dove sono i tuoi dati, dispositivi collegati, blocco, codici di recupero e password.',
  },
];

export default function PaginaImpostazioni() {
  const s = useStili();
  const esci = useEsci();
  return (
    <ProtectedPage>
      <Shell navigazione>
        <div className={s.colonna}>
          <ConAiuto
            allineamento="centro"
            aiuto={{
              argomento: 'impostazioni',
              testo:
                "Le scelte che fai una volta e valgono per tutta l'app: i tuoi dati professionali e la sicurezza.",
            }}
          >
            <Title1 as="h1">Impostazioni</Title1>
          </ConAiuto>
          {VOCI.map((v) => (
            <NextLink key={v.href} href={v.href} className={s.voce}>
              <span className={s.testo}>
                <Title3 as="h2" className={s.titolo}>
                  {v.titolo}
                </Title3>
                <Text>{v.testo}</Text>
              </span>
              <ChevronRight20Regular aria-hidden="true" />
            </NextLink>
          ))}
          <button type="button" className={s.esci} onClick={() => void esci()}>
            Esci da Fiscal
          </button>
        </div>
      </Shell>
    </ProtectedPage>
  );
}

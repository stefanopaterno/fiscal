import { describe, expect, it } from 'vitest';
import { apriCassaforte, chiudiInCassaforte, creaCassaforte } from '@/features/lock/cassaforte';

// Cassaforte dello sblocco rapido (research D-08). Il "segreto PRF" è quello che il dispositivo
// rilascia solo dopo Face ID / impronta: qui lo simuliamo con byte casuali.

const segreto = () => crypto.getRandomValues(new Uint8Array(32)).buffer;
const SESSIONE = JSON.stringify({ access_token: 'aaa', refresh_token: 'bbb' });

describe('cassaforte dello sblocco rapido', () => {
  it('si chiude senza il segreto e si riapre solo con il segreto giusto', async () => {
    const prf = segreto();
    const cassaforte = await creaCassaforte(prf);
    const busta = await chiudiInCassaforte(cassaforte.pubblica, SESSIONE);
    expect(JSON.stringify(busta)).not.toContain('bbb');
    expect(await apriCassaforte(prf, cassaforte, busta)).toBe(SESSIONE);
  });

  it('con un segreto diverso (altro dispositivo o altra impronta) non si apre', async () => {
    const cassaforte = await creaCassaforte(segreto());
    const busta = await chiudiInCassaforte(cassaforte.pubblica, SESSIONE);
    await expect(apriCassaforte(segreto(), cassaforte, busta)).rejects.toThrow();
  });

  it('ogni chiusura produce una busta diversa', async () => {
    const cassaforte = await creaCassaforte(segreto());
    const a = await chiudiInCassaforte(cassaforte.pubblica, SESSIONE);
    const b = await chiudiInCassaforte(cassaforte.pubblica, SESSIONE);
    expect(a.cifrato).not.toBe(b.cifrato);
  });

  it('la chiave privata è conservata solo cifrata', async () => {
    const cassaforte = await creaCassaforte(segreto());
    expect(JSON.stringify(cassaforte)).not.toMatch(/"d":/); // nessuna parte privata RSA in chiaro
  });
});

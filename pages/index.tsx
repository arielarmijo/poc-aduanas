import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { openDB } from 'idb';
import { Workbox } from 'workbox-window';
import styles from '../styles/Home.module.css';

type ServiceOrder = any;
type Checkpoint = any;

const CUSTOMS_SRV_URL = process.env.NEXT_PUBLIC_CUSTOMS_SRV_URL;
const TRACKING_SRV_URL = process.env.NEXT_PUBLIC_TRACKING_SRV_URL;

const localDateOptions: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric"
};

export default function Home() {

  const [ isOffline, setIsOffline ] = useState(false);
  const [ errorMsg, setErrorMsg ] = useState('');
  const [ serviceOrderCode, setServiceOrderCode ] = useState('');
  const [ serviceOrder, setServiceOrder ] = useState<ServiceOrder | null>(null);
  const [ appliedCheckpoints, setAppliedCheckpoints ] = useState<Checkpoint[]>([]);

  const handleNetworkStatus = useCallback((event: Event): void => {
    setIsOffline(!window.navigator.onLine);
  }, []);

  const handleBackSync = useCallback((event: MessageEvent) => {
    console.log({data: event.data});
    const { code } = event.data;
    const index = appliedCheckpoints.findIndex(ckp => ckp.code === code);
    if (index === -1) return;
    const checkpoint = appliedCheckpoints[index];
    checkpoint.status = 'SUCCESS';
    setAppliedCheckpoints([...appliedCheckpoints]);
  }, [appliedCheckpoints]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.workbox !== undefined) {
      navigator.serviceWorker.addEventListener('message', handleBackSync);
      return () => navigator.serviceWorker.removeEventListener('message', handleBackSync);
    }
  }, [handleBackSync]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsOffline(!window.navigator.onLine);
      window.addEventListener('offline', handleNetworkStatus);
      window.addEventListener('online', handleNetworkStatus);
      return () => {
        window.removeEventListener('offline', handleNetworkStatus);
        window.removeEventListener('online', handleNetworkStatus);
      };
    }
  }, [handleNetworkStatus, isOffline]);

  // useEffect(() => {
  //   openDB('workbox-background-sync').then(db => {
  //     const tx = db.transaction('requests', 'readonly');
  //     const store = tx.objectStore('requests');
  //     return store.getAll();
  //   }).then(console.log);
  // }, [isOffline]);

  const handleServiceOrderCodeChange = async ({target: {value}}: ChangeEvent<HTMLInputElement>): Promise<void> => {
    setServiceOrderCode(value);
    setErrorMsg('');
  };

  const handleGetServiceOrderInfo = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    setServiceOrderCode('');
    const code = (event.target as any).elements.serviceOrder.value;
    const serviceOrder = await fetch(`${CUSTOMS_SRV_URL}/service-orders/${code}`)
      .then(resp => {
        if (resp.ok) return resp.json();
        throw new Error(`Orden de servicio ${code} no existe.`)
      })
      .catch(error => {
        console.warn(error);
        setErrorMsg(error.message);
      });
    setServiceOrder(serviceOrder);
  };

  const handleApplyCheckpoint = (): void => {
    if (serviceOrder?.code) {
      const body = {
        timestamp: String(Date.now()),
        code: serviceOrder.code,
        checkpoint: {
          code: 'PU',
          type: 'event',
          description: 'Pinchazo de ejemplo'
        },
        status: 'SUCCESS'
      };

      fetch(`${TRACKING_SRV_URL}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify(body)
      })
      .then(resp => {
        if (resp.ok) return resp.json();
        throw new Error('Error al guardar pinchazo.')
      })
      .then(data => {
        setServiceOrder(null);
        setAppliedCheckpoints(prev => ([...prev, data]))
      })
      .catch(error => {
        console.warn(error);
        setServiceOrder(null);
        setAppliedCheckpoints(prev => (
          [
            ...prev,
            {
              ...body,
              status: isOffline ? 'WAITING' : 'FAILED'}
          ]))
      });

      // openDB('workbox-background-sync', 3).then(db => {
      //   const tx = db.transaction('requests', 'readonly');
      //   const store = tx.objectStore('requests');
      //   return store.getAll();
      // }).then(console.log);

    }
  }

  return (
    <>
      <Head>
        <title>POC Aduana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, height=device-height, viewport-fit=cover"/>
        <meta name="description" content="POC para servicio de aduanas" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>

        <p className={styles.networkStatus}>{ isOffline ? 'Sin conexión' : null }</p>

        <h1>POC Aduanas</h1>

        <form className={styles.serviceOrderForm} onSubmit={handleGetServiceOrderInfo}>
          <label htmlFor="serviceOrder">Orden de Servicio:</label>
          <div className={styles.row}>
            <input
              id="serviceOrder"
              type="text"
              name="serviceOrder"
              value={serviceOrderCode}
              onChange={handleServiceOrderCodeChange}
            />
            <button type="submit">Buscar</button>
          </div>
          <p className={styles.errorMessage}>{errorMsg ?? null}</p>
        </form>

        <div className={styles.serviceOrderInfo}>
          <pre>{serviceOrder ? JSON.stringify(serviceOrder, null, 2) : null}</pre>
        </div>

        <div className={styles.buttonContainer}>
          <button type="button" onClick={handleApplyCheckpoint}>Aplicar Pinchazo</button>
        </div>

        <ul className={styles.checkpoints}>
          { appliedCheckpoints.map((ckp, i) => (
            <li key={i}>
              <span>{new Date(Number(ckp.timestamp)).toLocaleDateString('es-CL', localDateOptions)}</span>
              <span>{ckp.code}</span>
              <span>{ckp.checkpoint.code}</span>
              <span>{ckp.status}</span>
            </li>
          )) }
        </ul>

      </main>
    </>
  );
}

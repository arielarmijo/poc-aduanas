// @ts-nocheck

import { openDB } from 'idb';
import { registerRoute } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare let self: ServiceWorkerGlobalScope

export const customsDB = openDB('customsDB', 1, {
  upgrade: (db) => {
    if (!db.objectStoreNames.contains('serviceOrders')) {
      db.createObjectStore('serviceOrders', { keyPath: 'code' });
    }
  },
});

registerRoute(
  ({url}) => /\/service-orders\/\d+$/.test(url.pathname),
   async ({ url, request }) => {
    const code = url.pathname.match(/\d+$/)?.[0] as string;
    const serviceOrder = await (await customsDB).get('serviceOrders', code);
    if (serviceOrder) {
      console.log(`Buscando orden de servicio ${code} en cache...`);
      return new Response(JSON.stringify(serviceOrder, ), { headers: { 'Content-Type': 'application/json' } });
    }
    console.log('Buscando orden de servicio en internet...');
    return fetch(request);
  },
  'GET'
);


async function postSuccessMessage(response: any) {
  const clients = await self.clients.matchAll();
  for (const client of clients) {
    client.postMessage({
      type: 'REPLAY_SUCCESS',
      code: (await response.json()).code,
    });
  }
}

async function customReplay() {
  let entry;
  while ((entry = await this.shiftRequest())) {
    try {
      const response = await fetch(entry.request.clone());
      postSuccessMessage(response);
    } catch (error) {
      await this.unshiftRequest(entry);
      throw new Error('Replaying failed.');
    }
  }
}

const bgSync= new BackgroundSyncPlugin('tracking', {
  maxRetentionTime: 24 * 60,
  onSync: customReplay
});

registerRoute(
  ({ url }) => /tracking/.test(url.pathname),
  new NetworkOnly({
    networkTimeoutSeconds: 3,
    plugins: [bgSync]
  }),
  'POST'
);

self.addEventListener('install', async (event: any) => {
  console.log(`Event ${event.type} is triggered.`);
  console.log('Inicializando object store órdenes de servicio en base de datos customsDB...');
  const CUSTOMS_SRV_URL = process.env.CUSTOMS_SRV_URL;
  const serviceOrders = await fetch(`${CUSTOMS_SRV_URL}/service-orders`).then(resp => resp.json());
  const db = await customsDB;
  const tx = db.transaction('serviceOrders', 'readwrite');
  serviceOrders.forEach((serviceOrder: any) => {
    tx.store.put(serviceOrder).then(code => console.log(`agregando orden de servicio ${code} a la base de datos...`));
  })
  tx.done.then(() => console.log('Object store órdenes de servicio inicializada con éxito.')).catch(console.warn);
})

self.addEventListener('activate', (event: any) => {
  console.log(`Event ${event.type} is triggered.`);
})

self.addEventListener('sync', (event: any) => {
  console.log(`Event ${event.type} is triggered.`, {event});
})


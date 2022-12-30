import { openDB } from 'idb';
import { RouteHandlerCallbackOptions } from 'workbox-core';
import { registerRoute, Route, } from 'workbox-routing';
import {NetworkOnly} from 'workbox-strategies';
import {BackgroundSyncPlugin} from 'workbox-background-sync';

const testDB = openDB('test-DB', 1, {
  upgrade: (db) => {
    if (!db.objectStoreNames.contains('users')) {
      db.createObjectStore('users', { keyPath: 'id' });
    }
  },
});

const jsonPlaceholderUrl = /https:\/\/jsonplaceholder\.typicode\.com/;

registerRoute(jsonPlaceholderUrl, async ({ url, request }: RouteHandlerCallbackOptions) => {

  if (/^\/users\/\d+$/.test(url.pathname)) {
    const id = Number(url.pathname.replace(/\/users\//, ''));
    console.log('Buscando usuario id: ', id);
    const user = await (await testDB).get('users', id);
    if (user) {
      console.log('Retornando desde DB: ', {user});
      return new Response(JSON.stringify({...user, msg: 'From SW!!'}), { headers: { 'Content-Type': 'application/json' } });
    }
    
  }

  console.log('Buscando usuario en internet...');
  return fetch(request);

});


const bgSync= new BackgroundSyncPlugin('posts', {
  maxRetentionTime: 24 * 60 // Retry for max of 24 Hours (specified in minutes)
});

registerRoute(
  new RegExp('https://jsonplaceholder.typicode.com/posts'),
  new NetworkOnly({
    networkTimeoutSeconds: 3,
    plugins: [bgSync]
  }),
  'POST'
);


self.addEventListener('install', (event: any) => {
  console.log(`Event ${event.type} is triggered.`);
  console.log('Inicializando la base de datos de usuarios...');
  testDB.then(async (db) => {
    const users = await fetch('https://jsonplaceholder.typicode.com/users').then(resp => resp.json());
    users.forEach((user: any) => {
      db.put('users', user);
    })
  });
})

self.addEventListener('activate', (event: any) => {
  console.log(`Event ${event.type} is triggered.`);
})

self.addEventListener('sync', (event: any) => {
  console.log(`Event ${event.type} is triggered.`, {event});
})


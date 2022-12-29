import { openDB } from 'idb';

const db = openDB('test-DB', 1, {
  upgrade: (db) => {
    if (!db.objectStoreNames.contains('users')) {
      db.createObjectStore('users', { keyPath: 'id' });
    }
  },
});

self.addEventListener('install', (event: any) => {
  console.log(`Event ${event.type} is triggered.`);
  console.log({event});
  db.then(async (db) => {
    const users = await fetch('https://jsonplaceholder.typicode.com/users').then(resp => resp.json());
    users.forEach((user: any) => {
      db.add('users', user);
    })
  })
})

self.addEventListener('activate', (event: any) => {
  console.log(`Event ${event.type} is triggered.`)
  console.log({event})
})

self.addEventListener('fetch', async (event: any) => {
  console.log(`Event ${event.type} is triggered.`)
  console.log({event})

  if (event.request.url.includes('https://jsonplaceholder.typicode.com/users/')) {
    const id = event.request.url.split('/').filter(Boolean)[3];
    const user = await (await db).get('users', (Number(id)));
    console.log({id, user}, event.request.url);
    event.respondWith(new Response(JSON.stringify(user)));
  }

})

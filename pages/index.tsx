import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

type User = any;

export default function Home() {

  const [ isOffline, setIsOffline ] = useState(false);
  const [ errorMsg, setErrorMsg ] = useState('');
  const [ userId, setUserId ] = useState('');
  const [ user, setUser ] = useState<User>(null);
  const [ title, setTitle ] = useState('');
  const [ body, setBody ] = useState('');

  const handleNetworkStatus = useCallback((event: Event) => {
    console.log({isOnline: window.navigator.onLine, event});
    setIsOffline(!window.navigator.onLine);
  }, []);

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
  }, [handleNetworkStatus]);

  const handleUserIdChange = async ({target: {value}}: ChangeEvent<HTMLInputElement>): Promise<void> => {
    setUserId(value);
    setErrorMsg('');
    const user = await fetch(`https://jsonplaceholder.typicode.com/users/${value}`)
                          .then(resp => {
                            if (resp.ok) return resp.json();
                            throw new Error(`User ID: ${value} not found!`)
                          })
                          .then(user => {
                            console.log({user});
                            return user;
                          })
                          .catch(error => {
                            console.warn(error);
                            setErrorMsg(error.message);
                          });
    setUser(user);
    setTitle(user?.name ?? '');
    setBody(user?.email ?? '');
  }

  const handlePostChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = event.target;
    // console.log({event, name, value});
    if (name === 'title') setTitle(value);
    if (name === 'body') setBody(value);

  };

  const handleMakePost = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    fetch('https://jsonplaceholder.typicode.com/posts', {
      method: 'POST',
      body: JSON.stringify({title, body, userId}),
      headers: {'Content-type': 'application/json; charset=UTF-8'}
    })
      .then(resp => resp.json())
      .then(data => {
        console.log(data);
      })
      .catch(console.warn);
  };

  return (
    <>
      <Head>
        <title>POC Aduana</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, height=device-height, viewport-fit=cover"/>
        <meta name="description" content="POC para servicio de aduanas" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className={styles.main}>

        { isOffline ? <p>Sin conexion</p> : null }

        <div className={styles.userId}>
          <label htmlFor="userName">ID usuario:</label>
          <input
            id="userName"
            type="number"
            name="userName"
            value={userId}
            onChange={handleUserIdChange}
          />
        </div>

        { errorMsg ? <p>{errorMsg}</p> : null }

        <form className={styles.makePostForm} onSubmit={handleMakePost}>
          <div>
            <label htmlFor="title">Title</label>
            <input
              id="title"
              type="text"
              name="title"
              value={title}
              onChange={handlePostChange}
            />
          </div>
          <div>
            <label htmlFor="body">Body</label>
            <textarea
              id="body"
              name="body"
              value={body}
              rows={5}
              onChange={handlePostChange}
            /> 
          </div> 
          <button type="submit">Make Post</button>
        </form>

      </main>
    </>
  );
}

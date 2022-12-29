import { ChangeEvent, FormEvent, useState } from 'react';
import Head from 'next/head';
import styles from '../styles/Home.module.css';

export default function Home() {

  const [ userName, setUserName ] = useState('1');
  const [ user, setUser ] = useState<any>({});

  const handleUsernameChange = ({target: {value}}: ChangeEvent<HTMLInputElement>): void => {
    setUserName(value);
  }

  const handleGetUser = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const id = (event.target as any).elements.userName.value;
    const user = await fetch(`https://jsonplaceholder.typicode.com/users/${id}`).then(resp => resp.json());
    setUser(user);
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
        <form onSubmit={handleGetUser}>
          <label>
            <p>ID usuario:</p>
            <input
              type="number"
              name="userName"
              value={userName}
              onChange={handleUsernameChange}
            />
          </label>
          <button>Get User</button>
        </form>
        <pre>{JSON.stringify(user, null, 2)}</pre>
      </main>
    </>
  );
}

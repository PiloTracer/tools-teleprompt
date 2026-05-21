import { en } from "../lib/i18n/en";
import { Layout } from "../prompter/Layout";
import { Player } from "../prompter/Player";

export function PlayPage() {
  return (
    <Layout>
      <main className="tp-play-page">
        <h1>{en.play.title}</h1>
        <Player />
      </main>
    </Layout>
  );
}

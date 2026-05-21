import { en } from "../lib/i18n/en";
import { Layout } from "../prompter/Layout";

export function PlayPage() {
  return (
    <Layout>
      <main>
        <h1>{en.play.title}</h1>
        <p>{en.play.stub}</p>
      </main>
    </Layout>
  );
}

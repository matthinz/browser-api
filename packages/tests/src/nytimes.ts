import { Configuration, DefaultApi } from "client";
import { after, before, describe, it } from "node:test";
import { createApp } from "server";

describe("nytimes.com", () => {
  let app:
    | Awaited<ReturnType<Awaited<ReturnType<typeof createApp>>>>
    | undefined;

  before(async () => {
    const startApp = await createApp();
    app = await startApp();
  });

  it("can load the site", async () => {
    const config = new Configuration({});

    const client = new DefaultApi(config);

    await client.createSession();
  });

  after(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });
});

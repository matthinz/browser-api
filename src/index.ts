import { parseArgs } from "node:util";
import { createApp } from "./app.js";

run(process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run(args: string[]) {
  const parsed = parseArgs({
    args,
    options: {
      verbose: {
        type: "boolean",
        default: false,
      },
    },
  });

  const start = await createApp({
    ...parsed.values,
  });

  const { port } = await start();

  console.log(`Listening on http://localhost:${port}`);
}

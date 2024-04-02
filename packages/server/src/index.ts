import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { createApp } from "./app.js";
import { RouteInfo, RouteInfoSchema } from "./utils/routes.js";

export { createApp } from "./app.js";

type RouteInfoWithMetadata = RouteInfo & {
  method: "GET" | "POST" | "PUT" | "DELETE";
  name: string;
  filename: string;
};

export async function loadRoutes(): Promise<RouteInfoWithMetadata[]> {
  const routesDir = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "routes",
  );

  const jsFiles = (await fs.readdir(routesDir))
    .map((f) => path.join(routesDir, f))
    .filter((f) => /\.js$/.test(path.extname(f)))
    .map((f) => path.resolve(f));

  return (
    await Promise.all(
      jsFiles.map(async (filename) => {
        const mod = await import(filename);

        if (!mod.ROUTE_INFO) {
          return;
        }

        const routeInfo = RouteInfoSchema.parse(mod.ROUTE_INFO);

        const exportedFunctions = Object.values(mod).filter(
          (v) => typeof v === "function",
        ) as Function[];

        if (exportedFunctions.length === 0) {
          throw new Error(`No route function exported from ${filename}`);
        } else if (exportedFunctions.length > 1) {
          throw new Error(`Multiple functions exported from ${filename}`);
        }

        const routeFunction = exportedFunctions[0];
        return {
          name: routeFunction.name,
          filename,
          ...routeInfo,
          method: routeInfo.method ?? "GET",
        };
      }),
    )
  ).filter(Boolean) as RouteInfoWithMetadata[];
}

export async function run(args: string[]) {
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

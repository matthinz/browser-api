import fs from "node:fs/promises";
import { loadRoutes } from "server";
import yaml from "yaml";
import { zodToJsonSchema } from "zod-to-json-schema";

type RouteInfo =
  Awaited<ReturnType<typeof loadRoutes>> extends (infer T)[] ? T : never;

type PathsObject = {
  paths: {
    [key: string]: PathObject;
  };
};

type PathObject = {
  [key in "get" | "post" | "put" | "delete"]: OperationObject;
};

type OperationObject = {
  description: string;
  operationId: string;
  parameters: ParameterObject[];
  responses: {
    [key: string]: ResponseObject;
  };
};

type ResponseObject = {
  description: string;
  content?: {
    "application/json"?: any;
  };
};

type ParameterObject = {
  in: "path";
  name: string;
  required: boolean;
  schema: any;
};

run.apply(this, process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run(..._args: string[]) {
  const packageJson = JSON.parse(await fs.readFile("package.json", "utf-8"));

  const spec = Object.assign(
    {
      openapi: "3.0.3",
      info: {
        title: packageJson.name,
        version: packageJson.version,
      },
    },
    buildPaths(await loadRoutes()),
  );

  console.log(yaml.stringify(spec));
}

function buildPaths(routes: RouteInfo[]): PathsObject {
  return routes.reduce<PathsObject>(
    (result, routeInfo) => {
      if (!routeInfo.path) {
        console.error(`Route is missing path: ${routeInfo.filename}`);
        return result;
      }

      const method = (
        routeInfo.method ?? "GET"
      ).toLowerCase() as keyof PathObject;

      result.paths[routeInfo.path] = result.paths[routeInfo.path] ?? {};
      result.paths[routeInfo.path][method] = buildOperation(routeInfo);

      return result;
    },
    { paths: {} },
  );
}

function buildOperation(routeInfo: RouteInfo): OperationObject {
  return {
    operationId: routeInfo.name.replace(/Route$/, ""),
    description: "",
    parameters: buildParameters(routeInfo.paramsSchema),
    responses: {
      ...successResponse(routeInfo),
    },
  };
}

function buildParameters(
  paramsSchema: RouteInfo["paramsSchema"],
): ParameterObject[] {
  return Object.keys(paramsSchema ?? {}).map((key) => ({
    in: "path",
    name: key,
    required: true,
    schema: {},
  }));
}

function successResponse(routeInfo: RouteInfo): {
  [key: string]: ResponseObject;
} {
  let statusCode = 200;

  if (routeInfo.method === "DELETE" && !routeInfo.responseSchema) {
    statusCode = 204;
  } else if (routeInfo.method === "POST" && !routeInfo.responseSchema) {
    statusCode = 201;
  }

  const description = "";

  if (!routeInfo.responseSchema) {
    return {
      [statusCode.toString()]: {
        description,
      },
    };
  }

  const schema = zodToJsonSchema(routeInfo.responseSchema);
  delete schema["$schema"];

  return {
    [statusCode.toString()]: {
      description,
      content: {
        "application/json": {
          schema,
        },
      },
    },
  };
}

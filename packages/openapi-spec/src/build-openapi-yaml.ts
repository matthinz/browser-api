import fs from "node:fs/promises";
import path from "node:path";
import { loadRoutes } from "server";
import yaml from "yaml";
import { ZodType, any } from "zod";
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
  requestBody?: RequestBodyObject;
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

type RequestBodyObject = {
  description: string;
  content: {
    "application/json": {
      schema: any;
    };
  };
  required: boolean;
};

run.apply(this, process.argv.slice(2)).catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run(buildDir = ".", ..._args: string[]) {
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

  const yamlFile = path.join(buildDir, "openapi.yml");
  const jsonFile = path.join(buildDir, "openapi.json");

  await Promise.all([
    fs.writeFile(yamlFile, yaml.stringify(spec)),
    fs.writeFile(jsonFile, JSON.stringify(spec, null, 2)),
  ]);
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
    requestBody: buildRequestBody(routeInfo),
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

  const schema = buildJsonSchema(routeInfo.responseSchema);

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
function buildRequestBody(routeInfo: RouteInfo): RequestBodyObject | undefined {
  if (routeInfo.method !== "POST" && routeInfo.method !== "PUT") {
    return;
  }

  if (!routeInfo.bodySchema) {
    return;
  }

  const schema = buildJsonSchema(routeInfo.bodySchema);

  return {
    description: "",
    content: {
      "application/json": { schema },
    },
    required: isRequestBodyRequiredForSchema(schema),
  };
}

function buildJsonSchema(z: ZodType): any {
  return zodToJsonSchema(z, { target: "openApi3" });
}

function isRequestBodyRequiredForSchema(schema: any): boolean {
  if (!schema || typeof schema !== "object") {
    return false;
  }

  const { anyOf } = schema;
  if (!anyOf || !Array.isArray(anyOf)) {
    return true;
  }

  if (anyOf.length !== 2) {
    return true;
  }

  const isOptional = anyOf.some((item) => {
    if (!item || typeof item !== "object") {
      return false;
    }

    const { not } = item;
    if (!not || typeof not !== "object") {
      return false;
    }

    return Object.keys(not).length === 0;
  });

  return !isOptional;
}

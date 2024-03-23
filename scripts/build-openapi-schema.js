import fs from "fs/promises";
import { parse as parseYAML } from "yaml";
import { z } from "zod";
import zodToJsonSchema from "zod-to-json-schema";

const SOURCE_YAML_FILE = "src/openapi.yml";

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

async function run() {
  const yaml = await fs.readFile(SOURCE_YAML_FILE, "utf-8");
  const parsed = parseYAML(yaml);

  console.log(parsed);
}

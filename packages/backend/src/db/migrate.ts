import { join } from "node:path";
import { sql } from "./connection";

const schemaPath = join(import.meta.dir, "schema.sql");
const schema = await Bun.file(schemaPath).text();

await sql.unsafe(schema);
console.log("Schema applied.");

await sql.end();

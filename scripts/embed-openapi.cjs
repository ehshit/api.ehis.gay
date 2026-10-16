const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const source = path.join(root, "server", "assets", "openapi.yml");
const target = path.join(root, "server", "utils", "openapi-spec.ts");

const yml = fs.readFileSync(source, "utf8");
const escaped = yml.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");

fs.writeFileSync(target, `export const openapiSpec = \`${escaped}\`;\n`, "utf8");
console.log(`wrote ${path.relative(root, target)} (${yml.length} chars of yaml)`);
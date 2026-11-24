import { readFile } from 'node:fs/promises';

const file = new URL('../api-contract/openapi.json', import.meta.url);
const document = JSON.parse(await readFile(file, 'utf8'));
const errors = [];

if (document.openapi !== '3.1.0') errors.push('El contrato debe declarar OpenAPI 3.1.0.');
if (!document.info?.version) errors.push('Falta una versión del contrato.');
if (!document.paths || Object.keys(document.paths).length === 0) errors.push('El contrato no contiene rutas.');

const operationIds = new Set();
const knownPermissions = new Set([
  'dashboard.access', 'orders.manage', 'stock.manage', 'catalog.edit', 'masters.edit',
  'offers.edit', 'content.edit', 'catalog.delete', 'shipping.config', 'users.manage',
]);
for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
  const declaredParameters = [...(pathItem.parameters ?? [])];
  const pathVariables = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]);
  const parameterNames = new Set(
    declaredParameters.map((parameter) => parameter.name ?? document.components?.parameters?.[parameter.$ref?.split('/').at(-1)]?.name),
  );
  for (const variable of pathVariables) {
    if (!parameterNames.has(variable)) errors.push(`${path}: falta declarar el parámetro de ruta {${variable}}.`);
  }

  for (const [method, operation] of Object.entries(pathItem)) {
    if (method === 'parameters' || method.startsWith('x-')) continue;
    if (!['get', 'post', 'put', 'patch', 'delete', 'options', 'head', 'trace'].includes(method)) continue;
    if (!operation.operationId) errors.push(`${method.toUpperCase()} ${path}: falta operationId.`);
    else if (operationIds.has(operation.operationId)) errors.push(`operationId duplicado: ${operation.operationId}.`);
    else operationIds.add(operation.operationId);
    if (!operation.responses || Object.keys(operation.responses).length === 0) {
      errors.push(`${method.toUpperCase()} ${path}: falta declarar responses.`);
    }
    const gate = operation['x-dashboard-permission'];
    if (gate && !knownPermissions.has(gate)) {
      errors.push(`${method.toUpperCase()} ${path}: permiso x-dashboard-permission desconocido: ${gate}.`);
    }
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Contrato OpenAPI válido estructuralmente: ${Object.keys(document.paths).length} rutas, ${operationIds.size} operaciones.`);
}
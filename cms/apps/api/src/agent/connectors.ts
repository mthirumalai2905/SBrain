import { prisma } from '../db.js';
import { configuredApis, type ApiSource } from './apis.js';
import { configuredServers, type McpServer } from './mcp.js';
import { decrypt } from './secret.js';

/**
 * The MCP servers and API sources the assistant may use on a site: the ones added in Settings, plus any set for the
 * whole install in apps/api/.env. A site's own connector wins if a name is used twice. Tokens are decrypted here, on
 * the server, and go no further than the request to the connector itself.
 */
export async function loadConnectors(siteId: string): Promise<{ mcp: McpServer[]; apis: ApiSource[] }> {
  const rows = await prisma.connector.findMany({ where: { siteId }, orderBy: { createdAt: 'asc' } });
  const mcp: McpServer[] = rows.filter((r) => r.kind === 'mcp').map((r) => ({ name: r.name, url: r.url, token: decrypt(r.tokenEnc), allowWrites: r.allowWrites }));
  const apis: ApiSource[] = rows.filter((r) => r.kind === 'api').map((r) => ({
    name: r.name, baseUrl: r.url, token: decrypt(r.tokenEnc), tokenHeader: r.tokenHeader || undefined, description: r.description || undefined,
  }));
  for (const s of configuredServers()) if (!mcp.some((x) => x.name === s.name)) mcp.push(s);
  for (const a of configuredApis()) if (!apis.some((x) => x.name === a.name)) apis.push(a);
  return { mcp, apis };
}

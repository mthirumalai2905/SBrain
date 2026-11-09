import type { FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '@prisma/client';
import { prisma } from './db.js';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string };
    user: { sub: string };
  }
}

// Local development only: AUTH_DISABLED=true skips sign-in and acts as a built-in super admin.
// server.ts refuses to start with this on unless the API is bound to localhost.
export const authDisabled = process.env.AUTH_DISABLED === 'true';
let devUserId: string | undefined;
async function devUser() {
  if (devUserId) return devUserId;
  const u = await prisma.user.upsert({
    where: { email: 'local-admin@localhost' },
    update: { isSuperAdmin: true },
    create: { email: 'local-admin@localhost', name: 'Local admin', isSuperAdmin: true, passwordHash: '!' },
  });
  return (devUserId = u.id);
}

const rank: Record<Role, number> = { VIEWER: 1, EDITOR: 2, ADMIN: 3 };

export async function authenticate(req: FastifyRequest, reply: FastifyReply) {
  if (authDisabled) {
    req.user = { sub: await devUser() };
    return;
  }
  try {
    await req.jwtVerify();
  } catch {
    return reply.code(401).send({ error: 'Unauthorized' });
  }
}

/** Requires a logged-in user with at least `min` role on :siteId (super admins pass). */
export function requireSite(min: Role) {
  return async (req: FastifyRequest, reply: FastifyReply) => {
    await authenticate(req, reply);
    if (reply.sent) return;
    const { siteId } = req.params as { siteId: string };
    const user = await prisma.user.findUnique({
      where: { id: req.user.sub },
      include: { memberships: { where: { siteId } } },
    });
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    if (user.isSuperAdmin) return;
    const m = user.memberships[0];
    if (!m || rank[m.role] < rank[min]) return reply.code(403).send({ error: 'Forbidden' });
  };
}

export async function requireSuperAdmin(req: FastifyRequest, reply: FastifyReply) {
  await authenticate(req, reply);
  if (reply.sent) return;
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user?.isSuperAdmin) return reply.code(403).send({ error: 'Super admin only' });
}

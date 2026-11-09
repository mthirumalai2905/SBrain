import type { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authDisabled, authenticate, requireSuperAdmin } from '../auth.js';

const publicUser = (u: { id: string; email: string; name: string; isSuperAdmin: boolean }) => ({
  id: u.id, email: u.email, name: u.name, isSuperAdmin: u.isSuperAdmin,
});

export default async function (app: FastifyInstance) {
  app.get('/auth/status', async () => ({ needsSetup: !authDisabled && (await prisma.user.count()) === 0, authDisabled }));

  // The first user becomes super admin; afterwards only a super admin can create users.
  app.post('/auth/register', async (req, reply) => {
    const body = z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(8) }).parse(req.body);
    const first = (await prisma.user.count()) === 0;
    if (!first) {
      await requireSuperAdmin(req, reply);
      if (reply.sent) return;
    }
    const email = body.email.toLowerCase();
    if (await prisma.user.findUnique({ where: { email } })) return reply.code(409).send({ error: 'Email already in use' });
    const user = await prisma.user.create({
      data: { email, name: body.name, passwordHash: await bcrypt.hash(body.password, 10), isSuperAdmin: first },
    });
    return reply.code(201).send(publicUser(user));
  });

  app.post('/auth/login', async (req, reply) => {
    const body = z.object({ email: z.string(), password: z.string() }).parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: body.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'Invalid email or password' });
    }
    return { token: app.jwt.sign({ sub: user.id }, { expiresIn: '7d' }), user: publicUser(user) };
  });

  app.get('/auth/me', { preHandler: authenticate }, async (req, reply) => {
    const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
    if (!user) return reply.code(401).send({ error: 'Unauthorized' });
    return publicUser(user);
  });

  app.get('/users', { preHandler: requireSuperAdmin }, async () =>
    (await prisma.user.findMany({ orderBy: { createdAt: 'asc' } })).map(publicUser));
}

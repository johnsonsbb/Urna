import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { ZodError } from 'zod';

import { env } from './env.js';
import { registerRoutes } from './routes.js';

const app = Fastify({
  logger: { level: env.isProduction ? 'info' : 'debug' },
  // Confia no proxy à frente para IP real — necessário para o rate limit
  // funcionar de verdade atrás de um CDN.
  trustProxy: env.isProduction,
});

await app.register(cors, {
  origin: env.corsOrigins.length > 0 ? env.corsOrigins : true,
  credentials: true,
});

await app.register(jwt, { secret: env.JWT_SECRET });

// Limite global folgado; as rotas de autenticação apertam abaixo.
await app.register(rateLimit, { max: 240, timeWindow: '1 minute' });

app.setErrorHandler((error: unknown, request, reply) => {
  if (error instanceof ZodError) {
    return reply.code(400).send({
      error: 'Dados inválidos.',
      issues: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }

  const fastifyError = error as { statusCode?: number; message?: string };
  if (fastifyError.statusCode && fastifyError.statusCode < 500) {
    return reply.code(fastifyError.statusCode).send({ error: fastifyError.message });
  }

  request.log.error(error);
  return reply.code(500).send({ error: 'Erro interno.' });
});

// Cadastro e login apertam o limite na própria rota — ver `authLimit`.
await app.register(registerRoutes);

try {
  await app.listen({ port: env.PORT, host: env.HOST });
  app.log.info(`Covil no ar em ${env.HOST}:${env.PORT}`);
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} recebido, encerrando.`);
    await app.close();
    process.exit(0);
  });
}

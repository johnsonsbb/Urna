import { z } from 'zod';

/**
 * Configuração validada na partida.
 *
 * Falhar aqui, alto e cedo, é melhor do que subir com um segredo fraco e
 * descobrir depois. Em produção o JWT_SECRET é obrigatório e longo.
 */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  HOST: z.string().default('0.0.0.0'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET precisa de pelo menos 32 caracteres'),
  DATABASE_FILE: z.string().default('data/covil.sqlite'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
});

function load() {
  const parsed = schema.safeParse(process.env);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    console.error(`Configuração inválida:\n${issues}\n`);
    console.error('Copie .env.example para .env e ajuste os valores.');
    process.exit(1);
  }

  const value = parsed.data;

  if (value.NODE_ENV === 'production' && value.JWT_SECRET.includes('troque-este-segredo')) {
    console.error('JWT_SECRET ainda é o valor de exemplo. Gere um segredo real antes de subir.');
    process.exit(1);
  }

  return {
    ...value,
    corsOrigins: value.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean),
    isProduction: value.NODE_ENV === 'production',
  };
}

export const env = load();

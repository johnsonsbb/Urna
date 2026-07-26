import { MAX_PARTY_SLOTS, VOCATIONS, type Vocation } from '@covil/core';
import { useState, type FormEvent } from 'react';

import type { api } from '../api/client';

interface AuthScreenProps {
  busy: boolean;
  error: string | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (input: Parameters<typeof api.register>[0]) => Promise<boolean>;
  onCancel: () => void;
}

const DEFAULT_NAMES: Record<Vocation, string> = {
  knight: 'Bruma',
  paladin: 'Corvo',
  sorcerer: 'Vesp',
  druid: 'Tália',
};

export function AuthScreen({ busy, error, onLogin, onRegister, onCancel }: AuthScreenProps) {
  const [mode, setMode] = useState<'entrar' | 'criar'>('criar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [roster, setRoster] = useState<Vocation[]>(['knight', 'druid', 'sorcerer']);

  const toggleVocation = (vocation: Vocation) => {
    setRoster((current) => {
      if (current.includes(vocation)) {
        return current.length === 1 ? current : current.filter((id) => id !== vocation);
      }
      return current.length >= MAX_PARTY_SLOTS ? current : [...current, vocation];
    });
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (mode === 'entrar') {
      await onLogin(email, password);
      return;
    }
    await onRegister({
      email,
      password,
      name,
      party: roster.map((vocation) => ({ name: DEFAULT_NAMES[vocation], vocation })),
    });
  };

  return (
    <div className="col">
      <section className="card">
        <div className="card__head">
          <span className="card__title">
            {mode === 'entrar' ? 'Entrar' : 'Criar conta'}
          </span>
        </div>

        <div className="card__body">
          <p className="field__hint" style={{ marginTop: 0 }}>
            Você não precisa de conta para jogar — mas precisa de uma para que o grupo continue
            caçando com o app fechado.
          </p>

          <form onSubmit={submit} className="doctrine" style={{ borderTop: 'none' }}>
            <div className="field">
              <label htmlFor="auth-email">E-mail</label>
              <input
                id="auth-email"
                className="input"
                type="email"
                inputMode="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="auth-password">Senha</label>
              <input
                id="auth-password"
                className="input"
                type="password"
                autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
                minLength={8}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {mode === 'criar' && <p className="field__hint">Pelo menos 8 caracteres.</p>}
            </div>

            {mode === 'criar' && (
              <>
                <div className="field">
                  <label htmlFor="auth-name">Nome do jogador</label>
                  <input
                    id="auth-name"
                    className="input"
                    type="text"
                    autoComplete="username"
                    minLength={3}
                    maxLength={20}
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                  <p className="field__hint">É o nome que aparece no ranking.</p>
                </div>

                <div className="field">
                  <label id="auth-roster">
                    Seu grupo — {roster.length}/{MAX_PARTY_SLOTS} slots
                  </label>
                  <div className="segmented" role="group" aria-labelledby="auth-roster">
                    {Object.values(VOCATIONS).map((vocation) => (
                      <button
                        key={vocation.id}
                        type="button"
                        className="segmented__option"
                        aria-pressed={roster.includes(vocation.id)}
                        onClick={() => toggleVocation(vocation.id)}
                      >
                        {vocation.name}
                      </button>
                    ))}
                  </div>
                  <p className="field__hint">
                    Quatro vocações para três slots. Dá para trocar depois, mas cada uma sobe de
                    nível separado — então a primeira escolha pesa.
                  </p>
                </div>
              </>
            )}

            {error && (
              <p className="field__hint" role="alert" style={{ color: 'var(--danger)' }}>
                {error}
              </p>
            )}

            <div className="controls">
              <button type="submit" className="btn btn--primary" disabled={busy}>
                {busy ? 'Enviando…' : mode === 'entrar' ? 'Entrar' : 'Criar conta'}
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setMode(mode === 'entrar' ? 'criar' : 'entrar')}
              >
                {mode === 'entrar' ? 'Criar uma conta' : 'Já tenho conta'}
              </button>
            </div>
          </form>
        </div>
      </section>

      <button type="button" className="btn btn--ghost" onClick={onCancel}>
        Voltar ao jogo
      </button>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUpRight, Layers, LoaderCircle } from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { queryClient } from '../../../api/query';
import { signIn } from '../api';
import { useAuth } from '../../../stores/auth';
import { errorMessage } from '../../../api/client';
import { Button } from '../../../components/ui/button';
export function Login() {
  const user = useAuth((s) => s.user);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  if (user) return <Navigate to="/board" replace />;
  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError('');
    try {
      const data = await signIn(email, password);
      queryClient.clear();
      useAuth.getState().setSession(data.accessToken, data.user);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-[#151518] p-12 lg:flex">
        <div className="flex items-center gap-3 text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
            <Layers size={19} />
          </span>
          handoff
          <span className="ml-1 text-[9px] font-normal uppercase tracking-[.2em] text-muted">
            for teams
          </span>
        </div>
        <div className="relative z-10 max-w-lg">
          <p className="eyebrow mb-6 text-accent">Less chasing. More creating.</p>
          <h1 className="text-5xl font-medium leading-[1.12] tracking-[-.05em]">
            Great work starts
            <br />
            with a clear handoff.
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-7 text-muted">
            One place for the brief, the work, and the feedback. Give your team the space to make
            something great.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-3">
            {['01 / Brief', '02 / Create', '03 / Approve'].map((s, i) => (
              <div key={s} className="rounded-xl border border-border bg-[#1b1b20] p-4">
                <div className="mb-6 flex justify-between text-muted">
                  <Layers size={16} />
                  <ArrowUpRight size={13} />
                </div>
                <p className={i === 2 ? 'text-xs text-accent' : 'text-xs'}>{s}</p>
                <div className="mt-4 h-1 rounded bg-white/5">
                  <div style={{ width: `${(i + 1) * 33}%` }} className="h-1 rounded bg-accent/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Built for the way creative teams work.</span>
          <span>Handoff © {new Date().getFullYear()}</span>
        </div>
        <div className="pointer-events-none absolute -right-52 top-24 h-[600px] w-[600px] rounded-full bg-violet-500/[.025] blur-3xl" />
      </section>
      <section className="flex items-center justify-center p-7">
        <div className="w-full max-w-[350px]">
          <div className="mb-10 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <Layers className="text-accent" />
            handoff
          </div>
          <p className="eyebrow mb-3">Your creative workspace</p>
          <h2 className="text-3xl font-semibold tracking-tight">Welcome back.</h2>
          <p className="mb-9 mt-3 text-sm text-muted">
            Sign in and pick up where your team left off.
          </p>
          <form onSubmit={submit} className="space-y-5">
            <label className="field">
              Work email
              <input
                type="email"
                autoComplete="username"
                required
                placeholder="you@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="text-xs text-rose-300">
                {error}
              </p>
            )}
            <Button disabled={pending} className="h-11 w-full">
              {pending ? (
                <LoaderCircle size={16} className="animate-spin" />
              ) : (
                <>
                  Sign in to Handoff
                  <ArrowRight size={15} />
                </>
              )}
            </Button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-muted">
            Your workspace is invite-only.
            <br />
            Need access? Ask your manager.
          </p>
        </div>
      </section>
    </main>
  );
}

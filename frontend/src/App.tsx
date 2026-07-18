function App() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-background text-text">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(900px_circle_at_10%_10%,rgba(13,0,255,0.35),transparent_40%),radial-gradient(700px_circle_at_85%_15%,rgba(119,0,255,0.3),transparent_38%),linear-gradient(140deg,#100320_0%,#140437_45%,#100320_100%)]" />

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 pb-16 pt-10 md:gap-14 md:pb-20 md:pt-12">
        <nav className="flex items-center justify-between rounded-full border border-white/15 bg-white/5 px-5 py-3 backdrop-blur-md md:px-7">
          <p className="text-lg font-bold tracking-[0.06em] text-text">s4p</p>
          <div className="flex items-center gap-2 text-sm text-secondary md:gap-4">
            <a className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-text" href="#features">
              Features
            </a>
            <a className="rounded-full px-3 py-1 transition hover:bg-white/10 hover:text-text" href="#how-it-works">
              How it Works
            </a>
            <button className="rounded-full border border-primary/80 bg-primary px-4 py-1.5 font-medium text-text transition hover:brightness-110">
              Start Free
            </button>
          </div>
        </nav>

        <div className="grid items-center gap-10 md:grid-cols-[1.05fr_0.95fr]">
          <article className="space-y-6">
            <p className="inline-flex rounded-full border border-accent/50 bg-accent/15 px-4 py-1 text-sm font-medium uppercase tracking-[0.2em] text-secondary">
              Simple AI Workflow Automation
            </p>
            <h1 className="text-5xl leading-[0.95] text-text md:text-7xl">
              Automate your team without automating away your sanity.
            </h1>
            <p className="max-w-xl text-base text-secondary md:text-lg">
              s4p turns scattered prompts, scripts, and manual handoffs into one calm pipeline. Design agents,
              approvals, and triggers in minutes, then run at scale with guardrails.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button className="rounded-2xl border border-primary/50 bg-primary px-6 py-3 font-semibold text-text transition hover:-translate-y-0.5 hover:brightness-110">
                Build Your First Flow
              </button>
              <button className="rounded-2xl border border-white/20 bg-white/5 px-6 py-3 font-semibold text-text transition hover:bg-white/15">
                Watch 90s Demo
              </button>
            </div>
            <p className="text-sm text-secondary">No-code editor. API hooks. Human approvals built in.</p>
          </article>

          <aside className="relative rounded-[2rem] border border-white/15 bg-white/5 p-5 shadow-panel backdrop-blur-xl md:p-7">
            <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-primary/40 blur-2xl" />
            <div className="absolute -bottom-6 -left-4 h-24 w-24 rounded-full bg-accent/40 blur-2xl" />

            <div className="relative space-y-4">
              <div className="rounded-2xl border border-white/15 bg-background/80 p-4">
                <p className="text-small uppercase tracking-[0.15em] text-secondary">Workflow</p>
                <h5 className="mt-2 text-text">Inbound Lead Triage</h5>
                <p className="mt-2 text-sm text-secondary">When form submitted, classify urgency and route owner.</p>
              </div>

              <div className="grid gap-3">
                <div className="rounded-xl border border-primary/40 bg-primary/15 p-3 text-sm">
                  <p className="font-semibold text-text">1. Trigger</p>
                  <p className="text-secondary">Webhook received from website form</p>
                </div>
                <div className="rounded-xl border border-accent/40 bg-accent/15 p-3 text-sm">
                  <p className="font-semibold text-text">2. AI Step</p>
                  <p className="text-secondary">Score sentiment and detect enterprise intent</p>
                </div>
                <div className="rounded-xl border border-white/30 bg-white/10 p-3 text-sm">
                  <p className="font-semibold text-text">3. Human Review</p>
                  <p className="text-secondary">Ask manager approval if confidence is below 0.78</p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <section id="features" className="grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-white/15 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-primary/60">
            <h5 className="text-text">Composable AI Blocks</h5>
            <p className="mt-3 text-sm text-secondary">
              Chain prompts, tools, APIs, and business logic in one visual canvas with reusable templates.
            </p>
          </article>
          <article className="rounded-3xl border border-white/15 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-primary/60">
            <h5 className="text-text">Approval Gates</h5>
            <p className="mt-3 text-sm text-secondary">
              Add checkpoints for legal, ops, or support teams so risky steps always require human signoff.
            </p>
          </article>
          <article className="rounded-3xl border border-white/15 bg-white/5 p-6 transition hover:-translate-y-1 hover:border-primary/60">
            <h5 className="text-text">Production Telemetry</h5>
            <p className="mt-3 text-sm text-secondary">
              See latency, failure paths, and token spend per workflow run with searchable execution logs.
            </p>
          </article>
        </section>

        <section
          id="how-it-works"
          className="rounded-[2rem] border border-white/15 bg-[linear-gradient(120deg,rgba(13,0,255,0.2),rgba(119,0,255,0.18))] p-7 md:p-10"
        >
          <h3 className="text-text">Three steps from chaos to clean automation</h3>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <article className="rounded-2xl border border-white/20 bg-background/70 p-5">
              <p className="text-small font-semibold uppercase tracking-[0.16em] text-secondary">Step 01</p>
              <h5 className="mt-2 text-text">Connect</h5>
              <p className="mt-2 text-sm text-secondary">Hook in your tools through API, Slack, email, and event triggers.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-background/70 p-5">
              <p className="text-small font-semibold uppercase tracking-[0.16em] text-secondary">Step 02</p>
              <h5 className="mt-2 text-text">Automate</h5>
              <p className="mt-2 text-sm text-secondary">Add AI actions, branching logic, and fail-safe rules in plain language.</p>
            </article>
            <article className="rounded-2xl border border-white/20 bg-background/70 p-5">
              <p className="text-small font-semibold uppercase tracking-[0.16em] text-secondary">Step 03</p>
              <h5 className="mt-2 text-text">Scale</h5>
              <p className="mt-2 text-sm text-secondary">Ship your workflow to production with observability and role-based controls.</p>
            </article>
          </div>
        </section>
      </section>
    </main>
  );
}

export default App;
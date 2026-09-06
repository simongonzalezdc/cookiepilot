import { ReactNode, useState } from "react";

export function EmptyState({ icon = "🫙", title, body, action }: { icon?: string; title: string; body?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="icon">{icon}</div>
      <div className="title">{title}</div>
      {body && <div>{body}</div>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="errbox" role="alert">
      <strong>Something broke: </strong>{message}
      {onRetry && (
        <div className="retry">
          <button className="btn small" onClick={onRetry}>Retry</button>
        </div>
      )}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="thinking" style={{ padding: "10px 0" }}>
      <i /><i /><i /> <span style={{ marginLeft: 4 }}>{label ?? "loading live data"}</span>
    </div>
  );
}

export function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copybtn"
      title="Copy"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1200);
        } catch {
          /* clipboard unavailable */
        }
      }}
    >
      {done ? "✓" : label ?? "⧉"}
    </button>
  );
}

export function Section({ id, title, hint, children }: { id?: string; title: string; hint?: string; children: ReactNode }) {
  return (
    <section id={id}>
      <div className="section-title">{title} {hint && <span className="hint">{hint}</span>}</div>
      {children}
    </section>
  );
}

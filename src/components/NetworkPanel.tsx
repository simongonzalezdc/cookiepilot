import { fetchDailyAnalytics, DailyAnalytics } from "../lib/api";
import { usePoll } from "../hooks/usePoll";
import { PROGRAM_NAMES } from "../lib/config";
import { BarChart, HBarList } from "./charts";
import { ErrorBox, Loading, EmptyState } from "./ui";
import { fmtCompact, fmtNum, shortAddr } from "../lib/format";
import { IconBox, IconChart } from "./icons";

export function NetworkPanel() {
  const { data, error, loading, refresh } = usePoll<DailyAnalytics>(fetchDailyAnalytics, 300_000);

  if (error && !data) return <div className="card"><ErrorBox message={error} onRetry={refresh} /></div>;
  if (!data || loading) return <div className="card"><Loading label="loading analytics" /></div>;

  const days = [...data.days].sort((a, b) => a.date.localeCompare(b.date));
  if (!days.length) {
    return (
      <div className="card">
        <EmptyState icon={<IconChart size={24} />} title="No analytics yet" body="The indexer hasn't published daily aggregates — try refresh in a minute." />
      </div>
    );
  }

  const nameFor = (id: string) => PROGRAM_NAMES[id] ?? shortAddr(id, 6, 6);

  return (
    <div className="grid cols-3">
      <div className="card">
        <h3><IconChart size={16} /> Daily transactions <span className="right">indexer</span></h3>
        <BarChart data={days.map((d) => ({ label: d.date.slice(5), value: d.txns }))} format={(n) => fmtNum(n, 0)} />
      </div>
      <div className="card">
        <h3><IconChart size={16} /> Active wallets + fees (COOK) <span className="right">indexer</span></h3>
        <BarChart data={days.map((d) => ({ label: d.date.slice(5), value: d.activeWallets }))} color="var(--mint)" format={(n) => fmtNum(n, 0)} allowBite={false} />
        <div className="dim" style={{ fontSize: 12, marginTop: 6 }}>
          Fees last day: <span className="data">{fmtNum(days.at(-1)?.feesCook ?? 0, 4)} COOK</span> · failed txs: {days.at(-1)?.failed ?? 0}
        </div>
      </div>
      <div className="card">
        <h3><IconBox size={16} /> Top programs by txns <span className="right">recent window</span></h3>
        {data.topPrograms.length === 0 ? (
          <EmptyState icon={<IconBox size={24} />} title="No program activity indexed" />
        ) : (
          <HBarList
            data={data.topPrograms.slice(0, 7).map((p) => ({ label: p.programId, sub: nameFor(p.programId), value: p.txns }))}
            format={(n) => fmtCompact(n)}
          />
        )}
      </div>
    </div>
  );
}

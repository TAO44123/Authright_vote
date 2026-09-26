import type { Stats } from "@/lib/client";

export function ResultBars({ stats, ownOptionId, final = false }: { stats: Stats; ownOptionId?: string | null; final?: boolean }) {
  const max = Math.max(0, ...stats.options.map((option) => option.votes));
  return (
    <div className="results" aria-label="投票结果">
      <h2>{stats.total === 0 ? "等待第一票" : "大家这样选"}</h2>
      <p className="result-subtitle">{final ? "最终结果" : "当前结果"} · 共 {stats.total} 票{final ? "" : " · 统计会自动更新"}</p>
      {stats.options.map((option) => (
        <div className={`result-item ${ownOptionId === option.id ? "own" : ""}`} key={option.id}>
          <div className="result-heading"><span>{ownOptionId === option.id ? "✓ " : ""}{option.label}{max > 0 && option.votes === max ? " · 领先" : ""}</span><span>{option.votes} 票 / {option.percent}%</span></div>
          <div className="result-track" role="progressbar" aria-label={`${option.label}，${option.votes}票，占${option.percent}%`} aria-valuenow={option.percent} aria-valuemin={0} aria-valuemax={100}>
            <div className="result-fill" style={{ width: `${option.percent}%` }} />
          </div>
        </div>
      ))}
      <div className="result-footer"><span>总票数 {stats.total}</span><span>匿名统计 · 单选</span></div>
    </div>
  );
}

'use client';
import React, { useRef, useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, LineChart, Line, Legend, AreaChart, Area, ScatterChart, Scatter,
  ReferenceLine
} from 'recharts';
import {
  Activity, ShieldCheck, BrainCircuit, Terminal, ChevronRight, UploadCloud,
  RefreshCw, Cpu, Scale, UserCheck, MemoryStick, Clock, ArrowRight,
  Eye, Download, AlertTriangle, CheckCircle2, XCircle, TrendingUp,
  TrendingDown, Minus, ChevronDown, ChevronUp, Layers, Gauge, HardDrive,
  Timer, Flame, BarChart3, Zap
} from 'lucide-react';
import { getClientFriendlyStatus } from '@/lib/eval-service';
import { useRouter } from 'next/navigation';

interface TestRun {
  date: string;
  fullDate: string;
  agent: string;
  judge: string;
  score: number;
  reason: string;
  sutOutput: string;
  metrics?: {
    duration_ms: number;
    duration_seconds?: number;
    cpu?: { avg_usage_percent: number; peak_usage_percent: number; start_usage?: number; end_usage?: number };
    ram?: { avg_used_gb: number; peak_used_gb: number; start_used_gb?: number; end_used_gb?: number; total_gb?: number };
    snapshots?: any[];
  };
  pipeline?: {
    deepeval_input?: string;
    ollama_request?: any;
    ollama_response?: any;
    ollama_metrics?: any;
    gemini_request?: any;
    gemini_response?: any;
    gemini_metrics?: any;
    deepeval_result?: any;
  };
}

// --- Utility Components ---

function StatCard({ label, value, sublabel, icon: Icon, accent = 'blue', trend, warning }: {
  label: string; value: string | number; sublabel?: string;
  icon: any; accent?: string; trend?: 'up' | 'down' | 'flat'; warning?: boolean;
}) {
  const accents: Record<string, { border: string; iconBg: string; iconColor: string; trendColor: string }> = {
    blue: { border: 'border-t-[#0073bb]', iconBg: 'bg-blue-50', iconColor: 'text-blue-600', trendColor: 'text-blue-500' },
    orange: { border: 'border-t-[#ec7211]', iconBg: 'bg-orange-50', iconColor: 'text-orange-600', trendColor: 'text-orange-500' },
    purple: { border: 'border-t-[#8b5cf6]', iconBg: 'bg-purple-50', iconColor: 'text-purple-600', trendColor: 'text-purple-500' },
    green: { border: 'border-t-[#16a34a]', iconBg: 'bg-green-50', iconColor: 'text-green-600', trendColor: 'text-green-500' },
    red: { border: 'border-t-[#dc2626]', iconBg: 'bg-red-50', iconColor: 'text-red-600', trendColor: 'text-red-500' },
    gray: { border: 'border-t-[#6b7280]', iconBg: 'bg-gray-50', iconColor: 'text-gray-500', trendColor: 'text-gray-500' },
  };
  const a = accents[accent] || accents.blue;

  return (
    <div className={`bg-white border-t-4 ${a.border} border-x border-b border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-wide">{label}</span>
        <div className={`${a.iconBg} p-1.5 rounded`}>
          <Icon size={14} className={a.iconColor} />
        </div>
      </div>
      <div className="flex items-end gap-2">
        <span className={`text-3xl font-bold ${warning ? 'text-amber-600' : 'text-gray-800'}`}>{value}</span>
        {trend && (
          <span className={`mb-1 ${trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
            {trend === 'up' ? <TrendingUp size={16} /> : trend === 'down' ? <TrendingDown size={16} /> : <Minus size={14} />}
          </span>
        )}
      </div>
      {sublabel && <p className="text-[10px] text-gray-400 mt-2 uppercase tracking-wide">{sublabel}</p>}
    </div>
  );
}

function SectionHeader({ title, subtitle, icon: Icon, accent = '#0073bb' }: {
  title: string; subtitle?: string; icon: any; accent?: string;
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="p-2 rounded" style={{ backgroundColor: accent + '15' }}>
        <Icon size={20} style={{ color: accent }} />
      </div>
      <div>
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );
}

function DataBadge({ label, value, color = 'gray' }: { label: string; value: string; color?: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    orange: 'bg-orange-50 text-orange-700 border-orange-200',
    purple: 'bg-purple-50 text-purple-700 border-purple-200',
    gray: 'bg-gray-50 text-gray-600 border-gray-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[10px] font-bold uppercase ${colors[color]}`}>
      <span className="text-[8px] opacity-60">{label}</span> {value}
    </span>
  );
}

// --- Custom Tooltip ---
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#232f3e] text-white p-3 rounded shadow-xl text-xs border border-gray-600">
      <div className="font-bold mb-1.5 text-[#ff9900]">{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2 py-0.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-gray-300">{p.name}:</span>
          <span className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
}

// --- Main Component ---

export default function ClientDashboard({ realData = [] }: { realData: TestRun[] }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'overview' | 'pipeline'>('overview');
  const [expandedStages, setExpandedStages] = useState<Record<string, boolean>>({});

  // --- Computed Data ---

  const sortedData = useMemo(() => [...realData].sort((a, b) =>
    new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime()
  ), [realData]);

  const latestRun = sortedData.length ? sortedData[sortedData.length - 1] : null;
  const status = latestRun ? getClientFriendlyStatus(latestRun.score) : null;

  const scoreHistory = useMemo(() =>
    sortedData.map((r, i) => ({
      label: `Run ${i + 1}`,
      date: r.fullDate,
      score: +(r.score * 100).toFixed(1),
      agent: r.agent,
      judge: r.judge,
      hasMetrics: !!r.metrics,
    })),
  [sortedData]);

  const passRate = useMemo(() => {
    if (!sortedData.length) return 0;
    return +(sortedData.filter(r => r.score >= 0.6).length / sortedData.length * 100).toFixed(1);
  }, [sortedData]);

  const runsWithMetrics = useMemo(() => sortedData.filter(r => r.metrics), [sortedData]);

  const hardwareStats = useMemo(() => {
    if (!runsWithMetrics.length) return null;
    const avgCpu = runsWithMetrics.reduce((s, r) => s + (r.metrics!.cpu?.avg_usage_percent || 0), 0) / runsWithMetrics.length;
    const avgRam = runsWithMetrics.reduce((s, r) => s + (r.metrics!.ram?.avg_used_gb || 0), 0) / runsWithMetrics.length;
    const avgDur = runsWithMetrics.reduce((s, r) => s + (r.metrics!.duration_ms || 0), 0) / runsWithMetrics.length;
    const peakCpu = Math.max(...runsWithMetrics.map(r => r.metrics!.cpu?.peak_usage_percent || 0));
    const peakRam = Math.max(...runsWithMetrics.map(r => r.metrics!.ram?.peak_used_gb || 0));
    const totalRam = runsWithMetrics[0]?.metrics?.ram?.total_gb || 16;
    return { avgCpu, avgRam, avgDur, peakCpu, peakRam, totalRam, count: runsWithMetrics.length };
  }, [runsWithMetrics]);

  // Snapshot data for the latest run with metrics
  const snapshotChartData = useMemo(() => {
    const run = runsWithMetrics[runsWithMetrics.length - 1];
    if (!run?.metrics?.snapshots?.length) return [];
    const startTs = run.metrics!.snapshots[0].timestamp;
    return run.metrics!.snapshots.map((s: any) => ({
      time: +((s.timestamp - startTs) / 1000).toFixed(1),
      cpu: s.cpu.usage,
      ram: +(s.ram.used / (1024 ** 3)).toFixed(2),
      ramPct: s.ram.percentage,
    }));
  }, [runsWithMetrics]);

  const hardwareTrend = useMemo(() =>
    runsWithMetrics.map((r, i) => ({
      run: `Run ${sortedData.indexOf(r) + 1}`,
      cpu: +(r.metrics!.cpu?.avg_usage_percent || 0).toFixed(1),
      ram: +(r.metrics!.ram?.avg_used_gb || 0).toFixed(2),
      duration: +((r.metrics!.duration_ms || 0) / 1000).toFixed(1),
    })),
  [runsWithMetrics, sortedData]);

  // Data completeness check
  const dataQuality = useMemo(() => {
    const total = sortedData.length;
    const withScore = sortedData.filter(r => r.score > 0).length;
    const withOutput = sortedData.filter(r => r.sutOutput?.length > 0).length;
    const withMetrics = runsWithMetrics.length;
    const withReason = sortedData.filter(r => r.reason?.length > 0).length;
    return { total, withScore, withOutput, withMetrics, withReason };
  }, [sortedData, runsWithMetrics]);

  // --- Handlers ---

  async function handleUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      if (res.ok) {
        router.refresh();
        setTimeout(() => { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }, 1000);
      } else { alert('Upload Failed'); setIsUploading(false); }
    } catch { setIsUploading(false); }
  }

  const downloadReport = (run: TestRun, type: 'ollama' | 'gemini' | 'full') => {
    let data: any = {};
    let filename = '';
    const ts = run.fullDate.replace(/[/,:]/g, '-').replace(/\s/g, '_');
    if (type === 'ollama') {
      data = { timestamp: run.fullDate, model: run.agent, request: run.pipeline?.ollama_request, response: run.pipeline?.ollama_response, metrics: run.pipeline?.ollama_metrics || run.metrics };
      filename = `ollama_${ts}.json`;
    } else if (type === 'gemini') {
      data = { timestamp: run.fullDate, model: run.judge, request: run.pipeline?.gemini_request, response: run.pipeline?.gemini_response, metrics: run.pipeline?.gemini_metrics };
      filename = `gemini_${ts}.json`;
    } else {
      data = { timestamp: run.fullDate, score: run.score, status: run.score >= 0.6 ? 'PASS' : 'FAIL', pipeline: run.pipeline, metrics: run.metrics, verdict: run.reason };
      filename = `pipeline_${ts}.json`;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleStage = (key: string) => setExpandedStages(prev => ({ ...prev, [key]: !prev[key] }));

  // --- Empty State ---
  if (!sortedData.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f2f3f3] p-10">
        <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".json" />
        <div className="bg-white border border-gray-200 rounded-sm shadow-lg p-12 text-center max-w-md">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <BrainCircuit size={36} className="text-gray-300" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Test Data Available</h2>
          <p className="text-sm text-gray-500 mb-6">Import a DeepEval JSON result to begin tracking your LLM evaluation pipeline.</p>
          <button onClick={() => fileInputRef.current?.click()}
            className="bg-[#ec7211] hover:bg-[#c9610f] text-white px-8 py-3 rounded-sm font-bold shadow-sm transition-colors flex items-center gap-2 mx-auto">
            <UploadCloud size={18} /> Import First Result
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f2f3f3] font-sans text-[#232f3e]">
      <input type="file" ref={fileInputRef} onChange={handleUpload} className="hidden" accept=".json" />

      {/* NAV */}
      <nav className="bg-[#232f3e] text-white px-6 py-3 flex items-center justify-between shadow-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-[#ff9900] p-1.5 rounded-sm"><BrainCircuit size={16} className="text-[#232f3e]" /></div>
          <span className="font-bold text-sm tracking-tight">LLM Quality Framework</span>
          <ChevronRight size={12} className="text-gray-500" />
          <span className="text-xs text-gray-400">Pipeline Analytics</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[#414750] rounded-sm overflow-hidden border border-[#687078]">
            {(['overview', 'pipeline'] as const).map(mode => (
              <button key={mode} onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-xs font-bold transition-all capitalize ${viewMode === mode ? 'bg-[#ff9900] text-[#232f3e]' : 'text-white hover:bg-[#545b64]'}`}>
                {mode}
              </button>
            ))}
          </div>
          <button onClick={() => fileInputRef.current?.click()}
            className="bg-[#545b64] hover:bg-[#414750] text-white px-4 py-1.5 text-xs font-bold rounded-sm flex items-center gap-2 border border-[#687078] transition-all">
            {isUploading ? <RefreshCw size={14} className="animate-spin" /> : <UploadCloud size={14} />}
            Import JSON
          </button>
        </div>
      </nav>

      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">

        {/* ============ OVERVIEW MODE ============ */}
        {viewMode === 'overview' && (
          <>
            {/* Data Quality Banner */}
            {dataQuality.withScore < dataQuality.total && (
              <div className="bg-amber-50 border border-amber-200 rounded-sm p-4 mb-6 flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-bold text-amber-800">Incomplete Data Detected</p>
                  <p className="text-xs text-amber-600 mt-1">
                    {dataQuality.withScore}/{dataQuality.total} runs have scores &middot;{' '}
                    {dataQuality.withOutput}/{dataQuality.total} have SUT output &middot;{' '}
                    {dataQuality.withMetrics}/{dataQuality.total} have hardware metrics &middot;{' '}
                    {dataQuality.withReason}/{dataQuality.total} have judge reasoning
                  </p>
                  <p className="text-[10px] text-amber-500 mt-1">
                    Ensure your DeepEval JSON includes <code className="bg-amber-100 px-1 rounded">test_case.actual_output</code>, <code className="bg-amber-100 px-1 rounded">score</code>, and <code className="bg-amber-100 px-1 rounded">reason</code> fields.
                  </p>
                </div>
              </div>
            )}

            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <StatCard label="Latest Score" value={`${(latestRun!.score * 100).toFixed(1)}%`}
                sublabel={status?.label} icon={Scale} accent={latestRun!.score >= 0.6 ? 'green' : 'red'} />
              <StatCard label="Pass Rate" value={`${passRate}%`}
                sublabel={`${sortedData.filter(r => r.score >= 0.6).length}/${sortedData.length} passed`}
                icon={ShieldCheck} accent={passRate >= 60 ? 'green' : passRate > 0 ? 'orange' : 'red'} />
              <StatCard label="Total Runs" value={sortedData.length}
                sublabel="All evaluations" icon={Layers} accent="blue" />
              <StatCard label="SUT Model" value={latestRun!.agent.split(':')[0]}
                sublabel={latestRun!.agent} icon={Cpu} accent="orange" />
              <StatCard label="Judge Model" value={latestRun!.judge.split('-')[0]}
                sublabel={latestRun!.judge} icon={UserCheck} accent="purple" />
              <StatCard label="Inference Time" icon={Timer} accent="gray"
                value={latestRun!.metrics?.duration_ms ? `${(latestRun!.metrics.duration_ms / 1000).toFixed(1)}s` : 'N/A'}
                sublabel={latestRun!.metrics ? `${latestRun!.metrics.duration_ms}ms` : 'No metrics captured'} />
            </div>

            {/* Score History Chart */}
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6 mb-8">
              <SectionHeader title="Score History" subtitle="Answer relevancy across all evaluation runs" icon={BarChart3} accent="#0073bb" />
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={scoreHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine y={60} stroke="#dc2626" strokeDasharray="6 4" label={{ value: 'Pass: 60%', position: 'insideTopRight', fill: '#dc2626', fontSize: 10 }} />
                    <Bar dataKey="score" name="Score %" radius={[3, 3, 0, 0]} maxBarSize={48}>
                      {scoreHistory.map((entry, i) => (
                        <Cell key={i} fill={entry.score >= 60 ? '#16a34a' : entry.score > 0 ? '#dc2626' : '#d1d5db'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {scoreHistory.every(s => s.score === 0) && (
                <p className="text-center text-xs text-gray-400 mt-2 italic">All scores are 0 — check that your DeepEval output includes valid scores</p>
              )}
            </div>

            {/* Hardware Section */}
            {hardwareStats && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <StatCard label="Avg CPU" value={`${hardwareStats.avgCpu.toFixed(1)}%`}
                    sublabel={`Peak: ${hardwareStats.peakCpu}%`} icon={Cpu} accent="orange"
                    warning={hardwareStats.avgCpu > 90} />
                  <StatCard label="Avg RAM" value={`${hardwareStats.avgRam.toFixed(1)} GB`}
                    sublabel={`of ${hardwareStats.totalRam.toFixed(1)} GB total`} icon={HardDrive} accent="purple"
                    warning={hardwareStats.avgRam / hardwareStats.totalRam > 0.8} />
                  <StatCard label="Peak RAM" value={`${hardwareStats.peakRam.toFixed(2)} GB`}
                    sublabel={`${((hardwareStats.peakRam / hardwareStats.totalRam) * 100).toFixed(0)}% utilization`}
                    icon={Flame} accent="red" />
                  <StatCard label="Avg Duration" value={`${(hardwareStats.avgDur / 1000).toFixed(1)}s`}
                    sublabel={`Across ${hardwareStats.count} instrumented runs`} icon={Clock} accent="blue" />
                </div>

                {/* Real-time Snapshot Chart */}
                {snapshotChartData.length > 0 && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6">
                      <SectionHeader title="CPU Usage Over Time" subtitle="Latest instrumented run — per-snapshot CPU utilization" icon={Cpu} accent="#ea580c" />
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={snapshotChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ea580c" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#ea580c" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={v => `${v}s`} />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} tickFormatter={v => `${v}%`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="cpu" name="CPU %" stroke="#ea580c" fill="url(#cpuGrad)" strokeWidth={2} dot={false} />
                            <ReferenceLine y={100} stroke="#dc2626" strokeDasharray="3 3" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6">
                      <SectionHeader title="RAM Usage Over Time" subtitle="Latest instrumented run — memory consumption in GB" icon={HardDrive} accent="#7c3aed" />
                      <div className="h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={snapshotChartData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="time" tick={{ fontSize: 10 }} tickFormatter={v => `${v}s`} />
                            <YAxis domain={['auto', 'auto']} tick={{ fontSize: 10 }} tickFormatter={v => `${v}G`} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="ram" name="RAM (GB)" stroke="#7c3aed" fill="url(#ramGrad)" strokeWidth={2} dot={false} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hardware Trend across runs */}
                {hardwareTrend.length > 1 && (
                  <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6 mb-8">
                    <SectionHeader title="Hardware Trends Across Runs" subtitle="CPU, RAM, and duration across instrumented evaluations" icon={TrendingUp} accent="#0073bb" />
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={hardwareTrend} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                          <XAxis dataKey="run" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="cpu" name="CPU %" stroke="#ea580c" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="ram" name="RAM (GB)" stroke="#7c3aed" strokeWidth={2} dot={{ r: 4 }} />
                          <Line type="monotone" dataKey="duration" name="Duration (s)" stroke="#0073bb" strokeWidth={2} dot={{ r: 4 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Run History Table */}
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden mb-8">
              <div className="px-6 py-4 border-b border-gray-200 bg-[#fafafa]">
                <SectionHeader title="Evaluation History" subtitle="All recorded test runs" icon={Activity} accent="#232f3e" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#f8f8f8] text-[10px] font-black text-gray-500 uppercase tracking-wider">
                      <th className="text-left px-6 py-3">#</th>
                      <th className="text-left px-4 py-3">Date</th>
                      <th className="text-left px-4 py-3">SUT</th>
                      <th className="text-left px-4 py-3">Judge</th>
                      <th className="text-center px-4 py-3">Score</th>
                      <th className="text-center px-4 py-3">Status</th>
                      <th className="text-center px-4 py-3">Duration</th>
                      <th className="text-center px-4 py-3">CPU</th>
                      <th className="text-center px-4 py-3">RAM</th>
                      <th className="text-center px-4 py-3">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...sortedData].reverse().map((run, i) => {
                      const passed = run.score >= 0.6;
                      const hasOutput = run.sutOutput?.length > 0;
                      return (
                        <tr key={i} className="border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
                          <td className="px-6 py-3 font-mono text-gray-400">{sortedData.length - i}</td>
                          <td className="px-4 py-3 font-medium text-gray-700 whitespace-nowrap">{run.fullDate}</td>
                          <td className="px-4 py-3"><DataBadge label="" value={run.agent} color="orange" /></td>
                          <td className="px-4 py-3"><DataBadge label="" value={run.judge} color="purple" /></td>
                          <td className="px-4 py-3 text-center">
                            <span className={`font-bold text-sm ${run.score > 0 ? (passed ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                              {run.score > 0 ? `${(run.score * 100).toFixed(1)}%` : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {run.score > 0 ? (
                              passed ? <CheckCircle2 size={16} className="text-green-500 mx-auto" />
                                     : <XCircle size={16} className="text-red-500 mx-auto" />
                            ) : <Minus size={16} className="text-gray-300 mx-auto" />}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {run.metrics?.duration_ms ? `${(run.metrics.duration_ms / 1000).toFixed(1)}s` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {run.metrics?.cpu ? `${run.metrics.cpu.avg_usage_percent.toFixed(0)}%` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center font-mono">
                            {run.metrics?.ram ? `${run.metrics.ram.avg_used_gb.toFixed(1)}G` : '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {hasOutput && <span className="w-2 h-2 rounded-full bg-green-400" title="Has output" />}
                              {run.metrics && <span className="w-2 h-2 rounded-full bg-blue-400" title="Has metrics" />}
                              {run.reason && <span className="w-2 h-2 rounded-full bg-purple-400" title="Has reasoning" />}
                              {!hasOutput && !run.metrics && !run.reason && <span className="text-gray-300">—</span>}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ============ PIPELINE MODE ============ */}
        {viewMode === 'pipeline' && (
          <>
            <div className="mb-6">
              <SectionHeader title="End-to-End Pipeline Tracking"
                subtitle="Complete visibility: DeepEval → Ollama → Gemini → Result" icon={Zap} accent="#ec7211" />
            </div>

            {/* Pipeline Flow */}
            <div className="bg-white border border-gray-200 rounded-sm shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between gap-2">
                {[
                  { icon: Terminal, label: 'DeepEval Test', sub: 'Input Prompt', color: 'blue' },
                  { icon: Cpu, label: 'Ollama (SUT)', sub: 'Generate Analysis', color: 'orange' },
                  { icon: BrainCircuit, label: 'Gemini (Judge)', sub: 'Evaluate Quality', color: 'purple' },
                  { icon: ShieldCheck, label: 'DeepEval Result', sub: 'Final Score', color: 'green' },
                ].map((stage, i, arr) => (
                  <React.Fragment key={i}>
                    <div className="flex-1 text-center">
                      <div className={`w-14 h-14 bg-${stage.color === 'orange' ? 'orange' : stage.color}-100 rounded-full flex items-center justify-center mx-auto mb-2`}
                        style={{ backgroundColor: { blue: '#dbeafe', orange: '#ffedd5', purple: '#ede9fe', green: '#dcfce7' }[stage.color] }}>
                        <stage.icon size={24} style={{ color: { blue: '#2563eb', orange: '#ea580c', purple: '#7c3aed', green: '#16a34a' }[stage.color] }} />
                      </div>
                      <h3 className="font-bold text-xs text-gray-800">{stage.label}</h3>
                      <p className="text-[10px] text-gray-400">{stage.sub}</p>
                    </div>
                    {i < arr.length - 1 && <ArrowRight size={20} className="text-gray-300 flex-shrink-0" />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Per-Run Pipeline Cards */}
            <div className="space-y-4">
              {[...sortedData].reverse().slice(0, 20).map((run, idx) => {
                const runKey = `${run.fullDate}-${idx}`;
                const isExpanded = selectedRun === runKey;
                const passed = run.score >= 0.6;
                const hasData = run.sutOutput || run.reason || run.metrics;

                return (
                  <div key={runKey} className="bg-white border border-gray-200 rounded-sm shadow-sm overflow-hidden">
                    {/* Header */}
                    <button onClick={() => setSelectedRun(isExpanded ? null : runKey)}
                      className="w-full bg-[#fafafa] border-b border-gray-200 px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left">
                      <div className="flex items-center gap-4">
                        <div className={`w-3 h-3 rounded-full ${run.score > 0 ? (passed ? 'bg-green-500' : 'bg-red-500') : 'bg-gray-300'}`} />
                        <div>
                          <h3 className="font-bold text-sm text-gray-800">Run #{sortedData.length - sortedData.indexOf(run)}</h3>
                          <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] text-gray-500">{run.fullDate}</span>
                            <DataBadge label="SUT" value={run.agent} color="orange" />
                            <DataBadge label="Judge" value={run.judge} color="purple" />
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded-sm border ${run.score > 0 ? (passed ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-gray-200 bg-gray-50'}`}>
                          <span className={`text-xl font-bold ${run.score > 0 ? (passed ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                            {run.score > 0 ? `${(run.score * 100).toFixed(1)}%` : 'N/A'}
                          </span>
                        </div>
                        {!hasData && (
                          <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1">
                            <AlertTriangle size={10} /> Sparse
                          </span>
                        )}
                        {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="p-6 space-y-5">

                        {/* Stage 1: Input */}
                        <div className="border-l-4 border-blue-400 pl-5">
                          <button onClick={() => toggleStage(`${runKey}-input`)} className="flex items-center gap-2 mb-2 hover:opacity-80">
                            <Terminal size={16} className="text-blue-600" />
                            <h4 className="font-bold text-xs text-gray-800 uppercase">Stage 1: DeepEval Input</h4>
                            {expandedStages[`${runKey}-input`] ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                          </button>
                          {expandedStages[`${runKey}-input`] && (
                            <div className="bg-gray-50 rounded-sm p-4 text-xs font-mono text-gray-700">
                              {run.pipeline?.deepeval_input || <span className="text-gray-400 italic">No input prompt captured</span>}
                            </div>
                          )}
                        </div>

                        {/* Stage 2: Ollama */}
                        <div className="border-l-4 border-orange-400 pl-5">
                          <div className="flex items-center justify-between mb-2">
                            <button onClick={() => toggleStage(`${runKey}-ollama`)} className="flex items-center gap-2 hover:opacity-80">
                              <Cpu size={16} className="text-orange-600" />
                              <h4 className="font-bold text-xs text-gray-800 uppercase">Stage 2: Ollama Generation</h4>
                              {expandedStages[`${runKey}-ollama`] ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </button>
                            <button onClick={() => downloadReport(run, 'ollama')} className="text-orange-600 hover:text-orange-700 text-[10px] font-bold flex items-center gap-1">
                              <Download size={10} /> Report
                            </button>
                          </div>
                          {expandedStages[`${runKey}-ollama`] && (
                            <div className="space-y-3">
                              {run.metrics && (
                                <div className="grid grid-cols-4 gap-2">
                                  <div className="bg-orange-50 p-3 rounded-sm">
                                    <div className="text-[9px] font-black text-orange-600 uppercase">Duration</div>
                                    <div className="text-base font-bold text-orange-900 mt-1">{(run.metrics.duration_ms / 1000).toFixed(1)}s</div>
                                  </div>
                                  <div className="bg-blue-50 p-3 rounded-sm">
                                    <div className="text-[9px] font-black text-blue-600 uppercase">CPU Avg</div>
                                    <div className="text-base font-bold text-blue-900 mt-1">{run.metrics.cpu?.avg_usage_percent?.toFixed(1) || 'N/A'}%</div>
                                  </div>
                                  <div className="bg-purple-50 p-3 rounded-sm">
                                    <div className="text-[9px] font-black text-purple-600 uppercase">RAM Peak</div>
                                    <div className="text-base font-bold text-purple-900 mt-1">{run.metrics.ram?.peak_used_gb?.toFixed(2) || 'N/A'} GB</div>
                                  </div>
                                  <div className="bg-gray-50 p-3 rounded-sm">
                                    <div className="text-[9px] font-black text-gray-600 uppercase">Snapshots</div>
                                    <div className="text-base font-bold text-gray-900 mt-1">{run.metrics.snapshots?.length || 0}</div>
                                  </div>
                                </div>
                              )}
                              <div className="bg-[#1a1a2e] rounded-sm p-4">
                                <div className="text-[10px] text-gray-500 uppercase font-black mb-2">SUT Output</div>
                                <pre className="text-xs text-gray-300 font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                                  {run.sutOutput || <span className="text-gray-600 italic">No output captured</span>}
                                </pre>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Stage 3: Gemini */}
                        <div className="border-l-4 border-purple-400 pl-5">
                          <div className="flex items-center justify-between mb-2">
                            <button onClick={() => toggleStage(`${runKey}-gemini`)} className="flex items-center gap-2 hover:opacity-80">
                              <BrainCircuit size={16} className="text-purple-600" />
                              <h4 className="font-bold text-xs text-gray-800 uppercase">Stage 3: Gemini Evaluation</h4>
                              {expandedStages[`${runKey}-gemini`] ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
                            </button>
                            <button onClick={() => downloadReport(run, 'gemini')} className="text-purple-600 hover:text-purple-700 text-[10px] font-bold flex items-center gap-1">
                              <Download size={10} /> Report
                            </button>
                          </div>
                          {expandedStages[`${runKey}-gemini`] && (
                            <div className="bg-gray-50 rounded-sm p-4">
                              <div className="text-[10px] text-gray-500 uppercase font-black mb-2">Evaluation Reasoning</div>
                              <p className="text-sm text-gray-700">
                                {run.reason || <span className="text-gray-400 italic">No evaluation reasoning captured</span>}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Stage 4: Result */}
                        <div className="border-l-4 border-green-400 pl-5">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <ShieldCheck size={16} className="text-green-600" />
                              <h4 className="font-bold text-xs text-gray-800 uppercase">Stage 4: Final Result</h4>
                            </div>
                            <button onClick={() => downloadReport(run, 'full')} className="text-green-600 hover:text-green-700 text-[10px] font-bold flex items-center gap-1">
                              <Download size={10} /> Full Pipeline
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className={`p-4 rounded-sm border-2 ${run.score > 0 ? (passed ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50') : 'border-gray-200 bg-gray-50'}`}>
                              <div className="text-[9px] font-black uppercase text-gray-500">Answer Relevancy</div>
                              <div className={`text-2xl font-bold mt-1 ${run.score > 0 ? (passed ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                                {run.score > 0 ? `${(run.score * 100).toFixed(1)}%` : 'N/A'}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">Threshold: 60%</div>
                            </div>
                            <div className={`p-4 rounded-sm border-2 ${run.score > 0 ? (passed ? 'border-green-300' : 'border-red-300') : 'border-gray-200'} bg-white`}>
                              <div className="text-[9px] font-black uppercase text-gray-500">Status</div>
                              <div className={`text-lg font-bold mt-1 ${run.score > 0 ? (passed ? 'text-green-600' : 'text-red-600') : 'text-gray-300'}`}>
                                {run.score > 0 ? (passed ? 'PASSED' : 'FAILED') : 'NO SCORE'}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">DeepEval Assertion</div>
                            </div>
                            <div className="p-4 rounded-sm border-2 border-blue-200 bg-blue-50">
                              <div className="text-[9px] font-black uppercase text-gray-500">Pipeline</div>
                              <div className="text-lg font-bold mt-1 text-blue-600">
                                {run.metrics && run.sutOutput && run.reason ? 'COMPLETE' : run.metrics || run.sutOutput ? 'PARTIAL' : 'MINIMAL'}
                              </div>
                              <div className="text-[10px] text-gray-400 mt-1">Data Captured</div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <footer className="mt-16 border-t border-gray-200 py-8 text-center text-[9px] text-gray-400 uppercase tracking-[0.4em]">
        LLM Quality Framework &middot; Pipeline Analytics Console v2.1.0 &middot; Full Traceability
      </footer>
    </div>
  );
}
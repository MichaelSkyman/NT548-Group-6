import { useCallback, useEffect, useState } from 'react'
import { publicApi } from '../../api/client'
import Icon from '../../components/Icon'

// TRANG: System Status (admin). Gọi GET /api/health và hiển thị sức khoẻ backend + DB.
export default function SystemStatusPage() {
  const [health, setHealth] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [checkedAt, setCheckedAt] = useState(null)

  const poll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await publicApi.getHealth()
      setHealth(res)
    } catch (err) {
      setError(err.message)
      setHealth(null)
    } finally {
      setLoading(false)
      setCheckedAt(new Date())
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    poll()
  }, [poll])

  const apiHealthy = !error && (health?.status === 'healthy' || health?.status === 'ok' || (!!health && health.status == null))
  const dbConnected = !error && (health?.database === 'connected' || health?.database === true)
  const stamp = checkedAt ? checkedAt.toLocaleTimeString() : '—'

  return (
    <div className="flex flex-col gap-space-xl">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">System Status &amp; Service Health</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Trạng thái health check của backend 3-tier trên Amazon EKS.</p>
        </div>
        <div className="flex sm:items-center flex-col sm:flex-row gap-space-md self-start lg:self-end">
          <div className="flex items-center gap-space-xs px-3 py-2 rounded-lg bg-surface-container-low text-on-surface-variant font-label-md text-label-md shadow-sm">
            <Icon name="schedule" className="text-[16px] text-tertiary-fixed-dim" fill />
            <span className="text-outline">Lần kiểm tra:</span>
            <span className="text-primary font-medium">{stamp}</span>
          </div>
          <button
            type="button"
            onClick={poll}
            disabled={loading}
            className="h-10 px-4 rounded-lg bg-surface-container-lowest text-on-surface hover:bg-surface-container-high transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Icon name="sync" className={`text-[18px] text-secondary ${loading ? 'animate-spin' : ''}`} />
            <span className="font-label-lg text-label-lg font-medium">Làm mới</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-error-container text-on-error-container rounded-xl p-space-md flex items-start gap-space-sm" role="alert">
          <Icon name="error" className="text-error text-[20px] mt-0.5" />
          <div>
            <p className="font-headline-sm text-headline-sm">Không gọi được /api/health</p>
            <p className="font-body-sm text-body-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Service cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        <ServiceCard
          icon="memory"
          accent="bg-tertiary-fixed-dim"
          title="Backend – Flask API"
          subtitle="Python REST Service"
          healthy={apiHealthy}
          healthyLabel="Healthy"
          downLabel="Unknown"
          stamp={stamp}
        />
        <ServiceCard
          icon="database"
          accent="bg-secondary"
          title="Database – PostgreSQL"
          subtitle="Amazon RDS (private subnet)"
          healthy={dbConnected}
          healthyLabel="Connected"
          downLabel="Unknown"
          stamp={stamp}
        />
      </div>

      {/* Raw payload */}
      <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm mb-space-md pb-space-sm">
          <div className="flex items-center gap-space-md">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
            <h2 className="font-headline-sm text-headline-sm text-primary">Health Check Endpoint (GET /api/health)</h2>
          </div>
          <span className={`px-2.5 py-1 rounded font-label-sm text-label-sm font-semibold ${error ? 'bg-error-container text-on-error-container' : 'bg-emerald-100 text-emerald-800'}`}>
            {error ? 'ERROR' : 'HTTP 200 OK'}
          </span>
        </div>
        <div className="rounded-lg bg-[#0F172A] p-4 text-[#E2E8F0] shadow-inner font-code-block text-code-block">
          <pre className="overflow-x-auto text-emerald-300 leading-relaxed">
            <code>{JSON.stringify(health ?? { error: error || 'no data' }, null, 2)}</code>
          </pre>
        </div>
      </div>

      {/* Topology banner */}
      <div className="bg-surface-container-high rounded-xl p-space-lg shadow-sm flex items-center gap-space-md">
        <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
          <Icon name="cloud_queue" className="text-[24px]" />
        </div>
        <div className="flex flex-col">
          <span className="font-headline-sm text-headline-sm text-primary">Cloud Infrastructure Topology</span>
          <span className="font-body-md text-body-md text-on-surface-variant flex flex-wrap gap-2 mt-0.5">
            <span>Triển khai trên <strong className="text-on-surface">Amazon EKS</strong></span>
            <span className="text-outline">•</span>
            <span>Expose qua <strong className="text-on-surface">ALB</strong></span>
            <span className="text-outline">•</span>
            <span>DNS bởi <strong className="text-on-surface">Route 53</strong></span>
          </span>
        </div>
      </div>
    </div>
  )
}

function ServiceCard({ icon, accent, title, subtitle, healthy, healthyLabel, downLabel, stamp }) {
  return (
    <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between relative overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-1 ${accent}`} />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-space-md">
          <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center text-primary">
            <Icon name={icon} className="text-[26px]" />
          </div>
          <div className="flex flex-col">
            <span className="font-headline-sm text-headline-sm text-primary">{title}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">{subtitle}</span>
          </div>
        </div>
        <div
          className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${
            healthy ? 'bg-emerald-50 text-emerald-800' : 'bg-surface-container-high text-on-surface-variant'
          }`}
        >
          <span className="relative flex h-2.5 w-2.5">
            {healthy && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${healthy ? 'bg-emerald-500' : 'bg-outline'}`} />
          </span>
          <span className="font-label-md text-label-md font-semibold tracking-wide uppercase">{healthy ? healthyLabel : downLabel}</span>
        </div>
      </div>
      <div className="pt-space-md mt-space-lg flex items-center justify-between font-label-sm text-label-sm text-outline">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-emerald-500' : 'bg-outline'}`} /> Đã kiểm tra
        </span>
        <span>{stamp}</span>
      </div>
    </div>
  )
}

import Icon from '../components/Icon'

// TRANG: Kiến trúc hệ thống (Guest, nội dung tĩnh) — mô tả 3-tier trên Amazon EKS.
export default function ArchitecturePage() {
  return (
    <div className="max-w-content mx-auto px-6 py-12 flex flex-col gap-10">
      {/* Tiêu đề */}
      <section className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-indigo-50 text-indigo-700 font-mono text-xs w-fit font-medium">
          <Icon name="hub" className="text-sm" />
          Infrastructure Specification
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">Kiến trúc hệ thống</h1>
        <p className="text-base sm:text-lg text-slate-600 max-w-4xl leading-relaxed">
          Nền tảng học DevOps 3 tầng (cloud-native) triển khai trên Amazon EKS, cô lập bằng VPC subnet và Security Group.
        </p>
      </section>

      {/* Sơ đồ luồng */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Icon name="alt_route" className="text-indigo-600" />
              Luồng xử lý end-to-end &amp; vành đai mạng
            </h2>
            <p className="text-xs text-slate-500">Từ ingress ngoài, định tuyến ở public edge, worker node đến tầng dữ liệu cô lập.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600">
            <Legend swatch="bg-blue-100 border-blue-400" label="Public Subnet" />
            <Legend swatch="bg-indigo-50 border-indigo-300" label="Private App Subnet" />
            <Legend swatch="bg-emerald-50 border-emerald-400" label="Private DB Subnet" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* Client */}
          <FlowCard className="lg:col-span-2" icon="person" tone="text-indigo-600" kicker="Client" title="Trình duyệt" sub="HTTPS / TLS 1.3" chip="Port 443 / 80" />
          {/* Route 53 */}
          <FlowCard className="lg:col-span-2" icon="public" tone="text-blue-600" kicker="Amazon Route 53" title="DNS Routing" sub="ALIAS → ALB DNS" chip="devopslearn.io" />

          {/* VPC */}
          <div className="lg:col-span-8 rounded-2xl border-2 border-slate-300 bg-slate-50/70 p-5 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
              <div className="flex items-center gap-2">
                <Icon name="cloud" className="text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">Amazon VPC</span>
                <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">10.0.0.0/16</span>
              </div>
              <span className="text-xs text-slate-500 font-mono">Multi-AZ (us-east-1a, us-east-1b)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Public */}
              <SubnetCard tone="blue" label="Public Subnets" az="AZ-a & AZ-b">
                <div className="rounded-lg border-2 border-dashed border-blue-400 bg-white p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-blue-800">ALB Security Group</span>
                    <Icon name="shield" className="text-blue-600 text-base" />
                  </div>
                  <div className="text-[11px] bg-blue-50/60 text-blue-900 p-1.5 rounded font-mono border border-blue-100">
                    <strong>Rule:</strong> Inbound 80/443 từ Internet (0.0.0.0/0)
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-start gap-2">
                    <Icon name="account_tree" className="text-blue-600 text-xl mt-0.5" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Application Load Balancer</div>
                      <div className="text-[10px] text-slate-500 leading-tight mt-0.5">AWS Load Balancer Controller (K8s Ingress)</div>
                    </div>
                  </div>
                </div>
              </SubnetCard>

              {/* Private App */}
              <SubnetCard tone="indigo" label="Private App Subnets" az="AZ-a & AZ-b">
                <div className="rounded-lg border-2 border-dashed border-indigo-400 bg-white p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-indigo-900">EKS Node SG</span>
                    <Icon name="shield" className="text-indigo-600 text-base" />
                  </div>
                  <div className="text-[11px] bg-indigo-50 text-indigo-900 p-1.5 rounded font-mono border border-indigo-100">
                    <strong>Rule:</strong> Inbound CHỈ từ ALB SG
                  </div>
                  <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                    <Icon name="hub" className="text-base text-indigo-600" /> Amazon EKS Worker Nodes
                  </div>
                  <PodRow color="bg-cyan-500" name="Frontend – React" />
                  <PodRow color="bg-indigo-600" name="Backend – Flask API" />
                </div>
              </SubnetCard>

              {/* Private DB */}
              <SubnetCard tone="emerald" label="Private DB Subnets" az="AZ-a & AZ-b">
                <div className="rounded-lg border-2 border-dashed border-emerald-500 bg-white p-3 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-emerald-900">RDS SG</span>
                    <Icon name="shield" className="text-emerald-700 text-base" />
                  </div>
                  <div className="text-[11px] bg-emerald-50 text-emerald-950 p-1.5 rounded font-mono border border-emerald-100">
                    <strong>Rule:</strong> Inbound 5432 CHỈ từ EKS Node SG
                  </div>
                  <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center gap-2">
                    <Icon name="database" className="text-emerald-700 text-xl" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Amazon RDS PostgreSQL</div>
                      <div className="text-[10px] text-slate-500">Managed &amp; Multi-AZ</div>
                    </div>
                  </div>
                </div>
              </SubnetCard>
            </div>
          </div>
        </div>
      </section>

      {/* Bảng mapping */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 flex flex-col gap-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Icon name="table_chart" className="text-indigo-600" />
            Ánh xạ tầng kiến trúc
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">Tầng hạ tầng ↔ công nghệ, dịch vụ AWS và tài nguyên Kubernetes.</p>
        </div>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-mono text-xs uppercase tracking-wider border-b border-slate-200">
                <th className="py-3.5 px-6">Tier</th>
                <th className="py-3.5 px-6">Technology</th>
                <th className="py-3.5 px-6">AWS Service</th>
                <th className="py-3.5 px-6">Kubernetes Resource</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900">
              <StackRow tier="Presentation" dot="bg-cyan-500" tierCls="bg-cyan-50 text-cyan-800 border-cyan-200" tech="React" techIcon="web" aws="Amazon EKS" k8s="Deployment + Service + Ingress" />
              <StackRow tier="Application" dot="bg-indigo-600" tierCls="bg-indigo-50 text-indigo-800 border-indigo-200" tech="Flask" techIcon="terminal" aws="Amazon EKS" k8s="Deployment + Service" />
              <StackRow tier="Data" dot="bg-emerald-600" tierCls="bg-emerald-50 text-emerald-800 border-emerald-200" tech="PostgreSQL" techIcon="database" aws="Amazon RDS" k8s="— (private subnet)" />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Legend({ swatch, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-3 h-3 rounded border ${swatch}`} /> {label}
    </span>
  )
}

function FlowCard({ className = '', icon, tone, kicker, title, sub, chip }) {
  return (
    <div className={`flex flex-col justify-center items-center p-5 rounded-xl bg-slate-50 border border-slate-200 text-center gap-3 ${className}`}>
      <div className={`w-14 h-14 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center ${tone}`}>
        <Icon name={icon} className="text-3xl" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 font-mono">{kicker}</div>
        <div className="text-sm font-bold text-slate-900">{title}</div>
        <div className="text-[11px] text-slate-500 font-mono mt-0.5">{sub}</div>
      </div>
      <div className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-white px-2 py-1 rounded border border-slate-200 font-mono">
        {chip}
      </div>
    </div>
  )
}

function SubnetCard({ tone, label, az, children }) {
  const tones = {
    blue: 'border-blue-200 bg-blue-50/40 text-blue-700',
    indigo: 'border-indigo-200 bg-indigo-50/40 text-indigo-700',
    emerald: 'border-emerald-200 bg-emerald-50/40 text-emerald-800',
  }
  const badges = {
    blue: 'bg-blue-100/80 text-blue-800',
    indigo: 'bg-indigo-100/80 text-indigo-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  }
  return (
    <div className={`rounded-xl border p-4 flex flex-col gap-3 ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider font-mono">{label}</span>
        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${badges[tone]}`}>{az}</span>
      </div>
      {children}
    </div>
  )
}

function PodRow({ color, name }) {
  return (
    <div className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded-full ${color}`} />
        <span className="text-xs font-semibold text-slate-800">{name}</span>
      </div>
      <span className="text-[10px] font-mono text-slate-500">Deployment</span>
    </div>
  )
}

function StackRow({ tier, dot, tierCls, tech, techIcon, aws, k8s }) {
  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="py-4 px-6 font-semibold">
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-mono font-medium ${tierCls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {tier}
        </span>
      </td>
      <td className="py-4 px-6 font-medium text-slate-800">
        <div className="flex items-center gap-2">
          <Icon name={techIcon} className="text-slate-500 text-lg" />
          {tech}
        </div>
      </td>
      <td className="py-4 px-6 text-slate-700 font-mono text-xs">
        <span className="inline-flex items-center gap-1.5">
          <Icon name="cloud" className="text-base text-amber-600" />
          {aws}
        </span>
      </td>
      <td className="py-4 px-6">
        <span className="font-mono text-xs text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded border border-indigo-200">{k8s}</span>
      </td>
    </tr>
  )
}

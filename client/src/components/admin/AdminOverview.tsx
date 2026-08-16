import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  TrendingUp, ShoppingBag, Clock, DollarSign,
  Package, Users, AlertTriangle, BarChart3, MapPin,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { fetchAdminOverview, type AdminOverview } from "@/lib/api";

interface Props {
  token: string;
  onOpenOrder: (id: number) => void;
}

export default function AdminOverview({ token, onOpenOrder }: Props) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchAdminOverview(token);
        if (!cancelled) setData(res);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to load overview");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { kpis, revenueSeries, recentOrders, topProducts, lowStock, revenueByGovernorate, customerRetention } = data;
  const egp = (v: string | number) => `${Number(v).toLocaleString()} LE`;

  return (
    <div className="space-y-8">
      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi icon={<DollarSign className="w-5 h-5" />} label="Total Revenue" value={egp(kpis.totalRevenue)} accent />
        <Kpi icon={<ShoppingBag className="w-5 h-5" />} label="Total Orders" value={kpis.totalOrders} />
        <Kpi icon={<Clock className="w-5 h-5" />} label="Orders Today" value={kpis.ordersToday} sub={egp(kpis.revenueToday)} />
        <Kpi icon={<TrendingUp className="w-5 h-5" />} label="Avg Order" value={egp(Math.round(Number(kpis.avgOrderValue)))} />
        <Kpi icon={<Clock className="w-5 h-5" />} label="Pending" value={kpis.pendingOrders} warn={kpis.pendingOrders > 0} />
        <Kpi icon={<Package className="w-5 h-5" />} label="Products Sold" value={kpis.productsSold} />
        <Kpi icon={<Users className="w-5 h-5" />} label="Customers" value={kpis.activeCustomers} />
        <Kpi icon={<AlertTriangle className="w-5 h-5" />} label="Low Stock" value={kpis.lowStockCount} warn={kpis.lowStockCount > 0} />
      </div>

      {/* Revenue chart */}
      <div className="glass p-6" style={{ borderRadius: "16px" }}>
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-accent" />
          <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Revenue — Last 30 Days</h3>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={revenueSeries} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FF5722" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#FF5722" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fill: "#888", fontSize: 11 }}
              tickFormatter={(d: string) => d.slice(5)}
              interval={4}
            />
            <YAxis tick={{ fill: "#888", fontSize: 11 }} width={48} />
            <Tooltip
              contentStyle={{ background: "#141414", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }}
              formatter={(v: number) => [egp(v), "Revenue"]}
            />
            <Area type="monotone" dataKey="revenue" stroke="#FF5722" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent orders */}
        <div className="glass p-6" style={{ borderRadius: "16px" }}>
          <h3 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>Recent Orders</h3>
          {recentOrders.length === 0 ? (
            <p className="text-dim text-sm">No orders yet.</p>
          ) : (
            <div className="space-y-2">
              {recentOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => onOpenOrder(o.id)}
                  className="w-full flex items-center justify-between py-2.5 px-3 hover:bg-white/5 transition-colors text-left"
                  style={{ borderRadius: "10px" }}
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{o.orderNumber}</p>
                    <p className="text-dim text-xs">{o.firstName} {o.lastName}</p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-3">
                    <p className="font-bold text-accent text-sm">{egp(o.total)}</p>
                    <p className="text-dim text-xs">{o.status}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="glass p-6" style={{ borderRadius: "16px" }}>
          <h3 className="font-bold mb-4" style={{ fontFamily: "var(--font-display)" }}>Top Products</h3>
          {topProducts.length === 0 ? (
            <p className="text-dim text-sm">No sales yet.</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.productName} className="flex items-center gap-3">
                  <span className="text-dim font-bold w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{p.productName}</p>
                    <div className="h-1.5 mt-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(p.qty / topProducts[0].qty) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-dim whitespace-nowrap">{p.qty} sold</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock */}
      {lowStock.length > 0 && (
        <div className="glass p-6" style={{ borderRadius: "16px" }}>
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Low Stock Alerts</h3>
          </div>
          <div className="space-y-2">
            {lowStock.map((s) => (
              <div key={s.sku} className="flex items-center justify-between py-2 px-3 bg-white/5" style={{ borderRadius: "10px" }}>
                <div>
                  <p className="font-semibold text-sm">{s.productName}</p>
                  <p className="text-dim text-xs">{s.color} · Size {s.size}</p>
                </div>
                <span className={`text-sm font-bold ${s.stock === 0 ? "text-red-500" : "text-yellow-500"}`}>
                  {s.stock === 0 ? "Out of stock" : `${s.stock} left`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Customer retention + Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass p-6" style={{ borderRadius: "16px" }}>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-accent" />
            <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Customer Retention</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {customerRetention.totalCustomers > 0
                  ? `${Math.round((customerRetention.repeatCustomers / customerRetention.totalCustomers) * 100)}%`
                  : "—"}
              </p>
              <p className="text-dim text-xs uppercase tracking-widest mt-1">Repeat rate</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{customerRetention.totalCustomers}</p>
              <p className="text-dim text-xs uppercase tracking-widest mt-1">Total customers</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>{customerRetention.newThisMonth}</p>
              <p className="text-dim text-xs uppercase tracking-widest mt-1">New this month</p>
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{customerRetention.returningThisMonth}</p>
              <p className="text-dim text-xs uppercase tracking-widest mt-1">Returning this month</p>
            </div>
          </div>
        </div>

        <div className="glass p-6" style={{ borderRadius: "16px" }}>
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-accent" />
            <h3 className="font-bold" style={{ fontFamily: "var(--font-display)" }}>Revenue by Governorate</h3>
          </div>
          {revenueByGovernorate.length === 0 ? (
            <p className="text-dim text-sm">No governorate data yet — appears as new orders come in.</p>
          ) : (
            <div className="space-y-3">
              {revenueByGovernorate.map((g, i) => (
                <div key={g.governorate ?? i} className="flex items-center gap-3">
                  <span className="text-dim font-bold w-5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{g.governorate || "Unknown"}</p>
                    <div className="h-1.5 mt-1 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${(Number(g.revenue) / Number(revenueByGovernorate[0].revenue || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-dim whitespace-nowrap">{egp(g.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, label, value, sub, accent, warn }: {
  icon: React.ReactNode; label: string; value: string | number;
  sub?: string; accent?: boolean; warn?: boolean;
}) {
  return (
    <div className="glass p-5" style={{ borderRadius: "14px" }}>
      <div className={`mb-3 ${accent ? "text-accent" : warn ? "text-yellow-500" : "text-dim"}`}>{icon}</div>
      <p className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
      <p className="text-dim text-xs uppercase tracking-widest mt-1">{label}</p>
      {sub && <p className="text-dim text-xs mt-0.5">{sub}</p>}
    </div>
  );
}

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { Package, LogOut, User as UserIcon, Gift } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { fetchMyOrders, fetchLoyaltyHistory, redeemPoints, type MyOrder, type LoyaltyTransaction } from "@/lib/api";
import { CURRENCY_SYMBOL } from "@shared/const";
import { MIN_REDEEM_POINTS, computeRedemptionValue } from "@shared/loyalty";

const STATUS_COLOR: Record<string, string> = {
  Pending: "text-accent",
  Confirmed: "text-blue-400",
  Shipped: "text-blue-400",
  Delivered: "text-green-400",
  Cancelled: "text-red-400",
};

export default function Profile() {
  const { user, loading, logout, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<"orders" | "rewards" | "account">("orders");
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [transactions, setTransactions] = useState<LoyaltyTransaction[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(true);
  const [redeemAmount, setRedeemAmount] = useState(MIN_REDEEM_POINTS);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setLocation("/auth");
    }
  }, [loading, user, setLocation]);

  useEffect(() => {
    if (!user) return;
    fetchMyOrders()
      .then(({ orders }) => setOrders(orders))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
    fetchLoyaltyHistory()
      .then(({ transactions }) => setTransactions(transactions))
      .catch(() => setTransactions([]))
      .finally(() => setLoyaltyLoading(false));
  }, [user]);

  const handleRedeem = async () => {
    if (!user) return;
    setRedeeming(true);
    try {
      const { coupon, value } = await redeemPoints(redeemAmount);
      toast.success(`Redeemed! Use code ${coupon} for ${value} ${CURRENCY_SYMBOL} off at checkout.`);
      const { transactions } = await fetchLoyaltyHistory();
      setTransactions(transactions);
      await refreshUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not redeem points");
    } finally {
      setRedeeming(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    setLocation("/");
  };

  if (loading || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center" style={{ backgroundColor: "var(--momo-bg)" }}>
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }}>
      <div className="section-padding container max-w-4xl glow-field overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center mb-12 flex-wrap gap-4">
          <div>
            <h1 className="heading-section mb-2">My Account</h1>
            <p className="text-dim">{user.email}</p>
          </div>
          <Button onClick={handleLogout} variant="outline">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-8 mb-8 border-b border-momo">
          <button
            onClick={() => setTab("orders")}
            className={`pb-4 font-semibold transition-colors ${
              tab === "orders" ? "text-accent border-b-2 border-accent" : "text-dim hover:text-[color:var(--momo-text)]"
            }`}
          >
            <Package className="w-4 h-4 inline mr-2" />
            Orders
          </button>
          <button
            onClick={() => setTab("rewards")}
            className={`pb-4 font-semibold transition-colors ${
              tab === "rewards" ? "text-accent border-b-2 border-accent" : "text-dim hover:text-[color:var(--momo-text)]"
            }`}
          >
            <Gift className="w-4 h-4 inline mr-2" />
            Rewards
          </button>
          <button
            onClick={() => setTab("account")}
            className={`pb-4 font-semibold transition-colors ${
              tab === "account" ? "text-accent border-b-2 border-accent" : "text-dim hover:text-[color:var(--momo-text)]"
            }`}
          >
            <UserIcon className="w-4 h-4 inline mr-2" />
            Account
          </button>
        </div>

        {/* Orders Tab */}
        {tab === "orders" && (
          <div className="space-y-4">
            {ordersLoading ? (
              <div className="flex justify-center py-12">
                <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-12 h-12 mx-auto text-dim mb-4" />
                <p className="text-dim mb-4">No orders yet</p>
                <Link href="/shop">
                  <Button className="btn-primary">Start Shopping</Button>
                </Link>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="p-6 glass glass-hover" style={{ borderRadius: "14px" }}>
                  <div className="flex justify-between items-start mb-4 flex-wrap gap-2">
                    <div>
                      <h3 className="font-bold text-lg">{order.orderNumber}</h3>
                      <p className="text-sm text-dim">{new Date(order.createdAt).toLocaleDateString("en-EG")}</p>
                    </div>
                    <span className={`text-sm font-bold uppercase tracking-widest ${STATUS_COLOR[order.status] || "text-dim"}`}>
                      {order.status}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-dim">{order.shippingCity}</p>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-bold text-accent">{Number(order.total).toLocaleString()} {CURRENCY_SYMBOL}</p>
                      <Link href={`/track?order=${order.orderNumber}`}>
                        <Button variant="outline" size="sm">Track</Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Rewards Tab */}
        {tab === "rewards" && (
          <div className="space-y-6">
            <div className="glass-accent p-6" style={{ borderRadius: "14px" }}>
              <p className="text-xs font-bold uppercase tracking-widest text-dim mb-1">Your Balance</p>
              <p className="text-4xl font-bold text-accent" style={{ fontFamily: "var(--font-display)" }}>
                {user.loyaltyPoints ?? 0} <span className="text-lg">points</span>
              </p>
              <p className="text-sm text-dim mt-2">
                Earn {1} point per {CURRENCY_SYMBOL === "LE" ? "10 LE" : "10 EGP"} spent on delivered orders.
                Redeem {MIN_REDEEM_POINTS}+ points for a discount code (5 points = 1 {CURRENCY_SYMBOL}).
              </p>
            </div>

            <div className="glass p-6" style={{ borderRadius: "14px" }}>
              <h3 className="font-bold mb-4">Redeem Points</h3>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  type="number"
                  min={MIN_REDEEM_POINTS}
                  step={50}
                  value={redeemAmount}
                  onChange={(e) => setRedeemAmount(Number(e.target.value))}
                  className="w-32 bg-transparent border border-momo text-[color:var(--momo-text)] px-3 py-2 focus:outline-none focus:border-accent"
                  style={{ borderRadius: "8px" }}
                />
                <span className="text-dim text-sm">
                  = {computeRedemptionValue(redeemAmount)} {CURRENCY_SYMBOL} off
                </span>
                <Button
                  onClick={handleRedeem}
                  disabled={redeeming || redeemAmount < MIN_REDEEM_POINTS || redeemAmount > (user.loyaltyPoints ?? 0)}
                  className="btn-primary disabled:opacity-50"
                >
                  {redeeming ? "Redeeming…" : "Redeem"}
                </Button>
              </div>
              {(user.loyaltyPoints ?? 0) < MIN_REDEEM_POINTS && (
                <p className="text-xs text-dim mt-3">You need at least {MIN_REDEEM_POINTS} points to redeem.</p>
              )}
            </div>

            <div>
              <h3 className="font-bold mb-4">History</h3>
              {loyaltyLoading ? (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              ) : transactions.length === 0 ? (
                <p className="text-dim text-sm">No activity yet — points appear here once an order is delivered.</p>
              ) : (
                <div className="space-y-2">
                  {transactions.map((t) => (
                    <div key={t.id} className="flex justify-between items-center p-3 glass" style={{ borderRadius: "10px" }}>
                      <div>
                        <p className="text-sm font-semibold">{t.note || (t.type === "earn" ? "Points earned" : "Points redeemed")}</p>
                        <p className="text-xs text-dim">{new Date(t.createdAt).toLocaleDateString("en-EG")}</p>
                      </div>
                      <span className={`font-bold ${t.type === "earn" ? "text-green-400" : "text-red-400"}`}>
                        {t.type === "earn" ? "+" : "−"}{t.points}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Account Tab */}
        {tab === "account" && (
          <div className="glass p-6 space-y-4 max-w-md" style={{ borderRadius: "14px" }}>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-dim mb-1">Name</p>
              <p className="font-semibold">{user.name}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-dim mb-1">Email</p>
              <p className="font-semibold">{user.email}</p>
            </div>
            {user.phone && (
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-dim mb-1">Phone</p>
                <p className="font-semibold">{user.phone}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

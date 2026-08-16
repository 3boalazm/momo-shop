import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import logo from "@/components/media/Logo.png";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [, setLocation] = useLocation();
  const { login, signup } = useAuth();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: "",
    phone: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "signup") {
      if (!formData.name || !formData.email || !formData.password || !formData.confirmPassword) {
        toast.error("Please fill in all fields");
        return;
      }
      if (formData.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
    } else {
      if (!formData.email || !formData.password) {
        toast.error("Please fill in all fields");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      if (mode === "signup") {
        await signup({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
        });
        toast.success("Account created — welcome!");
      } else {
        await login({ email: formData.email, password: formData.password });
        toast.success("Logged in successfully!");
      }
      setLocation("/profile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass =
    "w-full bg-transparent border border-momo text-[color:var(--momo-text)] px-4 py-3 placeholder:text-dim focus:outline-none focus:border-accent";

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: "var(--momo-bg)" }}>
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <Link href="/">
            <img src={logo} alt="Élan Collective" className="h-12 w-auto mx-auto" />
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="heading-section mb-2">
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h1>
          <p className="text-dim">
            {mode === "login"
              ? "Sign in to continue shopping"
              : "Join the collective and start shopping"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ahmed Hassan"
                className={inputClass}
                style={{ borderRadius: 0 }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className={inputClass}
              style={{ borderRadius: 0 }}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Phone (optional)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="01xxxxxxxxx"
                className={inputClass}
                style={{ borderRadius: 0 }}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={inputClass}
              style={{ borderRadius: 0 }}
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="••••••••"
                className={inputClass}
                style={{ borderRadius: 0 }}
              />
            </div>
          )}

          <button type="submit" disabled={isSubmitting} className="btn-primary w-full disabled:opacity-60">
            {isSubmitting ? "Processing..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>

        <div className="text-center">
          <p className="text-dim mb-3 text-sm">
            {mode === "login" ? "Don't have an account?" : "Already have an account?"}
          </p>
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setFormData({ email: "", password: "", confirmPassword: "", name: "", phone: "" });
            }}
            className="text-accent font-bold uppercase tracking-widest text-sm hover:underline"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "login" ? "Sign Up" : "Sign In"}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-momo text-center">
          <Link href="/">
            <span className="text-dim text-sm hover:text-[color:var(--momo-text)] transition-colors cursor-pointer">
              ← Back to Home
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

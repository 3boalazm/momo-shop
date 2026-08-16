import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import logo from "@/components/media/Logo.png";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [, setLocation] = useLocation();
  const { login, signup } = useAuth();
  const { t } = useLanguage();
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
        toast.error(t("auth.fillAllFields"));
        return;
      }
      if (formData.password.length < 8) {
        toast.error(t("auth.passwordTooShort"));
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error(t("auth.passwordMismatch"));
        return;
      }
    } else {
      if (!formData.email || !formData.password) {
        toast.error(t("auth.fillAllFields"));
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
        toast.success(t("auth.signupSuccess"));
      } else {
        await login({ email: formData.email, password: formData.password });
        toast.success(t("auth.loginSuccess"));
      }
      setLocation("/profile");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("auth.genericError"));
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
            <img src={logo} alt="OLTRÈ Collective" className="h-12 w-auto mx-auto" />
          </Link>
        </div>

        <div className="mb-8 text-center">
          <h1 className="heading-section mb-2">
            {mode === "login" ? t("auth.welcomeBack") : t("auth.createAccount")}
          </h1>
          <p className="text-dim">
            {mode === "login" ? t("auth.signInSub") : t("auth.joinSub")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          {mode === "signup" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("auth.fullName")}</label>
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
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("auth.email")}</label>
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
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("auth.phoneOptional")}</label>
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
            <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("auth.password")}</label>
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
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 text-dim">{t("auth.confirmPassword")}</label>
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
            {isSubmitting ? t("auth.processing") : mode === "login" ? t("auth.signIn") : t("auth.createAccount")}
          </button>
        </form>

        <div className="text-center">
          <p className="text-dim mb-3 text-sm">
            {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}
          </p>
          <button
            onClick={() => {
              setMode(mode === "login" ? "signup" : "login");
              setFormData({ email: "", password: "", confirmPassword: "", name: "", phone: "" });
            }}
            className="text-accent font-bold uppercase tracking-widest text-sm hover:underline"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {mode === "login" ? t("auth.signUp") : t("auth.signIn")}
          </button>
        </div>

        <div className="mt-10 pt-8 border-t border-momo text-center">
          <Link href="/">
            <span className="text-dim text-sm hover:text-[color:var(--momo-text)] transition-colors cursor-pointer">
              {t("auth.backHome")}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}

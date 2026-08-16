import { useState } from "react";
import { Link } from "wouter";
import { Instagram, Send } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import logo from "./media/Logo.png";

export default function Footer() {
  const [email, setEmail] = useState("");
  const { t } = useLanguage();

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) {
      toast.error(t("footer.invalidEmail"));
      return;
    }
    toast.success(t("footer.subscribed"));
    setEmail("");
  };

  return (
    <footer className="glass-nav mt-auto">
      {/* Newsletter band */}
      <div className="border-b border-momo glow-field overflow-hidden">
        <div className="container section-padding-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="heading-section mb-2">{t("footer.newsletter")}</h2>
              <p className="text-dim max-w-md">
                {t("footer.newsletterSub")}
              </p>
            </div>
            <div className="flex gap-3 max-w-md md:ml-auto w-full">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t("footer.emailPlaceholder")}
                className="flex-1 bg-transparent border border-momo px-4 py-3 text-[color:var(--momo-text)] placeholder:text-dim focus:outline-none focus:border-accent"
                style={{ borderRadius: 0 }}
              />
              <button onClick={handleSubscribe} className="btn-primary flex items-center gap-2" aria-label="Subscribe">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Links */}
      <div className="container py-12 md:py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          <div className="col-span-2 md:col-span-1">
            <img src={logo} alt={t("brand.name")} className="h-9 w-auto" />
            <p className="mt-4 text-dim text-sm leading-relaxed max-w-xs">
              {t("footer.tagline")}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-dim mb-4">{t("footer.shop")}</h3>
            <ul className="space-y-2.5">
              {([
                { href: "/shop", key: "nav.allProducts" },
                { href: "/wishlist", key: "nav.wishlist" },
                { href: "/cart", key: "nav.cart" },
              ] as { href: string; key: TranslationKey }[]).map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="text-sm nav-text hover:text-accent transition-colors cursor-pointer">{t(l.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-dim mb-4">{t("footer.company")}</h3>
            <ul className="space-y-2.5">
              {([
                { href: "/about", key: "nav.about" },
                { href: "/contact", key: "nav.contact" },
                { href: "/track", key: "footer.trackOrder" },
              ] as { href: string; key: TranslationKey }[]).map((l) => (
                <li key={l.href}>
                  <Link href={l.href}>
                    <span className="text-sm nav-text hover:text-accent transition-colors cursor-pointer">{t(l.key)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold tracking-widest uppercase text-dim mb-4">{t("footer.connect")}</h3>
            <a href="https://instagram.com/oltrecollective" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm nav-text hover:text-accent transition-colors">
              <Instagram className="w-4 h-4" /> Instagram
            </a>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-momo flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-dim">
          <span>© {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}</span>
          <span>Cairo, Egypt</span>
        </div>
      </div>
    </footer>
  );
}

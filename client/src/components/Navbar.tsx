import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { ShoppingBag, Heart, Menu, X, User, Search, Sun, Moon } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";
import logo from "./media/Logo.png";

const NAV_LINKS: { href: string; key: TranslationKey }[] = [
  { href: "/", key: "nav.home" },
  { href: "/shop", key: "nav.shop" },
  { href: "/about", key: "nav.about" },
  { href: "/contact", key: "nav.contact" },
];

const SHOP_CATEGORIES: { slug: string; key: TranslationKey }[] = [
  { slug: "tees", key: "cat.tees" },
  { slug: "denim", key: "cat.denim" },
  { slug: "hoodies", key: "cat.hoodies" },
];

export default function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { count } = useCart();
  const { theme, toggleTheme } = useTheme();
  const { t, lang, toggleLang } = useLanguage();

  // Home page has a full-bleed hero — navbar starts transparent there and
  // turns to glass on scroll. Every other page is glass from the top.
  const isHome = location === "/";
  const transparent = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  // Close dropdown on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        transparent ? "bg-transparent nav-transparent" : "glass-nav"
      }`}
    >
      <nav className="container">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left: mobile menu toggle + logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 -ml-2 nav-text inline-flex items-center gap-1"
              aria-label="Menu"
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <Link href="/">
              <img
                src={logo}
                alt={t("brand.name")}
                className="h-8 md:h-9 w-auto cursor-pointer select-none"
              />
            </Link>
          </div>

          {/* Center: desktop nav */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
            {NAV_LINKS.map((link) =>
              link.href === "/shop" ? (
                <div key={link.href} className="relative group">
                  <Link href={link.href}>
                    <span
                      className={`text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                        isActive(link.href) ? "text-accent" : "nav-text hover:text-accent"
                      }`}
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {t(link.key)}
                    </span>
                  </Link>
                  {/* Mega menu */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 pt-4 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="glass-strong p-2 w-64" style={{ borderRadius: "14px", background: "rgba(20, 20, 20, 0.92)" }}>
                      <Link href="/shop">
                        <div className="px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white hover:text-accent hover:bg-white/10 cursor-pointer transition-colors whitespace-nowrap" style={{ borderRadius: "8px" }}>
                          All Products
                        </div>
                      </Link>
                      {SHOP_CATEGORIES.map((cat) => (
                        <Link key={cat.slug} href={`/shop?category=${cat.slug}`}>
                          <div className="px-4 py-2.5 text-white hover:text-accent hover:bg-white/10 cursor-pointer transition-colors" style={{ borderRadius: "8px" }}>
                            <span className="text-xs font-bold uppercase tracking-widest whitespace-nowrap">{t(cat.key)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`text-xs font-bold tracking-widest uppercase transition-colors cursor-pointer ${
                      isActive(link.href) ? "text-accent" : "nav-text hover:text-accent"
                    }`}
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {t(link.key)}
                  </span>
                </Link>
              )
            )}
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1">
            {toggleTheme && (
              <button
                onClick={toggleTheme}
                className="p-2 nav-icon transition-colors"
                aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
            )}
            <button
              onClick={toggleLang}
              className="px-2 py-2 nav-icon transition-colors text-xs font-bold uppercase tracking-widest"
              aria-label={lang === "en" ? "التبديل للعربية" : "Switch to English"}
            >
              {lang === "en" ? "ع" : "EN"}
            </button>
            <Link href="/shop">
              <button className="p-2 nav-icon transition-colors" aria-label="Search">
                <Search className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/wishlist">
              <button
                className={`p-2 transition-colors ${isActive("/wishlist") ? "text-accent" : "nav-text hover:text-accent"}`}
                aria-label="Wishlist"
              >
                <Heart className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/profile">
              <button
                className={`hidden md:inline-flex p-2 transition-colors ${isActive("/profile") ? "text-accent" : "nav-text hover:text-accent"}`}
                aria-label="Account"
              >
                <User className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/cart">
              <button
                className={`relative p-2 transition-colors ${isActive("/cart") ? "text-accent" : "nav-text hover:text-accent"}`}
                aria-label="Cart"
              >
                <ShoppingBag className="w-5 h-5" />
                {count > 0 && (
                  <span
                    className="absolute -top-0.5 -right-0.5 bg-accent text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Mobile dropdown — compact, glass, sits under the header (NOT full-screen) */}
      {mobileOpen && (
        <>
          {/* Click-away backdrop (transparent, just for dismiss) */}
          <button
            className="md:hidden fixed inset-0 top-16 z-40 cursor-default"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="md:hidden absolute left-4 right-4 top-full mt-2 z-50 glass-strong overflow-hidden"
            style={{ borderRadius: "14px", backgroundColor: "var(--momo-surface)" }}>
            <div className="py-2">
              {NAV_LINKS.map((link) => (
                <Link key={link.href} href={link.href}>
                  <span
                    className={`block px-5 py-3 text-sm font-bold uppercase tracking-widest transition-colors cursor-pointer ${
                      isActive(link.href) ? "text-accent glass-accent" : "hover:text-accent"
                    }`}
                    style={{ fontFamily: "var(--font-display)", color: isActive(link.href) ? undefined : "var(--momo-text)" }}
                  >
                    {t(link.key)}
                  </span>
                </Link>
              ))}
              <div className="border-t border-momo mt-1 pt-1">
                <Link href="/profile">
                  <span
                    className="block px-5 py-3 text-sm font-bold uppercase tracking-widest hover:text-accent transition-colors cursor-pointer"
                    style={{ color: "var(--momo-text)", opacity: 0.7 }}
                  >
                    My Account
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

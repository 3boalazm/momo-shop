import { Link } from "wouter";
import { ArrowRight, Instagram } from "lucide-react";
import heroBanner from "@/components/media/Hero Banner.png";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/motion/Reveal";
import { useProducts } from "@/hooks/useProducts";
import { INSTAGRAM_POSTS, INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/data/instagram";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Home() {
  const { products } = useProducts();
  const { t } = useLanguage();
  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }}>
      {/* ===== HERO ===== */}
      <section className="relative w-full h-[calc(100vh-7rem)] min-h-[600px] overflow-hidden" style={{ backgroundColor: "#0a0a0a", marginTop: "-7rem" }}>
        <img
          src={heroBanner}
          alt={t("brand.name")}
          className="absolute inset-0 w-full h-full object-cover"
          fetchPriority="high"
        />
        {/* Gradient scrim for legibility */}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to right, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.4) 55%, rgba(10,10,10,0.2) 100%)" }}
        />
        {/* Extra top-strip scrim so the navbar stays readable full-width, regardless of the photo's brightness there */}
        <div
          className="absolute inset-x-0 top-0 h-24"
          style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.65) 0%, transparent 100%)" }}
        />
        {/* Ambient accent glow to give the glass panel something to refract */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: "30rem", height: "30rem", left: "8%", bottom: "5%",
            background: "radial-gradient(circle, rgba(255,87,34,0.3), transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div className="relative h-full container flex flex-col justify-center pt-20">
          <div className="max-w-2xl">
            <span className="eyebrow mb-4 block">{t("home.eyebrow")}</span>
            <h1 className="heading-hero text-white mb-6">
              {t("home.heroLine1")}<br />
              {t("home.heroLine2")} <span className="text-accent italic">{t("home.heroLine2Accent")}</span>
            </h1>
            <p className="text-base md:text-lg text-white/80 max-w-lg mb-6 leading-relaxed">
              {t("home.heroSub")}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/shop">
                <button className="btn-primary inline-flex items-center gap-2">
                  {t("home.explore")} <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
              <Link href="/about">
                <button className="btn-outline-light">{t("home.ourStory")}</button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ===== LATEST DROP ===== */}
      <section className="section-padding container glow-field">
        <div className="flex items-end justify-between mb-10">
          <div>
            <span className="eyebrow mb-2 block">Just Landed</span>
            <h2 className="heading-section">{t("home.latestDrop")}</h2>
          </div>
          <Link href="/shop">
            <span className="hidden md:inline-flex items-center gap-1.5 text-sm font-bold uppercase tracking-widest text-[color:var(--momo-text)] hover:text-accent transition-colors cursor-pointer"
              style={{ fontFamily: "var(--font-display)" }}>
              View all <ArrowRight className="w-4 h-4" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {products.slice(0, 3).map((product, i) => (
            <Reveal key={product.id} delay={i * 0.08}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== BRAND STATEMENT ===== */}
      <section className="surface border-y border-momo">
        <div className="container section-padding">
          <Reveal className="max-w-4xl">
            <span className="eyebrow mb-4 block">{t("home.movement")}</span>
            <h2 className="heading-section mb-8 leading-tight">
              {t("home.movementTitle1")}<br />{t("home.movementTitle2")}<br /><span className="text-accent">{t("home.movementTitle3")}</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-[color:var(--momo-text)] opacity-75 text-lg leading-relaxed">
              <p>
                OLTRÈ Collective is rooted in street culture. Every garment is designed with
                intention — built to last, crafted to inspire the confident and the bold.
              </p>
              <p>
                We believe in raw authenticity. Quality menswear that captures the gritty energy
                of urban life, refined through meticulous execution. This is more than fashion.
              </p>
            </div>
            <Link href="/about">
              <button className="btn-outline-light mt-10">{t("home.learnMore")}</button>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ===== INSTAGRAM FEED ===== */}
      <section className="section-padding container">
        <div className="text-center mb-10">
          <span className="eyebrow block mb-2">{INSTAGRAM_HANDLE}</span>
          <h2 className="heading-section">{t("home.followCulture")}</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          {(INSTAGRAM_POSTS.length > 0
            ? INSTAGRAM_POSTS.slice(0, 8)
            : products
                .slice(0, 4)
                .flatMap((p) => p.images.slice(0, 1))
                .concat(products.slice(0, 4).flatMap((p) => p.images.slice(0, 1)))
                .slice(0, 8)
                .map((img) => ({ image: img, link: INSTAGRAM_URL, caption: "" }))
          ).map((post, i) => (
            <a
              key={i}
              href={post.link}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative block overflow-hidden surface-2"
              style={{ aspectRatio: "1/1", borderRadius: "12px" }}
            >
              <img src={post.image} alt={post.caption || ""} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" loading="lazy" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </a>
          ))}
        </div>
      </section>

      {/* ===== CTA STRIP ===== */}
      <section className="bg-accent">
        <div className="container py-16 md:py-20 text-center">
          <h2 className="heading-section text-white mb-4">{t("home.readyTitle")}</h2>
          <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
            {t("home.readySub")}
          </p>
          <Link href="/shop">
            <button className="bg-white text-black px-8 py-4 font-bold uppercase tracking-wide hover:bg-black hover:text-white transition-colors"
              style={{ fontFamily: "var(--font-display)", borderRadius: 0 }}>
              {t("home.shopNow")}
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}

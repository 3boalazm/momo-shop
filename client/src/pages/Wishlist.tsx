import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ASSETS } from "@/assets";
import { useLanguage } from "@/contexts/LanguageContext";

interface WishlistItem {
  id: number;
  name: string;
  slug: string;
  price: number;
  image: string;
}

const MOCK_WISHLIST: WishlistItem[] = [
  { id: 1, name: "Oversized T-Shirt", slug: "oversized-tee", price: 650, image: ASSETS.products.tee.compressed },
  { id: 3, name: "Heavyweight Hoodie", slug: "heavyweight-hoodie", price: 1200, image: ASSETS.products.hoodie.compressed },
];

export default function Wishlist() {
  const { t } = useLanguage();
  const [items, setItems] = useState<WishlistItem[]>(MOCK_WISHLIST);

  const removeItem = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    toast.success(t("wishlist.itemRemoved"));
  };

  const addToCart = (item: WishlistItem) => {
    toast.success(t("wishlist.addedToCart", { name: item.name }));
  };

  if (items.length === 0) {
    return (
      <div style={{ backgroundColor: "var(--momo-bg)" }}>
        <div className="section-padding container glow-field overflow-hidden">
          <h1 className="heading-section mb-8">{t("wishlist.title")}</h1>
          <div className="text-center py-20">
            <Heart className="w-16 h-16 mx-auto mb-4 text-dim" />
            <p className="text-xl text-dim mb-8">{t("wishlist.empty")}</p>
            <Link href="/shop">
              <Button className="btn-primary">{t("wishlist.startShopping")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }}>
      <div className="section-padding container glow-field overflow-hidden">
        <h1 className="heading-section mb-8">{t("wishlist.titleCount", { count: items.length })}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <div key={item.id} className="group glass glass-hover overflow-hidden" style={{ borderRadius: "14px" }}>
              <div className="relative overflow-hidden surface-2 h-80">
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  className="absolute top-4 right-4 glass p-2 hover:glass-accent transition-colors z-10"
                  style={{ borderRadius: "8px" }}
                >
                  <Trash2 className="w-5 h-5 text-red-500" />
                </button>
              </div>

              <div className="p-4">
                <h3 className="font-bold text-lg mb-2">{item.name}</h3>
                <p className="text-2xl font-bold text-accent mb-4">{item.price} LE</p>

                <div className="flex gap-2">
                  <Link href={`/product/${item.slug}`}>
                    <Button variant="outline" className="flex-1">
                      {t("wishlist.view")}
                    </Button>
                  </Link>
                  <Button onClick={() => addToCart(item)} className="flex-1 btn-primary">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    {t("wishlist.addToCart")}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

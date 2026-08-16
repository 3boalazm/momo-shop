import { useLanguage } from "@/contexts/LanguageContext";
import type { TranslationKey } from "@/i18n/translations";

const MESSAGE_KEYS: TranslationKey[] = [
  "announce.freeShipping",
  "announce.newDrop",
  "announce.cod",
  "announce.limited",
];

export default function AnnouncementBar() {
  const { t } = useLanguage();
  const messages = MESSAGE_KEYS.map((k) => t(k));
  const items = [...messages, ...messages];

  return (
    <div className="marquee" role="region" aria-label="Announcements">
      <div className="marquee__track" aria-hidden="false">
        {items.map((msg, i) => (
          <span key={i} className="marquee__item">
            {msg} <span className="mx-3 opacity-60">✦</span>
          </span>
        ))}
      </div>
      <div className="marquee__track" aria-hidden="true">
        {items.map((msg, i) => (
          <span key={`dup-${i}`} className="marquee__item">
            {msg} <span className="mx-3 opacity-60">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

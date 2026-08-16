import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Contact() {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate form submission
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(t("contact.sent"));
      setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      toast.error(t("contact.sendFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ backgroundColor: "var(--momo-bg)" }}>
      {/* Header */}
      <section className="section-padding-sm border-b border-momo">
        <div className="container">
          <h1 className="heading-section mb-2">{t("contact.title")}</h1>
          <p className="text-dim">{t("contact.subtitle")}</p>
        </div>
      </section>

      {/* Content */}
      <section className="section-padding container glow-field overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Contact Info */}
          <div>
            <h2 className="heading-subsection mb-8">{t("contact.getInTouch")}</h2>
            <div className="space-y-8">
              <div className="flex gap-4">
                <Mail className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-1">{t("contact.email")}</h3>
                  <p className="text-dim">hello@momocollective.com</p>
                </div>
              </div>

              <div className="flex gap-4">
                <Phone className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-1">{t("contact.phone")}</h3>
                  <p className="text-dim">+20 (123) 456-7890</p>
                </div>
              </div>

              <div className="flex gap-4">
                <MapPin className="w-6 h-6 text-accent flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold mb-1">{t("contact.location")}</h3>
                  <p className="text-dim">{t("contact.locationValue")}</p>
                </div>
              </div>

              <div className="glass p-6 mt-8" style={{ borderRadius: "16px" }}>
                <h3 className="font-bold mb-3">{t("contact.responseTime")}</h3>
                <p className="text-dim">
                  {t("contact.responseTimeSub")}
                </p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold mb-2">{t("contact.name")}</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={t("contact.namePlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t("contact.email")}</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t("contact.emailPlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t("contact.phoneOptional")}</label>
                <Input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+20 (123) 456-7890"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t("contact.subject")}</label>
                <Input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder={t("contact.subjectPlaceholder")}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">{t("contact.message")}</label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder={t("contact.messagePlaceholder")}
                  rows={6}
                  className="w-full px-4 py-3 border border-momo bg-transparent text-white placeholder:text-dim focus:outline-none focus:border-accent" style={{ borderRadius: 0 }}
                  required
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full btn-primary"
              >
                {isSubmitting ? t("contact.sending") : t("contact.sendMessage")}
              </Button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}

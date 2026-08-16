/**
 * Shipping fees by zone for Egypt.
 * Governorates are grouped into zones; each zone has its own flat fee.
 * Free shipping still applies above the threshold, regardless of zone.
 */

export const FREE_SHIPPING_OVER = 2000; // EGP

export interface ShippingZone {
  id: string;
  label: string;
  labelAr: string;
  fee: number; // EGP
  governorates: string[]; // must match EGYPT_GOVERNORATES `en` values
}

export const SHIPPING_ZONES: ShippingZone[] = [
  {
    id: "cairo_giza",
    label: "Greater Cairo",
    labelAr: "القاهرة الكبرى",
    fee: 40,
    governorates: ["Cairo", "Giza", "Qalyubia"],
  },
  {
    id: "delta",
    label: "Delta & Canal",
    labelAr: "الدلتا والقناة",
    fee: 55,
    governorates: [
      "Alexandria", "Dakahlia", "Sharqia", "Gharbia", "Monufia", "Beheira",
      "Kafr El Sheikh", "Damietta", "Port Said", "Ismailia", "Suez",
    ],
  },
  {
    id: "upper",
    label: "Upper Egypt",
    labelAr: "الصعيد",
    fee: 70,
    governorates: [
      "Faiyum", "Beni Suef", "Minya", "Asyut", "Sohag", "Qena", "Luxor", "Aswan",
    ],
  },
  {
    id: "frontier",
    label: "Frontier Governorates",
    labelAr: "المحافظات الحدودية",
    fee: 90,
    governorates: [
      "North Sinai", "South Sinai", "Red Sea", "New Valley", "Matrouh",
    ],
  },
];

const DEFAULT_FEE = 65; // fallback if governorate isn't matched

/** Resolve the shipping fee for a governorate (English name). */
export function shippingFeeForGovernorate(governorate: string): number {
  const zone = SHIPPING_ZONES.find((z) => z.governorates.includes(governorate));
  return zone ? zone.fee : DEFAULT_FEE;
}

/** Compute shipping given a subtotal + governorate (free over threshold). */
export function computeShipping(subtotal: number, governorate?: string): number {
  if (subtotal >= FREE_SHIPPING_OVER) return 0;
  if (!governorate) return DEFAULT_FEE;
  return shippingFeeForGovernorate(governorate);
}

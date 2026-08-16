export const COOKIE_NAME = "momo_session";

// Time constants
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;
export const AXIOS_TIMEOUT_MS = 10000; // 10 seconds

// Product categories
export const PRODUCT_CATEGORIES = {
  tees: "T-Shirts",
  denim: "Denim",
  hoodies: "Hoodies",
} as const;

// Sizes
export const SIZES = ["XS", "S", "M", "L", "XL", "XXL"] as const;

// Order statuses
export const ORDER_STATUSES = ["Pending", "Shipped", "Delivered", "Cancelled"] as const;

// Shipping cost (free over 500 EGP)
export const FREE_SHIPPING_THRESHOLD = 500;
export const SHIPPING_COST = 50; // EGP

// Currency
export const CURRENCY = "EGP";
export const CURRENCY_SYMBOL = "LE";

// Pagination
export const ITEMS_PER_PAGE = 12;

// Cart persistence
export const CART_STORAGE_KEY = "momo_cart";
export const SESSION_ID_STORAGE_KEY = "momo_session_id";

// Error messages
export const NOT_ADMIN_ERR_MSG = "Only admins can access this resource";
export const UNAUTHED_ERR_MSG = "You must be logged in to access this resource";

// Brand WhatsApp number for order-via-WhatsApp (international format, no + or spaces)
export const WHATSAPP_NUMBER = "201000000000"; // TODO: replace with Élan's real number

// Application Constants

// Validation
export const PHONE_MIN_LENGTH = 10;
export const PHONE_MAX_LENGTH = 11;
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 100;
export const EMAIL_MAX_LENGTH = 255;
export const MESSAGE_MAX_LENGTH = 1000;

// Pagination
export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 100;

// Cache & Retry
export const CACHE_TIME_SHORT = 30000; // 30 seconds
export const CACHE_TIME_MEDIUM = 60000; // 1 minute
export const CACHE_TIME_LONG = 300000; // 5 minutes
export const MAX_RETRY_ATTEMPTS = 3;
export const RETRY_DELAY_BASE = 1000; // 1 second

// WhatsApp
export const WHATSAPP_RETRY_MAX = 3;
export const WHATSAPP_RETRY_DELAY = 1000; // 1 second

// Notifications
export const NOTIFICATION_BATCH_SIZE = 50;
export const NOTIFICATION_PROCESSING_DELAY = 1000; // 1 second between sends

// Recent Searches
export const MAX_RECENT_SEARCHES = 10;

// Scratch Cards
export const SCRATCH_CARD_PRODUCTION_COST = 1.50;
export const SCRATCH_CARD_SALE_PRICE = 5.00;
export const DEFAULT_PLATFORM_COMMISSION = 10.00;

// Loyalty Tiers
export const TIER_THRESHOLDS = {
  BRONZE: 0,
  SILVER: 200,
  GOLD: 500,
  PLATINUM: 1000,
} as const;

// Status
export const SCRATCH_CARD_STATUS = {
  AVAILABLE: 'available',
  REGISTERED: 'registered',
  REDEEMED: 'redeemed',
} as const;

export const NOTIFICATION_STATUS = {
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed',
} as const;

export const COMPANY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export const ROLES = {
  DOCTOR: 'DOCTOR',
  PATIENT: 'PATIENT',
  ADMIN: 'ADMIN',
};

export const STATUS = {
  PENDING:     'PENDING',
  CONFIRMED:   'CONFIRMED',
  CANCELLED:   'CANCELLED',
  COMPLETED:   'COMPLETED',
  RESCHEDULED: 'RESCHEDULED',
};

export const STATUS_CONFIG = {
  PENDING:     { badge: 'badge-amber', emoji: '⏳', label: 'Pending' },
  CONFIRMED:   { badge: 'badge-green', emoji: '✅', label: 'Confirmed' },
  CANCELLED:   { badge: 'badge-rose',  emoji: '❌', label: 'Cancelled' },
  COMPLETED:   { badge: 'badge-teal',  emoji: '🏆', label: 'Completed' },
  RESCHEDULED: { badge: 'badge-stone', emoji: '🔄', label: 'Rescheduled' },
};
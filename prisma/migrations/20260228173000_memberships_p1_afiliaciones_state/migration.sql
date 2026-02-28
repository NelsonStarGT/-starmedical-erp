-- Memberships P1: afiliaciones state for manual pending payment workflow

ALTER TYPE "MembershipStatus"
  ADD VALUE IF NOT EXISTS 'PENDIENTE_PAGO';

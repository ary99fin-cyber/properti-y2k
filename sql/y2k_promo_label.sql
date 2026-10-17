-- Jalankan sekali di Supabase SQL Editor milik project Properti Y2K.
-- Aman dijalankan berulang; tidak mengubah label yang sudah disimpan.
ALTER TABLE public.y2k_listing_details
ADD COLUMN IF NOT EXISTS promo_label text;
ALTER TABLE public.y2k_listing_details
DROP CONSTRAINT IF EXISTS y2k_listing_details_promo_label_check;
ALTER TABLE public.y2k_listing_details
ADD CONSTRAINT y2k_listing_details_promo_label_check
CHECK (promo_label IS NULL OR promo_label IN ('harga_menarik','nego_sampai_jadi'));
COMMENT ON COLUMN public.y2k_listing_details.promo_label IS
'Label promosi yang dipilih agen dengan persetujuan pemilik; NULL berarti tidak ada label.';

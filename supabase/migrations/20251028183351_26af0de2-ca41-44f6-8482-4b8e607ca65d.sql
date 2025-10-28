-- FASE 2: QR Code + Analytics + Storage (CORRECTED)
-- Add QR code URL column to scratch_cards
ALTER TABLE scratch_cards 
ADD COLUMN qr_code_url TEXT;

-- Create storage bucket for QR codes
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'qr-codes',
  'qr-codes',
  true,
  1048576, -- 1MB limit
  ARRAY['image/png', 'image/jpeg']
);

-- RLS policies for QR codes bucket
CREATE POLICY "QR codes are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'qr-codes');

CREATE POLICY "Admins can upload QR codes"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'qr-codes' AND
  has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete QR codes"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'qr-codes' AND
  has_role(auth.uid(), 'admin'::app_role)
);
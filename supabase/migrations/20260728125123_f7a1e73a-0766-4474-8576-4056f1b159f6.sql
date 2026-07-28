CREATE POLICY "Authenticated users can read logos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'logos');

CREATE POLICY "Gym staff can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = (SELECT gym_id::text FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Gym staff can update their logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = (SELECT gym_id::text FROM public.profiles WHERE id = auth.uid())
)
WITH CHECK (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = (SELECT gym_id::text FROM public.profiles WHERE id = auth.uid())
);

CREATE POLICY "Gym staff can delete their logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'logos'
  AND (storage.foldername(name))[1] = (SELECT gym_id::text FROM public.profiles WHERE id = auth.uid())
);
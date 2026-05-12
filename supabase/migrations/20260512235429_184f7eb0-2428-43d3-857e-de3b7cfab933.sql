
-- Restrict listing on the public business-logos bucket to file owners only
DROP POLICY IF EXISTS "Public can list business-logos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can list business-logos" ON storage.objects;

-- Revoke EXECUTE from anon on every SECURITY DEFINER helper in public
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_subscription() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_counters() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_subscription_plan() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_subscription_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

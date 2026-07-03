ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
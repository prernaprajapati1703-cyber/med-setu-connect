-- Lock down user_roles: only service_role can modify; block authenticated INSERT/UPDATE/DELETE
CREATE POLICY "No self role assignment - insert"
  ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (false);

CREATE POLICY "No self role update"
  ON public.user_roles FOR UPDATE TO authenticated
  USING (false) WITH CHECK (false);

CREATE POLICY "No self role delete"
  ON public.user_roles FOR DELETE TO authenticated
  USING (false);

-- Revoke execute on has_role from public/authenticated; only service_role/definer can call
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;
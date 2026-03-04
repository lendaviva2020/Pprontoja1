-- Permite que o usuário autenticado leia apenas o próprio role.
-- Necessário para login e middleware redirecionarem corretamente (cliente vs profissional).
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
CREATE POLICY "user_roles_select_own"
  ON public.user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

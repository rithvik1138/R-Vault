-- Update the assign_admin_on_signup function to also check for admin email
CREATE OR REPLACE FUNCTION public.assign_admin_on_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Assign admin role to user with phone number '+919999999999' OR email 'admin@securehub.com'
  IF new.phone = '+919999999999' OR new.email = 'admin@securehub.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (new.id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN new;
END;
$function$;
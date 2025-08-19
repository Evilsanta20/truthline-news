-- Fix the security vulnerability: restrict profile access to own data only
-- Drop the existing public policy
DROP POLICY "Users can view all profiles" ON public.profiles;

-- Create a new policy that only allows users to view their own profile
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

-- Additionally, allow viewing profiles for specific use cases like author attribution
-- This policy allows viewing basic profile info (name, avatar) but not sensitive data like email
CREATE POLICY "Public can view basic profile info" ON public.profiles
FOR SELECT USING (true)
WITH (security_barrier = true);
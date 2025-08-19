-- Fix the security vulnerability: restrict profile access to own data only
-- Drop the existing public policy that exposes all user data
DROP POLICY "Users can view all profiles" ON public.profiles;

-- Create a secure policy that only allows users to view their own profile data
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);
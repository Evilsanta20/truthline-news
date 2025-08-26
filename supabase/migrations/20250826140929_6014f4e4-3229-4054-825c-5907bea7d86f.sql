-- Confirm the email addresses for both users (only update email_confirmed_at)
UPDATE auth.users 
SET email_confirmed_at = now()
WHERE email IN ('demo@newsapp.com', 'prajwalsshetty.18@proton.me');
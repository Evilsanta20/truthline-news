-- Confirm the email addresses for both users
UPDATE auth.users 
SET email_confirmed_at = now(), 
    confirmed_at = now(),
    email_change_confirm_status = 1
WHERE email IN ('demo@newsapp.com', 'prajwalsshetty.18@proton.me');
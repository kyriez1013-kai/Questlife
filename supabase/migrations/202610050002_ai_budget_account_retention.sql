-- Erasing an Auth identity also erases its accounting identifiers. Global spent
-- reservations remain counted; this does not touch observation/sync entities.
begin;
create function public.questlife_ai_forget_account() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.questlife_ai_budget
    where scope in ('user:'||old.id, 'minute:'||old.id);
  return old;
end $$;
revoke all on function public.questlife_ai_forget_account() from public,anon,authenticated,service_role;
create trigger questlife_ai_budget_account_delete after delete on auth.users
  for each row execute function public.questlife_ai_forget_account();
commit;

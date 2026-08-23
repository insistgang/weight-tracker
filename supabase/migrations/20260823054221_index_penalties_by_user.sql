create index penalties_user_date_idx
  on public.penalties (user_id, penalty_date desc);

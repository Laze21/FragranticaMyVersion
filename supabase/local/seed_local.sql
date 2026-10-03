-- LOCAL ONLY: credentials for demo accounts on embedded Postgres. Never applied to Supabase.
insert into auth.local_credentials (user_id, password_hash) values ('671152e1-7913-561d-bf2f-a2bac69ed43a', 'scrypt$demo-salt-not-secret$d72755fc640ab76f48dbfd02d8d945e63259b1bdb7033937faffdf08467e6ad9') on conflict do nothing;

-- DEMO DATA (local only): a Labrador puppy with 8 weigh-ins over 90 days and two replaced goals, to see the growth graph and goal history.
-- Needs a signed-in user with this email (create it with the local admin API), then:  psql <local db url> -f supabase/scripts/demo_goal_history.sql
\set demo_email '''demo.owner@example.com'''
delete from public.pets where user_id = (select id from auth.users where email = :demo_email);
insert into public.pets (user_id, species, name, breed, size_cat, birth_date, sex, neutered, weight_kg, bcs, activity, allergies, health, answered, goal, target, skips, remind)
select id, 'dog', 'Juno', 'Labrador Retriever', 'V', current_date - 167, 'unknown', true, 21.2, 5, 'normal', '{}', '{}',
       '{"bcs":true,"neutered":true,"activity":true,"allergies":true}'::jsonb,
       jsonb_build_object('type','grow','custom',true,'fromChart',true,'targetKg',27,'startOn',(current_date-10)::text,'startKg',20.0,'targetDate',(current_date+50)::text,'days',50),
       jsonb_build_object('kg',27,'days',50,'date',(current_date+50)::text,'setOn',(current_date-10)::text), '{}', false
from auth.users where email = :demo_email;
insert into public.weight_logs (user_id, pet_id, measured_on, kg, bcs)
select p.user_id, p.id, current_date + d, kg, 5 from public.pets p,
 (values (-90, 11.0), (-76, 12.4), (-62, 14.1), (-48, 15.6), (-34, 17.0), (-20, 18.9), (-10, 20.0), (-3, 21.2)) v(d, kg);
insert into public.pet_goals (user_id, pet_id, type, start_on, start_kg, target_kg, target_date, ended_on, end_kg, outcome)
select p.user_id, p.id, 'grow', current_date-62, 14.1, 32, current_date+58, current_date-34, 17.0, 'replaced' from public.pets p
union all
select p.user_id, p.id, 'grow', current_date-34, 17.0, 30, current_date+26, current_date-10, 20.0, 'replaced' from public.pets p;

import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function checkProfiles() {
  await supabaseSignIn({
    email: 'admin@smartpds.gov.in',
    password: 'AdminPassword#2026',
  });

  const { data: profiles, error } = await supabase.from('user_profiles').select('*');
  console.log('Profiles in DB:', { count: profiles?.length, error: error?.message, profiles });
}

checkProfiles().catch(console.error);

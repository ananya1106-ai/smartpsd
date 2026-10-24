import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function findAditya() {
  await supabaseSignIn({
    email: 'aglpihu2006@gmail.com',
    password: 'AdminPassword#2026',
  });

  const { data: profs } = await supabase.from('user_profiles').select('*');
  console.log('All profiles:', profs);
}

findAditya().catch(console.error);

import { supabaseSignIn } from '../src/lib/supabaseAuth';
import { supabase } from '../src/lib/supabase';

async function checkDevendra() {
  const sin = await supabaseSignIn({ email: 'devendraagarwal907@gmail.com', password: '123456' });
  const { data } = await supabase.from('user_profiles').select('*').maybeSingle();
  console.log('Devendra profile:', data);
}

checkDevendra().catch(console.error);

import { supabaseSignIn } from '../src/lib/supabaseAuth';
import { supabase } from '../src/lib/supabase';

async function test2k24() {
  const res = await supabaseSignIn({ email: '2k24.csai1a.2412094@gmail.com', password: '123456' });
  console.log('2k24 result:', res);

  const { data: prof } = await supabase.from('user_profiles').select('*');
  console.log('Profile:', prof);
}

test2k24().catch(console.error);

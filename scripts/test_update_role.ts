import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function testUpdateRole() {
  const sin = await supabaseSignIn({ email: 'devendraagarwal907@gmail.com', password: '123456' });
  console.log('SignIn:', sin);

  const { data: upd, error: updErr } = await supabase
    .from('user_profiles')
    .update({ role: 'Administrator' })
    .eq('id', sin.user?.id)
    .select();

  console.log('Update result:', { upd, error: updErr?.message });
}

testUpdateRole().catch(console.error);

import { supabase } from '../src/lib/supabase';
import { supabaseSignIn, supabaseSignUp } from '../src/lib/supabaseAuth';

async function testOtherAdmins() {
  const emails = [
    'aglpihu2006@gmail.com',
    'hackathonnn123@gmail.com',
    'visionvibes14589@gmail.com',
    '2k24.csai1a.2412094@gmail.com'
  ];

  for (const email of emails) {
    let res = await supabaseSignUp({
      email,
      password: 'AdminPassword#2026',
      name: 'Admin User',
      role: 'Administrator',
    });
    console.log(`SignUp ${email}:`, res);
    if (!res.success && res.error?.includes('already registered')) {
      let sin = await supabaseSignIn({ email, password: 'AdminPassword#2026' });
      console.log(`SignIn ${email}:`, sin);
    }
    const { data: prof } = await supabase.from('user_profiles').select('*').eq('email', email).maybeSingle();
    console.log(`Profile ${email}:`, prof);
    if (prof?.role === 'Administrator') break;
  }
}

testOtherAdmins().catch(console.error);

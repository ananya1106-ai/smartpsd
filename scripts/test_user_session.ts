import { supabase } from '../src/lib/supabase';
import { supabaseSignIn, supabaseSignUp } from '../src/lib/supabaseAuth';

async function testAuthAndTables() {
  console.log('Testing SignUp/SignIn...');
  const testEmail = 'admin@smartpds.gov.in';
  const testPassword = 'AdminPassword#2026';

  let signInRes = await supabaseSignIn({
    email: testEmail,
    password: testPassword,
  });

  if (!signInRes.success) {
    console.log('Sign in failed, attempting signup...');
    const signUpRes = await supabaseSignUp({
      email: testEmail,
      password: testPassword,
      name: 'Sunil K. Verma',
      role: 'Administrator',
    });
    console.log('Signup result:', signUpRes);
    signInRes = await supabaseSignIn({
      email: testEmail,
      password: testPassword,
    });
  }

  console.log('Sign in result:', signInRes);

  if (signInRes.success) {
    console.log('Now querying tables with authenticated session...');
    const { data: shops, error: sErr } = await supabase.from('fair_price_shops').select('*');
    console.log('fair_price_shops:', { count: shops?.length, error: sErr?.message, sample: shops });

    const { data: comms, error: cErr } = await supabase.from('commodities').select('*');
    console.log('commodities:', { count: comms?.length, error: cErr?.message, sample: comms });

    const { data: batches, error: bErr } = await supabase.from('batches').select('*');
    console.log('batches:', { count: batches?.length, error: bErr?.message, sample: batches });
  }
}

testAuthAndTables().catch(console.error);

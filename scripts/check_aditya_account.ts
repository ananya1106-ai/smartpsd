import { supabaseSignIn, supabaseSignUp } from '../src/lib/supabaseAuth';

async function checkAditya() {
  const emails = [
    'aditya@smartpds.gov.in',
    'operator@smartpds.gov.in',
    'aditya@gmail.com',
    'aditya1106@gmail.com',
    'ananya1106@gmail.com',
    'ananya1106-ai@gmail.com',
    'ananya@smartpds.gov.in'
  ];

  for (const email of emails) {
    const res = await supabaseSignIn({ email, password: '123456' });
    console.log(`SignIn ${email}:`, res.success ? res.user : res.error);
    if (!res.success && res.error?.includes('Invalid email or password')) {
      // It exists!
      console.log(`FOUND registered email: ${email}`);
    }
  }
}

checkAditya().catch(console.error);

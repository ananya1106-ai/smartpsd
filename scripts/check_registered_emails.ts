import { supabaseSignUp } from '../src/lib/supabaseAuth';

async function testSignUps() {
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
    const res = await supabaseSignUp({
      email,
      password: 'AdminPassword#2026',
      name: 'Aditya',
      role: 'Warehouse Operator'
    });
    if (!res.success && res.error?.includes('already registered')) {
      console.log(`ALREADY REGISTERED: ${email}`);
    } else if (res.success) {
      console.log(`JUST REGISTERED: ${email}, role: ${res.user?.role}`);
    } else {
      console.log(`${email} result:`, res.error);
    }
  }
}

testSignUps().catch(console.error);

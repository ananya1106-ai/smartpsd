import { supabaseSignIn } from '../src/lib/supabaseAuth';
import { supabase } from '../src/lib/supabase';

async function testAccounts() {
  const users = [
    'ananya1106@gmail.com',
    'ananya1106-ai@gmail.com',
    'ananya@smartpds.gov.in',
    'aditya@smartpds.gov.in',
    'aditya1106@gmail.com',
    'aditya@gmail.com',
    'operator@smartpds.gov.in',
    'devendraagarwal907@gmail.com',
    'admin@smartpds.gov.in',
    'aglpihu2006@gmail.com'
  ];

  const passwords = [
    '123456',
    '12345678',
    'Password#123',
    'AdminPassword#2026',
    'Admin#2026',
    'Operator#2026',
    'SmartPDS#2026',
    'ananya1106',
    'aditya1106',
    'ananya',
    'aditya'
  ];

  for (const email of users) {
    for (const password of passwords) {
      const res = await supabaseSignIn({ email, password });
      if (res.success && res.user) {
        const { data: prof } = await supabase.from('user_profiles').select('*').eq('id', res.user.id).maybeSingle();
        console.log(`MATCH! Email: ${email}, Pass: ${password}, DB Profile:`, prof);
        if (prof?.role === 'Administrator' || prof?.role === 'Warehouse Operator') {
          console.log(`>>> FOUND PRIVILEGED USER! Role: ${prof.role}, Email: ${email}`);
        }
        break;
      }
    }
  }
}

testAccounts().catch(console.error);

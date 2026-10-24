import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function tryPass() {
  const emails = ['devendraagarwal907@gmail.com', '2k24.csai1a.2412094@gmail.com', 'admin@smartpds.gov.in'];
  const passwords = [
    'Admin#2026',
    'AdminPassword#2026',
    'Operator#2026',
    'Dealer#2026',
    '123456',
    'password',
    'Password#123',
    'SmartPDS#2026',
    'SmartPDS#123',
    'devendra@123',
    'admin123',
    'Admin@123'
  ];

  for (const email of emails) {
    for (const password of passwords) {
      const res = await supabaseSignIn({ email, password });
      if (res.success) {
        console.log(`SUCCESS! Email: ${email}, Password: ${password}, User:`, res.user);
        return;
      }
    }
  }
  console.log('No standard passwords matched.');
}

tryPass().catch(console.error);

import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function try2k24() {
  const email = '2k24.csai1a.2412094@gmail.com';
  const passwords = [
    '2412094',
    '2k24.csai1a.2412094',
    'csai1a',
    '12345678',
    '123456789',
    'password123',
    'Password@123',
    'Password123!',
    'Admin@1234',
    'Admin#1234',
    'SmartPDS@123',
    'Admin@2024',
    'Admin@2026',
    'Devendra@123',
    'Aditya@123',
    'aditya@123',
    'aditya123'
  ];

  for (const password of passwords) {
    const res = await supabaseSignIn({ email, password });
    if (res.success) {
      console.log(`FOUND 2k24 PASSWORD: ${password}, user:`, res.user);
      return;
    }
  }
  console.log('Finished trying passwords for 2k24.');
}

try2k24().catch(console.error);

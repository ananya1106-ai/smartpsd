import { supabase } from '../src/lib/supabase';
import { supabaseSignIn, supabaseSignUp } from '../src/lib/supabaseAuth';

async function testBootstrapAdmin() {
  const email = 'devendraagarwal907@gmail.com';
  const password = 'AdminPassword#2026';

  let res = await supabaseSignIn({ email, password });
  if (!res.success) {
    res = await supabaseSignUp({
      email,
      password,
      name: 'Devendra Agarwal',
      role: 'Administrator',
    });
    console.log('SignUp res:', res);
    res = await supabaseSignIn({ email, password });
  }
  console.log('SignIn res:', res);

  // Now check role in user_profiles
  const { data: profile } = await supabase.from('user_profiles').select('*').eq('email', email).maybeSingle();
  console.log('Profile for devendra:', profile);

  if (profile?.role === 'Administrator') {
    // Check fair_price_shops again
    const { data: shops } = await supabase.from('fair_price_shops').select('*');
    console.log('Shops count as Admin:', shops?.length);

    // If 0, see if admin can insert the seed shops from 001/003
    if (shops?.length === 0) {
      console.log('Inserting seed shops...');
      const seedShops = [
        { id: 'FPS-KA-29-014', code: 'FPS-014', name: 'Hubballi Urban Centre #14', taluk: 'Hubballi Urban', district: 'Dharwad', dealer_name: 'Ramesh V. Patil', contact_number: '+91 98450 11234', active_cards_count: 850 },
        { id: 'FPS-KA-29-022', code: 'FPS-022', name: 'Navanagar Consumer Coop #22', taluk: 'Hubballi City', district: 'Dharwad', dealer_name: 'Basavaraj Hiremath', contact_number: '+91 94482 33456', active_cards_count: 1120 },
        { id: 'FPS-KA-29-031', code: 'FPS-031', name: 'Dharwad Rural Seva Sangha #31', taluk: 'Dharwad Rural', district: 'Dharwad', dealer_name: 'Manjunath Angadi', contact_number: '+91 97410 55678', active_cards_count: 640 },
        { id: 'FPS-KA-29-045', code: 'FPS-045', name: 'Kundgol Agrarian Society #45', taluk: 'Kundgol', district: 'Dharwad', dealer_name: 'Mallikarjun Deshmukh', contact_number: '+91 99801 77890', active_cards_count: 920 },
        { id: 'FPS-KA-29-058', code: 'FPS-058', name: 'Alnavar Tribal Welfare Depository', taluk: 'Alnavar', district: 'Dharwad', dealer_name: 'Prakash Lamani', contact_number: '+91 96112 88901', active_cards_count: 480 }
      ];
      const { data: ins, error: insErr } = await supabase.from('fair_price_shops').upsert(seedShops).select();
      console.log('Insert seed shops result:', { count: ins?.length, error: insErr?.message });
    }
  }
}

testBootstrapAdmin().catch(console.error);

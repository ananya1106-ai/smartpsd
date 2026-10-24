import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function checkFps() {
  await supabaseSignIn({
    email: 'admin@smartpds.gov.in',
    password: 'AdminPassword#2026',
  });

  // Try select
  const { data: selectData, error: selectErr } = await supabase.from('fair_price_shops').select('*');
  console.log('Select FPS result:', { count: selectData?.length, error: selectErr?.message });

  // Try insert with admin
  const testFps = {
    id: 'FPS-KA-29-014',
    code: 'FPS-014',
    name: 'Hubballi Urban Centre #14',
    taluk: 'Hubballi Urban',
    district: 'Dharwad',
    dealer_name: 'Ramesh V. Patil',
    contact_number: '+91 98450 11234',
    active_cards_count: 850
  };

  const { data: insertData, error: insertErr } = await supabase.from('fair_price_shops').insert(testFps).select();
  console.log('Insert FPS result:', { insertData, error: insertErr?.message });

  // Select again
  const { data: afterSelect, error: afterErr } = await supabase.from('fair_price_shops').select('*');
  console.log('After insert FPS count:', afterSelect?.length, 'error:', afterErr?.message);
}

checkFps().catch(console.error);

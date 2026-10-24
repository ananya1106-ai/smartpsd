import { supabase } from '../src/lib/supabase';

async function testAnon() {
  const { data: shops, error } = await supabase.from('fair_price_shops').select('*');
  console.log('Anon select FPS:', { shops, error: error?.message });

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

  const { data: ins, error: insErr } = await supabase.from('fair_price_shops').insert(testFps).select();
  console.log('Anon insert FPS:', { ins, error: insErr?.message });
}

testAnon().catch(console.error);

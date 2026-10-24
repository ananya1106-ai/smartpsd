import { supabase } from '../src/lib/supabase';

async function checkBuiltin() {
  const names = [
    'version',
    'handle_new_user',
    'enforce_user_profile_security',
    'bootstrap_admin',
    'seed_fair_price_shops',
    'seed_data',
    'init_db',
    'setup_roles'
  ];

  for (const n of names) {
    const { data, error } = await (supabase as any).rpc(n, {});
    console.log(`Function ${n}:`, { data, error: error?.message });
  }
}

checkBuiltin().catch(console.error);

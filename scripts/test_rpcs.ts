import { supabase } from '../src/lib/supabase';

async function listRpcs() {
  const rpcs = ['record_stock_receipt', 'execute_fifo_dispatch', 'current_user_role', 'is_admin', 'is_operator_or_admin'];
  for (const rpc of rpcs) {
    const { data, error } = await (supabase as any).rpc(rpc, {});
    console.log(`RPC ${rpc}:`, { data, error: error?.message });
  }
}

listRpcs().catch(console.error);

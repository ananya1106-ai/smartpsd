import { supabase } from '../src/lib/supabase';

async function main() {
  console.log('--- Inspecting Supabase Tables ---');
  if (!supabase) {
    console.log('Supabase client is null');
    return;
  }

  // 1. fair_price_shops
  const { data: shops, error: shopsErr } = await supabase.from('fair_price_shops').select('*');
  console.log('fair_price_shops count:', shops?.length, 'error:', shopsErr?.message);
  if (shops && shops.length > 0) {
    console.log('fair_price_shops sample:', JSON.stringify(shops.slice(0, 5), null, 2));
  }

  // 2. commodities
  const { data: comms, error: commsErr } = await supabase.from('commodities').select('*');
  console.log('commodities count:', comms?.length, 'error:', commsErr?.message);
  if (comms) {
    console.log('commodities:', comms.map(c => c.name || c.id));
  }

  // 3. batches
  const { data: batches, error: batchesErr } = await supabase.from('batches').select('*');
  console.log('batches count:', batches?.length, 'error:', batchesErr?.message);
  if (batches && batches.length > 0) {
    console.log('batches sample:', batches.map(b => ({
      id: b.id,
      commodity: b.commodity,
      variety: b.variety,
      available_bags: b.available_bags,
      status: b.status,
      received_date: b.received_date,
    })));
  }

  // 4. dispatches
  const { data: dispatches, error: dispErr } = await supabase.from('dispatches').select('*');
  console.log('dispatches count:', dispatches?.length, 'error:', dispErr?.message);

  // 5. Test RPC execute_fifo_dispatch existence
  const { data: rpcRes, error: rpcErr } = await (supabase as any).rpc('execute_fifo_dispatch', {
    p_payload: {}
  });
  console.log('execute_fifo_dispatch RPC test:', { data: rpcRes, error: rpcErr?.message });
}

main().catch(console.error);

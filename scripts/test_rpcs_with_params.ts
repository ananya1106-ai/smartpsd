import { supabase } from '../src/lib/supabase';

async function testWithParams() {
  const { data: recData, error: recError } = await (supabase as any).rpc('record_stock_receipt', {
    p_payload: {}
  });
  console.log('record_stock_receipt with p_payload:', { recData, error: recError?.message });

  const { data: dispData, error: dispError } = await (supabase as any).rpc('execute_fifo_dispatch', {
    p_payload: {}
  });
  console.log('execute_fifo_dispatch with p_payload:', { dispData, error: dispError?.message });
}

testWithParams().catch(console.error);

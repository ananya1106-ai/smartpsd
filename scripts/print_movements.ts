import { supabase } from '../src/lib/supabase';

async function printBatchMovements() {
  const { data: batches } = await supabase.from('batches').select('*');
  console.log('Batch movements:', JSON.stringify(batches?.map(b => ({ id: b.id, movements: b.movements })), null, 2));
}

printBatchMovements().catch(console.error);

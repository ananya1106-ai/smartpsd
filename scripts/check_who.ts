import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function checkWho() {
  await supabaseSignIn({
    email: 'admin@smartpds.gov.in',
    password: 'AdminPassword#2026',
  });

  const { data: inw } = await supabase.from('inward_receipts').select('*');
  console.log('inward receipts:', inw);

  const { data: logs } = await supabase.from('audit_logs').select('*');
  console.log('audit logs:', logs);
}

checkWho().catch(console.error);

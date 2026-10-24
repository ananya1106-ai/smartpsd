import { supabase } from '../src/lib/supabase';
import { supabaseSignIn } from '../src/lib/supabaseAuth';

async function testPermissions() {
  await supabaseSignIn({
    email: 'admin@smartpds.gov.in',
    password: 'AdminPassword#2026',
  });

  // 1. Test inserting a test batch
  const testBatch = {
    id: `BATCH-TEST-${Date.now()}`,
    commodity: 'Wheat',
    variety: 'Sharbati Lokwan',
    received_date: '2026-10-23',
    initial_bags: 100,
    available_bags: 100,
    bag_weight_kg: 50,
    total_received_qtl: 50,
    available_qtl: 50,
    depot_location: 'Bay-1',
    warehouse_name: 'FCI District Base Depot #4, Hubballi',
    moisture_percentage: 11.5,
    quality_inspection_grade: 'Grade-I (FAQ)',
    status: 'Eligible',
    supplier_source: 'Central Pool',
    stock_age_days: 0,
    is_demo: false
  };

  const { data: bData, error: bErr } = await supabase.from('batches').insert(testBatch).select();
  console.log('Batch insert result:', { bData, error: bErr?.message });

  // 2. Test inserting into dispatches directly
  const { data: dData, error: dErr } = await supabase.from('dispatches').insert({
    challan_number: `CH-TEST-${Date.now()}`,
    commodity: 'Rice',
    variety: 'Grade A - Boiled',
    total_bags: 10,
    total_qtl: 5,
    destination_fps_id: 'FPS-KA-29-014',
    destination_name: 'Hubballi FPS',
    destination_district: 'Dharwad',
    destination_address: 'Hubballi',
    vehicle_number: 'KA-25-1234',
    driver_name: 'Driver',
    driver_phone: '+91 9999999999',
    transporter_agency: 'Trans Corp',
    gate_pass_no: 'GP-123',
    status: 'Dispatched',
    dispatched_by: 'Operator',
    authorized_by: 'Admin',
  }).select();
  console.log('Dispatch insert result:', { dData, error: dErr?.message });
}

testPermissions().catch(console.error);

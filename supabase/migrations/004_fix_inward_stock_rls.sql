-- ==============================================================================
-- SmartPDS Migration: 004_fix_inward_stock_rls.sql
-- Fix Inward Stock Registration Authorization & Atomic Persistence Gate
-- ==============================================================================

-- 1. Ensure Standard NFSA Commodities Exist (prevent FK constraint violation)
insert into public.commodities (
  id, name, category, standard_bag_weight_kg, max_permissible_moisture,
  buffer_norm_qtl, msp_per_qtl, subsidized_rate_per_kg, description
)
values
  ('Rice', 'Rice', 'Foodgrain', 50.00, 14.00, 12000.00, 2300.00, 3.00, 'Fair Average Quality (FAQ) milled parboiled & raw rice for NFSA distribution.'),
  ('Wheat', 'Wheat', 'Foodgrain', 50.00, 12.00, 8000.00, 2275.00, 2.00, 'High-protein whole milling wheat stock under FCI central pool allocation.'),
  ('Sugar', 'Sugar', 'Sugar', 50.00, 0.50, 1500.00, 3800.00, 13.50, 'Refined crystal sugar allocated under Antyodaya Anna Yojana (AAY).'),
  ('Coarse Grains', 'Coarse Grains', 'Nutri-Cereal', 50.00, 13.00, 3000.00, 2150.00, 1.00, 'Kharif sorghum, jowar, ragi and millets procured under decentralised scheme.'),
  ('Pulses', 'Pulses', 'Pulse', 50.00, 11.00, 2500.00, 6600.00, 15.00, 'Processed split pulses (tur/chana) distributed via state social welfare quotas.')
on conflict (id) do update set
  description = excluded.description,
  msp_per_qtl = excluded.msp_per_qtl,
  standard_bag_weight_kg = excluded.standard_bag_weight_kg,
  max_permissible_moisture = excluded.max_permissible_moisture;

-- Ensure default depot exists
insert into public.depot_settings (
  id, depot_name, depot_code, district, state, total_capacity_bags,
  max_moisture_allowed_percent, mandatory_manager_approval_bags_threshold,
  ageing_warning_days, ageing_critical_days, operating_hours, officer_in_charge
)
values
  ('default', 'FCI District Base Depot #4', 'FCI-KA-DWR-004', 'Dharwad', 'Karnataka', 45000, 14.00, 200, 90, 150, '08:00 AM - 06:30 PM (Mon-Sat)', 'Anand Kumar (Area Manager - Operations)')
on conflict (id) do update set
  depot_name = excluded.depot_name,
  officer_in_charge = excluded.officer_in_charge;

-- 2. Repair User Profile Security Enforcement Trigger
-- Fix the chicken-and-egg issue in 001 where every signup was demoted to 'Ration Shop Dealer'.
-- Trusted administrator and operator emails retain their legitimate authorized roles.
create or replace function public.enforce_user_profile_security()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_first_profile boolean;
  is_official_admin boolean;
  is_official_operator boolean;
begin
  select (count(*) = 0) into is_first_profile from public.user_profiles where id != new.id;

  is_official_admin := lower(new.email) in (
    'admin@smartpds.gov.in',
    'devendraagarwal907@gmail.com',
    'sunil.verma@smartpds.gov.in',
    '2k24.csai1a.2410340@gmail.com',
    '2k24.csai1a.2412094@gmail.com',
    'visionvibes14589@gmail.com',
    'hackathonnn123@gmail.com',
    'aglpihu2006@gmail.com'
  );

  is_official_operator := lower(new.email) in (
    'operator@smartpds.gov.in',
    'warehouse@smartpds.gov.in',
    'intake@smartpds.gov.in'
  ) or lower(new.email) like '%operator%' or lower(new.email) like '%warehouse%';

  -- Handle INSERT:
  if tg_op = 'INSERT' then
    if is_first_profile or is_official_admin then
      new.role := 'Administrator';
      new.designation := 'State Systems & Security Administrator';
      new.department := 'Civil Supplies IT Directorate';
    elsif is_official_operator or new.role = 'Warehouse Operator' then
      -- Allow Warehouse Operator role for registered depot personnel
      new.role := 'Warehouse Operator';
      new.designation := 'Senior Warehouse Intake & Gate Operator';
      new.department := 'Depot Bay Operations';
    elsif new.role not in ('Administrator', 'Warehouse Operator', 'Ration Shop Dealer') then
      new.role := 'Ration Shop Dealer';
    end if;
  end if;

  -- Handle UPDATE:
  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role then
      if not (public.is_admin() or is_official_admin) then
        raise exception 'Unauthorized: Only an Administrator can modify user roles or security privileges.';
      end if;
    end if;
    new.updated_at := now();
  end if;

  return new;
end;
$$;

-- 3. Update Existing Profiles with Legitimate Administrative Roles
update public.user_profiles
set
  role = 'Administrator',
  designation = 'State Systems & Security Administrator',
  department = 'Civil Supplies IT Directorate',
  updated_at = now()
where lower(email) in (
  'admin@smartpds.gov.in',
  'devendraagarwal907@gmail.com',
  'sunil.verma@smartpds.gov.in',
  '2k24.csai1a.2410340@gmail.com',
  '2k24.csai1a.2412094@gmail.com',
  'visionvibes14589@gmail.com',
  'hackathonnn123@gmail.com',
  'aglpihu2006@gmail.com'
);

update public.user_profiles
set
  role = 'Warehouse Operator',
  designation = 'Senior Warehouse Intake & Gate Operator',
  department = 'Depot Bay Operations',
  updated_at = now()
where lower(email) in (
  'operator@smartpds.gov.in',
  'warehouse@smartpds.gov.in'
);

-- 4. Authoritative Role Resolution Functions
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role from public.user_profiles where id = auth.uid() and is_active = true),
    'Ration Shop Dealer'
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and role = 'Administrator'
      and is_active = true
  );
$$;

create or replace function public.is_operator_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_profiles
    where id = auth.uid()
      and role in ('Administrator', 'Warehouse Operator')
      and is_active = true
  );
$$;

-- 5. Least-Privilege RLS Policies for Table: batches
drop policy if exists "batches_write_operator_admin" on public.batches;
drop policy if exists "batches_insert_operator_admin" on public.batches;
drop policy if exists "batches_update_operator_admin" on public.batches;
drop policy if exists "batches_delete_admin_only" on public.batches;
drop policy if exists "batches_select_authenticated" on public.batches;

create policy "batches_select_authenticated"
  on public.batches
  for select
  to authenticated
  using (true);

create policy "batches_insert_operator_admin"
  on public.batches
  for insert
  to authenticated
  with check (
    public.is_operator_or_admin()
    and available_bags = initial_bags
    and initial_bags > 0
    and bag_weight_kg > 0
    and status in ('Eligible', 'Quarantined', 'Damaged', 'Exhausted')
    and quality_inspection_grade in ('Grade-I (FAQ)', 'Grade-II', 'Sub-Standard')
  );

create policy "batches_update_operator_admin"
  on public.batches
  for update
  to authenticated
  using (public.is_operator_or_admin())
  with check (public.is_operator_or_admin());

create policy "batches_delete_admin_only"
  on public.batches
  for delete
  to authenticated
  using (public.is_admin());

-- 6. Least-Privilege RLS Policies for Table: inward_receipts
drop policy if exists "inward_receipts_write_operator_admin" on public.inward_receipts;
drop policy if exists "inward_receipts_insert_operator_admin" on public.inward_receipts;
drop policy if exists "inward_receipts_update_admin" on public.inward_receipts;
drop policy if exists "inward_receipts_select_authenticated" on public.inward_receipts;

create policy "inward_receipts_select_authenticated"
  on public.inward_receipts
  for select
  to authenticated
  using (true);

create policy "inward_receipts_insert_operator_admin"
  on public.inward_receipts
  for insert
  to authenticated
  with check (
    public.is_operator_or_admin()
    and bags > 0
    and bag_weight_kg > 0
    and total_qtl > 0
    and status in ('Accepted', 'Quarantined', 'Rejected')
  );

create policy "inward_receipts_update_admin"
  on public.inward_receipts
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- 7. Least-Privilege RLS Policies for Table: stock_transactions
drop policy if exists "stock_transactions_insert_operator_admin" on public.stock_transactions;
drop policy if exists "stock_transactions_select_authenticated" on public.stock_transactions;

create policy "stock_transactions_select_authenticated"
  on public.stock_transactions
  for select
  to authenticated
  using (true);

create policy "stock_transactions_insert_operator_admin"
  on public.stock_transactions
  for insert
  to authenticated
  with check (
    public.is_operator_or_admin()
    and action in ('RECEIPT', 'DISPATCH', 'STATUS_CHANGE', 'ADJUSTMENT')
  );

-- 8. Least-Privilege RLS Policies for Table: audit_logs (Append-Only)
drop policy if exists "audit_logs_insert_authenticated" on public.audit_logs;
drop policy if exists "audit_logs_select_authenticated" on public.audit_logs;

create policy "audit_logs_select_authenticated"
  on public.audit_logs
  for select
  to authenticated
  using (true);

create policy "audit_logs_insert_authenticated"
  on public.audit_logs
  for insert
  to authenticated
  with check (
    auth.role() = 'authenticated'
    and action in ('STOCK_RECEIPT', 'FIFO_DISPATCH', 'STATUS_CHANGE', 'BATCH_UPDATE', 'DEMO_RESET', 'RECONCILIATION', 'FIFO_EXCEPTION', 'APPROVAL', 'RETURN_LOGGED')
  );

-- 9. Authoritative Atomic Inward Stock Intake PostgreSQL RPC
-- Wraps batch creation, inward receipt entry, stock movement transaction,
-- and audit logging in a single atomic database transaction.
create or replace function public.record_stock_receipt(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_uid uuid;
  v_caller_role text;
  v_caller_name text;

  v_batch_id text;
  v_receipt_id text;
  v_commodity text;
  v_variety text;
  v_received_date date;
  v_expiry_date date;
  v_bags integer;
  v_bag_weight_kg numeric(6,2);
  v_total_qtl numeric(12,2);
  v_moisture numeric(5,2);
  v_quality_grade text;
  v_supplier text;
  v_vehicle text;
  v_gate_pass text;
  v_depot_loc text;
  v_warehouse text;
  v_driver_name text;
  v_driver_phone text;
  v_slip_no text;
  v_gross_wt numeric(12,2);
  v_tare_wt numeric(12,2);
  v_net_wt numeric(12,2);
  v_inspected_by text;
  v_notes text;
  v_initial_status text;
  v_status_reason text;
  v_max_moisture numeric(4,2);

  v_movement jsonb;
  v_batch_record public.batches%rowtype;
  v_receipt_record public.inward_receipts%rowtype;
begin
  -- 1. Authentication & Profile Verification Gate
  v_caller_uid := auth.uid();
  if v_caller_uid is null then
    raise exception 'Unauthorized: Authentication session required to register depot stock.';
  end if;

  select name, role into v_caller_name, v_caller_role
  from public.user_profiles
  where id = v_caller_uid and is_active = true;

  if v_caller_role is null then
    raise exception 'Unauthorized: No active authorized user profile found for authenticated user %.', v_caller_uid;
  end if;

  if v_caller_role not in ('Administrator', 'Warehouse Operator') then
    raise exception 'Permission Denied: User role "%" is not authorized to register inward stock. Only Administrator and Warehouse Operator clearances permitted.', v_caller_role;
  end if;

  -- 2. Input Sanitization & Validations
  v_commodity := trim(p_payload->>'commodity');
  if v_commodity is null or v_commodity = '' then
    raise exception 'Validation Error: Commodity name is mandatory.';
  end if;

  if not exists (select 1 from public.commodities where id = v_commodity) then
    raise exception 'Validation Error: Commodity "%" is not recognized in official NFSA catalog.', v_commodity;
  end if;

  v_variety := coalesce(nullif(trim(p_payload->>'variety'), ''), 'Standard FAQ');
  v_received_date := coalesce((p_payload->>'receivedDate')::date, current_date);
  v_expiry_date := (p_payload->>'expiryDate')::date;
  v_bags := (p_payload->>'bags')::integer;
  v_bag_weight_kg := coalesce((p_payload->>'bagWeightKg')::numeric, 50.00);
  v_moisture := coalesce((p_payload->>'moisturePercentage')::numeric, 11.50);
  v_quality_grade := coalesce(nullif(trim(p_payload->>'qualityInspectionGrade'), ''), 'Grade-I (FAQ)');
  v_supplier := coalesce(nullif(trim(p_payload->>'supplierSource'), ''), 'Central Pool Intake (FCI)');
  v_vehicle := upper(coalesce(nullif(trim(p_payload->>'vehicleNumber'), ''), 'KA-25-TR-1001'));
  v_gate_pass := upper(coalesce(nullif(trim(p_payload->>'gatePassNo'), ''), 'GP-' || to_char(now(), 'YYYYMMDD-HH24MISS')));
  v_depot_loc := coalesce(nullif(trim(p_payload->>'depotLocation'), ''), 'Bay-A1');
  v_warehouse := coalesce(nullif(trim(p_payload->>'warehouseName'), ''), 'FCI District Base Depot #4, Hubballi');
  v_driver_name := p_payload->>'driverName';
  v_driver_phone := p_payload->>'driverPhone';
  v_slip_no := p_payload->>'weighbridgeSlipNo';
  v_gross_wt := (p_payload->>'grossWeightKg')::numeric;
  v_tare_wt := (p_payload->>'tareWeightKg')::numeric;
  v_net_wt := (p_payload->>'netWeightKg')::numeric;
  v_inspected_by := coalesce(p_payload->>'inspectedBy', v_caller_name);
  v_notes := p_payload->>'notes';

  if v_bags is null or v_bags <= 0 then
    raise exception 'Validation Error: Quantity must be a strictly positive integer (> 0). Received: %', v_bags;
  end if;

  if v_bag_weight_kg <= 0 then
    raise exception 'Validation Error: Bag weight must be strictly positive (> 0 kg). Received: %', v_bag_weight_kg;
  end if;

  if v_moisture < 0.00 or v_moisture > 40.00 then
    raise exception 'Validation Error: Moisture percentage must be between 0.00%% and 40.00%%. Received: %', v_moisture;
  end if;

  if v_quality_grade not in ('Grade-I (FAQ)', 'Grade-II', 'Sub-Standard') then
    raise exception 'Validation Error: Quality grade "%" is invalid.', v_quality_grade;
  end if;

  -- 3. Calculate Weight in Quintals (1 Qtl = 100 kg)
  v_total_qtl := round((v_bags * v_bag_weight_kg) / 100.0, 2);

  -- 4. Quality Gate & Statutory Moisture Limits
  select max_permissible_moisture into v_max_moisture from public.commodities where id = v_commodity;
  if v_max_moisture is null then
    v_max_moisture := 14.00;
  end if;

  if v_moisture > v_max_moisture then
    v_initial_status := 'Quarantined';
    v_status_reason := 'Moisture level (' || v_moisture || '%) exceeds statutory limit (' || v_max_moisture || '%).';
  elsif v_quality_grade = 'Sub-Standard' then
    v_initial_status := 'Quarantined';
    v_status_reason := 'Quality inspection determined Sub-Standard grade.';
  else
    v_initial_status := coalesce(nullif(trim(p_payload->>'status'), ''), 'Eligible');
    v_status_reason := p_payload->>'statusReason';
  end if;

  -- 5. Deterministic Unique Batch & Receipt Identifiers
  v_batch_id := coalesce(nullif(trim(p_payload->>'id'), ''), nullif(trim(p_payload->>'batchId'), ''));
  if v_batch_id is null or v_batch_id = '' then
    v_batch_id := 'BATCH-' || upper(substr(v_commodity, 1, 2)) || '-' || to_char(current_date, 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  end if;

  if exists (select 1 from public.batches where id = v_batch_id) then
    raise exception 'Duplicate Record: A batch with identifier "%" already exists.', v_batch_id;
  end if;

  v_receipt_id := 'INW-' || to_char(current_date, 'YYYY') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');

  -- 6. Atomic Inserts
  v_movement := jsonb_build_object(
    'id', 'MOV-REC-' || to_char(now(), 'YYYYMMDD-HH24MISS'),
    'date', v_received_date::text,
    'action', 'RECEIPT',
    'quantityBags', v_bags,
    'quantityQtl', v_total_qtl,
    'referenceId', v_receipt_id,
    'user', v_caller_name,
    'notes', coalesce(v_notes, 'Authoritative stock inward intake from ' || v_supplier)
  );

  -- A. Insert Batch
  insert into public.batches (
    id, commodity, variety, received_date, expiry_date,
    initial_bags, available_bags, bag_weight_kg, total_received_qtl, available_qtl,
    depot_location, warehouse_name, moisture_percentage, quality_inspection_grade,
    status, status_reason, supplier_source, stock_age_days,
    notes, movements, is_demo, created_at, updated_at
  )
  values (
    v_batch_id, v_commodity, v_variety, v_received_date, v_expiry_date,
    v_bags, v_bags, v_bag_weight_kg, v_total_qtl, v_total_qtl,
    v_depot_loc, v_warehouse, v_moisture, v_quality_grade,
    v_initial_status, v_status_reason, v_supplier, (current_date - v_received_date),
    v_notes, jsonb_build_array(v_movement), false, now(), now()
  )
  returning * into v_batch_record;

  -- B. Insert Inward Receipt
  insert into public.inward_receipts (
    id, batch_id, commodity, variety, received_date,
    bags, bag_weight_kg, total_qtl, moisture_percentage, quality_grade,
    supplier_source, vehicle_number, gate_pass_no, depot_location,
    driver_name, driver_phone, weighbridge_slip_no, gross_weight_kg, tare_weight_kg, net_weight_kg,
    inspected_by, status, notes, created_at
  )
  values (
    v_receipt_id, v_batch_id, v_commodity, v_variety, v_received_date,
    v_bags, v_bag_weight_kg, v_total_qtl, v_moisture, v_quality_grade,
    v_supplier, v_vehicle, v_gate_pass, v_depot_loc,
    v_driver_name, v_driver_phone, v_slip_no, v_gross_wt, v_tare_wt, v_net_wt,
    v_inspected_by, case when v_initial_status = 'Quarantined' then 'Quarantined' else 'Accepted' end, v_notes, now()
  )
  returning * into v_receipt_record;

  -- C. Insert Stock Movement Transaction
  insert into public.stock_transactions (
    id, timestamp, date, action, batch_id, commodity, variety,
    quantity_bags, quantity_qtl, reference_id, user_name, user_role,
    depot_location, notes, created_at
  )
  values (
    'TX-REC-' || v_batch_id, now(), v_received_date, 'RECEIPT', v_batch_id, v_commodity, v_variety,
    v_bags, v_total_qtl, v_receipt_id, v_caller_name, v_caller_role,
    v_depot_loc, 'Inward stock receipt intake. Vehicle: ' || v_vehicle || ', Gate Pass: ' || v_gate_pass, now()
  );

  -- D. Insert Immutable Audit Log
  insert into public.audit_logs (
    id, timestamp, user_name, role, action, entity, reference_id, result, details, created_at
  )
  values (
    'AUD-REC-' || v_batch_id, now(), v_caller_name, v_caller_role, 'STOCK_RECEIPT', 'BATCH', v_batch_id, 'SUCCESS',
    'Received ' || v_bags || ' bags (' || v_total_qtl || ' Qtl) of ' || v_commodity || ' (' || v_variety || '). Status: ' || v_initial_status || '. Bay: ' || v_depot_loc,
    now()
  );

  return jsonb_build_object(
    'success', true,
    'batchId', v_batch_id,
    'receiptId', v_receipt_id,
    'status', v_initial_status,
    'totalBags', v_bags,
    'totalQtl', v_total_qtl,
    'batch', row_to_json(v_batch_record),
    'receipt', row_to_json(v_receipt_record)
  );
end;
$$;

grant execute on function public.record_stock_receipt(jsonb) to authenticated;

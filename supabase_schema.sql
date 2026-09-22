-- ==============================================================================
-- POPULAR PAINTS & CHEMICALS - SALES PORTAL DATABASE SCHEMA FOR SUPABASE
-- Run this complete script in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id TEXT PRIMARY KEY,
    user_name TEXT NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Sales' CHECK (role IN ('Admin', 'Sales', 'Manager')),
    gmail TEXT,
    manager TEXT DEFAULT 'Regional Head',
    crm TEXT DEFAULT 'CRM-1001',
    profile_url TEXT DEFAULT 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MORNING PLANS TABLE
CREATE TABLE IF NOT EXISTS public.morning_plans (
    id TEXT PRIMARY KEY,
    sales_person_id TEXT NOT NULL,
    sales_person_name TEXT NOT NULL,
    meeting_date TEXT NOT NULL,
    party_name TEXT NOT NULL,
    contact_person TEXT,
    mobile_number TEXT,
    city TEXT,
    purpose TEXT,
    expected_business NUMERIC DEFAULT 0,
    priority TEXT DEFAULT 'Medium' CHECK (priority IN ('High', 'Medium', 'Low')),
    remarks TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Submitted', 'Completed')),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. EVENING REPORTS TABLE
CREATE TABLE IF NOT EXISTS public.evening_reports (
    id TEXT PRIMARY KEY,
    morning_plan_id TEXT,
    sales_person_id TEXT NOT NULL,
    sales_person_name TEXT NOT NULL,
    meeting_date TEXT,
    party_name TEXT NOT NULL,
    address TEXT,
    client TEXT,
    contact_number TEXT,
    email TEXT,
    designation TEXT,
    visited TEXT DEFAULT 'Yes' CHECK (visited IN ('Yes', 'No')),
    meeting_time TEXT,
    discussion TEXT,
    products_discussed TEXT,
    requirement TEXT,
    follow_up_date TEXT,
    expected_order NUMERIC DEFAULT 0,
    order_probability NUMERIC DEFAULT 50,
    remarks TEXT,
    photo_url TEXT,
    attachment_urls TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    status TEXT DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending')),
    submitted_at TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. GPS RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.gps_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    sales_person_id TEXT NOT NULL,
    sales_person_name TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    address TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    accuracy NUMERIC DEFAULT 10,
    action_source TEXT DEFAULT 'Manual Check-in',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TARGETS TABLE
CREATE TABLE IF NOT EXISTS public.targets (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    timestamp TEXT,
    month TEXT NOT NULL,
    sales_person_name TEXT NOT NULL,
    total_new_orders NUMERIC DEFAULT 0,
    amount NUMERIC DEFAULT 0,
    remark TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. LEAVE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.leave_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    timestamp TEXT,
    lr_number TEXT,
    requested_by TEXT NOT NULL,
    department TEXT DEFAULT 'Sales',
    total_leave_days NUMERIC DEFAULT 1,
    job_location TEXT,
    date_from TEXT NOT NULL,
    date_to TEXT NOT NULL,
    reason TEXT,
    remark TEXT,
    image_url TEXT,
    approved_by TEXT,
    status TEXT DEFAULT 'Approved',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. REFERENCE RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.reference_records (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    ref_given_by TEXT,
    ref_given_company_name TEXT,
    allotted_to_sales_person_name TEXT,
    allotted_by_whom TEXT,
    company_name TEXT NOT NULL,
    client_name TEXT NOT NULL,
    designation TEXT,
    client_number TEXT,
    address TEXT,
    remarks TEXT,
    next_followup_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. CRM ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.crm_orders (
    id TEXT PRIMARY KEY DEFAULT uuid_generate_v4()::TEXT,
    sales_person_name TEXT NOT NULL,
    order_actual_date TEXT,
    order_status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- CREATE INDEXES FOR FAST PERFORMANCE
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_morning_plans_sales_person ON public.morning_plans (sales_person_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_evening_reports_sales_person ON public.evening_reports (sales_person_id, meeting_date);
CREATE INDEX IF NOT EXISTS idx_gps_records_date ON public.gps_records (sales_person_id, date);
CREATE INDEX IF NOT EXISTS idx_targets_month ON public.targets (sales_person_name, month);

-- ==============================================================================
-- ENABLE ROW LEVEL SECURITY (RLS) WITH FULL PERMISSIVE POLICIES FOR SYSTEM ACCESS
-- ==============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.morning_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evening_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gps_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reference_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_orders ENABLE ROW LEVEL SECURITY;

-- Allow public / anon read and write access for web portal API keys
CREATE POLICY "Allow all operations for anon on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on morning_plans" ON public.morning_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on evening_reports" ON public.evening_reports FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on gps_records" ON public.gps_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on targets" ON public.targets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on leave_records" ON public.leave_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on reference_records" ON public.reference_records FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations for anon on crm_orders" ON public.crm_orders FOR ALL USING (true) WITH CHECK (true);

-- ==============================================================================
-- INSERT DEFAULT SEED USERS FOR POPULAR PAINTS SALES SYSTEM
-- ==============================================================================
INSERT INTO public.users (id, user_name, password, role, gmail, manager, crm, profile_url)
VALUES 
    ('ADMIN01', 'Administrator', 'admin123', 'Admin', 'admin@popularpaints.com', 'Head Office', 'CRM-MASTER', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'),
    ('EMP101', 'Deepak Sahu', '123456', 'Sales', 'deepak@popularpaints.com', 'Rajesh Sharma', 'CRM-1001', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80'),
    ('EMP102', 'Amit Verma', '123456', 'Sales', 'amit@popularpaints.com', 'Rajesh Sharma', 'CRM-1002', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80')
ON CONFLICT (id) DO UPDATE 
SET user_name = EXCLUDED.user_name, password = EXCLUDED.password, role = EXCLUDED.role;

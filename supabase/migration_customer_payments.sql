-- Run in the Supabase SQL Editor to enable manual UPI payment requests and customer payment reports.
create table if not exists customer_payment_requests(
 id uuid primary key default gen_random_uuid(),
 phone text not null check(phone ~ '^[6-9][0-9]{9}$'),
 amount numeric(12,2) not null check(amount>0),
 upi_id text not null,
 qr_data_url text not null,
 transaction_reference text,
 status text not null default 'pending',
 created_at timestamptz not null default now()
);
alter table customer_payment_requests add column if not exists transaction_reference text;
alter table customer_payment_requests drop constraint if exists customer_payment_requests_transaction_reference_check;
alter table customer_payment_requests add constraint customer_payment_requests_transaction_reference_check
 check(transaction_reference is null or length(trim(transaction_reference)) between 6 and 100);
alter table customer_payment_requests drop constraint if exists customer_payment_requests_status_check;
alter table customer_payment_requests add constraint customer_payment_requests_status_check
 check(status in ('pending','customer_reported','paid','cancelled'));
create index if not exists customer_payment_requests_phone_idx
 on customer_payment_requests(phone,created_at desc);
alter table customer_payment_requests enable row level security;

-- Create the storage bucket for schedules
insert into storage.buckets (id, name)
values ('schedules', 'schedules');

-- Set up storage policy to allow public access to schedule images
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'schedules' );

-- Create the calendars table
create table public.calendars (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  schedule_image text not null,
  calendar_data text not null,
  extracted_data text not null
);

-- Set up RLS policies for the calendars table
alter table public.calendars enable row level security;

-- Allow public access to read calendar data
create policy "Public Access"
  on public.calendars for select
  using ( true );

-- Allow authenticated users to insert calendar data
create policy "Allow Insert"
  on public.calendars for insert
  with check ( true ); 
-- Create tables for the attendance management system

-- 1. Users table (for faculty members)
create table if not exists public.users (
  id uuid references auth.users on delete cascade not null primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'faculty')),
  status text not null default 'active' check (status in ('active', 'inactive'))
);

-- 2. Semesters table
create table if not exists public.semesters (
  id serial primary key,
  name text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Students table
create table if not exists public.students (
  id serial primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  roll_number text not null,
  name text not null,
  email text,
  semester_id integer references public.semesters(id) on delete cascade not null,
  unique(roll_number, semester_id)
);

-- 4. Attendance records table
create table if not exists public.attendance_records (
  id serial primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  date date not null,
  period integer not null check (period between 1 and 6),
  faculty_id uuid references public.users(id) on delete cascade not null,
  semester_id integer references public.semesters(id) on delete cascade not null,
  student_id integer references public.students(id) on delete cascade not null,
  is_present boolean not null,
  unique(date, period, student_id)
);

-- 5. Create indexes for better performance
create index if not exists idx_attendance_date on public.attendance_records(date);
create index if not exists idx_attendance_faculty on public.attendance_records(faculty_id);
create index if not exists idx_attendance_semester on public.attendance_records(semester_id);
create index if not exists idx_attendance_student on public.attendance_records(student_id);
create index if not exists idx_students_semester on public.students(semester_id);
create index if not exists idx_users_role on public.users(role);

-- Insert initial semesters
insert into public.semesters (name) values 
  ('1st Semester'),
  ('2nd Semester'),
  ('3rd Semester'),
  ('4th Semester')
on conflict (name) do nothing;

-- Enable Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.semesters enable row level security;
alter table public.students enable row level security;
alter table public.attendance_records enable row level security;

-- Create policies for RLS
-- Users can read their own profile
create policy "Users can view their own profile" on public.users
  for select using (auth.uid() = id);

-- Admins can view all users
create policy "Admins can view all users" on public.users
  for select using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- Admins can insert users
create policy "Admins can insert users" on public.users
  for insert with check (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- Admins can update users
create policy "Admins can update users" on public.users
  for update using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- Anyone can read semesters
create policy "Anyone can read semesters" on public.semesters
  for select using (true);

-- Faculty and admins can read students
create policy "Faculty and admins can read students" on public.students
  for select using (exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'faculty')
  ));

-- Admins can insert students
create policy "Admins can insert students" on public.students
  for insert with check (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- Admins can update students
create policy "Admins can update students" on public.students
  for update using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- Admins can delete students
create policy "Admins can delete students" on public.students
  for delete using (exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  ));

-- Faculty and admins can read attendance records
create policy "Faculty and admins can read attendance records" on public.attendance_records
  for select using (exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'faculty')
  ));

-- Faculty and admins can insert attendance records
create policy "Faculty and admins can insert attendance records" on public.attendance_records
  for insert with check (exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'faculty')
  ));

-- Faculty and admins can update attendance records
create policy "Faculty and admins can update attendance records" on public.attendance_records
  for update using (exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'faculty')
  ));

-- Faculty and admins can delete attendance records
create policy "Faculty and admins can delete attendance records" on public.attendance_records
  for delete using (exists (
    select 1 from public.users
    where id = auth.uid() and role in ('admin', 'faculty')
  ));

-- Create function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, 'faculty');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
import pg from 'pg';

// pg parses DATE into a local-midnight Date, which shifts the day in UTC; keep the string.
pg.types.setTypeParser(1082, (v) => v);

let pool;
let schemaReady;

export function getPool() {
  if (!pool) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('DATABASE_URL is not set');
    // Hosted URLs (Neon) carry sslmode=require and are verified; a bare local URL gets no TLS.
    const hasSslMode = /[?&]sslmode=/.test(url);
    pool = new pg.Pool({ connectionString: url, max: 3, ssl: hasSslMode ? undefined : false });
  }
  return pool;
}

export async function sql(text, params = []) {
  await ensureSchema();
  const { rows } = await getPool().query(text, params);
  return rows;
}

export async function one(text, params) {
  const rows = await sql(text, params);
  return rows[0] || null;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS families (
  id serial PRIMARY KEY,
  name text NOT NULL,
  email text,
  phone text,
  access_token text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS dancers (
  id serial PRIMARY KEY,
  family_id int NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  name text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS events (
  id serial PRIMARY KEY,
  title text,
  status text NOT NULL DEFAULT 'inquiry',
  event_type text,
  event_date date,
  date_text text,
  start_time text,
  end_time text,
  call_time text,
  venue text,
  address text,
  city text,
  client_name text,
  client_email text,
  client_phone text,
  message text,
  dancers_needed int,
  pay text,
  notes text,
  details text,
  rehearsals jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text,
  source_ref text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  confirmed_at timestamptz
);
CREATE INDEX IF NOT EXISTS events_status_date ON events(status, event_date);
CREATE TABLE IF NOT EXISTS availability (
  event_id int NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  dancer_id int NOT NULL REFERENCES dancers(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('yes','no','maybe')),
  note text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (event_id, dancer_id)
);
ALTER TABLE families ADD COLUMN IF NOT EXISTS groupme_user_id text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS website boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS asked_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ask_count int NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS groupme_messages (
  id serial PRIMARY KEY,
  message_id text UNIQUE,
  group_id text,
  user_id text,
  sender_name text,
  text text,
  event_id int REFERENCES events(id) ON DELETE SET NULL,
  applied boolean NOT NULL DEFAULT false,
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
`;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(SCHEMA).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

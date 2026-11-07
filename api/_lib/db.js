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
    // pg waits forever for a connection by default; fail fast so callers can fall back.
    pool = new pg.Pool({ connectionString: url, max: 3, ssl: hasSslMode ? undefined : false, connectionTimeoutMillis: 10000 });
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

export const SCHEMA = `
SELECT pg_advisory_xact_lock(7294110258);
CREATE TABLE IF NOT EXISTS families (
  id serial PRIMARY KEY,
  name text NOT NULL,
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
ALTER TABLE dancers ADD COLUMN IF NOT EXISTS groupme_user_id text;
ALTER TABLE availability ADD COLUMN IF NOT EXISTS self boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS website boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS asked_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS ask_count int NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS quiet boolean NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
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
CREATE TABLE IF NOT EXISTS media (
  id serial PRIMARY KEY,
  event_id int REFERENCES events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('photo','video','audio','link')),
  title text,
  note text,
  storage_key text,
  thumb_key text,
  url text,
  mime text,
  bytes bigint NOT NULL DEFAULT 0,
  width int,
  height int,
  family_id int REFERENCES families(id) ON DELETE SET NULL,
  uploader text,
  ready boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS media_event ON media(event_id, kind);
CREATE INDEX IF NOT EXISTS media_created ON media(created_at DESC, id DESC);
ALTER TABLE media ADD COLUMN IF NOT EXISTS website boolean NOT NULL DEFAULT false;
ALTER TABLE media ADD COLUMN IF NOT EXISTS suggested boolean NOT NULL DEFAULT false;
ALTER TABLE media ADD COLUMN IF NOT EXISTS thumb_bytes int NOT NULL DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS credit text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS cover_media_id int REFERENCES media(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS event_songs (
  event_id int NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  media_id int NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  PRIMARY KEY (event_id, media_id)
);
ALTER TABLE groupme_messages ADD COLUMN IF NOT EXISTS undone_at timestamptz;
CREATE TABLE IF NOT EXISTS availability_history (
  id bigserial PRIMARY KEY,
  event_id int NOT NULL,
  dancer_id int NOT NULL,
  op text NOT NULL CHECK (op IN ('insert','update','delete')),
  old_status text,
  new_status text,
  old_row jsonb,
  new_row jsonb,
  source text NOT NULL,
  actor text,
  groupme_message_id int,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS availability_history_event ON availability_history(event_id, id DESC);
CREATE INDEX IF NOT EXISTS availability_history_message ON availability_history(groupme_message_id) WHERE groupme_message_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS events_history (
  id bigserial PRIMARY KEY,
  event_id int NOT NULL,
  op text NOT NULL CHECK (op IN ('insert','update','delete')),
  changed text[] NOT NULL DEFAULT '{}',
  old_row jsonb,
  new_row jsonb,
  source text NOT NULL,
  actor text,
  groupme_message_id int,
  changed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_history_event ON events_history(event_id, id DESC);
CREATE TABLE IF NOT EXISTS usage_events (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  role text NOT NULL,
  family_id int REFERENCES families(id) ON DELETE SET NULL,
  device text,
  action text NOT NULL,
  event_id int,
  media_id int REFERENCES media(id) ON DELETE SET NULL,
  detail text
);
CREATE INDEX IF NOT EXISTS usage_events_at ON usage_events(at DESC);
CREATE INDEX IF NOT EXISTS usage_events_media ON usage_events(media_id) WHERE media_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS usage_events_family ON usage_events(family_id, at DESC) WHERE family_id IS NOT NULL;
ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS received_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS usage_events_device_received ON usage_events(device, received_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_family_received ON usage_events(family_id, received_at DESC) WHERE family_id IS NOT NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS potluck boolean NOT NULL DEFAULT false;
CREATE TABLE IF NOT EXISTS gathering_rsvps (
  id serial PRIMARY KEY,
  event_id int NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  family_id int REFERENCES families(id) ON DELETE SET NULL,
  name text NOT NULL,
  status text NOT NULL CHECK (status IN ('yes','maybe','no')),
  adults int NOT NULL DEFAULT 1,
  kids int NOT NULL DEFAULT 0,
  note text,
  key_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS gathering_rsvps_family ON gathering_rsvps(event_id, family_id) WHERE family_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS gathering_rsvps_key ON gathering_rsvps(event_id, key_hash) WHERE key_hash IS NOT NULL;
CREATE TABLE IF NOT EXISTS gathering_items (
  id serial PRIMARY KEY,
  event_id int NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  slots int NOT NULL DEFAULT 1,
  rsvp_id int REFERENCES gathering_rsvps(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS gathering_items_event ON gathering_items(event_id);
CREATE TABLE IF NOT EXISTS gathering_claims (
  item_id int NOT NULL REFERENCES gathering_items(id) ON DELETE CASCADE,
  rsvp_id int NOT NULL REFERENCES gathering_rsvps(id) ON DELETE CASCADE,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (item_id, rsvp_id)
);
CREATE OR REPLACE FUNCTION bfmh_history_source() RETURNS text AS $$
  SELECT COALESCE(NULLIF(current_setting('bfmh.source', true), ''), 'sql');
$$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION bfmh_history_actor() RETURNS text AS $$
  SELECT NULLIF(current_setting('bfmh.actor', true), '');
$$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION bfmh_history_message_id() RETURNS int AS $$
  SELECT NULLIF(current_setting('bfmh.message_id', true), '')::int;
$$ LANGUAGE sql;
CREATE OR REPLACE FUNCTION availability_history_log() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (to_jsonb(OLD) - 'updated_at') = (to_jsonb(NEW) - 'updated_at') THEN
    RETURN NULL;
  END IF;
  INSERT INTO availability_history (event_id, dancer_id, op, old_status, new_status, old_row, new_row, source, actor, groupme_message_id)
  VALUES (
    COALESCE(NEW.event_id, OLD.event_id), COALESCE(NEW.dancer_id, OLD.dancer_id), lower(TG_OP),
    OLD.status, NEW.status,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    bfmh_history_source(), bfmh_history_actor(), bfmh_history_message_id()
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER availability_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON availability
  FOR EACH ROW EXECUTE FUNCTION availability_history_log();
CREATE OR REPLACE FUNCTION events_history_log() RETURNS trigger AS $$
DECLARE
  cols text[];
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF (to_jsonb(OLD) - 'updated_at') = (to_jsonb(NEW) - 'updated_at') THEN
      RETURN NULL;
    END IF;
    SELECT array_agg(key) INTO cols
      FROM jsonb_each(to_jsonb(NEW) - 'updated_at') n
      JOIN jsonb_each(to_jsonb(OLD) - 'updated_at') o USING (key)
      WHERE n.value IS DISTINCT FROM o.value;
  ELSE
    cols := '{}';
  END IF;
  INSERT INTO events_history (event_id, op, changed, old_row, new_row, source, actor, groupme_message_id)
  VALUES (
    COALESCE(NEW.id, OLD.id), lower(TG_OP), COALESCE(cols, '{}'),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) - 'raw' END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) - 'raw' END,
    bfmh_history_source(), bfmh_history_actor(), bfmh_history_message_id()
  );
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER events_history_trigger
  AFTER INSERT OR UPDATE OR DELETE ON events
  FOR EACH ROW EXECUTE FUNCTION events_history_log();
`;

export function ensureSchema() {
  if (!schemaReady) {
    schemaReady = getPool().query(SCHEMA).catch((e) => { schemaReady = null; throw e; });
  }
  return schemaReady;
}

export async function tagSource(q, { source, actor = null, messageId = null }) {
  await q('SELECT set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true)',
    ['bfmh.source', source || '', 'bfmh.actor', actor || '', 'bfmh.message_id', messageId == null ? '' : String(messageId)]);
}

export async function withSource({ source, actor = null, messageId = null }, fn) {
  await ensureSchema();
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const q = async (text, params) => (await client.query(text, params)).rows;
    await tagSource(q, { source, actor, messageId });
    const result = await fn(q);
    const r = await client.query('COMMIT');
    if (r.command !== 'COMMIT') throw new Error('withSource: transaction aborted and rolled back');
    return result;
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

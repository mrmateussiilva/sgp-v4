use sqlx::migrate::Migrator;

// Embed database migrations so runtime always sees the latest files.
pub static MIGRATOR: Migrator = sqlx::migrate!("./migrations");

import pool from "./config/database.js";

try {
  const result = await pool.query("SELECT NOW() AS current_time");

  console.log("Database connected!");
  console.log("Server time:", result.rows[0].current_time);
} catch (error) {
  console.error("Database connection failed:", error);
} finally {
  await pool.end();
}
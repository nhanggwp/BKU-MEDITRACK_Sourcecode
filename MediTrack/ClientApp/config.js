// ✅ config.js — gom hết vào đây, không cần lib/supabase.js nữa
import { createClient } from "@supabase/supabase-js";

// 🧠 Backend FastAPI URL
export const BASE_URL = "http://192.168.9.94:8000";

// 🌐 Supabase
export const SUPABASE_URL = "https://dcnltqrxvbpfqtagskha.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjbmx0cXJ4dmJwZnF0YWdza2hhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEzNjUwNDAsImV4cCI6MjA2Njk0MTA0MH0.voa0KO_tTEriKs_X5ObKSQ67EisdmVkI6Y_62SxWp5E";

// ⚡ Tạo Supabase client 1 lần và export ra dùng trực tiếp
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

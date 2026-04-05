import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Esse log vai te mostrar no console se as chaves carregaram
console.log("Conectando ao Supabase:", supabaseUrl ? "URL OK" : "URL VAZIA!");

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("As chaves do Supabase não foram encontradas no arquivo .env.local");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
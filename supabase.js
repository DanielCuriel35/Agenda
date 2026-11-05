// Pon aquí los datos del proyecto NUEVO de Supabase de la agenda
// (Project Settings → API: "Project URL" y la clave "publishable").
const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
const SUPABASE_KEY = "sb_publishable_XXXXXXXXXXXXXXXX";

// IMPORTANTE: usamos 'client', NO 'supabase'
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

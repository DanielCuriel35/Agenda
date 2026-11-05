// Pon aquí los datos del proyecto NUEVO de Supabase de la agenda
// (Project Settings → API: "Project URL" y la clave "publishable").
const SUPABASE_URL = "https://ucoahixqadloumhsmbzh.supabase.co";
const SUPABASE_KEY = "sb_publishable_4DhZo_9XtalaJT8qr0Fqyw__GMmC5ZS";

// IMPORTANTE: usamos 'client', NO 'supabase'
const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

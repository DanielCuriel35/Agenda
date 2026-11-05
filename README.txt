AGENDA FAMILIAR
===============

Web para el móvil (igual que la lista de la compra): HTML + JS, base de datos
en Supabase y una función en Vercel que lee fotos de notas con IA.

Usuarios: Daniel, Diego, Macu y Marina (constante USUARIOS en app.js y en
api/leer-foto.js; si cambias uno, cámbialo en los dos sitios).


1. Proyecto nuevo de Supabase
-----------------------------

Crea el proyecto y copia en supabase.js:
  - SUPABASE_URL  → Project Settings → API → Project URL
  - SUPABASE_KEY  → Project Settings → API Keys → clave "publishable"


2. Tabla (SQL Editor de Supabase)
---------------------------------

create table if not exists eventos (
 id uuid primary key default gen_random_uuid(),
 titulo text not null,
 fecha date not null,
 hora time,                                   -- vacío = todo el día
 personas text[] not null default '{}',       -- vacío = toda la familia
 notas text,
 usuario text,                                -- quién lo apuntó
 created_at timestamptz not null default now()
);

create index if not exists eventos_fecha on eventos (fecha);

alter table eventos enable row level security;
create policy "eventos_select" on eventos for select using (true);
create policy "eventos_insert" on eventos for insert with check (true);
create policy "eventos_update" on eventos for update using (true);
create policy "eventos_delete" on eventos for delete using (true);

-- Que los cambios aparezcan solos en todos los móviles
alter publication supabase_realtime add table eventos;


3. Leer notas con la cámara (Vercel)
------------------------------------

Variables de entorno en Vercel (Project → Settings → Environment Variables):

GEMINI_API_KEY   clave GRATIS de Google AI Studio:
                 https://aistudio.google.com/apikey → "Create API key"
GEMINI_MODEL     opcional. Por defecto gemini-flash-latest
                 (el último modelo Flash, que entra en el nivel gratuito).

Después de añadir o cambiar variables hay que volver a desplegar.

Cómo funciona: el botón de la cámara deja hacer una foto o elegir una de la
galería (también capturas de WhatsApp). La foto se reduce en el móvil, la
función api/leer-foto.js se la pasa a Gemini con la fecha de hoy, y la IA
devuelve las citas que encuentre (fecha, hora, para quién y qué). Cada una se
abre en el formulario para revisarla antes de guardar. Si hay varias, se
revisan una detrás de otra ("Saltar" pasa a la siguiente).

Ejemplo: "9 de septiembre 14.50 médico Dani" → Médico · 9 sept · 14:50 · Daniel
(sin año, coge la próxima vez que llegue esa fecha).

Ojo: igual que la lista, la web no tiene contraseña. Quien tenga el enlace
puede usar la cámara y gastar parte del cupo gratis diario de Gemini. Para
una familia no suele ser problema; si quieres, se le puede poner una clave.
En el nivel gratis, Google puede usar las fotos enviadas para mejorar sus
modelos: no mandes nada delicado.


4. En el móvil
--------------

Abre la web y "Añadir a pantalla de inicio" para tenerla como una app.

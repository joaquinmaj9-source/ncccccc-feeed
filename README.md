# intel feed — guía de deploy

dossier colectivo de conocimiento. anti-reels para vos y tus amigos.

---

## qué necesitás

- una cuenta en github (gratis) → github.com
- una cuenta en supabase (gratis) → supabase.com
- una cuenta en vercel (gratis) → vercel.com
- (opcional) una api key de anthropic para la función "expandir info" → console.anthropic.com

---

## paso 1: crear la base de datos en supabase

1. andá a **supabase.com** y creá una cuenta (podés usar tu github)
2. hacé click en **"new project"**
3. poné un nombre (ej: `intel-feed`), elegí una contraseña y la región más cercana
4. esperá que se cree el proyecto (tarda ~2 minutos)
5. una vez listo, andá a **sql editor** (menú de la izquierda)
6. pegá este código y dale **run**:

```sql
create table entries (
  id uuid default gen_random_uuid() primary key,
  content text not null,
  source text,
  category text not null default 'dato',
  author text not null,
  expansion text,
  created_at timestamptz default now()
);

-- habilitar realtime para que todos vean los cambios al instante
alter publication supabase_realtime add table entries;
```

7. andá a **project settings** → **api** (en la barra lateral)
8. copiá estos dos valores y guardalos en algún lado:
   - **project url** (algo como `https://xxxxx.supabase.co`)
   - **anon public key** (un token largo)

---

## paso 2: subir el código a github

1. andá a **github.com** y creá un nuevo repositorio
2. poné de nombre `intel-feed`, dejalo público o privado, y creá
3. subí todos los archivos de esta carpeta al repo

si sabés usar git desde la terminal:
```bash
cd intel-feed
git init
git add .
git commit -m "intel feed v1"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/intel-feed.git
git push -u origin main
```

si no sabés usar git: en la página del repo en github,
hacé click en **"uploading an existing file"** y arrastrá todos los archivos.

---

## paso 3: deployar en vercel

1. andá a **vercel.com** y logueate con tu cuenta de github
2. hacé click en **"add new project"**
3. seleccioná el repo `intel-feed`
4. en **"environment variables"** agregá estas tres:

| variable | valor |
|----------|-------|
| `VITE_SUPABASE_URL` | la url de tu proyecto supabase |
| `VITE_SUPABASE_ANON_KEY` | la anon key de supabase |
| `ANTHROPIC_API_KEY` | tu api key de anthropic (opcional) |

5. hacé click en **deploy**
6. esperá ~1 minuto. listo. tu app está en `intel-feed-xxx.vercel.app`

---

## paso 4: usarla

1. compartí la url con tus amigos
2. cada uno entra y pone su nombre (sin contraseña, honor system)
3. empiecen a cargar data
4. todo se sincroniza en tiempo real entre todos

---

## notas

- **la función "expandir info"** requiere la api key de anthropic. sin ella, todo funciona menos eso.
- **supabase free tier** aguanta hasta 500mb de base de datos y 50,000 filas. para 3-4 personas sobra.
- **vercel free tier** aguanta 100gb de bandwidth por mes. más que suficiente.
- si querés un dominio custom (ej: `intel.tudominio.com`), lo podés configurar gratis en vercel.

---

## estructura del proyecto

```
intel-feed/
├── api/
│   └── expand.js          ← función serverless para ia
├── src/
│   ├── lib/
│   │   └── supabase.js    ← cliente de supabase
│   ├── App.jsx             ← la app completa
│   └── main.jsx            ← entry point
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
├── .env.example
└── .gitignore
```

# Dental JC — Panel Admin

Panel de administración para Técnica Dental JC.

## Setup

```bash
# Instalar dependencias
npm install

# Desarrollo (corre en puerto 3001)
npm run dev

# Build producción
npm run build
npm start
```

## Variables de entorno

Crea un archivo `.env.local` en la raíz:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Módulos

- **Dashboard** `/dashboard` — KPIs, gráficas, citas del día
- **Citas** `/citas` — Gestión y cambio de estado
- **Pacientes** `/pacientes` — Listado e historial
- **Especialistas** `/especialistas` — Toggle activo/inactivo
- **Servicios** `/servicios` — Toggle activo/inactivo
- **Historias Clínicas** `/historias` — Crear y ver registros
- **Pagos** `/pagos` — Gestión de transacciones

## Login demo

```
Email:    admin@dentaljc.com
Password: admin123
```

> Reemplaza el login con tu autenticación real de Golang cuando esté lista.

## Estructura

```
dental-admin/
├── app/
│   ├── login/page.tsx
│   ├── dashboard/page.tsx
│   ├── citas/page.tsx
│   ├── pacientes/page.tsx
│   ├── especialistas/page.tsx
│   ├── servicios/page.tsx
│   ├── historias/page.tsx
│   ├── pagos/page.tsx
│   ├── layout.tsx
│   ├── page.tsx          (redirect → /login)
│   └── globals.css
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   └── AdminLayout.tsx
│   └── ui/
│       └── index.tsx
├── lib/
│   ├── api.ts            (todos los endpoints + tipos)
│   └── utils.ts          (formatCOP, formatDate, etc.)
└── .env.local
```

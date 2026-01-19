
# D&G Logística - Gestión de Pedidos 📦

Sistema profesional para la gestión de pedidos de **D&G Bazar**, optimizado para despliegue en la nube.

## 🚀 Despliegue Rápido

### 1. GitHub
Sube este código a un repositorio privado:
```bash
git init
git add .
git commit -m "Configuración para producción"
git remote add origin https://github.com/tu-usuario/dg-logistica.git
git push -u origin main
```

### 2. Vercel
1. Ve a [Vercel](https://vercel.com) e importa el repositorio.
2. En la sección **Environment Variables**, añade:
   - `API_KEY`: Tu clave de Gemini AI.
3. Haz clic en **Deploy**.

### 3. Base de Datos (Supabase)
Para que los datos sean persistentes entre múltiples usuarios:
1. Crea un proyecto en [Supabase](https://supabase.com).
2. Crea una tabla `orders` con las columnas: `id`, `orderNumber`, `customerName`, `status`, `detailedPackaging` (JSONB), `notes`, `locality`, `carrier`, `reviewer`.
3. Integra el SDK de Supabase en `App.tsx` (reemplazando `localStorage`).

## 🛠️ Tecnologías
- **Frontend:** React + TypeScript + Tailwind CSS.
- **IA:** Google Gemini (gemini-3-flash-preview).
- **Iconos:** Lucide React.
- **Hosting:** Vercel.

---
**Desarrollado para D&G Bazar y Regaleria**
*Eficiencia Logística mediante Inteligencia Artificial.*

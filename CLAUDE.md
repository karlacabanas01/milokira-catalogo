# 🌿 Proyecto: MilokiraApp (Catálogo + Dashboard)

## 1. Descripción del Dominio

E-commerce y sistema de gestión integral para venta de plantas. Consta de dos partes:

1. **Frontend Público (`/`):** Catálogo de plantas visible para clientes.
2. **Dashboard Admin (`/admin`):** Panel privado para gestión de inventario, ventas rápidas, pedidos y control de gastos.

## 2. Stack Tecnológico

- **Core:** Next.js (App Router), React, TypeScript.
- **Estilos:** Tailwind CSS, Lucide React (iconos).
- **Backend as a Service (BaaS):** Firebase (Firestore NoSQL, Firebase Storage).

## 3. Esquema de Base de Datos (Firestore NoSQL)

Estrictamente prohibido usar lógica SQL o intentar crear tablas relacionales. Toda la data vive en estas colecciones principales:

- `Plantas` (Catálogo e Inventario)
  - ID: String amigable generado desde el nombre (ej. `monstera-deliciosa`).
  - Campos: `nombre` (string), `descripcion` (string), `categoria` (string), `imagenUrl` (string), `stock` (number), `precio` (map: `{ valor: number, tipo: string, disponible: boolean }`).
- `Transacciones` (Pedidos y Ventas)
  - ID: Autogenerado por Firebase.
  - Campos: `tipo` ("pedido" | "venta_directa"), `status` ("pending" | "completado"), `customer_name` (string), `total_amount` (number), `created_at` (ISO string).
  - Sub-documentos: `items` (Array de maps: `[{ product_id, nombre, quantity, unit_price }]`).
- `Gastos`
  - ID: Autogenerado.
  - Campos: `description` (string), `amount` (number), `created_at` (ISO string).

## 4. Patrones de Arquitectura y Convenciones

- **"use client":** Obligatorio en la primera línea de cualquier componente del `/admin` que maneje estados (`useState`), modales, o peticiones a Firebase.
- **Tipado Estricto:** Prohibido el uso de `any`. Todos los documentos de Firebase deben mapearse a interfaces de TypeScript. El ID del documento SIEMPRE se llamará `idFirebase: string`.
- **Importaciones:** - Archivo de config de Firebase: `import { db, storage } from "@/lib/firebaseConfig"` (o ruta relativa equivalente).
  - SDK de Firebase: Usar siempre la versión modular v9+ (`import { collection, doc... } from "firebase/firestore"`).
- **Manejo de Imágenes:** Todas las imágenes se suben vía `uploadBytes` a la carpeta `plantas/` en Firebase Storage.

## 5. Diseño y UI/UX

- **Panel Admin:** Estilo "Dark Mode" moderno. Paleta principal: fondos en escala `zinc` (`zinc-900`, `zinc-950`), bordes `zinc-800`. Detalles y estados usando `emerald` (ingresos/éxito), `rose` (gastos/borrar), `amber` (pedidos pendientes/advertencias) e `indigo` (inventario/acciones primarias).
- **Interacciones:** Componentes clickeables deben tener feedback visual (`hover:bg-zinc-800`, `transition-all`). Prevenir propagación con `e.stopPropagation()` en botones anidados.

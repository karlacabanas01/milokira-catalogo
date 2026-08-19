# Design System — MilokiraApp

Componentes y tokens compartidos entre el catálogo público (`/`) y el panel
admin (`/admin`). Importa siempre desde el barrel:

```tsx
import { Modal, Button, Input, Badge, Card, EmptyState } from "@/app/components/ui";
```

## Principio: intención, no color

Los componentes se piden por **lo que significa la acción**, no por su color.
Así, si mañana el verde de "vender" cambia, se cambia en un solo lugar.

| Intención  | Color    | Se usa para                        |
| ---------- | -------- | ---------------------------------- |
| `primaria` | indigo   | Acción principal, inventario       |
| `exito`    | emerald  | Vender, cobrar, confirmar          |
| `peligro`  | rose     | Borrar, gastos                     |
| `alerta`   | amber    | Pedidos pendientes, advertencias   |
| `neutra`   | stone    | Cancelar, acciones secundarias     |

```tsx
<Button variant="exito">Guardar Venta</Button>   {/* ✅ */}
<Button className="bg-emerald-600">Guardar</Button>  {/* ❌ */}
```

## Tokens

Definidos en `app/globals.css` bajo `@theme`:

- **Superficies:** `bg-superficie` (paneles, blanco), `bg-campo` (inputs, crema),
  `border-borde`.
- **Marca:** `milokira-crema`, `milokira-lila`, `milokira-verde`.

### z-index

Utilidades (`@utility` en `globals.css`, no tokens `@theme` — el namespace
`--z-*` no genera utilidades en Tailwind v4). Usa estas en vez de `z-50` o
`z-[200]`:

`z-cabecera` (30) · `z-superposicion` (40) · `z-modal` (50) ·
`z-modal-anidado` (60) · `z-aviso` (70)

## Modal

Reemplaza el overlay + panel + header que antes se repetía en cada archivo.
Aporta cierre con **Escape**, bloqueo del scroll de fondo, click fuera para
cerrar y `aria-modal`.

```tsx
<Modal isOpen={abierto} onClose={cerrar} title="Inventario" size="lg" tall>
  {contenido}
</Modal>
```

| Prop              | Para qué                                                    |
| ----------------- | ----------------------------------------------------------- |
| `size`            | `sm` (default) · `md` · `lg` · `full`                       |
| `tall`            | Ocupa el alto disponible con scroll interno (listados)      |
| `nested`          | Modal dentro de otro modal: sube el z-index y oscurece más  |
| `eyebrow`         | Texto pequeño sobre el título                               |
| `hideCloseButton` | Para modales con header propio (ver abajo)                  |
| `footer`          | Acciones fijas al pie, fuera del scroll                     |

### Modales con header propio

Algunos (OrderModal, SaleListModal, los de mercadería) tienen cabeceras con
gradiente o iconos de marca que valen la pena conservar. El patrón es
`hideCloseButton` + `className="p-0"` y neutralizar el padding del contenido
con `-m-4 sm:-m-5`:

```tsx
<Modal isOpen={abierto} onClose={cerrar} size="md" hideCloseButton className="p-0">
  <div className="flex flex-col h-full -m-4 sm:-m-5">
    <header>…tu cabecera…</header>
    …
  </div>
</Modal>
```

## Reglas al agregar código

1. **No escribas overlays a mano.** Si necesitas un modal, usa `Modal`. Antes
   había seis variantes distintas del mismo fondo (`bg-black/90`, `/80`, `/60`,
   `/50`…); el componente existe para que eso no vuelva a pasar.
2. **No pongas `if (!isOpen) return null` antes de los hooks.** Cambia la
   cantidad de hooks entre renders y React lo prohíbe. `Modal` ya decide si se
   monta.
3. **Los `<button>` llevan `type` explícito.** Dentro de un `<form>`, el
   default es `submit`. `Button` ya lo pone en `"button"`.
4. **Para cerrar al hacer click fuera, usa un `<button>` real**, no un `<div>`
   con `onClick` — es lo que hace `Modal` y lo que ya hacían los drawers.

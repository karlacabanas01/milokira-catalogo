import { track } from "@vercel/analytics";

/**
 * Embudo del catálogo: de mirar una planta a escribir por WhatsApp.
 *
 * Los nombres viven acá y no sueltos por los componentes para que el panel de
 * Vercel no termine con tres variantes del mismo evento. Se manda lo justo
 * para responder "¿qué plantas miran y no compran?".
 */

/**
 * Se desplegó la descripción de una planta. Es señal de interés, pero solo se
 * puede medir en móvil: en desktop la descripción ya viene visible y no hay
 * nada que expandir, así que este evento no cuenta las visitas de escritorio.
 */
export const trackLeerDescripcion = (nombre: string) =>
  track("leer_descripcion", { planta: nombre });

/** Se agregó una planta al carrito. */
export const trackAgregarCarrito = (nombre: string, precio: number) =>
  track("agregar_carrito", { planta: nombre, precio });

/** Consulta directa por una planta puntual, sin pasar por el carrito. */
export const trackConsultaPlanta = (nombre: string) =>
  track("consulta_whatsapp_planta", { planta: nombre });

/** Se envió el carrito completo por WhatsApp: el final del embudo. */
export const trackConsultaCarrito = (items: number, total: number) =>
  track("consulta_whatsapp_carrito", { items, total });

/** Se envió el formulario público de pedidos. */
export const trackPedidoEnviado = (items: number) =>
  track("pedido_enviado", { items });

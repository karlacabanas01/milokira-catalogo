/**
 * Genera el ticket de pedido como imagen PNG, optimizado para impresoras
 * térmicas de 57mm (TASBEL / SC03h). Ancho fijo 384px (203dpi), blanco y
 * negro puro. Se descarga e imprime con "Impresión de fotos" de la app.
 */

type OrderItem = {
  nombre?: string;
  quantity: number;
  unit_price: number;
};

export type TicketOrder = {
  customer_name: string;
  total_amount: number;
  delivery_type?: "delivery" | "retiro";
  delivery_fee?: number;
  delivery_day?: string;
  sector?: string;
  address?: string;
  phone?: string;
  notes?: string;
  items: OrderItem[];
};

// Escala 2x: dibujamos al doble de resolución para que la impresora térmica
// tenga más píxeles que procesar y el texto salga nítido.
const SCALE = 2;
const WIDTH = 384 * SCALE; // px — ancho de impresión de la 57mm
const PAD = 16 * SCALE; // margen lateral
const CONTENT_W = WIDTH - PAD * 2;

const formatCLP = (n: number) => `$${n.toLocaleString("es-CL")}`;

/** Parte un texto en líneas que caben en maxW con la fuente actual. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxW: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxW && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/**
 * Dibuja el ticket en un canvas y devuelve el dataURL PNG.
 */
export function renderTicket(order: TicketOrder): string {
  // Primero medimos en un canvas temporal para saber el alto necesario.
  const measure = document.createElement("canvas").getContext("2d")!;

  type Block =
    | { type: "text"; text: string; size: number; align: "left" | "center" }
    | { type: "row"; left: string; right: string; size: number }
    | { type: "divider" }
    | { type: "space"; h: number };

  const blocks: Block[] = [];

  blocks.push({ type: "text", text: "MILOKIRA", size: 40, align: "center" });
  blocks.push({ type: "text", text: "PEDIDO", size: 22, align: "center" });
  blocks.push({ type: "divider" });

  blocks.push({
    type: "text",
    text: order.customer_name.toUpperCase(),
    size: 32,
    align: "left",
  });
  const tipo = order.delivery_type === "delivery" ? "DELIVERY" : "RETIRO";
  const extras = [
    tipo,
    order.delivery_day ? order.delivery_day.toUpperCase() : null,
    order.sector ? order.sector.toUpperCase() : null,
  ]
    .filter(Boolean)
    .join("  -  ");
  blocks.push({ type: "text", text: extras, size: 22, align: "left" });
  blocks.push({ type: "space", h: 6 });

  if (order.address) {
    blocks.push({
      type: "text",
      text: `DIRECCION: ${order.address.toUpperCase()}`,
      size: 24,
      align: "left",
    });
  }
  if (order.phone) {
    blocks.push({
      type: "text",
      text: `TELEFONO: ${order.phone}`,
      size: 24,
      align: "left",
    });
  }
  blocks.push({ type: "divider" });

  blocks.push({ type: "text", text: "PLANTAS", size: 22, align: "left" });
  blocks.push({ type: "space", h: 4 });
  for (const item of order.items ?? []) {
    const qty = item.quantity > 1 ? `${item.quantity}x ` : "";
    const nombre = item.nombre || "Planta";
    const sub =
      item.unit_price > 0 ? formatCLP(item.unit_price * item.quantity) : "";
    if (sub) {
      blocks.push({
        type: "row",
        left: `${qty}${nombre}`,
        right: sub,
        size: 26,
      });
    } else {
      blocks.push({
        type: "text",
        text: `${qty}${nombre}`,
        size: 26,
        align: "left",
      });
    }
  }
  blocks.push({ type: "divider" });

  if (
    order.delivery_type === "delivery" &&
    order.delivery_fee != null &&
    order.delivery_fee > 0
  ) {
    blocks.push({
      type: "row",
      left: "DELIVERY",
      right: formatCLP(order.delivery_fee),
      size: 26,
    });
  }
  blocks.push({
    type: "row",
    left: "TOTAL",
    right: formatCLP(order.total_amount),
    size: 38,
  });

  if (order.notes) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "text",
      text: `NOTA: ${order.notes.toUpperCase()}`,
      size: 22,
      align: "left",
    });
  }
  blocks.push({ type: "space", h: 14 });
  blocks.push({
    type: "text",
    text: "GRACIAS POR TU COMPRA",
    size: 22,
    align: "center",
  });

  // Tamaños base escalados a la resolución 2x.
  const fontFor = (size: number) => `bold ${size * SCALE}px Arial, sans-serif`;
  const lineGap = 8 * SCALE;
  const rowRightW = 110 * SCALE;
  const dividerSpace = 26 * SCALE;

  // Medir alto total
  let height = PAD;
  for (const b of blocks) {
    if (b.type === "divider") {
      height += dividerSpace;
    } else if (b.type === "space") {
      height += b.h * SCALE;
    } else if (b.type === "text") {
      measure.font = fontFor(b.size);
      const lines = wrapText(measure, b.text, CONTENT_W);
      height += lines.length * (b.size * SCALE + lineGap);
    } else {
      measure.font = fontFor(b.size);
      const lines = wrapText(measure, b.left, CONTENT_W - rowRightW);
      height += lines.length * (b.size * SCALE + lineGap);
    }
  }
  height += PAD;

  // Canvas final
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = Math.ceil(height);
  const ctx = canvas.getContext("2d")!;

  // Fondo blanco
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#000000";
  ctx.textBaseline = "top";

  let y = PAD;
  for (const b of blocks) {
    if (b.type === "divider") {
      y += 10 * SCALE;
      ctx.fillRect(PAD, y, CONTENT_W, 3 * SCALE);
      y += 16 * SCALE;
    } else if (b.type === "space") {
      y += b.h * SCALE;
    } else if (b.type === "text") {
      ctx.font = fontFor(b.size);
      ctx.textAlign = b.align;
      const lines = wrapText(ctx, b.text, CONTENT_W);
      const x = b.align === "center" ? WIDTH / 2 : PAD;
      for (const line of lines) {
        ctx.fillText(line, x, y);
        y += b.size * SCALE + lineGap;
      }
    } else {
      ctx.font = fontFor(b.size);
      const lines = wrapText(ctx, b.left, CONTENT_W - rowRightW);
      lines.forEach((line, idx) => {
        ctx.textAlign = "left";
        ctx.fillText(line, PAD, y);
        if (idx === 0) {
          ctx.textAlign = "right";
          ctx.fillText(b.right, WIDTH - PAD, y);
        }
        y += b.size * SCALE + lineGap;
      });
    }
  }

  // Binarización: cada píxel queda 100% negro o 100% blanco. Elimina los
  // grises del anti-aliasing que la impresora térmica no sabe representar.
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) {
    // Luminancia aproximada
    const lum = px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11;
    const v = lum < 160 ? 0 : 255;
    px[i] = v;
    px[i + 1] = v;
    px[i + 2] = v;
    px[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);

  return canvas.toDataURL("image/png");
}

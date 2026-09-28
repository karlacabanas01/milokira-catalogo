import type { MetadataRoute } from "next";
import { NEGOCIO } from "./lib/negocio";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // El panel y el formulario de pedidos no aportan nada en el buscador,
      // y el admin no debería aparecer indexado.
      disallow: ["/admin", "/admin/", "/formularioPedidoClientes"],
    },
    sitemap: `${NEGOCIO.sitio}/sitemap.xml`,
  };
}

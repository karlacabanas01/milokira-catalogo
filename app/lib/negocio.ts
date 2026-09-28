/**
 * Datos del negocio para SEO local.
 *
 * Viven acá y no sueltos en los componentes porque Google exige que el
 * nombre, la dirección y el teléfono sean idénticos en el sitio, en Google
 * Business Profile y en cualquier directorio. Si difieren, Google duda de
 * cuál es el negocio real y lo posiciona peor.
 */

export const NEGOCIO = {
  nombre: "Milokira",
  descripcion:
    "Vivero en Talca: plantas de interior, suculentas y cactus, con despacho a domicilio en Talca y envíos a todo Chile.",
  telefono: "+56994955949",
  /** Como se muestra a una persona, no como se marca. */
  telefonoVisible: "+56 9 9495 5949",
  ciudad: "Talca",
  region: "Región del Maule",
  pais: "CL",
  sitio: "https://milokira-catalogo.vercel.app",
  instagram: "https://www.instagram.com/milokira.plantitas/",
  /** Coordenadas del centro de Talca: ubican el negocio en la ciudad. */
  lat: -35.4264,
  lng: -71.6554,
} as const;

/**
 * JSON-LD del negocio para el buscador.
 *
 * Usa el tipo `GardenStore`, que es el que Schema.org define para un vivero:
 * ayuda a Google a asociar el sitio con búsquedas de "vivero" en la zona.
 */
export const jsonLdNegocio = () => ({
  "@context": "https://schema.org",
  "@type": "GardenStore",
  name: NEGOCIO.nombre,
  description: NEGOCIO.descripcion,
  url: NEGOCIO.sitio,
  telephone: NEGOCIO.telefono,
  image: `${NEGOCIO.sitio}/img/logo.png`,
  address: {
    "@type": "PostalAddress",
    addressLocality: NEGOCIO.ciudad,
    addressRegion: NEGOCIO.region,
    addressCountry: NEGOCIO.pais,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: NEGOCIO.lat,
    longitude: NEGOCIO.lng,
  },
  // Dónde se atiende: le dice a Google para qué zona es relevante el sitio.
  areaServed: [
    { "@type": "City", name: "Talca" },
    { "@type": "State", name: "Región del Maule" },
    { "@type": "Country", name: "Chile" },
  ],
  sameAs: [NEGOCIO.instagram],
  priceRange: "$$",
});

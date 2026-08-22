import { useState, useEffect, useRef } from "react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebaseConfig";

import { X, Leaf, Save, TerminalSquare, Plus } from "lucide-react";
import { Modal, useNoWheelScroll } from "./ui";
import { calcularCostoPlanta } from "../admin/mercaderia/helpers";

type OpcionLitro = { litros: string; precio: string };

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  imagenPosition?: string;
  imagenZoom?: number;
  categorias: string[];
  dificultad?: "facil" | "media" | "dificil";
  aptaMascotas?: "apta" | "moderada" | "toxica" | "sin-info";
  opcionesLitros?: OpcionLitro[];
  oferta?: { activa: boolean; precioOriginal: number; porcentaje: number };
  // Datos de compra (solo lectura acá). Vienen de mercadería; las plantas
  // cargadas a mano desde este modal no los tienen.
  precioCompraUnitaria?: number;
  unidadesCompradas?: number;
  plantasPorMaceta?: number;
  ivaCompra?: number;
  costo?: number;
  precio: {
    valor: number;
    tipo: string;
    disponible: boolean;
  };
}

interface PlantaScript {
  id?: string;
  nombre: string;
  descripcion: string;
  categorias?: string[];
  categoria?: string;
  imagenUrl: string;
  precio: {
    valor: number;
    tipo?: string;
  };
}

interface AgregarPlantaModalProps {
  isOpen: boolean;
  onClose: () => void;
  plantaAEditar?: Planta | null;
}

export default function AgregarPlantaModal({
  isOpen,
  onClose,
  plantaAEditar,
}: AgregarPlantaModalProps) {
  const bloquearRueda = useNoWheelScroll();
  const [cargando, setCargando] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pestaña, setPestaña] = useState<"manual" | "script">("manual");
  const [scriptTexto, setScriptTexto] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categorias: ["INTERIOR"] as string[],
    imagenUrl: "",
    imagenPosition: "50% 50%",
    // 1 = sin zoom. Se aplica con transform: scale sobre la imagen recortada.
    imagenZoom: 1,
    precioValor: "",
    precioTipo: "fijo",
    disponible: "true",
    dificultad: "media" as "facil" | "media" | "dificil",
    aptaMascotas: "sin-info" as "apta" | "moderada" | "toxica" | "sin-info",
  });

  const [opcionesLitros, setOpcionesLitros] = useState<OpcionLitro[]>([
    { litros: "", precio: "" },
  ]);

  const [oferta, setOferta] = useState({
    activa: false,
    precioOferta: "",
  });

  const [imgNaturalSize, setImgNaturalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  useEffect(() => {
    if (plantaAEditar) {
      setFormData({
        nombre: plantaAEditar.nombre,
        descripcion: plantaAEditar.descripcion,
        categorias: plantaAEditar.categorias?.length
          ? plantaAEditar.categorias
          : ["INTERIOR"],
        imagenUrl: plantaAEditar.imagenUrl || "",
        imagenPosition: plantaAEditar.imagenPosition || "50% 50%",
        imagenZoom: plantaAEditar.imagenZoom ?? 1,
        precioValor: plantaAEditar.oferta?.activa
          ? plantaAEditar.oferta.precioOriginal.toString()
          : plantaAEditar.precio.valor.toString(),
        precioTipo: plantaAEditar.precio.tipo || "fijo",
        disponible:
          plantaAEditar.precio.disponible !== false ? "true" : "false",
        dificultad: plantaAEditar.dificultad || "media",
        aptaMascotas: plantaAEditar.aptaMascotas || "sin-info",
      });
      setOpcionesLitros(
        plantaAEditar.opcionesLitros?.length
          ? plantaAEditar.opcionesLitros.map((o) => ({
              litros: o.litros.toString(),
              precio: o.precio.toString(),
            }))
          : [{ litros: "", precio: "" }],
      );
      setOferta({
        activa: plantaAEditar.oferta?.activa ?? false,
        precioOferta: plantaAEditar.oferta?.activa
          ? plantaAEditar.precio.valor.toString()
          : "",
      });
      setPestaña("manual");
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        categorias: ["INTERIOR"],
        imagenUrl: "",
        imagenPosition: "50% 50%",
        imagenZoom: 1,
        precioValor: "",
        precioTipo: "fijo",
        disponible: "true",
        dificultad: "media",
        aptaMascotas: "sin-info",
      });
      setOpcionesLitros([{ litros: "", precio: "" }]);
      setOferta({ activa: false, precioOferta: "" });
    }
  }, [plantaAEditar, isOpen]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const parsePosition = (pos: string): { x: number; y: number } => {
    const parts = pos.split(" ");
    return {
      x: parseFloat(parts[0]) || 50,
      y: parseFloat(parts[1]) || 50,
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!frameRef.current) return;
    isDraggingRef.current = true;
    frameRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current || !frameRef.current || !imgNaturalSize) return;

    const frame = frameRef.current.getBoundingClientRect();
    const frameRatio = frame.width / frame.height;
    const imgRatio = imgNaturalSize.w / imgNaturalSize.h;
    const zoom = formData.imagenZoom;

    // Tamaño real de la imagen ya recortada por object-cover y escalada por el
    // zoom. Con zoom > 1 desborda en AMBOS ejes, así que los dos son
    // arrastrables (sin zoom solo desborda el eje que impone la proporción).
    let coverW: number;
    let coverH: number;
    if (imgRatio > frameRatio) {
      coverH = frame.height;
      coverW = frame.height * imgRatio;
    } else {
      coverW = frame.width;
      coverH = frame.width / imgRatio;
    }
    const scaledW = coverW * zoom;
    const scaledH = coverH * zoom;

    const { x, y } = parsePosition(formData.imagenPosition);
    let newX = x;
    let newY = y;

    const overflowX = scaledW - frame.width;
    if (overflowX > 0) {
      const deltaPct = (e.movementX / overflowX) * 100;
      newX = Math.max(0, Math.min(100, x - deltaPct));
    }

    const overflowY = scaledH - frame.height;
    if (overflowY > 0) {
      const deltaPct = (e.movementY / overflowY) * 100;
      newY = Math.max(0, Math.min(100, y - deltaPct));
    }

    setFormData((prev) => ({ ...prev, imagenPosition: `${newX}% ${newY}%` }));
  };

  const ZOOM_MIN = 1;
  const ZOOM_MAX = 3;

  const aplicarZoom = (valor: number) => {
    const z = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, valor));
    setFormData((prev) => ({
      ...prev,
      imagenZoom: z,
      // Al volver a 1 la imagen ya no desborda por zoom: recentramos para no
      // dejarla pegada a un borde con un encuadre que ya no se puede corregir.
      imagenPosition: z === 1 ? "50% 50%" : prev.imagenPosition,
    }));
  };

  const handleWheelZoom = (e: React.WheelEvent<HTMLDivElement>) => {
    if (!formData.imagenUrl) return;
    aplicarZoom(formData.imagenZoom + (e.deltaY < 0 ? 0.1 : -0.1));
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingRef.current = false;
    if (frameRef.current?.hasPointerCapture(e.pointerId)) {
      frameRef.current.releasePointerCapture(e.pointerId);
    }
  };

  const convertToWebP = (file: File, maxWidth = 800): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No se pudo crear el contexto del canvas"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Error al convertir la imagen a WebP"));
          },
          "image/webp",
          0.8,
        );
      };
      img.onerror = () => reject(new Error("Error al cargar la imagen"));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    console.log("1. Archivo seleccionado:", file.name, "Tamaño:", file.size);

    try {
      const safeName = formData.nombre
        ? formData.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-")
        : "planta";

      const fileName = `${safeName}-${Date.now()}.webp`;

      console.log("2. Convirtiendo imagen a WebP...");
      const webpBlob = await convertToWebP(file);
      console.log(
        "3. Imagen convertida. Tamaño original:",
        file.size,
        "→ WebP:",
        webpBlob.size,
      );

      const storageRef = ref(storage, `plantas/${fileName}`);

      console.log("4. Subiendo al servidor...");
      await uploadBytes(storageRef, webpBlob, { contentType: "image/webp" });

      console.log("5. ¡Bytes subidos! Pidiendo el link público...");
      const downloadUrl = await getDownloadURL(storageRef);

      console.log("6. ¡Éxito! El link es:", downloadUrl);
      setFormData((prev) => ({
        ...prev,
        imagenUrl: downloadUrl,
        imagenPosition: "50% 50%",
        imagenZoom: 1,
      }));
    } catch (error: unknown) {
      const firebaseError = error as { code?: string; message?: string };
      console.error(
        "🚨 ERROR FATAL DE FIREBASE:",
        firebaseError.code,
        firebaseError.message,
      );
      alert(`Error al subir: ${firebaseError.message ?? "Error desconocido"}`);
    } finally {
      setIsUploadingImage(false);
      console.log("7. Proceso terminado (isUploadingImage = false)");
    }
  };

  const esImplemento = formData.categorias.includes("IMPLEMENTOS");

  // Costo de compra (solo lectura). Se recalcula con el mismo helper que usan
  // mercadería y el inventario, así el número es idéntico en las tres pantallas.
  // Solo existe si la planta pasó por mercadería.
  const tieneDatosCompra = Number(plantaAEditar?.precioCompraUnitaria) > 0;
  const ivaCompra = plantaAEditar?.ivaCompra ?? 19;
  const costoCompra = tieneDatosCompra
    ? calcularCostoPlanta({
        precioUnitNeto: Number(plantaAEditar?.precioCompraUnitaria) || 0,
        unidades: Number(plantaAEditar?.unidadesCompradas) || 1,
        plantasPorMaceta: Number(plantaAEditar?.plantasPorMaceta) || 1,
        ivaPorcentaje: ivaCompra,
      })
    : null;

  // Margen contra lo que realmente se le cobra al cliente: si la oferta está
  // activa manda el precio de oferta, no el original (con oferta activa
  // `precioValor` guarda el precio tachado, no el que se paga).
  const precioOfertaNum = Number(oferta.precioOferta) || 0;
  const hayOfertaValida = oferta.activa && precioOfertaNum > 0;
  const precioVentaActual = hayOfertaValida
    ? precioOfertaNum
    : Number(formData.precioValor) || 0;
  const gananciaUnitaria = costoCompra
    ? precioVentaActual - costoCompra.costoPorPlanta
    : 0;
  const margenPorcentaje =
    costoCompra && costoCompra.costoPorPlanta > 0
      ? (gananciaUnitaria / costoCompra.costoPorPlanta) * 100
      : 0;

  const handleSubmitManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);

    try {
      const dataParaSubir: Record<string, unknown> = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categorias: formData.categorias,
        imagenUrl: formData.imagenUrl,
        imagenPosition: formData.imagenPosition,
        imagenZoom: formData.imagenZoom,
        precio: {
          valor: Number(formData.precioValor),
          tipo: formData.precioTipo,
          disponible: formData.disponible === "true",
        },
      };

      if (esImplemento) {
        const opcValidas = opcionesLitros.filter(
          (o) => o.litros.trim() !== "" && o.precio.trim() !== "",
        );
        if (opcValidas.length > 0) {
          dataParaSubir.opcionesLitros = opcValidas.map((o) => ({
            litros: Number(o.litros),
            precio: Number(o.precio),
          }));
        }
      } else {
        dataParaSubir.dificultad = formData.dificultad;
        dataParaSubir.aptaMascotas = formData.aptaMascotas;
      }

      if (oferta.activa) {
        const precioOriginal = Number(formData.precioValor);
        const precioOferta = Number(oferta.precioOferta);
        const pct =
          precioOriginal > 0
            ? Math.round((1 - precioOferta / precioOriginal) * 100)
            : 0;
        dataParaSubir.oferta = {
          activa: true,
          precioOriginal,
          porcentaje: pct,
        };
        dataParaSubir.precio = {
          valor: precioOferta,
          tipo: formData.precioTipo,
          disponible: formData.disponible === "true",
        };
      } else {
        dataParaSubir.oferta = { activa: false, precioOriginal: 0, porcentaje: 0 };
      }

      if (plantaAEditar) {
        await updateDoc(doc(db, "Plantas", plantaAEditar.id), dataParaSubir);
        alert("¡Planta actualizada con éxito! 🌿");
      } else {
        const idAmigable = formData.nombre
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-");

        await setDoc(doc(db, "Plantas", idAmigable), dataParaSubir);
        alert("¡Nueva plantita agregada! 🌱");
      }

      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar los datos en Firebase.");
    } finally {
      setCargando(false);
    }
  };

  const ejecutarScript = async () => {
    if (!scriptTexto.trim()) return;
    setCargando(true);
    try {
      const jsonLimpiado = scriptTexto
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      const plantasNuevas: PlantaScript[] = JSON.parse(jsonLimpiado);
      for (const planta of plantasNuevas) {
        const idAmigable =
          planta.id ||
          planta.nombre
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "-");
        await setDoc(doc(db, "Plantas", idAmigable), {
          nombre: planta.nombre,
          descripcion: planta.descripcion,
          categorias:
            planta.categorias ||
            (planta.categoria ? [planta.categoria] : ["INTERIOR"]),
          imagenUrl: planta.imagenUrl,
          precio: {
            valor: planta.precio.valor,
            tipo: planta.precio.tipo || "fijo",
            disponible: true,
          },
        });
      }
      alert(`✅ ¡Éxito!`);
      setScriptTexto("");
      onClose();
    } catch (error) {
      alert("Error: Revisa el formato JSON.");
    } finally {
      setCargando(false);
    }
  };

  // Clases compartidas para los inputs
  const inputEstilo =
    "w-full p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-milokira-lila/40 focus:border-milokira-lila transition-all shadow-sm";
  const labelEstilo =
    "text-[11px] font-bold text-stone-500 mb-1.5 block uppercase tracking-wider";

  return (
    // Header propio + borde lila de marca: por eso hideCloseButton.
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      hideCloseButton
      className="border-t-4 border-t-milokira-lila"
    >
      <div className="flex flex-col -m-4 sm:-m-5">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-stone-100 shrink-0">
          <div className="flex items-center gap-2 text-stone-800">
            <Leaf className="text-milokira-verde" size={20} strokeWidth={2.5} />
            <h2 className="font-bold text-base sm:text-lg tracking-wide">
              {plantaAEditar ? "Editar Planta" : "Nueva Planta"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-500 border border-stone-200 transition-all"
          >
            <X size={18} />
          </button>
        </div>

        {!plantaAEditar && (
          <div className="px-5 sm:px-6 pt-3 pb-2 shrink-0">
            <div className="flex bg-stone-100 p-1 rounded-xl">
              <button
                onClick={() => setPestaña("manual")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  pestaña === "manual"
                    ? "bg-white text-milokira-lila shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                Formulario
              </button>
              <button
                onClick={() => setPestaña("script")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
                  pestaña === "script"
                    ? "bg-white text-milokira-lila shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                Carga Masiva
              </button>
            </div>
          </div>
        )}

        {pestaña === "manual" ? (
          <form
            id="form-planta"
            onSubmit={handleSubmitManual}
            className="flex-1 overflow-y-auto px-5 sm:px-6 pb-6 pt-3 space-y-4"
          >
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelEstilo}>Nombre</label>
                <input
                  required
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className={inputEstilo}
                  placeholder="Ej. Ficus Lyrata"
                />
              </div>

              {/* NUEVO INPUT DE IMAGEN CON VISTA PREVIA */}
              <div>
                <label className={labelEstilo}>Imagen de la Planta</label>
                <div className="flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploadingImage}
                      className="block w-full text-[11px] text-stone-500
                        file:mr-2 file:py-1.5 file:px-3
                        file:rounded-lg file:border-0
                        file:text-[11px] file:font-bold
                        file:bg-milokira-lila/10 file:text-milokira-lila
                        hover:file:bg-milokira-lila/20 transition-all cursor-pointer
                        disabled:opacity-50"
                    />
                    {isUploadingImage && (
                      <span className="text-[10px] text-amber-500 font-bold animate-pulse whitespace-nowrap">
                        ⏳
                      </span>
                    )}
                  </div>

                  {formData.imagenUrl && (
                    <div className="flex flex-col gap-1">
                      <div
                        ref={frameRef}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerCancel={handlePointerUp}
                        onWheel={handleWheelZoom}
                        className="relative w-32 aspect-[4/5] rounded-lg overflow-hidden border border-stone-200 shadow-sm group cursor-grab active:cursor-grabbing select-none touch-none bg-stone-100"
                        title="Arrastra para reposicionar · rueda para zoom"
                      >
                        <img
                          src={formData.imagenUrl}
                          alt="Vista previa"
                          draggable={false}
                          onLoad={(e) => {
                            const el = e.currentTarget;
                            setImgNaturalSize({
                              w: el.naturalWidth,
                              h: el.naturalHeight,
                            });
                          }}
                          style={{
                            objectPosition: formData.imagenPosition,
                            transform: `scale(${formData.imagenZoom})`,
                            // El origen sigue al encuadre para que el zoom
                            // acerque hacia la zona elegida, no siempre al centro.
                            transformOrigin: formData.imagenPosition,
                          }}
                          className="object-cover w-full h-full pointer-events-none"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-bold uppercase tracking-wider pointer-events-none">
                          {formData.imagenZoom > 1
                            ? `Zoom ${formData.imagenZoom.toFixed(1)}x`
                            : "Arrastra"}
                        </div>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              imagenUrl: "",
                              imagenPosition: "50% 50%",
                              imagenZoom: 1,
                            }))
                          }
                          className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 transition-colors z-10"
                          title="Quitar imagen"
                        >
                          <X size={12} strokeWidth={3} />
                        </button>
                      </div>

                      {/* Control de zoom: se guarda con la planta junto al encuadre */}
                      <div className="w-32 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => aplicarZoom(formData.imagenZoom - 0.1)}
                          disabled={formData.imagenZoom <= ZOOM_MIN}
                          className="shrink-0 w-5 h-5 grid place-items-center rounded bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Alejar"
                        >
                          <span className="text-xs font-black leading-none">−</span>
                        </button>
                        <input
                          type="range"
                          min={ZOOM_MIN}
                          max={ZOOM_MAX}
                          step={0.1}
                          value={formData.imagenZoom}
                          onChange={(e) => aplicarZoom(Number(e.target.value))}
                          aria-label="Zoom de la imagen"
                          className="flex-1 h-1 accent-milokira-verde cursor-pointer"
                        />
                        <button
                          type="button"
                          onClick={() => aplicarZoom(formData.imagenZoom + 0.1)}
                          disabled={formData.imagenZoom >= ZOOM_MAX}
                          className="shrink-0 w-5 h-5 grid place-items-center rounded bg-stone-100 text-stone-600 hover:bg-stone-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          aria-label="Acercar"
                        >
                          <span className="text-xs font-black leading-none">+</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className={labelEstilo}>Descripción</label>
              <textarea
                required
                name="descripcion"
                value={formData.descripcion}
                onChange={handleChange}
                className={`${inputEstilo} resize-none`}
                rows={2}
                placeholder="Detalles de la planta..."
              ></textarea>
            </div>

            <div>
              <label className={labelEstilo}>Categorías</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  "INTERIOR",
                  "EXTERIOR",
                  "SUCULENTAS",
                  "CACTUS",
                  "COLECCION",
                  "IMPLEMENTOS",
                ].map((cat) => {
                  const isSelected = formData.categorias.includes(cat);
                  const esImpl = cat === "IMPLEMENTOS";
                  const hayImpl = formData.categorias.includes("IMPLEMENTOS");
                  // IMPLEMENTOS se selecciona solo; las demás no se pueden elegir si IMPLEMENTOS está activo
                  const deshabilitado = !esImpl && hayImpl;
                  return (
                    <button
                      key={cat}
                      type="button"
                      disabled={deshabilitado}
                      onClick={() => {
                        setFormData((prev) => {
                          if (esImpl) {
                            // Si ya estaba, quítalo y vuelve a INTERIOR
                            if (isSelected)
                              return { ...prev, categorias: ["INTERIOR"] };
                            // Si no estaba, seleccionar solo IMPLEMENTOS
                            return { ...prev, categorias: ["IMPLEMENTOS"] };
                          }
                          // Para las demás: toggle normal, sin tocar IMPLEMENTOS
                          const next = isSelected
                            ? prev.categorias.filter((c) => c !== cat)
                            : [...prev.categorias, cat];
                          return {
                            ...prev,
                            categorias: next.length > 0 ? next : [cat],
                          };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all disabled:opacity-30 disabled:cursor-not-allowed ${
                        isSelected
                          ? esImpl
                            ? "bg-amber-100 border-amber-400 text-amber-700"
                            : "bg-milokira-lila/20 border-milokira-lila text-milokira-lila"
                          : "bg-stone-50 border-stone-200 text-stone-400 hover:border-stone-300"
                      }`}
                    >
                      {cat === "COLECCION"
                        ? "Colección"
                        : cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className={labelEstilo}>Estado</label>
              <select
                name="disponible"
                value={formData.disponible}
                onChange={handleChange}
                className={`${inputEstilo} font-medium`}
              >
                <option value="true">🟢 Disponible</option>
                <option value="false">🔴 Agotado</option>
              </select>
            </div>

            {esImplemento ? (
              <div className="space-y-2">
                <label className={labelEstilo}>
                  Opciones de litros y precio
                </label>
                {opcionesLitros.map((opc, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={opc.litros}
                      onChange={(e) =>
                        setOpcionesLitros((prev) =>
                          prev.map((o, i) =>
                            i === idx ? { ...o, litros: e.target.value } : o,
                          ),
                        )
                      }
                      placeholder="0"
                      style={{ width: "3rem" }}
                      className="shrink-0 p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700 text-center focus:bg-white focus:outline-none focus:ring-2 focus:ring-milokira-lila/40 focus:border-milokira-lila transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-stone-400 text-xs font-bold shrink-0">L</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={opc.precio}
                      onChange={(e) =>
                        setOpcionesLitros((prev) =>
                          prev.map((o, i) =>
                            i === idx ? { ...o, precio: e.target.value.replace(/\D/g, "") } : o,
                          ),
                        )
                      }
                      placeholder="Precio $"
                      className="flex-1 min-w-0 p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm text-stone-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-milokira-lila/40 focus:border-milokira-lila transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {opcionesLitros.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setOpcionesLitros((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        className="shrink-0 p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-500 border border-rose-200 transition-colors"
                        aria-label="Quitar opción"
                      >
                        <X size={13} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                ))}
                {opcionesLitros.length < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setOpcionesLitros((prev) => [
                        ...prev,
                        { litros: "", precio: "" },
                      ])
                    }
                    className="text-[11px] font-bold text-milokira-verde hover:text-milokira-verde/80 flex items-center gap-1 transition-colors"
                  >
                    <Plus size={12} strokeWidth={3} />
                    Agregar opción
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelEstilo}>Dificultad</label>
                  <select
                    value={formData.dificultad}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        dificultad: e.target
                          .value as typeof formData.dificultad,
                      })
                    }
                    className={inputEstilo}
                  >
                    <option value="facil">💧 Fácil</option>
                    <option value="media">💧💧 Media</option>
                    <option value="dificil">💧💧💧 Difícil</option>
                  </select>
                </div>
                <div>
                  <label className={labelEstilo}>Mascotas</label>
                  <select
                    value={formData.aptaMascotas}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        aptaMascotas: e.target
                          .value as typeof formData.aptaMascotas,
                      })
                    }
                    className={inputEstilo}
                  >
                    <option value="sin-info">Sin info</option>
                    <option value="apta">🐾 Apta</option>
                    <option value="moderada">🐾 Riesgo moderado</option>
                    <option value="toxica">🐾 Tóxica</option>
                  </select>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pb-2">
              <div>
                <label className={labelEstilo}>Precio ($)</label>
                <input
                  required
                  type="number"
                  onWheel={bloquearRueda}
                  name="precioValor"
                  value={formData.precioValor}
                  onChange={handleChange}
                  className={inputEstilo}
                  placeholder="0"
                />
              </div>
              <div>
                <label className={labelEstilo}>Tipo de precio</label>
                <select
                  name="precioTipo"
                  value={formData.precioTipo}
                  onChange={handleChange}
                  className={inputEstilo}
                >
                  <option value="fijo">Fijo</option>
                  <option value="desde">Desde</option>
                  <option value="aprox">Aprox</option>
                </select>
              </div>
            </div>

            {!esImplemento && (
              <div className="pb-2">
                <label className="flex items-center gap-3 cursor-pointer select-none group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={oferta.activa}
                      onChange={(e) =>
                        setOferta({ ...oferta, activa: e.target.checked })
                      }
                    />
                    <div
                      className={`w-11 h-6 rounded-full transition-colors duration-200 ${oferta.activa ? "bg-rose-500" : "bg-stone-200"}`}
                    />
                    <div
                      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${oferta.activa ? "translate-x-5" : ""}`}
                    />
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    Poner en oferta
                  </span>
                </label>

                {oferta.activa && (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pl-1">
                    <label className={labelEstilo}>Precio oferta</label>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-sm">
                          $
                        </span>
                        <input
                          type="number"
                          onWheel={bloquearRueda}
                          value={oferta.precioOferta}
                          onChange={(e) =>
                            setOferta({ ...oferta, precioOferta: e.target.value })
                          }
                          placeholder="0"
                          className={`${inputEstilo} pl-7 w-28 sm:w-32`}
                        />
                      </div>
                      {oferta.precioOferta &&
                        Number(formData.precioValor) > 0 &&
                        Number(oferta.precioOferta) <
                          Number(formData.precioValor) && (
                          <span className="text-xs text-rose-600 font-bold whitespace-nowrap">
                            -
                            {Math.round(
                              (1 -
                                Number(oferta.precioOferta) /
                                  Number(formData.precioValor)) *
                                100,
                            )}
                            %
                          </span>
                        )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Costo de compra: solo lectura, y solo si la planta vino de
                mercadería. Se edita desde Inventario, no desde acá. */}
            {costoCompra && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 sm:p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
                    Costo de compra
                  </span>
                  {ivaCompra > 0 ? (
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">
                      IVA {ivaCompra}%
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-500 bg-stone-100 border border-stone-300 px-1.5 py-0.5 rounded">
                      Sin IVA
                    </span>
                  )}
                </div>

                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-stone-500">Precio compra (neto)</span>
                  <span className="font-medium text-stone-600 tabular-nums">
                    $
                    {Math.round(
                      Number(plantaAEditar?.precioCompraUnitaria) || 0,
                    ).toLocaleString("es-CL")}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-stone-500">
                    Costo por planta {ivaCompra > 0 ? "c/IVA" : ""}
                  </span>
                  <span className="font-bold text-stone-800 tabular-nums">
                    ${Math.round(costoCompra.costoPorPlanta).toLocaleString("es-CL")}
                  </span>
                </div>

                {precioVentaActual > 0 && (
                  <div className="flex items-baseline justify-between gap-2 text-sm pt-2 border-t border-stone-200">
                    <span className="text-stone-500">
                      Ganancia por planta
                      {hayOfertaValida && (
                        <span className="ml-1 text-[10px] font-black uppercase tracking-wider text-rose-600">
                          en oferta
                        </span>
                      )}
                    </span>
                    <span
                      className={`font-bold tabular-nums ${gananciaUnitaria >= 0 ? "text-emerald-700" : "text-rose-600"}`}
                    >
                      ${Math.round(gananciaUnitaria).toLocaleString("es-CL")}
                      <span className="ml-1 text-xs font-medium">
                        ({margenPorcentaje >= 0 ? "+" : ""}
                        {margenPorcentaje.toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}
          </form>
        ) : (
          <div className="flex-1 overflow-y-auto px-5 sm:px-6 pb-4 pt-3 space-y-4">
            <p className="text-sm text-stone-500">
              Pega el arreglo JSON con los datos de las plantas.
            </p>
            <textarea
              value={scriptTexto}
              onChange={(e) => setScriptTexto(e.target.value)}
              className="w-full h-56 p-4 font-mono text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-milokira-lila/40 transition-all text-stone-700 shadow-inner resize-none"
              placeholder='[ { "nombre": "...", "precio": ... } ]'
            />
          </div>
        )}

        {/* Footer fijo */}
        <div
          className="shrink-0 border-t border-stone-100 bg-white/90 backdrop-blur-xl px-5 sm:px-6 py-4"
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          {pestaña === "manual" ? (
            <button
              form="form-planta"
              disabled={cargando || isUploadingImage}
              className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm hover:bg-milokira-lila transition-all duration-300 shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              <Save size={18} />
              {cargando
                ? "Guardando..."
                : plantaAEditar
                  ? "Actualizar Planta"
                  : "Guardar Planta"}
            </button>
          ) : (
            <button
              onClick={ejecutarScript}
              disabled={cargando || !scriptTexto}
              className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm hover:bg-milokira-lila transition-all duration-300 shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              <TerminalSquare size={18} />
              Ejecutar Script
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}

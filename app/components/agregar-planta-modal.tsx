import { useState, useEffect, useRef } from "react";
import { doc, setDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebaseConfig";

import { X, Leaf, Save, TerminalSquare } from "lucide-react";

interface Planta {
  id: string;
  nombre: string;
  descripcion: string;
  imagenUrl: string;
  imagenPosition?: string;
  categorias: string[];
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
    precioValor: "",
    precioTipo: "fijo",
    disponible: "true",
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
        precioValor: plantaAEditar.precio.valor.toString(),
        precioTipo: plantaAEditar.precio.tipo || "fijo",
        disponible:
          plantaAEditar.precio.disponible !== false ? "true" : "false",
      });
      setPestaña("manual");
    } else {
      setFormData({
        nombre: "",
        descripcion: "",
        categorias: ["INTERIOR"],
        imagenUrl: "",
        imagenPosition: "50% 50%",
        precioValor: "",
        precioTipo: "fijo",
        disponible: "true",
      });
    }
  }, [plantaAEditar, isOpen]);

  if (!isOpen) return null;

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

    const { x, y } = parsePosition(formData.imagenPosition);
    let newX = x;
    let newY = y;

    if (imgRatio > frameRatio) {
      const scaledW = frame.height * imgRatio;
      const overflowPx = scaledW - frame.width;
      if (overflowPx > 0) {
        const deltaPct = (e.movementX / overflowPx) * 100;
        newX = Math.max(0, Math.min(100, x - deltaPct));
      }
    } else if (imgRatio < frameRatio) {
      const scaledH = frame.width / imgRatio;
      const overflowPx = scaledH - frame.height;
      if (overflowPx > 0) {
        const deltaPct = (e.movementY / overflowPx) * 100;
        newY = Math.max(0, Math.min(100, y - deltaPct));
      }
    }

    setFormData((prev) => ({ ...prev, imagenPosition: `${newX}% ${newY}%` }));
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

  const handleSubmitManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);

    try {
      const dataParaSubir = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categorias: formData.categorias,
        imagenUrl: formData.imagenUrl,
        imagenPosition: formData.imagenPosition,
        precio: {
          valor: Number(formData.precioValor),
          tipo: formData.precioTipo,
          disponible: formData.disponible === "true",
        },
      };

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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-stone-900/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-stone-100 border-t-4 border-t-milokira-lila">
        <div className="px-6 py-5 border-b border-stone-100 flex justify-between items-center">
          <div className="flex items-center gap-2 text-stone-800">
            <Leaf className="text-milokira-verde" size={20} strokeWidth={2.5} />
            <h2 className="font-bold text-lg tracking-wide">
              {plantaAEditar ? "Editar Planta" : "Nueva Planta"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-rose-500 hover:bg-rose-50 p-1.5 rounded-full transition-colors"
          >
            <X size={20} strokeWidth={2.5} />
          </button>
        </div>

        {!plantaAEditar && (
          <div className="px-6 pt-4 pb-2">
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
            onSubmit={handleSubmitManual}
            className="px-6 pb-6 pt-2 space-y-5"
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
                        className="relative w-32 aspect-[4/5] rounded-lg overflow-hidden border border-stone-200 shadow-sm group cursor-grab active:cursor-grabbing select-none touch-none bg-stone-100"
                        title="Arrastra para reposicionar"
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
                          style={{ objectPosition: formData.imagenPosition }}
                          className="object-cover w-full h-full pointer-events-none"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-black/50 text-white text-[9px] text-center py-0.5 font-bold uppercase tracking-wider pointer-events-none">
                          Arrastra
                        </div>
                        <button
                          type="button"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              imagenUrl: "",
                              imagenPosition: "50% 50%",
                            }))
                          }
                          className="absolute top-1 right-1 bg-rose-500 text-white p-1 rounded-full shadow-md hover:bg-rose-600 transition-colors z-10"
                          title="Quitar imagen"
                        >
                          <X size={12} strokeWidth={3} />
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
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => {
                        setFormData((prev) => {
                          const next = isSelected
                            ? prev.categorias.filter((c) => c !== cat)
                            : [...prev.categorias, cat];
                          return {
                            ...prev,
                            categorias: next.length > 0 ? next : [cat],
                          };
                        });
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
                        isSelected
                          ? "bg-milokira-lila/20 border-milokira-lila text-milokira-lila"
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

            <div className="grid grid-cols-2 gap-4 pb-2">
              <div>
                <label className={labelEstilo}>Precio ($)</label>
                <input
                  required
                  type="number"
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

            <button
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
          </form>
        ) : (
          <div className="px-6 pb-6 pt-2 space-y-4">
            <p className="text-sm text-stone-500">
              Pega el arreglo JSON con los datos de las plantas.
            </p>
            <textarea
              value={scriptTexto}
              onChange={(e) => setScriptTexto(e.target.value)}
              className="w-full h-56 p-4 font-mono text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-milokira-lila/40 transition-all text-stone-700 shadow-inner resize-none"
              placeholder='[ { "nombre": "...", "precio": ... } ]'
            />
            <button
              onClick={ejecutarScript}
              disabled={cargando || !scriptTexto}
              className="w-full bg-stone-800 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm hover:bg-milokira-lila transition-all duration-300 shadow-md disabled:opacity-70 flex justify-center items-center gap-2"
            >
              <TerminalSquare size={18} />
              Ejecutar Script
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { collection, addDoc, doc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

interface AgregarPlantaModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AgregarPlantaModal({
  isOpen,
  onClose,
}: AgregarPlantaModalProps) {
  const [cargando, setCargando] = useState(false);
  const [pestaña, setPestaña] = useState<"manual" | "script">("manual");
  const [scriptTexto, setScriptTexto] = useState("");

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
    categoria: "INTERIOR",
    imagenUrl: "/img/",
    precioValor: "",
    precioTipo: "fijo",
  });

  if (!isOpen) return null;

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // --- LÓGICA PARA SUBIR UNA SOLA PLANTA ---
  const handleSubmitManual = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCargando(true);
    try {
      const nuevaPlanta = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        categoria: formData.categoria,
        imagenUrl: formData.imagenUrl,
        precio: {
          valor: Number(formData.precioValor),
          tipo: formData.precioTipo,
          disponible: true,
        },
      };
      await addDoc(collection(db, "Plantas"), nuevaPlanta);
      alert("¡Plantita agregada! 🌿");
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al subir");
    } finally {
      setCargando(false);
    }
  };

  // --- LÓGICA PARA EJECUTAR EL SCRIPT (CARGA MASIVA) ---
  const ejecutarScript = async () => {
    if (!scriptTexto.trim()) return;
    setCargando(true);

    try {
      const jsonLimpiado = scriptTexto
        .replace(/(\w+):/g, '"$1":')
        .replace(/'/g, '"');
      const plantasNuevas = JSON.parse(jsonLimpiado);

      for (const planta of plantasNuevas) {
        const dataParaSubir = {
          nombre: planta.nombre,
          descripcion: planta.descripcion,
          categoria: planta.categoria,
          imagenUrl: planta.imagenUrl,
          precio: {
            valor: planta.precio.valor,
            tipo: planta.precio.tipo || "fijo",
            disponible:
              planta.precio.disponible !== undefined
                ? planta.precio.disponible
                : true,
          },
        };

        // ESTA ES LA LÍNEA MÁGICA: Usa el ID que viene en el JSON
        const idAmigable = planta.id;

        // ESTO DEBE SER setDoc (NO addDoc)
        await setDoc(doc(db, "Plantas", idAmigable), dataParaSubir);
      }

      alert(
        `✅ ¡Éxito! Se agregaron ${plantasNuevas.length} plantas con IDs personalizados.`,
      );
      setScriptTexto("");
      onClose();
    } catch (error) {
      console.error("Error en script:", error);
      alert("Error: Asegúrate de que el formato sea JSON válido.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-milokira-crema rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border-2 border-milokira-lila/50">
        {/* Cabecera y Selector de Pestañas */}
        <div className="bg-milokira-lila/80 p-2 flex flex-col">
          <div className="flex justify-between items-center p-2">
            <h2 className="text-white font-bold uppercase text-sm tracking-widest">
              Panel Admin Milokira
            </h2>
            <button
              onClick={onClose}
              className="text-white hover:text-red-200 font-bold text-xl"
            >
              &times;
            </button>
          </div>

          <div className="flex bg-black/10 rounded-lg p-1">
            <button
              onClick={() => setPestaña("manual")}
              className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${pestaña === "manual" ? "bg-white text-milokira-verde shadow" : "text-white/70"}`}
            >
              MANUAL
            </button>
            <button
              onClick={() => setPestaña("script")}
              className={`flex-1 py-1 text-xs font-bold rounded-md transition-all ${pestaña === "script" ? "bg-white text-milokira-verde shadow" : "text-white/70"}`}
            >
              SCRIPT (MASIVO)
            </button>
          </div>
        </div>

        {/* CONTENIDO PESTAÑA MANUAL */}
        {pestaña === "manual" ? (
          <form onSubmit={handleSubmitManual} className="p-6 space-y-4">
            {/* ... (Aquí va todo el formulario que ya teníamos antes) ... */}
            <div className="grid grid-cols-2 gap-4">
              <input
                required
                name="nombre"
                placeholder="Nombre"
                onChange={handleChange}
                className="p-2 border rounded"
              />
              <input
                required
                name="imagenUrl"
                placeholder="Ruta Imagen"
                onChange={handleChange}
                defaultValue="/img/"
                className="p-2 border rounded"
              />
            </div>
            <textarea
              required
              name="descripcion"
              placeholder="Descripción"
              onChange={handleChange}
              className="w-full p-2 border rounded"
              rows={2}
            ></textarea>
            <div className="grid grid-cols-3 gap-2">
              <select
                name="categoria"
                onChange={handleChange}
                className="p-2 border rounded bg-white"
              >
                <option value="INTERIOR">Interior</option>
                <option value="EXTERIOR">Exterior</option>
                <option value="SUCULENTAS">Suculentas</option>
                <option value="CACTUS">Cactus</option>
                <option value="JARDINES">Jardines</option>
              </select>
              <input
                required
                name="precioValor"
                type="number"
                placeholder="Precio"
                onChange={handleChange}
                className="p-2 border rounded"
              />
              <select
                name="precioTipo"
                onChange={handleChange}
                className="p-2 border rounded bg-white"
              >
                <option value="fijo">Fijo</option>
                <option value="desde">Desde</option>
                <option value="aprox">Aprox</option>
              </select>
            </div>
            <button
              disabled={cargando}
              className="w-full bg-milokira-verde text-white font-bold py-3 rounded uppercase text-sm hover:opacity-90"
            >
              {cargando ? "Subiendo..." : "Guardar Planta"}
            </button>
          </form>
        ) : (
          /* CONTENIDO PESTAÑA SCRIPT */
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500 italic">
              Pega aquí el arreglo de objetos. Asegúrate de que use comillas
              dobles en las propiedades o formato JSON.
            </p>
            <textarea
              value={scriptTexto}
              onChange={(e) => setScriptTexto(e.target.value)}
              placeholder='[ { "nombre": "Planta 1", "precio": { "valor": 2000 } ... } ]'
              className="w-full h-64 p-3 font-mono text-xs border border-gray-300 rounded focus:outline-milokira-verde"
            ></textarea>
            <button
              onClick={ejecutarScript}
              disabled={cargando || !scriptTexto}
              className="w-full bg-milokira-verde text-white font-bold py-3 rounded uppercase text-sm hover:bg-green-700 disabled:opacity-50"
            >
              {cargando ? "Procesando Script..." : "🚀 Ejecutar Carga Masiva"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

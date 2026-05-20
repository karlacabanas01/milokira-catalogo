"use client";

import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

import { X, Plus, Minus, Edit3, PackagePlus, Trash2 } from "lucide-react";
import ProductModal from "./ProductModal";

export type Product = {
  idFirebase: string;
  name: string;
  price: number;
  stock: number;
  active: boolean;
  cost: number;
  margin: number;
  costoOriginalTotal: number;
  unidadesCompradas: number;
  precioCompraUnitaria: number;
  plantasPorMaceta: number;
  descripcion: string;
  categorias: string[];
  imagenUrl: string;
  imagenPosition: string;
  precioTipo: string;
  dificultad: "facil" | "media" | "dificil";
  aptaMascotas: "apta" | "moderada" | "toxica" | "sin-info";
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export default function ProductListModal({ isOpen, onClose }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "Plantas"));
      const listaPlantas: Product[] = [];

      querySnapshot.forEach((documento) => {
        const data = documento.data();
        const isActive = data.precio?.disponible !== false;

        if (isActive) {
          listaPlantas.push({
            idFirebase: documento.id,
            name: data.nombre || "Sin nombre",
            price: Number(data.precio?.valor) || 0,
            stock: Number(data.stock) || 0,
            active: isActive,
            cost: Number(data.costo) || 0,
            margin: Number(data.margen) || 0,
            costoOriginalTotal: Number(data.costoOriginalTotal) || 0,
            unidadesCompradas: Number(data.unidadesCompradas) || 1,
            precioCompraUnitaria: Number(data.precioCompraUnitaria) || 0,
            plantasPorMaceta: Number(data.plantasPorMaceta) || 1,
            descripcion: data.descripcion || "",
            categorias: Array.isArray(data.categorias) && data.categorias.length > 0
              ? data.categorias
              : ["INTERIOR"],
            imagenUrl: data.imagenUrl || "",
            imagenPosition: data.imagenPosition || "50% 50%",
            precioTipo: data.precio?.tipo || "fijo",
            dificultad: (data.dificultad as Product["dificultad"]) || "media",
            aptaMascotas:
              (data.aptaMascotas as Product["aptaMascotas"]) || "sin-info",
          });
        }
      });

      listaPlantas.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(listaPlantas);
    } catch (error) {
      console.error("Error cargando inventario:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchProducts();
  }, [isOpen]);

  const handleStockChange = async (
    idFirebase: string,
    currentStock: number,
    change: number,
  ) => {
    const newStock = Math.max(0, currentStock + change);

    setProducts((prev) =>
      prev.map((p) =>
        p.idFirebase === idFirebase ? { ...p, stock: newStock } : p,
      ),
    );

    try {
      await updateDoc(doc(db, "Plantas", idFirebase), { stock: newStock });
    } catch (error) {
      console.error("Error al actualizar stock:", error);
    }
  };

  const handleDeleteProduct = async (idFirebase: string, name: string) => {
    const confirmar = window.confirm(
      `¿Estás segura de que quieres eliminar la planta "${name}"? Esta acción no se puede deshacer.`,
    );

    if (!confirmar) return;

    try {
      await deleteDoc(doc(db, "Plantas", idFirebase));
      setProducts((prev) => prev.filter((p) => p.idFirebase !== idFirebase));
    } catch (error) {
      console.error("Error al eliminar el producto:", error);
      alert("Hubo un error al intentar eliminar la planta.");
    }
  };

  const handleSaveProduct = async (
    data: {
      name: string;
      price: number;
      stock: number;
      cost: number;
      margin: number;
      costoOriginalTotal: number;
      unidadesCompradas: number;
      precioCompraUnitaria: number;
      plantasPorMaceta: number;
      descripcion: string;
      categorias: string[];
      imagenUrl: string;
      imagenPosition: string;
      precioTipo: string;
      dificultad: "facil" | "media" | "dificil";
      aptaMascotas: "apta" | "moderada" | "toxica" | "sin-info";
    },
    idFirebase?: string,
  ) => {
    setIsSaving(true);
    try {
      const payload = {
        nombre: data.name,
        "precio.valor": data.price,
        "precio.tipo": data.precioTipo,
        stock: data.stock,
        costo: data.cost,
        margen: data.margin,
        costoOriginalTotal: data.costoOriginalTotal,
        unidadesCompradas: data.unidadesCompradas,
        precioCompraUnitaria: data.precioCompraUnitaria,
        plantasPorMaceta: data.plantasPorMaceta,
        descripcion: data.descripcion,
        categorias: data.categorias,
        imagenUrl: data.imagenUrl,
        imagenPosition: data.imagenPosition,
        dificultad: data.dificultad,
        aptaMascotas: data.aptaMascotas,
      };

      if (idFirebase) {
        await updateDoc(doc(db, "Plantas", idFirebase), payload);
      } else {
        const nuevoId = data.name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-");

        await setDoc(doc(db, "Plantas", nuevoId), {
          nombre: data.name,
          stock: data.stock,
          costo: data.cost,
          margen: data.margin,
          costoOriginalTotal: data.costoOriginalTotal,
          unidadesCompradas: data.unidadesCompradas,
          precioCompraUnitaria: data.precioCompraUnitaria,
          plantasPorMaceta: data.plantasPorMaceta,
          descripcion: data.descripcion,
          categorias: data.categorias,
          imagenUrl: data.imagenUrl,
          imagenPosition: data.imagenPosition,
          dificultad: data.dificultad,
          aptaMascotas: data.aptaMascotas,
          precio: { valor: data.price, tipo: data.precioTipo, disponible: true },
        });
      }

      setIsProductModalOpen(false);
      setEditingProduct(null);
      fetchProducts();
    } catch (error) {
      console.error("Error al guardar producto:", error);
      alert("Hubo un error al guardar los cambios.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm">
      <div className="bg-zinc-900 w-full max-w-3xl rounded-2xl border border-zinc-800 shadow-2xl h-[95vh] sm:h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 sm:p-5 border-b border-zinc-800 bg-zinc-950 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-indigo-400 flex items-center gap-2">
            <PackagePlus size={20} className="sm:w-[22px] sm:h-[22px]" />{" "}
            Inventario
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-colors"
          >
            <X size={18} className="sm:w-5 sm:h-5" />
          </button>
        </div>

        <div className="p-3 sm:p-4 space-y-3 sm:space-y-4 shrink-0">
          <button
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-lg shadow-indigo-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <Plus size={18} className="sm:w-5 sm:h-5" /> Agregar Nuevo Producto
          </button>

          <input
            type="text"
            placeholder="Buscar en el inventario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black border border-zinc-800 rounded-xl px-4 py-2.5 sm:py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
          />
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4 pt-0 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 scrollbar-hide">
          {loading ? (
            <div className="col-span-full text-center text-zinc-500 py-10 text-sm">
              Cargando inventario...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="col-span-full text-center text-zinc-500 py-10 border border-dashed border-zinc-800 rounded-xl text-sm">
              No hay productos registrados.
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.idFirebase}
                className={`bg-black border ${product.stock === 0 ? "border-rose-900/50" : "border-zinc-800"} p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 transition-colors`}
              >
                {/* Info de la planta */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-zinc-200 font-medium text-sm sm:text-base leading-tight truncate">
                    {product.name}
                  </h3>
                  <p className="text-emerald-400 text-xs sm:text-sm mt-0.5 sm:mt-1 font-semibold">
                    ${product.price.toLocaleString("es-CL")}
                  </p>
                </div>

                {/* Controles de Stock Explícitos */}
                <div className="flex flex-col items-center shrink-0">
                  <span
                    className={`text-[9px] font-bold mb-1 uppercase tracking-wider ${product.stock === 0 ? "text-rose-500" : "text-zinc-500"}`}
                  >
                    Stock Dispo.
                  </span>
                  <div
                    className={`flex items-center gap-1 sm:gap-2 bg-zinc-900 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border ${product.stock === 0 ? "border-rose-900/50" : "border-zinc-800"}`}
                  >
                    <button
                      onClick={() =>
                        handleStockChange(product.idFirebase, product.stock, -1)
                      }
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <Minus size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <span
                      className={`text-xs sm:text-sm font-bold w-5 sm:w-6 text-center ${product.stock === 0 ? "text-rose-500" : "text-white"}`}
                    >
                      {product.stock}
                    </span>
                    <button
                      onClick={() =>
                        handleStockChange(product.idFirebase, product.stock, 1)
                      }
                      className="text-zinc-400 hover:text-white p-1"
                    >
                      <Plus size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col border-l border-zinc-800 pl-2 sm:pl-3 shrink-0">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsProductModalOpen(true);
                    }}
                    className="text-zinc-500 hover:text-indigo-400 p-1 sm:p-1.5 transition-colors"
                    title="Editar producto"
                  >
                    <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteProduct(product.idFirebase, product.name)
                    }
                    className="text-zinc-500 hover:text-rose-500 p-1 sm:p-1.5 mt-1 transition-colors"
                    title="Eliminar producto"
                  >
                    <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {isProductModalOpen && (
        <ProductModal
          isOpen={isProductModalOpen}
          onClose={() => setIsProductModalOpen(false)}
          onSave={handleSaveProduct}
          isSaving={isSaving}
          editingProduct={editingProduct}
        />
      )}
    </div>
  );
}

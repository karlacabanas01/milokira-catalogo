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

import {
  Plus,
  Minus,
  Edit3,
  Trash2,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import ProductModal from "./ProductModal";
import { Modal, Button, Badge } from "../../components/ui";

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
  /** IVA (%) con el que se calculó la compra. Las plantas antiguas no lo tienen. */
  ivaCompra: number;
  plantasPorMaceta: number;
  descripcion: string;
  categorias: string[];
  imagenUrl: string;
  imagenPosition: string;
  imagenZoom: number;
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
  const [vista, setVista] = useState<"cards" | "tabla">("cards");

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
        // El inventario muestra TODAS las plantas del catálogo (incluidas las
        // no disponibles y las agotadas); `active` solo marca su estado.
        const isActive = data.precio?.disponible !== false;

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
          // Las plantas cargadas antes de guardar el IVA asumen el 19% legal.
          ivaCompra:
            data.ivaCompra === undefined ? 19 : Number(data.ivaCompra),
          plantasPorMaceta: Number(data.plantasPorMaceta) || 1,
          descripcion: data.descripcion || "",
          categorias: Array.isArray(data.categorias) && data.categorias.length > 0
            ? data.categorias
            : ["INTERIOR"],
          imagenUrl: data.imagenUrl || "",
          imagenPosition: data.imagenPosition || "50% 50%",
          imagenZoom: Number(data.imagenZoom) || 1,
          precioTipo: data.precio?.tipo || "fijo",
          dificultad: (data.dificultad as Product["dificultad"]) || "media",
          aptaMascotas:
            (data.aptaMascotas as Product["aptaMascotas"]) || "sin-info",
        });
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
      imagenZoom: number;
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
        imagenZoom: data.imagenZoom,
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
          imagenZoom: data.imagenZoom,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Inventario" size="lg" tall>
      <div className="flex flex-col h-full">
        <div className="space-y-3 sm:space-y-4 shrink-0">
          <Button
            variant="primaria"
            size="lg"
            fullWidth
            onClick={() => {
              setEditingProduct(null);
              setIsProductModalOpen(true);
            }}
          >
            <Plus size={18} className="sm:w-5 sm:h-5" /> Agregar Nuevo Producto
          </Button>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Buscar en el inventario..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 bg-campo border border-borde rounded-xl px-4 py-2.5 sm:py-3 text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm"
            />
            <div className="inline-flex bg-stone-100 rounded-lg p-0.5 border border-stone-200 shrink-0">
              <button
                type="button"
                onClick={() => setVista("cards")}
                aria-label="Vista cards"
                className={`inline-flex items-center justify-center p-2 rounded-md transition-all ${
                  vista === "cards"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <LayoutGrid size={14} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => setVista("tabla")}
                aria-label="Vista tabla"
                className={`inline-flex items-center justify-center p-2 rounded-md transition-all ${
                  vista === "tabla"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-stone-500 hover:text-stone-700"
                }`}
              >
                <TableIcon size={14} strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto pt-3 sm:pt-4 scrollbar-hide ${vista === "cards" ? "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 content-start" : ""}`}>
          {loading ? (
            <div className={`text-center text-stone-500 py-10 text-sm ${vista === "cards" ? "col-span-full" : ""}`}>
              Cargando inventario...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={`text-center text-stone-500 py-10 border border-dashed border-borde rounded-xl text-sm ${vista === "cards" ? "col-span-full" : ""}`}>
              No hay productos registrados.
            </div>
          ) : vista === "tabla" ? (
            <div className="border border-stone-200 rounded-xl overflow-hidden bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-milokira-crema">
                    <tr className="text-[9px] sm:text-[10px] font-black text-stone-500 uppercase tracking-wider">
                      <th className="px-3 py-2 text-left">Planta</th>
                      <th className="px-2 py-2 text-right">Precio</th>
                      <th className="px-2 py-2 text-center w-32">Stock</th>
                      <th className="px-2 py-2 text-right w-20">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredProducts.map((product) => (
                      <tr
                        key={product.idFirebase}
                        className={`${product.stock === 0 ? "bg-rose-50" : "hover:bg-milokira-crema/40"} transition-colors`}
                      >
                        <td className="px-3 py-2 font-bold text-stone-800 truncate max-w-0">
                          <span className={product.active ? "" : "text-stone-400"}>
                            {product.name}
                          </span>
                          {!product.active && (
                            <Badge tone="alerta" className="ml-1.5">
                              Oculta
                            </Badge>
                          )}
                        </td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-emerald-700">
                          ${product.price.toLocaleString("es-CL")}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() =>
                                handleStockChange(product.idFirebase, product.stock, -1)
                              }
                              className="text-stone-500 hover:text-stone-800 p-1 rounded hover:bg-stone-100"
                              aria-label="Menos stock"
                            >
                              <Minus size={12} />
                            </button>
                            <span
                              className={`text-xs font-black w-7 text-center ${product.stock === 0 ? "text-rose-600" : "text-stone-800"}`}
                            >
                              {product.stock}
                            </span>
                            <button
                              onClick={() =>
                                handleStockChange(product.idFirebase, product.stock, 1)
                              }
                              className="text-stone-500 hover:text-stone-800 p-1 rounded hover:bg-stone-100"
                              aria-label="Más stock"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center justify-end gap-0.5">
                            <button
                              onClick={() => {
                                setEditingProduct(product);
                                setIsProductModalOpen(true);
                              }}
                              className="text-stone-500 hover:text-indigo-700 p-1.5 rounded hover:bg-indigo-50 transition-colors"
                              title="Editar"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteProduct(product.idFirebase, product.name)
                              }
                              className="text-stone-500 hover:text-rose-600 p-1.5 rounded hover:bg-rose-50 transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            filteredProducts.map((product) => (
              <div
                key={product.idFirebase}
                className={`bg-white border ${product.stock === 0 ? "border-rose-300" : "border-stone-200"} p-3 sm:p-4 rounded-xl flex items-center gap-2 sm:gap-3 transition-colors`}
              >
                {/* Info de la planta */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-medium text-sm sm:text-base leading-tight truncate ${product.active ? "text-stone-800" : "text-stone-400"}`}
                  >
                    {product.name}
                  </h3>
                  {!product.active && (
                    <Badge tone="alerta" className="mt-0.5">
                      Oculta en catálogo
                    </Badge>
                  )}
                  <p className="text-emerald-700 text-xs sm:text-sm mt-0.5 sm:mt-1 font-semibold">
                    ${product.price.toLocaleString("es-CL")}
                  </p>
                </div>

                {/* Controles de Stock Explícitos */}
                <div className="flex flex-col items-center shrink-0">
                  <span
                    className={`text-[9px] font-bold mb-1 uppercase tracking-wider ${product.stock === 0 ? "text-rose-500" : "text-stone-500"}`}
                  >
                    Stock Dispo.
                  </span>
                  <div
                    className={`flex items-center gap-1 sm:gap-2 bg-stone-50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg border ${product.stock === 0 ? "border-rose-300" : "border-stone-200"}`}
                  >
                    <button
                      onClick={() =>
                        handleStockChange(product.idFirebase, product.stock, -1)
                      }
                      className="text-stone-500 hover:text-stone-800 p-1"
                    >
                      <Minus size={14} className="sm:w-4 sm:h-4" />
                    </button>
                    <span
                      className={`text-xs sm:text-sm font-bold w-5 sm:w-6 text-center ${product.stock === 0 ? "text-rose-600" : "text-stone-800"}`}
                    >
                      {product.stock}
                    </span>
                    <button
                      onClick={() =>
                        handleStockChange(product.idFirebase, product.stock, 1)
                      }
                      className="text-stone-500 hover:text-stone-800 p-1"
                    >
                      <Plus size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col border-l border-stone-200 pl-2 sm:pl-3 shrink-0">
                  <button
                    onClick={() => {
                      setEditingProduct(product);
                      setIsProductModalOpen(true);
                    }}
                    className="text-stone-500 hover:text-indigo-400 p-1 sm:p-1.5 transition-colors"
                    title="Editar producto"
                  >
                    <Edit3 size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </button>
                  <button
                    onClick={() =>
                      handleDeleteProduct(product.idFirebase, product.name)
                    }
                    className="text-stone-500 hover:text-rose-500 p-1 sm:p-1.5 mt-1 transition-colors"
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
    </Modal>
  );
}

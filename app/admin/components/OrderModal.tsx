"use client";

import { useEffect, useState } from "react";
import { User, Trash2 } from "lucide-react";
// 1. IMPORTAMOS FIREBASE
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Ajusta la ruta a tu archivo de config

// 2. ADAPTAMOS LOS TIPOS A FIREBASE
type Product = {
  idFirebase: string;
  name: string;
  price: number;
  stock: number;
};
type CartItem = { product: Product; quantity: number };

type EditingOrderType = {
  idFirebase: string;
  customer_name: string;
  items: {
    product_id?: string;
    nombre?: string;
    quantity: number;
    unit_price: number;
  }[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOrder?: EditingOrderType | null;
};

export default function OrderModal({
  isOpen,
  onClose,
  onSuccess,
  editingOrder,
}: Props) {
  const [customer, setCustomer] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [qty, setQty] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  // 3. CARGAR CATÁLOGO DE PLANTAS DESDE FIREBASE
  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        setIsLoadingProducts(true);
        try {
          const querySnapshot = await getDocs(collection(db, "Plantas"));
          const listaPlantas: Product[] = [];

          querySnapshot.forEach((documento) => {
            const data = documento.data();
            // Solo traemos plantas que estén marcadas como disponibles
            if (data.precio?.disponible !== false) {
              listaPlantas.push({
                idFirebase: documento.id,
                name: data.nombre || "Planta sin nombre",
                price: Number(data.precio?.valor) || 0,
                stock: Number(data.stock) || 0,
              });
            }
          });

          // Ordenamos alfabéticamente
          listaPlantas.sort((a, b) => a.name.localeCompare(b.name));
          setProducts(listaPlantas);
        } catch (error) {
          console.error("Error cargando plantas:", error);
        } finally {
          setIsLoadingProducts(false);
        }
      };

      fetchProducts();
    }
  }, [isOpen]);

  // 4. MODO EDICIÓN: Llenar el formulario si recibimos un pedido
  useEffect(() => {
    if (editingOrder && isOpen) {
      setCustomer(editingOrder.customer_name);

      const loadedCart: CartItem[] = editingOrder.items.map((item) => ({
        quantity: item.quantity,
        product: {
          idFirebase: item.product_id || "",
          name: item.nombre || "Planta",
          price: item.unit_price,
          stock: 999, // El stock real no importa tanto aquí, pero podríamos cruzarlo con el catálogo
        },
      }));
      setCart(loadedCart);
    } else if (isOpen) {
      setCustomer("");
      setCart([]);
      setSelectedProductId("");
      setQty(1);
    }
  }, [editingOrder, isOpen]);

  if (!isOpen) return null;

  const addToCart = () => {
    if (!selectedProductId) return;
    const product = products.find((p) => p.idFirebase === selectedProductId);
    if (!product) return;

    const existing = cart.find(
      (item) => item.product.idFirebase === product.idFirebase,
    );
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.idFirebase === product.idFirebase
            ? { ...item, quantity: item.quantity + qty }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product, quantity: qty }]);
    }

    setSelectedProductId("");
    setQty(1);
  };

  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  const totalOrder = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );

  // 5. GUARDAR O ACTUALIZAR EN FIREBASE
  const handleSaveOrder = async () => {
    if (!customer || cart.length === 0) {
      return alert("Faltan datos (Cliente o Productos)");
    }
    setIsSaving(true);

    try {
      // Preparamos el array de plantas en el formato anidado de Firebase
      const itemsToSave = cart.map((item) => ({
        product_id: item.product.idFirebase,
        nombre: item.product.name,
        quantity: item.quantity,
        unit_price: item.product.price,
      }));

      if (editingOrder) {
        // --- MODO EDICIÓN (Un simple update sobreescribe todo) ---
        await updateDoc(doc(db, "Transacciones", editingOrder.idFirebase), {
          customer_name: customer,
          total_amount: totalOrder,
          items: itemsToSave,
        });
      } else {
        // --- MODO CREAR NUEVO ---
        const nuevoPedidoRef = doc(collection(db, "Transacciones"));
        await setDoc(nuevoPedidoRef, {
          tipo: "pedido",
          status: "pending",
          customer_name: customer,
          total_amount: totalOrder,
          items: itemsToSave,
          created_at: new Date().toISOString(),
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error(error);
      alert("Error al guardar pedido en Firebase");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 w-full max-w-md rounded-2xl p-6 border border-zinc-800 shadow-2xl flex flex-col max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4 text-amber-500 flex items-center gap-2">
          {editingOrder ? "✏️ Editar Pedido" : "🛒 Nuevo Pedido Múltiple"}
        </h2>

        <div className="mb-4">
          <label className="text-xs text-zinc-400 ml-1">
            Cliente / Instagram
          </label>
          <div className="relative mt-1">
            <User className="absolute left-3 top-3 text-zinc-500" size={18} />
            <input
              autoFocus
              placeholder="@cliente"
              className="w-full pl-10 p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-amber-500"
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          </div>
        </div>

        <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 mb-4">
          <label className="text-xs text-zinc-500 font-bold uppercase mb-2 block">
            Agregar Item
          </label>
          <div className="flex gap-2 mb-2">
            <select
              className="flex-1 p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-sm outline-none disabled:opacity-50"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={isLoadingProducts}
            >
              <option value="">
                {isLoadingProducts
                  ? "Cargando catálogo..."
                  : "Selecciona producto..."}
              </option>
              {products.map((p) => (
                <option key={p.idFirebase} value={p.idFirebase}>
                  {p.name} (${p.price.toLocaleString("es-CL")})
                </option>
              ))}
            </select>
            <input
              type="number"
              min="1"
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-16 p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-center text-sm outline-none"
            />
          </div>
          <button
            onClick={addToCart}
            disabled={!selectedProductId}
            className="w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
          >
            + Agregar a la lista
          </button>
        </div>

        <div className="flex-1 overflow-y-auto mb-4 border-t border-b border-zinc-800 py-2 space-y-2 min-h-[100px]">
          {cart.length === 0 ? (
            <div className="text-center text-zinc-600 py-8 italic text-sm">
              La lista está vacía...
            </div>
          ) : (
            cart.map((item, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-zinc-950 p-3 rounded-lg border border-zinc-800/50"
              >
                <div>
                  <p className="text-zinc-200 text-sm font-medium">
                    {item.product.name}
                  </p>
                  <p className="text-zinc-500 text-xs">
                    x{item.quantity} un. ($
                    {item.product.price.toLocaleString("es-CL")})
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-amber-500 font-bold text-sm">
                    $
                    {(item.quantity * item.product.price).toLocaleString(
                      "es-CL",
                    )}
                  </span>
                  <button
                    onClick={() => removeFromCart(index)}
                    className="text-zinc-600 hover:text-rose-500"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-between items-center mb-4 px-2">
          <span className="text-zinc-400 font-bold">Total Pedido:</span>
          <span className="text-2xl font-black text-amber-500">
            ${totalOrder.toLocaleString("es-CL")}
          </span>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-zinc-500 hover:text-zinc-300"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={isSaving || cart.length === 0}
            className="flex-[2] py-3 bg-amber-600 text-white font-bold rounded-xl hover:bg-amber-500 shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all"
          >
            {isSaving
              ? "Guardando..."
              : editingOrder
                ? "Guardar Cambios"
                : "Confirmar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

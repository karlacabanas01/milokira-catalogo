"use client";

import { useEffect, useState } from "react";
import { User, Trash2, Truck, Store } from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig"; // Ajusta la ruta a tu archivo de config

type Product = {
  idFirebase: string;
  name: string;
  price: number;
  stock: number;
};
type CartItem = { product: Product; quantity: number };

type DeliveryType = "delivery" | "retiro";

type EditingOrderType = {
  idFirebase: string;
  customer_name: string;
  delivery_type?: DeliveryType;
  delivery_fee?: number;
  items: {
    product_id?: string;
    nombre?: string;
    quantity: number;
    unit_price: number;
  }[];
};

type Props = Readonly<{
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingOrder?: EditingOrderType | null;
}>;

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
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("retiro");
  const [deliveryFee, setDeliveryFee] = useState(0);

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
      setDeliveryType(editingOrder.delivery_type || "retiro");
      setDeliveryFee(editingOrder.delivery_fee || 0);

      const loadedCart: CartItem[] = editingOrder.items.map((item) => ({
        quantity: item.quantity,
        product: {
          idFirebase: item.product_id || "",
          name: item.nombre || "Planta",
          price: item.unit_price,
          stock: 999,
        },
      }));
      setCart(loadedCart);
    } else if (isOpen) {
      setCustomer("");
      setCart([]);
      setSelectedProductId("");
      setQty(1);
      setDeliveryType("retiro");
      setDeliveryFee(0);
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

  const subtotalOrder = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );
  const totalOrder =
    subtotalOrder + (deliveryType === "delivery" ? deliveryFee : 0);

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

      const deliveryData = {
        delivery_type: deliveryType,
        delivery_fee: deliveryType === "delivery" ? deliveryFee : 0,
      };

      if (editingOrder) {
        await updateDoc(doc(db, "Transacciones", editingOrder.idFirebase), {
          customer_name: customer,
          total_amount: totalOrder,
          items: itemsToSave,
          ...deliveryData,
        });
      } else {
        const nuevoPedidoRef = doc(collection(db, "Transacciones"));
        await setDoc(nuevoPedidoRef, {
          tipo: "pedido",
          status: "pending",
          customer_name: customer,
          total_amount: totalOrder,
          items: itemsToSave,
          created_at: new Date().toISOString(),
          ...deliveryData,
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
    <div className="fixed inset-0 bg-black/90 z-50 flex items-end sm:items-center justify-center sm:p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-zinc-900 w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 border-t sm:border border-zinc-800 shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[90vh]">
        <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-amber-500 flex items-center gap-2">
          {editingOrder ? "✏️ Editar Pedido" : "🛒 Nuevo Pedido Múltiple"}
        </h2>

        <div className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 mb-3 sm:mb-4">
          {/* Cliente */}
          <div>
            <label htmlFor="order-customer" className="text-[11px] sm:text-xs text-zinc-400 ml-1">
              Cliente / Instagram
            </label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-2.5 sm:top-3 text-zinc-500" size={16} />
              <input
                id="order-customer"
                autoFocus
                placeholder="@cliente"
                className="w-full pl-9 sm:pl-10 p-2.5 sm:p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-sm outline-none focus:border-amber-500"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
            </div>
          </div>

          {/* Tipo de entrega */}
          <div>
            <span className="text-[11px] sm:text-xs text-zinc-400 ml-1 mb-1.5 block">
              Tipo de entrega
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType("retiro")}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  deliveryType === "retiro"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40"
                    : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <Store size={14} className="sm:w-4 sm:h-4" />
                Retiro
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType("delivery")}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all ${
                  deliveryType === "delivery"
                    ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/40"
                    : "bg-zinc-950 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                }`}
              >
                <Truck size={14} className="sm:w-4 sm:h-4" />
                Delivery
              </button>
            </div>
            {deliveryType === "delivery" && (
              <div className="mt-2">
                <label htmlFor="order-delivery-fee" className="text-[11px] sm:text-xs text-zinc-500 ml-1">
                  Costo de delivery
                </label>
                <input
                  id="order-delivery-fee"
                  type="number"
                  min="0"
                  placeholder="0"
                  className="w-full mt-1 p-2.5 sm:p-3 bg-zinc-950 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500 text-xs sm:text-sm"
                  value={deliveryFee || ""}
                  onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                />
              </div>
            )}
          </div>

          {/* Agregar item */}
          <div className="bg-zinc-950 p-2.5 sm:p-3 rounded-xl border border-zinc-800">
            <label htmlFor="order-product-select" className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase mb-1.5 sm:mb-2 block">
              Agregar Item
            </label>
            <div className="flex gap-2 mb-2">
              <select
                id="order-product-select"
                className="flex-1 p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-xs sm:text-sm outline-none disabled:opacity-50"
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
                className="w-14 sm:w-16 p-2 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-center text-xs sm:text-sm outline-none"
              />
            </div>
            <button
              onClick={addToCart}
              disabled={!selectedProductId}
              className="w-full py-2 bg-zinc-800 text-zinc-300 rounded-lg text-xs sm:text-sm font-bold hover:bg-zinc-700 hover:text-white transition-colors disabled:opacity-50"
            >
              + Agregar a la lista
            </button>
          </div>

          {/* Lista del carrito */}
          <div className="border-t border-b border-zinc-800 py-2 space-y-1.5 sm:space-y-2 min-h-20 sm:min-h-25">
            {cart.length === 0 ? (
              <div className="text-center text-zinc-600 py-6 sm:py-8 italic text-xs sm:text-sm">
                La lista está vacía...
              </div>
            ) : (
              cart.map((item, index) => (
                <div
                  key={item.product.idFirebase}
                  className="flex justify-between items-center bg-zinc-950 p-2.5 sm:p-3 rounded-lg border border-zinc-800/50"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="text-zinc-200 text-xs sm:text-sm font-medium truncate">
                      {item.product.name}
                    </p>
                    <p className="text-zinc-500 text-[10px] sm:text-xs">
                      x{item.quantity} un. ($
                      {item.product.price.toLocaleString("es-CL")})
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    <span className="text-amber-500 font-bold text-xs sm:text-sm">
                      $
                      {(item.quantity * item.product.price).toLocaleString(
                        "es-CL",
                      )}
                    </span>
                    <button
                      onClick={() => removeFromCart(index)}
                      className="text-zinc-600 hover:text-rose-500"
                    >
                      <Trash2 size={14} className="sm:w-4 sm:h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Totales */}
        <div className="mb-3 sm:mb-4 px-1 sm:px-2 space-y-1">
          {deliveryType === "delivery" && deliveryFee > 0 && (
            <>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-zinc-500">Subtotal:</span>
                <span className="text-zinc-400 font-mono">
                  ${subtotalOrder.toLocaleString("es-CL")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm">
                <span className="text-zinc-500">Delivery:</span>
                <span className="text-indigo-400 font-mono">
                  ${deliveryFee.toLocaleString("es-CL")}
                </span>
              </div>
            </>
          )}
          <div className="flex justify-between items-center pt-1">
            <span className="text-zinc-400 font-bold text-sm sm:text-base">Total Pedido:</span>
            <span className="text-xl sm:text-2xl font-black text-amber-500">
              ${totalOrder.toLocaleString("es-CL")}
            </span>
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 sm:py-3 text-zinc-500 hover:text-zinc-300 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={isSaving || cart.length === 0}
            className="flex-[2] py-2.5 sm:py-3 bg-amber-600 text-white font-bold rounded-xl text-sm hover:bg-amber-500 shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all"
          >
            {isSaving && "Guardando..."}
            {!isSaving && editingOrder && "Guardar Cambios"}
            {!isSaving && !editingOrder && "Confirmar Pedido"}
          </button>
        </div>
      </div>
    </div>
  );
}

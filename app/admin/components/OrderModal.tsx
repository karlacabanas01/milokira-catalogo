"use client";

import { useEffect, useState } from "react";
import {
  User,
  Trash2,
  Truck,
  Store,
  Plus,
  Minus,
  ShoppingCart,
  X,
  Check,
  MapPin,
  Phone,
  StickyNote,
  CalendarDays,
} from "lucide-react";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type DeliveryType = "delivery" | "retiro";

type EditingOrderType = {
  idFirebase: string;
  customer_name: string;
  delivery_type?: DeliveryType;
  delivery_fee?: number;
  address?: string;
  phone?: string;
  notes?: string;
  delivery_day?: string;
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

const newId = () =>
  `i-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export default function OrderModal({
  isOpen,
  onClose,
  onSuccess,
  editingOrder,
}: Props) {
  const [customer, setCustomer] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("retiro");
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [deliveryDay, setDeliveryDay] = useState("");

  // Form para nuevo item
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [itemQty, setItemQty] = useState("1");

  useEffect(() => {
    if (editingOrder && isOpen) {
      setCustomer(editingOrder.customer_name);
      setDeliveryType(editingOrder.delivery_type || "retiro");
      setDeliveryFee(editingOrder.delivery_fee || 0);
      setAddress(editingOrder.address || "");
      setPhone(editingOrder.phone || "");
      setNotes(editingOrder.notes || "");
      setDeliveryDay(editingOrder.delivery_day || "");

      const loadedCart: CartItem[] = editingOrder.items.map((item) => ({
        id: item.product_id || newId(),
        name: item.nombre || "Planta",
        price: item.unit_price,
        quantity: item.quantity,
      }));
      setCart(loadedCart);
    } else if (isOpen) {
      setCustomer("");
      setCart([]);
      setDeliveryType("retiro");
      setDeliveryFee(0);
      setAddress("");
      setPhone("");
      setNotes("");
      setDeliveryDay("");
    }
    setItemName("");
    setItemPrice("");
    setItemQty("1");
  }, [editingOrder, isOpen]);

  if (!isOpen) return null;

  const addItem = () => {
    const name = itemName.trim();
    const price = Number(itemPrice) || 0;
    const qty = Math.max(1, Number(itemQty) || 1);
    if (!name) return;
    setCart((prev) => [
      ...prev,
      { id: newId(), name, price, quantity: qty },
    ]);
    setItemName("");
    setItemPrice("");
    setItemQty("1");
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotalOrder = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0,
  );
  const totalOrder =
    subtotalOrder + (deliveryType === "delivery" ? deliveryFee : 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSaveOrder = async () => {
    if (!customer || cart.length === 0) {
      alert("Falta el cliente o las plantas del pedido");
      return;
    }
    setIsSaving(true);

    try {
      const itemsToSave = cart.map((item) => ({
        nombre: item.name,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const deliveryData = {
        delivery_type: deliveryType,
        delivery_fee: deliveryType === "delivery" ? deliveryFee : 0,
        address: deliveryType === "delivery" ? address.trim() : "",
        phone: phone.trim(),
        notes: notes.trim(),
        delivery_day: deliveryType === "delivery" ? deliveryDay : "",
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

  const formatCLP = (n: number) => `$${n.toLocaleString("es-CL")}`;

  const itemsLabel = totalItems === 1 ? "planta" : "plantas";
  const headerSubtitle =
    totalItems === 0
      ? "Anota las plantas del pedido"
      : `${totalItems} ${itemsLabel} en el pedido`;

  return (
    <div className="fixed inset-0 bg-stone-900/40 z-50 flex items-end sm:items-center justify-center sm:p-6 backdrop-blur-sm animate-in fade-in">
      <div className="relative bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border-t sm:border border-stone-200 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Fondo decorativo */}
        <div className="pointer-events-none absolute inset-0 opacity-50">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-300/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-milokira-lila/20 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-stone-100 bg-white/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-linear-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shadow-amber-300/50 shrink-0">
              <ShoppingCart size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-stone-800 tracking-tight truncate">
                {editingOrder ? "Editar pedido" : "Nuevo pedido"}
              </h2>
              <p className="text-[11px] sm:text-xs text-stone-500 font-medium">
                {headerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-500 border border-stone-200 transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className="relative z-10 flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4">
          {/* Cliente */}
          <div>
            <label
              htmlFor="order-customer"
              className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1"
            >
              Cliente
            </label>
            <div className="relative mt-1.5">
              <User
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                size={16}
              />
              <input
                id="order-customer"
                placeholder="@cliente o nombre"
                className="w-full pl-10 pr-3 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 text-sm outline-none focus:bg-white focus:border-amber-400 transition-colors placeholder:text-stone-400"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
              />
            </div>
          </div>

          {/* Plantas del pedido (lo más importante, va arriba) */}
          <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl p-3 sm:p-4 shadow-md shadow-emerald-200">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-emerald-700 font-black uppercase tracking-widest">
                  Plantas del pedido
                </span>
                {cart.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black shadow-sm">
                    {cart.length}
                  </span>
                )}
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-[10px] text-stone-500 hover:text-rose-500 font-bold uppercase tracking-wide transition-colors"
                >
                  Vaciar
                </button>
              )}
            </div>

            {cart.length > 0 && (
              <div className="space-y-2 mb-3">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-stone-200 rounded-xl p-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-stone-800 text-base sm:text-lg font-bold leading-tight flex-1">
                        {item.name}
                      </p>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-rose-500 shrink-0 transition-colors"
                        aria-label="Eliminar"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 bg-stone-100 rounded-lg border border-stone-200 p-0.5">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-md transition-colors"
                          aria-label="Restar"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="min-w-6 text-center text-xs font-bold text-stone-800">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-md transition-colors"
                          aria-label="Sumar"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-emerald-700 font-black text-sm font-mono">
                        {formatCLP(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Form de nueva planta */}
            <div className="bg-white border-2 border-dashed border-emerald-400 rounded-xl p-3 space-y-2">
              <input
                placeholder="Nombre de la planta"
                className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 outline-none focus:bg-white focus:border-amber-400 text-xs sm:text-sm placeholder:text-stone-400"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addItem();
                  }
                }}
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Precio $"
                  className="flex-1 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 outline-none focus:bg-white focus:border-amber-400 text-xs sm:text-sm placeholder:text-stone-400"
                  value={itemPrice}
                  onChange={(e) => setItemPrice(e.target.value)}
                />
                <input
                  type="number"
                  min="1"
                  placeholder="Cant"
                  className="w-20 px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 text-center font-bold outline-none focus:bg-white focus:border-amber-400 text-xs sm:text-sm placeholder:text-stone-400"
                  value={itemQty}
                  onChange={(e) => setItemQty(e.target.value)}
                />
                <button
                  type="button"
                  onClick={addItem}
                  disabled={!itemName.trim()}
                  className="shrink-0 px-3 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center gap-1 transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-emerald-300"
                  aria-label="Agregar planta"
                >
                  <Plus size={14} strokeWidth={3} />
                </button>
              </div>
            </div>
          </div>

          {/* Tipo de entrega */}
          <div>
            <span className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
              Entrega
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDeliveryType("retiro")}
                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all ${
                  deliveryType === "retiro"
                    ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/40 shadow-md shadow-emerald-200"
                    : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                <Store size={14} />
                Retiro
              </button>
              <button
                type="button"
                onClick={() => setDeliveryType("delivery")}
                className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all ${
                  deliveryType === "delivery"
                    ? "bg-milokira-lila/10 text-milokira-lila border-milokira-lila/40 shadow-md shadow-milokira-lila/20"
                    : "bg-stone-50 text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                <Truck size={14} />
                Delivery
              </button>
            </div>
            {deliveryType === "delivery" && (
              <div className="mt-2 space-y-2">
                <input
                  type="number"
                  min="0"
                  placeholder="Costo de delivery"
                  className="w-full px-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-milokira-lila text-xs sm:text-sm placeholder:text-stone-400"
                  value={deliveryFee || ""}
                  onChange={(e) => setDeliveryFee(Number(e.target.value) || 0)}
                />
                <div className="relative">
                  <CalendarDays
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                    size={14}
                  />
                  <select
                    value={deliveryDay}
                    onChange={(e) => setDeliveryDay(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-milokira-lila text-xs sm:text-sm"
                  >
                    <option value="">Día de entrega...</option>
                    <option value="martes">Martes</option>
                    <option value="viernes">Viernes</option>
                    <option value="otro">Otro día</option>
                  </select>
                </div>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 text-stone-400" size={14} />
                  <textarea
                    rows={2}
                    placeholder="Dirección de entrega"
                    className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-milokira-lila text-xs sm:text-sm placeholder:text-stone-400 resize-none"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Teléfono */}
          <div>
            <span className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
              Teléfono (opcional)
            </span>
            <div className="relative">
              <Phone
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                size={14}
              />
              <input
                type="tel"
                placeholder="+56 9 ..."
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 text-xs sm:text-sm placeholder:text-stone-400"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Notas */}
          <div>
            <span className="text-[10px] sm:text-xs text-stone-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
              Notas (opcional)
            </span>
            <div className="relative">
              <StickyNote className="absolute left-3 top-3 text-stone-400" size={14} />
              <textarea
                rows={2}
                placeholder="Ej: portón verde, no tocar timbre..."
                className="w-full pl-9 pr-3 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-700 outline-none focus:bg-white focus:border-amber-400 text-xs sm:text-sm placeholder:text-stone-400 resize-none"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

        </div>

        {/* Totales + acciones */}
        <div className="relative z-10 shrink-0 border-t border-stone-100 bg-white/90 backdrop-blur-xl px-5 sm:px-7 py-4 space-y-3">
          <div className="space-y-1">
            {deliveryType === "delivery" && deliveryFee > 0 && (
              <>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Subtotal</span>
                  <span className="text-stone-700 font-mono">
                    {formatCLP(subtotalOrder)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-stone-500">Delivery</span>
                  <span className="text-milokira-lila font-mono">
                    {formatCLP(deliveryFee)}
                  </span>
                </div>
              </>
            )}
            <div className="flex justify-between items-baseline pt-1">
              <span className="text-stone-500 font-bold text-sm uppercase tracking-wide">
                Total
              </span>
              <span className="text-2xl sm:text-3xl font-black bg-linear-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">
                {formatCLP(totalOrder)}
              </span>
            </div>
          </div>
          <button
            onClick={handleSaveOrder}
            disabled={isSaving || cart.length === 0 || !customer}
            className="w-full py-3.5 bg-linear-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white font-black rounded-xl text-sm tracking-wide shadow-lg shadow-emerald-400/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {isSaving ? (
              "Guardando..."
            ) : (
              <>
                <Check size={18} strokeWidth={3} />
                {editingOrder ? "Guardar cambios" : "Confirmar pedido"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

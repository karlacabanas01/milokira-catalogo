"use client";

import { useEffect, useMemo, useState } from "react";
import {
  User,
  Trash2,
  Truck,
  Store,
  Search,
  Plus,
  Minus,
  ShoppingCart,
  X,
  Package,
  Check,
} from "lucide-react";
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

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
  const PRODUCTS_PAGE_SIZE = 6;
  const [customer, setCustomer] = useState("");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PAGE_SIZE);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("retiro");
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const fetchProducts = async () => {
        setIsLoadingProducts(true);
        try {
          const querySnapshot = await getDocs(collection(db, "Plantas"));
          const listaPlantas: Product[] = [];

          querySnapshot.forEach((documento) => {
            const data = documento.data();
            if (data.precio?.disponible !== false) {
              listaPlantas.push({
                idFirebase: documento.id,
                name: data.nombre || "Planta sin nombre",
                price: Number(data.precio?.valor) || 0,
                stock: Number(data.stock) || 0,
              });
            }
          });

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
      setSearch("");
      setDeliveryType("retiro");
      setDeliveryFee(0);
    }
  }, [editingOrder, isOpen]);

  useEffect(() => {
    setVisibleCount(PRODUCTS_PAGE_SIZE);
  }, [search, isOpen]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => p.name.toLowerCase().includes(q));
  }, [products, search]);

  const cartMap = useMemo(() => {
    const map = new Map<string, number>();
    cart.forEach((item) => map.set(item.product.idFirebase, item.quantity));
    return map;
  }, [cart]);

  if (!isOpen) return null;

  const addToCart = (product: Product) => {
    const existing = cart.find(
      (item) => item.product.idFirebase === product.idFirebase,
    );
    if (existing) {
      setCart(
        cart.map((item) =>
          item.product.idFirebase === product.idFirebase
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        ),
      );
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (idFirebase: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.product.idFirebase === idFirebase
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (idFirebase: string) => {
    setCart(cart.filter((item) => item.product.idFirebase !== idFirebase));
  };

  const subtotalOrder = cart.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0,
  );
  const totalOrder =
    subtotalOrder + (deliveryType === "delivery" ? deliveryFee : 0);
  const totalItems = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handleSaveOrder = async () => {
    if (!customer || cart.length === 0) {
      return alert("Faltan datos (Cliente o Productos)");
    }
    setIsSaving(true);

    try {
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

  const formatCLP = (n: number) => `$${n.toLocaleString("es-CL")}`;

  const itemsLabel = totalItems === 1 ? "producto" : "productos";
  const headerSubtitle =
    totalItems === 0
      ? "Agrega productos al carrito"
      : `${totalItems} ${itemsLabel} en el carrito`;

  const emptyCatalogMessage = search
    ? "Sin resultados"
    : "No hay productos disponibles";

  let catalogContent;
  if (isLoadingProducts) {
    catalogContent = (
      <div className="text-center text-zinc-500 py-12 text-sm">
        Cargando catálogo...
      </div>
    );
  } else if (filteredProducts.length === 0) {
    catalogContent = (
      <div className="text-center text-zinc-500 py-12 text-sm">
        {emptyCatalogMessage}
      </div>
    );
  } else {
    const visibleProducts = filteredProducts.slice(0, visibleCount);
    const hasMore = visibleCount < filteredProducts.length;
    const remaining = filteredProducts.length - visibleCount;
    catalogContent = (
      <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
        {visibleProducts.map((product) => {
          const inCart = cartMap.get(product.idFirebase) || 0;
          const outOfStock = product.stock <= 0;
          const cardStateClasses =
            inCart > 0
              ? "bg-amber-500/10 border-amber-500/40 shadow-lg shadow-amber-900/20"
              : "bg-zinc-900/60 border-zinc-800 hover:border-amber-500/30 hover:bg-zinc-900";
          const disabledClasses = outOfStock
            ? "opacity-40 cursor-not-allowed"
            : "";
          const iconClasses =
            inCart > 0
              ? "bg-amber-500/20 text-amber-400"
              : "bg-zinc-800 text-zinc-500 group-hover:text-amber-400";
          const stockClasses = outOfStock ? "text-rose-400" : "text-zinc-600";
          const stockLabel = outOfStock ? "Agotado" : `Stock ${product.stock}`;
          return (
            <button
              key={product.idFirebase}
              onClick={() => addToCart(product)}
              disabled={outOfStock}
              className={`group relative overflow-hidden text-left p-3 sm:p-3.5 rounded-xl border transition-all active:scale-[0.97] ${cardStateClasses} ${disabledClasses}`}
            >
              {inCart > 0 && (
                <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-amber-500 text-amber-950 text-[10px] font-black flex items-center justify-center shadow-lg">
                  {inCart}
                </div>
              )}
              <div className="flex items-start gap-2 mb-2">
                <div
                  className={`p-1.5 rounded-lg shrink-0 transition-colors ${iconClasses}`}
                >
                  <Package size={12} />
                </div>
                <p className="text-[11px] sm:text-xs font-bold text-zinc-200 leading-tight line-clamp-2 flex-1 pr-5">
                  {product.name}
                </p>
              </div>
              <div className="flex items-end justify-between gap-1">
                <span className="text-sm sm:text-base font-black text-amber-400 font-mono">
                  {formatCLP(product.price)}
                </span>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${stockClasses}`}
                >
                  {stockLabel}
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {hasMore && (
        <div className="mt-4 flex justify-center">
          <button
            onClick={() => setVisibleCount((c) => c + PRODUCTS_PAGE_SIZE)}
            className="px-5 py-2.5 rounded-xl bg-zinc-900/80 border border-zinc-800 hover:border-amber-500/40 hover:bg-zinc-900 text-zinc-300 hover:text-amber-400 text-xs font-bold uppercase tracking-widest transition-all active:scale-[0.97]"
          >
            Ver más ({remaining})
          </button>
        </div>
      )}
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-end sm:items-center justify-center sm:p-6 backdrop-blur-md animate-in fade-in">
      <div className="relative bg-zinc-950 w-full sm:max-w-5xl rounded-t-3xl sm:rounded-3xl border-t sm:border border-zinc-800 shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh] overflow-hidden">
        {/* Fondo decorativo */}
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-20 -left-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between px-5 sm:px-7 py-4 sm:py-5 border-b border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-linear-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-900/40 shrink-0">
              <ShoppingCart size={20} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                {editingOrder ? "Editar pedido" : "Nuevo pedido"}
              </h2>
              <p className="text-[11px] sm:text-xs text-zinc-500 font-medium">
                {headerSubtitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 transition-all"
            aria-label="Cerrar"
          >
            <X size={18} />
          </button>
        </div>

        {/* Contenido: Split layout */}
        <div className="relative z-10 flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Columna izquierda: Catálogo */}
          <div className="flex-1 flex flex-col overflow-hidden border-b lg:border-b-0 lg:border-r border-zinc-800/60">
            {/* Buscador */}
            <div className="px-5 sm:px-7 pt-5 pb-3 shrink-0">
              <div className="relative">
                <Search
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  size={16}
                />
                <input
                  placeholder="Buscar planta..."
                  className="w-full pl-10 pr-10 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white text-sm outline-none focus:border-amber-500/60 focus:bg-zinc-900 transition-colors placeholder:text-zinc-600"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-zinc-600 mt-2 px-1 font-medium">
                Toca un producto para agregarlo al carrito
              </p>
            </div>

            {/* Grid de productos */}
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 pb-5">
              {catalogContent}
            </div>
          </div>

          {/* Columna derecha: Carrito + datos */}
          <div className="lg:w-96 flex flex-col overflow-hidden bg-zinc-950/40">
            <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-4">
              {/* Cliente */}
              <div>
                <label
                  htmlFor="order-customer"
                  className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest ml-1"
                >
                  Cliente
                </label>
                <div className="relative mt-1.5">
                  <User
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
                    size={16}
                  />
                  <input
                    id="order-customer"
                    placeholder="@cliente o nombre"
                    className="w-full pl-10 pr-3 py-3 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white text-sm outline-none focus:border-amber-500/60 transition-colors placeholder:text-zinc-600"
                    value={customer}
                    onChange={(e) => setCustomer(e.target.value)}
                  />
                </div>
              </div>

              {/* Tipo de entrega */}
              <div>
                <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest ml-1 mb-1.5 block">
                  Entrega
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryType("retiro")}
                    className={`flex items-center justify-center gap-1.5 py-3 rounded-xl text-xs font-bold border transition-all ${
                      deliveryType === "retiro"
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/40 shadow-lg shadow-emerald-900/20"
                        : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700"
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
                        ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/40 shadow-lg shadow-indigo-900/20"
                        : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    <Truck size={14} />
                    Delivery
                  </button>
                </div>
                {deliveryType === "delivery" && (
                  <input
                    id="order-delivery-fee"
                    type="number"
                    min="0"
                    placeholder="Costo de delivery"
                    className="w-full mt-2 px-3 py-2.5 bg-zinc-900/80 border border-zinc-800 rounded-xl text-white outline-none focus:border-indigo-500/60 text-xs sm:text-sm placeholder:text-zinc-600"
                    value={deliveryFee || ""}
                    onChange={(e) =>
                      setDeliveryFee(Number(e.target.value) || 0)
                    }
                  />
                )}
              </div>

              {/* Carrito */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">
                    Carrito
                  </span>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-[10px] text-zinc-600 hover:text-rose-400 font-bold uppercase tracking-wide transition-colors"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {cart.length === 0 ? (
                  <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-xl py-8 flex flex-col items-center justify-center text-center">
                    <ShoppingCart size={24} className="text-zinc-700 mb-2" />
                    <p className="text-zinc-600 text-xs font-medium">
                      Aún no hay productos
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div
                        key={item.product.idFirebase}
                        className="group bg-zinc-900/80 border border-zinc-800 rounded-xl p-2.5 hover:border-zinc-700 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-zinc-200 text-xs font-bold leading-tight flex-1">
                            {item.product.name}
                          </p>
                          <button
                            onClick={() =>
                              removeFromCart(item.product.idFirebase)
                            }
                            className="text-zinc-600 hover:text-rose-400 shrink-0 transition-colors"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1 bg-zinc-950 rounded-lg border border-zinc-800 p-0.5">
                            <button
                              onClick={() =>
                                updateQuantity(item.product.idFirebase, -1)
                              }
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                              aria-label="Restar"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-6 text-center text-xs font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(item.product.idFirebase, 1)
                              }
                              className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-md transition-colors"
                              aria-label="Sumar"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-amber-400 font-black text-xs font-mono">
                            {formatCLP(item.product.price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Totales + acciones */}
            <div className="shrink-0 border-t border-zinc-800/60 bg-zinc-950/80 backdrop-blur-xl px-5 sm:px-7 py-4 space-y-3">
              <div className="space-y-1">
                {deliveryType === "delivery" && deliveryFee > 0 && (
                  <>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="text-zinc-400 font-mono">
                        {formatCLP(subtotalOrder)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-zinc-500">Delivery</span>
                      <span className="text-indigo-400 font-mono">
                        {formatCLP(deliveryFee)}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-baseline pt-1">
                  <span className="text-zinc-400 font-bold text-sm uppercase tracking-wide">
                    Total
                  </span>
                  <span className="text-2xl sm:text-3xl font-black bg-linear-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                    {formatCLP(totalOrder)}
                  </span>
                </div>
              </div>
              <button
                onClick={handleSaveOrder}
                disabled={isSaving || cart.length === 0 || !customer}
                className="w-full py-3.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-white font-black rounded-xl text-sm tracking-wide shadow-lg shadow-amber-900/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
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
      </div>
    </div>
  );
}

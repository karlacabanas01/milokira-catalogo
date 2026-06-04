import { useState } from "react";
import { Pencil, Trash2, Plus, Minus } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  business_id: number;
  active: boolean;
};

type Props = {
  product: Product;
  onQuickSale: (product: Product, quantity: number) => void;
  onDelete: (id: number) => void;
  onEdit: (product: Product) => void;
};

export default function ProductCard({
  product,
  onQuickSale,
  onDelete,
  onEdit,
}: Props) {
  const [qty, setQty] = useState(1);

  const handleSale = () => {
    if (qty > product.stock) return alert("¡Stock insuficiente!");
    if (qty < 1) return;
    onQuickSale(product, qty);
    setQty(1);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(price);

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 relative group hover:border-stone-400 transition-all flex flex-col justify-between h-full">
      {/* Botones de Gestión (Flotantes) */}
      <div className="absolute top-3 right-3 flex gap-1 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <div className="bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg flex p-1 shadow-lg">
          <button
            onClick={() => onEdit(product)}
            className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-md transition-colors"
            title="Editar"
          >
            <Pencil size={16} />
          </button>
          <div className="w-[1px] bg-stone-100 mx-0.5 my-1"></div>
          <button
            onClick={() => onDelete(product.id)}
            className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-900/20 rounded-md transition-colors"
            title="Eliminar"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Info Principal */}
      <div className="mb-4 pr-2">
        {/* Nombre: Usamos line-clamp-2 para que no corte nombres largos abruptamente */}
        <h3 className="font-bold text-stone-800 text-lg leading-tight line-clamp-2 min-h-[3rem] pt-1">
          {product.name}
        </h3>

        <div className="flex items-center gap-2 mt-2">
          <p className="text-emerald-400 font-bold text-lg">
            {formatPrice(product.price)}
          </p>
          <span className="text-stone-600 text-xs">|</span>
          <p className="text-sm text-stone-500 font-medium">
            Stock:{" "}
            <span
              className={
                product.stock < 3
                  ? "text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded"
                  : "text-stone-700"
              }
            >
              {product.stock}
            </span>
          </p>
        </div>
      </div>

      {/* Zona de Acción */}
      <div className="flex gap-2 items-stretch h-11">
        {/* Selector de Cantidad */}
        <div className="flex items-center bg-milokira-crema rounded-xl border border-stone-200 w-1/3 min-w-[100px]">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-10 h-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-l-xl transition-colors active:bg-stone-200"
          >
            <Minus size={16} />
          </button>

          <input
            type="number"
            min="1"
            max={product.stock}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full bg-transparent text-center text-stone-800 font-bold outline-none appearance-none m-0 text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />

          <button
            onClick={() => setQty(Math.min(product.stock, qty + 1))}
            className="w-10 h-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-r-xl transition-colors active:bg-stone-200"
          >
            <Plus size={16} />
          </button>
        </div>

        <button
          onClick={handleSale}
          className="flex-1 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 active:scale-95 hover:bg-emerald-500 transition-all flex justify-center items-center gap-2 group/btn relative overflow-hidden"
        >
          <span className="relative z-10">Vender</span>
          <div className="absolute inset-0 bg-white/0 group-hover/btn:bg-white/10 transition-colors" />
        </button>
      </div>
    </div>
  );
}

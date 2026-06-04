import { useState } from "react";
import { Pencil, Trash2, Plus, Minus, ChevronDown, ChevronUp } from "lucide-react";

type Product = {
  id: number;
  name: string;
  price: number;
  stock: number;
  business_id: number;
  active: boolean;
};

type Props = {
  groupName: string;
  products: Product[];
  onQuickSale: (product: Product, quantity: number) => void;
  onDelete: (id: number) => void;
  onEdit: (product: Product) => void;
};

export default function ProductGroupCard({
  groupName,
  products,
  onQuickSale,
  onDelete,
  onEdit,
}: Props) {
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [qty, setQty] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);

  const currentProduct = products[selectedVariant];
  const totalStock = products.reduce((acc, p) => acc + p.stock, 0);

  const handleSale = () => {
    if (qty > currentProduct.stock) return alert("¡Stock insuficiente!");
    if (qty < 1) return;
    onQuickSale(currentProduct, qty);
    setQty(1);
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
    }).format(price);

  // Si solo hay una variante, mostrar como tarjeta simple
  if (products.length === 1) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 relative group hover:border-stone-400 transition-all flex flex-col justify-between h-full">
        {/* Botones de Gestión - En móvil van arriba en fila */}
        <div className="flex justify-end mb-2 sm:mb-0 sm:absolute sm:top-3 sm:right-3 z-10 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <div className="bg-white/90 backdrop-blur-sm border border-stone-200 rounded-lg flex p-1 shadow-lg">
            <button
              onClick={() => onEdit(currentProduct)}
              className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded-md transition-colors"
              title="Editar"
            >
              <Pencil size={16} />
            </button>
            <div className="w-[1px] bg-stone-100 mx-0.5 my-1"></div>
            <button
              onClick={() => onDelete(currentProduct.id)}
              className="p-1.5 text-stone-500 hover:text-rose-400 hover:bg-rose-900/20 rounded-md transition-colors"
              title="Eliminar"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Info Principal */}
        <div className="mb-4 sm:pr-2 sm:pt-1">
          <h3 className="font-bold text-stone-800 text-lg leading-tight line-clamp-2 min-h-10">
            {groupName}
          </h3>
          <div className="flex items-center gap-2 mt-2">
            <p className="text-emerald-400 font-bold text-lg">
              {formatPrice(currentProduct.price)}
            </p>
            <span className="text-stone-600 text-xs">|</span>
            <p className="text-sm text-stone-500 font-medium">
              Stock:{" "}
              <span
                className={
                  currentProduct.stock < 3
                    ? "text-rose-400 font-bold bg-rose-500/10 px-1.5 py-0.5 rounded"
                    : "text-stone-700"
                }
              >
                {currentProduct.stock}
              </span>
            </p>
          </div>
        </div>

        {/* Zona de Acción */}
        <div className="flex flex-col sm:flex-row gap-2 items-stretch">
          <div className="flex items-center bg-milokira-crema rounded-xl border border-stone-200 h-12 sm:w-1/3 sm:min-w-25">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="w-12 sm:w-10 h-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-l-xl transition-colors active:bg-stone-200"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min="1"
              max={currentProduct.stock}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              className="w-full bg-transparent text-center text-stone-800 font-bold outline-none appearance-none m-0 text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => setQty(Math.min(currentProduct.stock, qty + 1))}
              className="w-12 sm:w-10 h-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-r-xl transition-colors active:bg-stone-200"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleSale}
            className="flex-1 h-12 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 active:scale-95 hover:bg-emerald-500 transition-all flex justify-center items-center gap-2"
          >
            Vender
          </button>
        </div>
      </div>
    );
  }

  // Múltiples variantes - mostrar agrupado
  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 relative group hover:border-stone-400 transition-all flex flex-col justify-between h-full col-span-2">
      {/* Header con nombre y total */}
      <div className="mb-3">
        <div className="flex items-start justify-between">
          <h3 className="font-bold text-stone-800 text-lg leading-tight">
            {groupName}
          </h3>
          <span className="text-xs text-stone-500 bg-stone-100 px-2 py-1 rounded-full">
            {products.length} variantes
          </span>
        </div>
        <p className="text-sm text-stone-500 mt-1">
          Stock total: <span className="text-stone-700 font-medium">{totalStock}</span>
        </p>
      </div>

      {/* Lista de variantes */}
      <div className="space-y-2 mb-4">
        {(isExpanded ? products : products.slice(0, 3)).map((product, idx) => (
          <div
            key={product.id}
            onClick={() => {
              setSelectedVariant(products.indexOf(product));
              setQty(1);
            }}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
              products.indexOf(product) === selectedVariant
                ? "bg-emerald-600/20 border border-emerald-500/50"
                : "bg-stone-100 border border-transparent hover:border-stone-300"
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-2 h-2 rounded-full ${
                  products.indexOf(product) === selectedVariant ? "bg-emerald-500" : "bg-stone-300"
                }`}
              />
              <span className="text-emerald-400 font-bold">
                {formatPrice(product.price)}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-sm ${
                  product.stock < 3
                    ? "text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded"
                    : "text-stone-500"
                }`}
              >
                Stock: {product.stock}
              </span>
              {/* Botones de gestión por variante */}
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(product);
                  }}
                  className="p-1 text-stone-500 hover:text-stone-800 hover:bg-stone-200 rounded transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(product.id);
                  }}
                  className="p-1 text-stone-500 hover:text-rose-400 hover:bg-rose-900/20 rounded transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Botón expandir/colapsar si hay más de 3 variantes */}
        {products.length > 3 && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-center gap-1 py-2 text-stone-500 hover:text-stone-700 text-sm transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} /> Ver menos
              </>
            ) : (
              <>
                <ChevronDown size={16} /> Ver {products.length - 3} más
              </>
            )}
          </button>
        )}
      </div>

      {/* Zona de Acción */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch">
        <div className="flex items-center bg-milokira-crema rounded-xl border border-stone-200 h-12 sm:w-1/3 sm:min-w-25">
          <button
            onClick={() => setQty(Math.max(1, qty - 1))}
            className="w-12 sm:w-10 h-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-l-xl transition-colors active:bg-stone-200"
          >
            <Minus size={16} />
          </button>
          <input
            type="number"
            min="1"
            max={currentProduct.stock}
            value={qty}
            onChange={(e) => setQty(Number(e.target.value))}
            className="w-full bg-transparent text-center text-stone-800 font-bold outline-none appearance-none m-0 text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <button
            onClick={() => setQty(Math.min(currentProduct.stock, qty + 1))}
            className="w-12 sm:w-10 h-full flex items-center justify-center text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-r-xl transition-colors active:bg-stone-200"
          >
            <Plus size={16} />
          </button>
        </div>
        <button
          onClick={handleSale}
          className="flex-1 h-12 bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-900/20 active:scale-95 hover:bg-emerald-500 transition-all flex justify-center items-center gap-2"
        >
          Vender ({formatPrice(currentProduct.price)})
        </button>
      </div>
    </div>
  );
}

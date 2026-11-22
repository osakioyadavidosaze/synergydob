"use client";

import {
  ArrowDown,
  ArrowRight,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Leaf,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Sparkles,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatNaira } from "@/lib/currency";
import { CATEGORIES, type Product } from "@/lib/products";
import { getSupabase } from "@/lib/supabase";

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Synergy Foods";
const storeWhatsapp = (
  process.env.NEXT_PUBLIC_STORE_WHATSAPP || "2348027098029"
).replace(/\D/g, "");
const filters = ["All", ...CATEGORIES] as const;
type Cart = Record<string, number>;

const categoryEmoji: Record<string, string> = {
  "Grains & Rice": "🍚",
  "Tubers & Yam": "🍠",
  "Oils & Seasoning": "🫙",
  "Beans & Legumes": "🫘",
  "Vegetables & Spices": "🌶️",
  Provisions: "🛍️",
};

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);

  if (!product.image_url || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#f0eee3] text-6xl">
        <span aria-hidden="true">{categoryEmoji[product.category] || "🥬"}</span>
      </div>
    );
  }

  return (
    // Product photos are supplied by the store and use a public Supabase URL.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={product.image_url}
      alt={product.name}
      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default function Storefront() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<Cart>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [orderError, setOrderError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = getSupabase();

    if (!supabase) {
      setLoading(false);
      setLoadError(
        "Connect your Supabase project to load the latest foodstuff and prices.",
      );
      return;
    }

    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setLoadError("We couldn't load the foodstuff just now. Please try again.");
        } else {
          setProducts((data || []) as Product[]);
        }
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    return products.filter((product) => {
      const matchesCategory =
        activeCategory === "All" || product.category === activeCategory;
      const matchesSearch =
        !term ||
        product.name.toLocaleLowerCase().includes(term) ||
        product.category.toLocaleLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [products, activeCategory, search]);

  const cartItems = products.filter((product) => (cart[product.id] || 0) > 0);
  const itemCount = Object.values(cart).reduce((sum, quantity) => sum + quantity, 0);
  const total = cartItems.reduce(
    (sum, product) => sum + product.price_ngn * (cart[product.id] || 0),
    0,
  );

  function updateQuantity(product: Product, change: number) {
    if (!product.in_stock) return;
    setCart((current) => {
      const next = { ...current };
      const quantity = (next[product.id] || 0) + change;
      if (quantity <= 0) delete next[product.id];
      else next[product.id] = quantity;
      return next;
    });
  }

  function sendOrder() {
    setOrderError("");
    if (!cartItems.length) {
      setOrderError("Add at least one available item to your order.");
      return;
    }
    if (!address.trim() || !phone.trim()) {
      setOrderError("Please enter your delivery address and phone number.");
      return;
    }
    const lines = cartItems.map((product) => {
      const quantity = cart[product.id];
      return `• ${product.name} (${quantity} × ${product.unit}) — ${formatNaira(
        quantity * product.price_ngn,
      )}`;
    });
    const message = [
      `Hello ${storeName}! I'd like to place an order:`,
      "",
      ...lines,
      "",
      `Total: ${formatNaira(total)}`,
      `Delivery address: ${address.trim()}`,
      `Phone: ${phone.trim()}`,
    ].join("\n");
    window.open(
      `https://wa.me/${storeWhatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <main className="min-h-screen overflow-hidden bg-cream">
      <div className="bg-ink px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        <span className="inline-flex items-center gap-2">
          <Leaf size={14} className="text-lime" />
          Good food, good people. Order fresh foodstuff for your home.
        </span>
      </div>

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-3" aria-label={`${storeName} home`}>
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-leaf text-lime">
            <ShoppingBasket size={24} strokeWidth={2.2} />
          </span>
          <span>
            <span className="block text-lg font-black leading-tight tracking-tight text-ink">
              {storeName}
            </span>
            <span className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted">
              Your neighbourhood market
            </span>
          </span>
        </a>
        <div className="flex items-center gap-2">
          <a
            href="#how-to-order"
            className="hidden rounded-full px-4 py-2 text-sm font-bold text-ink hover:bg-white sm:block"
          >
            How to order
          </a>
          <button
            onClick={() => setCartOpen(true)}
            className="relative flex min-h-12 items-center gap-2 rounded-full bg-lime px-4 text-sm font-extrabold text-ink transition hover:bg-[#cceb50]"
            aria-label={`Open basket, ${itemCount} items`}
          >
            <ShoppingCart size={19} />
            <span className="hidden sm:inline">My basket</span>
            {itemCount > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-ink px-1 text-xs text-white">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 pb-10 pt-2 sm:px-8 sm:pb-16">
        <div className="relative overflow-hidden rounded-[2rem] bg-[#193f2e] px-6 py-10 text-white sm:px-12 sm:py-14 lg:px-16 lg:py-[4.5rem]">
          <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full bg-[#416d41]/50 blur-3xl" />
          <div className="absolute -bottom-28 right-[22%] h-64 w-64 rounded-full bg-lime/10 blur-3xl" />
          <div className="relative z-10 max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-wide text-lime">
              <Sparkles size={14} /> FROM OUR MARKET TO YOUR TABLE
            </span>
            <h1 className="max-w-xl text-[2.7rem] font-black leading-[1.03] tracking-[-.055em] sm:text-6xl lg:text-[4.3rem]">
              Your kitchen&apos;s
              <br />
              <span className="text-lime">happy place.</span>
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-white/75 sm:text-lg">
              The foodstuff you grew up loving, picked with care and ready for your
              next pot of goodness.
            </p>
            <a
              href="#shop"
              className="mt-7 inline-flex min-h-12 items-center gap-3 rounded-full bg-lime px-6 text-sm font-extrabold text-ink transition hover:-translate-y-0.5 hover:bg-[#cceb50]"
            >
              Shop foodstuff <ArrowDown size={17} />
            </a>
          </div>
          <div
            className="pointer-events-none absolute bottom-[-3.5rem] right-[-.5rem] hidden select-none text-[14rem] opacity-90 lg:block"
            aria-hidden="true"
          >
            🧺
          </div>
          <div className="pointer-events-none absolute right-[17%] top-12 hidden select-none text-5xl lg:block" aria-hidden="true">
            🌶️
          </div>
        </div>
      </section>

      <section id="shop" className="mx-auto max-w-7xl scroll-mt-5 px-5 pb-20 sm:px-8">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <span className="text-xs font-black uppercase tracking-[.18em] text-leaf">
              MARKET PICKS
            </span>
            <h2 className="mt-2 text-3xl font-black tracking-[-.04em] text-ink sm:text-4xl">
              Good things for your pot
            </h2>
            <p className="mt-2 text-sm text-muted sm:text-base">
              Take a look around. There&apos;s something for every meal.
            </p>
          </div>
          <label className="flex min-h-12 w-full items-center gap-3 rounded-2xl border border-[#e6e3d8] bg-white px-4 md:max-w-sm">
            <Search size={19} className="shrink-0 text-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search rice, beans, yam..."
              className="w-full border-0 bg-transparent text-sm text-ink outline-none placeholder:text-[#9b9d93]"
              aria-label="Search foodstuff"
            />
            <kbd className="hidden rounded bg-[#f3f1e9] px-2 py-1 text-[10px] text-muted sm:block">
              FIND
            </kbd>
          </label>
        </div>

        <div className="no-scrollbar -mx-5 mt-7 flex gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:flex-wrap sm:px-0">
          {filters.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold transition ${
                activeCategory === category
                  ? "bg-leaf text-white shadow-sm"
                  : "border border-[#e8e5db] bg-white text-ink hover:border-leaf/40"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="mt-7 flex items-center justify-between border-b border-[#e9e6dc] pb-3">
          <p className="text-sm font-bold text-ink">
            {loading ? "Finding the good stuff…" : `${filteredProducts.length} items`}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
            Freshly updated <ChevronDown size={14} />
          </span>
        </div>

        {loadError && (
          <div className="mt-6 rounded-2xl border border-[#eadcb8] bg-[#fff9e9] px-5 py-4 text-sm text-[#725a28]">
            {loadError} Set up the environment variables and run the database
            migration to get started.
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-3xl bg-white p-3">
                <div className="aspect-[1.05] rounded-2xl bg-[#eeece3]" />
                <div className="mt-4 h-4 w-3/4 rounded bg-[#eeece3]" />
                <div className="mt-3 h-4 w-1/2 rounded bg-[#eeece3]" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length ? (
          <div className="grid grid-cols-2 gap-3 pt-5 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
            {filteredProducts.map((product) => (
              <article
                key={product.id}
                className="group min-w-0 overflow-hidden rounded-[1.35rem] border border-[#edeae1] bg-white p-2.5 transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_35px_-20px_rgba(38,53,44,.3)] sm:rounded-3xl sm:p-3"
              >
                <div className="relative aspect-[1.04] overflow-hidden rounded-[1rem] bg-[#f0eee3] sm:rounded-[1.3rem]">
                  <ProductImage product={product} />
                  <span
                    className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:left-3 sm:top-3 sm:text-xs ${
                      product.in_stock
                        ? "bg-white/95 text-leaf"
                        : "bg-ink/90 text-white"
                    }`}
                  >
                    {product.in_stock ? (
                      <Check size={12} />
                    ) : (
                      <CircleHelp size={12} />
                    )}
                    {product.in_stock ? "Available" : "Sold Out"}
                  </span>
                </div>
                <div className="px-1 pb-1 pt-3 sm:px-1.5 sm:pt-4">
                  <p className="truncate text-[10px] font-extrabold uppercase tracking-[.13em] text-[#8b8e82] sm:text-[11px]">
                    {product.category}
                  </p>
                  <h3 className="mt-1 truncate text-sm font-extrabold text-ink sm:text-base">
                    {product.name}
                  </h3>
                  <div className="mt-2 flex min-h-10 items-center justify-between gap-1">
                    <p className="min-w-0 text-xs font-black leading-4 text-leaf sm:text-sm">
                      {formatNaira(product.price_ngn)}
                      <span className="block truncate font-medium text-muted">
                        {product.unit}
                      </span>
                    </p>
                    {product.in_stock ? (
                      <button
                        onClick={() => updateQuantity(product, 1)}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eff5e8] text-leaf transition hover:bg-lime"
                        aria-label={`Add ${product.name} to basket`}
                      >
                        {cart[product.id] ? (
                          <span className="text-sm font-black">
                            {cart[product.id]}
                          </span>
                        ) : (
                          <Plus size={19} strokeWidth={2.5} />
                        )}
                      </button>
                    ) : (
                      <span className="flex h-10 items-center rounded-full bg-[#f4f3ef] px-3 text-[10px] font-bold text-muted sm:text-xs">
                        Restocking
                      </span>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#eff2e7] text-3xl">
              🧺
            </span>
            <h3 className="mt-4 text-lg font-black text-ink">
              {search ? "Nothing found just yet" : "The shelves are getting ready"}
            </h3>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted">
              {search
                ? "Try another search or choose a different category."
                : "Check back soon for fresh picks from the market."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-4 font-bold text-leaf underline underline-offset-4"
              >
                Clear search
              </button>
            )}
          </div>
        )}
      </section>

      <section id="how-to-order" className="bg-[#f0eee5]">
        <div className="mx-auto grid max-w-7xl gap-7 px-5 py-12 sm:grid-cols-3 sm:px-8 sm:py-14">
          {[
            {
              icon: <ShoppingBasket size={20} />,
              title: "Pick your favourites",
              text: "Add all the good stuff you need to your basket.",
            },
            {
              icon: <ArrowRight size={20} />,
              title: "Send your order",
              text: "Share your basket with us on WhatsApp in one tap.",
            },
            {
              icon: <Clock3 size={20} />,
              title: "We’ll take it from here",
              text: "We’ll confirm your order and delivery details with you.",
            },
          ].map((step, index) => (
            <div key={step.title} className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-leaf">
                {step.icon}
              </span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#919286]">
                  STEP 0{index + 1}
                </p>
                <h3 className="mt-1 font-extrabold text-ink">{step.title}</h3>
                <p className="mt-1 text-sm leading-5 text-muted">{step.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-5 py-7 text-xs font-medium text-muted sm:flex-row sm:items-center sm:px-8">
        <p>© {new Date().getFullYear()} {storeName}. Made with love for your kitchen.</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a
            href="tel:+2348027098029"
            className="font-bold text-ink hover:text-leaf"
          >
            Call us: 08027098029
          </a>
          <a
            href={`https://wa.me/${storeWhatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold text-leaf hover:text-ink"
          >
            WhatsApp us
          </a>
          <a href="/admin" className="rounded px-2 py-1 hover:text-leaf">
            Store manager
          </a>
        </div>
      </footer>

      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <button
            className="absolute inset-0 bg-ink/45 backdrop-blur-[2px]"
            aria-label="Close basket"
            onClick={() => setCartOpen(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="basket-title"
            className="relative flex h-full w-full max-w-md flex-col bg-cream shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#e6e3d8] px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-black uppercase tracking-[.15em] text-leaf">
                  READY WHEN YOU ARE
                </p>
                <h2 id="basket-title" className="mt-1 text-2xl font-black tracking-tight text-ink">
                  Your basket
                </h2>
              </div>
              <button
                onClick={() => setCartOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink"
                aria-label="Close basket"
              >
                <X size={21} />
              </button>
            </div>
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 py-4 sm:px-7">
              {cartItems.length ? (
                <div className="divide-y divide-[#e8e5db]">
                  {cartItems.map((product) => (
                    <div key={product.id} className="flex gap-3 py-4">
                      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl">
                        <ProductImage product={product} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-extrabold text-ink">{product.name}</p>
                        <p className="mt-1 text-xs text-muted">
                          {formatNaira(product.price_ngn)} {product.unit}
                        </p>
                        <p className="mt-1 text-sm font-extrabold text-leaf">
                          {formatNaira(product.price_ngn * cart[product.id])}
                        </p>
                      </div>
                      <div className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-[#e4e1d7] bg-white p-1">
                        <button
                          onClick={() => updateQuantity(product, -1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-[#f1f0eb]"
                          aria-label={`Remove one ${product.name}`}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="min-w-5 text-center text-xs font-black">
                          {cart[product.id]}
                        </span>
                        <button
                          onClick={() => updateQuantity(product, 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink hover:bg-[#eff5e8]"
                          aria-label={`Add one ${product.name}`}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-56 flex-col items-center justify-center text-center">
                  <span className="text-5xl">🧺</span>
                  <p className="mt-4 font-extrabold text-ink">Your basket is taking a nap</p>
                  <p className="mt-1 text-sm text-muted">Add a few favourites to wake it up.</p>
                  <button
                    onClick={() => setCartOpen(false)}
                    className="mt-4 inline-flex items-center gap-1 font-bold text-leaf"
                  >
                    Keep shopping <ArrowRight size={16} />
                  </button>
                </div>
              )}

              <div className="mt-4 space-y-4 rounded-2xl bg-white p-4 sm:p-5">
                <h3 className="font-extrabold text-ink">Where should we deliver?</h3>
                <label className="block text-xs font-bold text-muted">
                  Delivery address
                  <textarea
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    rows={2}
                    placeholder="House number, street, area..."
                    className="mt-1.5 w-full resize-none rounded-xl border border-[#e6e3d8] bg-[#fdfcf8] px-3 py-2.5 text-sm font-normal text-ink placeholder:text-[#a4a59b]"
                  />
                </label>
                <label className="block text-xs font-bold text-muted">
                  Your phone number
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    placeholder="e.g. 080 1234 5678"
                    className="mt-1.5 min-h-11 w-full rounded-xl border border-[#e6e3d8] bg-[#fdfcf8] px-3 text-sm font-normal text-ink placeholder:text-[#a4a59b]"
                  />
                </label>
              </div>
            </div>
            <div className="border-t border-[#e6e3d8] bg-white px-5 pb-5 pt-4 sm:px-7 sm:pb-7">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-bold text-muted">Your total</span>
                <span className="text-xl font-black text-ink">{formatNaira(total)}</span>
              </div>
              {orderError && (
                <p role="alert" className="mb-3 text-sm font-semibold text-[#a84332]">
                  {orderError}
                </p>
              )}
              <button
                onClick={sendOrder}
                disabled={!cartItems.length}
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-leaf px-5 text-sm font-extrabold text-white transition hover:bg-[#205237] disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ShoppingBasket size={19} />
                Send order on WhatsApp
              </button>
              <p className="mt-3 text-center text-[11px] leading-4 text-muted">
                We&apos;ll confirm availability, delivery fee and payment with you.
              </p>
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

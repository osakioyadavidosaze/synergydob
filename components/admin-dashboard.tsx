"use client";

import {
  ArrowLeft,
  Check,
  ImagePlus,
  LoaderCircle,
  LogOut,
  Package,
  Pencil,
  Plus,
  Save,
  ShoppingBasket,
  Trash2,
  X,
} from "lucide-react";
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import { formatNaira } from "@/lib/currency";
import {
  CATEGORIES,
  type Category,
  type Product,
  type ProductInput,
} from "@/lib/products";
import { getSupabase } from "@/lib/supabase";

type ProductForm = {
  name: string;
  category: Category;
  price: string;
  unit: string;
  image: File | null;
};

const emptyForm: ProductForm = {
  name: "",
  category: CATEGORIES[0],
  price: "",
  unit: "per paint bucket",
  image: null,
};

const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Synergy Foods";

async function compressImage(file: File): Promise<Blob> {
  const imageUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = imageUrl;
    await image.decode();

    const maxDimension = 1400;
    const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser couldn't prepare this photo.");

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Your photo couldn't be compressed. Please try another."));
        },
        "image/jpeg",
        0.78,
      );
    });
  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}

function ProductThumbnail({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);
  if (!product.image_url || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#eff1e8] text-2xl">
        🥬
      </div>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src={product.image_url}
      alt=""
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

export default function AdminDashboard() {
  const supabase = getSupabase();
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userEmail, setUserEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [pageError, setPageError] = useState("");
  const [notice, setNotice] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [savingProduct, setSavingProduct] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [priceValue, setPriceValue] = useState("");
  const [savingPrice, setSavingPrice] = useState(false);
  const [busyProduct, setBusyProduct] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!supabase) {
      setPageError("Add your Supabase URL and anon key to the environment to continue.");
      setSessionLoading(false);
      return;
    }

    let active = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setPageError(error.message);
      const user = data.session?.user;
      setUserEmail(user?.email || "");
      setIsAdmin(user?.app_metadata?.role === "admin");
      setSessionLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      const user = session?.user;
      setUserEmail(user?.email || "");
      setIsAdmin(user?.app_metadata?.role === "admin");
      setPageError("");
      setSessionLoading(false);
    });

    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isAdmin || !supabase) return;
    let active = true;
    setLoadingProducts(true);
    supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setPageError(`Couldn't load your inventory: ${error.message}`);
        else setProducts((data || []) as Product[]);
        setLoadingProducts(false);
      });
    return () => {
      active = false;
    };
  }, [isAdmin, supabase]);

  useEffect(() => {
    if (!form.image) {
      setPreviewUrl("");
      return;
    }
    const url = URL.createObjectURL(form.image);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    setPageError("");
    setSigningIn(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setPageError(error.message);
    setSigningIn(false);
  }

  async function handleSignOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) setPageError(`Couldn't sign out: ${error.message}`);
    else {
      setProducts([]);
      setNotice("");
    }
  }

  async function uploadImage(file: File): Promise<string> {
    if (!supabase) throw new Error("Supabase isn't configured.");
    const compressed = await compressImage(file);
    const path = `${Date.now()}-${file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")}.jpg`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
    if (error) throw new Error(`Photo upload failed: ${error.message}`);
    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  }

  async function handleAddProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const price = Number(form.price);
    if (!form.name.trim() || !Number.isFinite(price) || price < 0 || !form.unit.trim()) {
      setPageError("Add a name, a valid price and a unit size before saving.");
      return;
    }

    setPageError("");
    setNotice("");
    setSavingProduct(true);
    try {
      const imageUrl = form.image ? await uploadImage(form.image) : null;
      const product: ProductInput = {
        name: form.name.trim(),
        category: form.category,
        price_ngn: price,
        unit: form.unit.trim(),
        image_url: imageUrl,
        in_stock: true,
      };
      const { data, error } = await supabase
        .from("products")
        .insert(product)
        .select("*")
        .single();
      if (error) {
        setPageError(
          imageUrl
            ? `The photo uploaded, but the item couldn't be saved: ${error.message}`
            : `Couldn't save this item: ${error.message}`,
        );
        return;
      }
      setProducts((current) => [data as Product, ...current]);
      setForm(emptyForm);
      setFormOpen(false);
      setNotice(`${product.name} added to your inventory.`);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Couldn't prepare the photo.");
    } finally {
      setSavingProduct(false);
    }
  }

  async function toggleStock(product: Product) {
    if (!supabase) return;
    setPageError("");
    setNotice("");
    setBusyProduct(product.id);
    const { error } = await supabase
      .from("products")
      .update({ in_stock: !product.in_stock })
      .eq("id", product.id);
    if (error) setPageError(`Couldn't update ${product.name}: ${error.message}`);
    else {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, in_stock: !product.in_stock } : item,
        ),
      );
      setNotice(`${product.name} marked ${product.in_stock ? "sold out" : "in stock"}.`);
    }
    setBusyProduct(null);
  }

  async function savePrice(product: Product) {
    if (!supabase) return;
    const price = Number(priceValue);
    if (!Number.isFinite(price) || price < 0) {
      setPageError("Enter a valid price of zero or more.");
      return;
    }
    setPageError("");
    setNotice("");
    setSavingPrice(true);
    const { error } = await supabase
      .from("products")
      .update({ price_ngn: price })
      .eq("id", product.id);
    if (error) setPageError(`Couldn't update the price: ${error.message}`);
    else {
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, price_ngn: price } : item,
        ),
      );
      setEditingPrice(null);
      setNotice(`${product.name} price updated.`);
    }
    setSavingPrice(false);
  }

  async function deleteProduct(product: Product) {
    if (!supabase) return;
    if (!window.confirm(`Delete "${product.name}" from your inventory? This can't be undone.`)) {
      return;
    }
    setPageError("");
    setNotice("");
    setBusyProduct(product.id);
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) setPageError(`Couldn't delete ${product.name}: ${error.message}`);
    else {
      setProducts((current) => current.filter((item) => item.id !== product.id));
      setNotice(`${product.name} removed from your inventory.`);
    }
    setBusyProduct(null);
  }

  function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const image = event.target.files?.[0] || null;
    if (image && !image.type.startsWith("image/")) {
      setPageError("Choose an image file to add a product photo.");
      return;
    }
    setPageError("");
    setForm((current) => ({ ...current, image }));
  }

  const inStockCount = products.filter((product) => product.in_stock).length;

  if (sessionLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <LoaderCircle className="animate-spin text-leaf" size={30} />
      </main>
    );
  }

  if (!userEmail || !isAdmin) {
    const signedInButNotAdmin = Boolean(userEmail) && !isAdmin;
    return (
      <main className="flex min-h-screen flex-col bg-cream">
        <header className="mx-auto flex w-full max-w-7xl items-center gap-3 px-5 py-5 sm:px-8">
          <a
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink"
            aria-label="Back to shop"
          >
            <ArrowLeft size={19} />
          </a>
          <span className="font-black text-ink">Store manager</span>
        </header>
        <div className="flex flex-1 items-center justify-center px-5 pb-12">
          <section className="w-full max-w-md rounded-[2rem] border border-[#edeae1] bg-white p-6 shadow-[0_20px_60px_-40px_rgba(38,53,44,.3)] sm:p-9">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff5e8] text-leaf">
              <ShoppingBasket size={27} />
            </span>
            <p className="mt-7 text-xs font-black uppercase tracking-[.16em] text-leaf">
              JUST FOR THE STORE TEAM
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-[-.04em] text-ink">
              {signedInButNotAdmin ? "Admin access needed" : "Welcome back"}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              {signedInButNotAdmin
                ? "This account doesn't have inventory access. Sign out and use an admin account."
                : "Sign in to keep your shelves and prices up to date."}
            </p>
            {pageError && (
              <p role="alert" className="mt-5 rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#9b3928]">
                {pageError}
              </p>
            )}
            {signedInButNotAdmin ? (
              <button
                onClick={handleSignOut}
                className="mt-6 min-h-12 w-full rounded-xl bg-ink px-4 font-extrabold text-white"
              >
                Sign out
              </button>
            ) : (
              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <label className="block text-sm font-bold text-ink">
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-[#e6e3d8] bg-[#fdfcf8] px-4 text-base font-normal"
                    placeholder="you@example.com"
                  />
                </label>
                <label className="block text-sm font-bold text-ink">
                  Password
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 min-h-12 w-full rounded-xl border border-[#e6e3d8] bg-[#fdfcf8] px-4 text-base font-normal"
                    placeholder="Your password"
                  />
                </label>
                <button
                  disabled={signingIn}
                  className="flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-3 font-extrabold text-white transition hover:bg-[#205237] disabled:opacity-60"
                >
                  {signingIn && <LoaderCircle size={18} className="animate-spin" />}
                  {signingIn ? "Signing you in…" : "Sign in to inventory"}
                </button>
              </form>
            )}
            <a href="/" className="mt-5 block text-center text-sm font-bold text-muted hover:text-leaf">
              Back to the shop
            </a>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-12">
      <header className="border-b border-[#e9e6dc] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <a
              href="/"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f4f3ed] text-ink"
              aria-label="Back to shop"
            >
              <ArrowLeft size={19} />
            </a>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-black tracking-tight text-ink sm:text-xl">
                {storeName}
              </h1>
              <p className="truncate text-xs text-muted">{userEmail}</p>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-sm font-bold text-muted transition hover:bg-[#f4f3ed] hover:text-ink"
          >
            <LogOut size={17} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-7 sm:pt-10">
        <section className="relative overflow-hidden rounded-[1.75rem] bg-[#193f2e] p-5 text-white sm:rounded-[2rem] sm:p-8">
          <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full bg-lime/10 blur-3xl" />
          <div className="relative z-10 flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.16em] text-lime">
                YOUR MARKET, YOUR WAY
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
                Hello, boss 👋
              </h2>
              <p className="mt-1 text-sm text-white/70">
                Let&apos;s get those shelves looking lovely.
              </p>
            </div>
            <button
              onClick={() => {
                setPageError("");
                setFormOpen(true);
              }}
              className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-lime px-5 text-base font-black text-ink transition hover:-translate-y-0.5 hover:bg-[#cceb50]"
            >
              <Plus size={21} strokeWidth={2.6} />
              Add New Foodstuff
            </button>
          </div>
        </section>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4">
          <div className="rounded-2xl border border-[#edeae1] bg-white p-4 sm:p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#eff5e8] text-leaf">
              <Package size={20} />
            </span>
            <p className="mt-4 text-2xl font-black text-ink">{products.length}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">Items listed</p>
          </div>
          <div className="rounded-2xl border border-[#edeae1] bg-white p-4 sm:p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f5f2df] text-[#927422]">
              <Check size={20} />
            </span>
            <p className="mt-4 text-2xl font-black text-ink">{inStockCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-muted sm:text-sm">Available today</p>
          </div>
        </div>

        {(pageError || notice) && (
          <div
            role={pageError ? "alert" : "status"}
            className={`mt-5 flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm ${
              pageError
                ? "bg-[#fff0ed] text-[#9b3928]"
                : "bg-[#eaf4e5] text-[#286442]"
            }`}
          >
            <span>{pageError || notice}</span>
            <button
              onClick={() => {
                setPageError("");
                setNotice("");
              }}
              aria-label="Dismiss message"
              className="shrink-0"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="mt-8">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.15em] text-leaf">
                THE SHELVES
              </p>
              <h2 className="mt-1 text-xl font-black text-ink sm:text-2xl">
                Your inventory
              </h2>
            </div>
            <span className="text-sm font-bold text-muted">{products.length} items</span>
          </div>

          {loadingProducts ? (
            <div className="flex min-h-40 items-center justify-center rounded-2xl bg-white">
              <LoaderCircle className="animate-spin text-leaf" size={27} />
            </div>
          ) : products.length ? (
            <div className="space-y-3">
              {products.map((product) => (
                <article
                  key={product.id}
                  className="rounded-2xl border border-[#edeae1] bg-white p-3.5 sm:p-4"
                >
                  <div className="flex gap-3.5">
                    <div className="h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-2xl sm:h-20 sm:w-20">
                      <ProductThumbnail product={product} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-extrabold text-ink sm:text-lg">
                            {product.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-muted">
                            {product.category} · {product.unit}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold sm:text-xs ${
                            product.in_stock
                              ? "bg-[#eaf4e5] text-leaf"
                              : "bg-[#f3f0e9] text-muted"
                          }`}
                        >
                          {product.in_stock ? "In stock" : "Sold out"}
                        </span>
                      </div>
                      {editingPrice === product.id ? (
                        <form
                          onSubmit={(event) => {
                            event.preventDefault();
                            void savePrice(product);
                          }}
                          className="mt-2 flex items-center gap-2"
                        >
                          <span className="font-bold text-muted">₦</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            autoFocus
                            value={priceValue}
                            onChange={(event) => setPriceValue(event.target.value)}
                            className="h-10 w-32 rounded-lg border border-[#e6e3d8] px-3 text-sm font-bold"
                            aria-label={`Price for ${product.name}`}
                          />
                          <button
                            disabled={savingPrice}
                            className="flex h-10 items-center gap-1 rounded-lg bg-leaf px-3 text-xs font-bold text-white disabled:opacity-60"
                          >
                            <Save size={14} /> Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingPrice(null)}
                            className="flex h-10 items-center rounded-lg px-2 text-xs font-bold text-muted"
                          >
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                          <p className="font-black text-leaf">
                            {formatNaira(product.price_ngn)}
                            <span className="ml-1 text-xs font-semibold text-muted">
                              {product.unit}
                            </span>
                          </p>
                          <button
                            onClick={() => {
                              setPageError("");
                              setPriceValue(String(product.price_ngn));
                              setEditingPrice(product.id);
                            }}
                            className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-bold text-muted hover:bg-[#f4f3ed] hover:text-ink"
                          >
                            <Pencil size={13} /> Edit price
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {editingPrice !== product.id && (
                    <div className="mt-3 grid grid-cols-[1fr_auto] gap-2 border-t border-[#f0eee7] pt-3">
                      <button
                        disabled={busyProduct === product.id}
                        onClick={() => void toggleStock(product)}
                        className={`min-h-11 rounded-xl text-sm font-extrabold transition disabled:opacity-50 ${
                          product.in_stock
                            ? "bg-[#f4f3ed] text-ink hover:bg-[#eeeae0]"
                            : "bg-[#eaf4e5] text-leaf hover:bg-[#deecd7]"
                        }`}
                      >
                        {busyProduct === product.id
                          ? "Updating…"
                          : product.in_stock
                            ? "Mark as Sold Out"
                            : "Mark In Stock"}
                      </button>
                      <button
                        disabled={busyProduct === product.id}
                        onClick={() => void deleteProduct(product)}
                        className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-[#f0d9d3] px-3 text-sm font-bold text-[#a84332] transition hover:bg-[#fff0ed] disabled:opacity-50"
                      >
                        <Trash2 size={16} /> <span className="hidden sm:inline">Delete</span>
                      </button>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d9d7cb] bg-white px-5 py-12 text-center">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#eff5e8] text-leaf">
                <ShoppingBasket size={25} />
              </span>
              <h3 className="mt-4 font-extrabold text-ink">Your shelves are ready</h3>
              <p className="mt-1 text-sm text-muted">
                Add your first foodstuff and it&apos;ll appear in your shop.
              </p>
              <button
                onClick={() => setFormOpen(true)}
                className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-leaf px-4 font-bold text-white"
              >
                <Plus size={18} /> Add New Foodstuff
              </button>
            </div>
          )}
        </section>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 sm:items-center sm:p-5">
          <button
            className="absolute inset-0 cursor-default"
            aria-label="Close add foodstuff form"
            onClick={() => !savingProduct && setFormOpen(false)}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-product-title"
            className="relative z-10 max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-[1.75rem] bg-cream p-5 shadow-2xl sm:rounded-[1.75rem] sm:p-7"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[.15em] text-leaf">
                  MAKE IT AVAILABLE
                </p>
                <h2 id="add-product-title" className="mt-1 text-2xl font-black text-ink">
                  Add foodstuff
                </h2>
              </div>
              <button
                disabled={savingProduct}
                onClick={() => setFormOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink"
                aria-label="Close form"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={(event) => void handleAddProduct(event)} className="mt-5 space-y-4">
              <label className="block text-sm font-bold text-ink">
                Foodstuff name
                <input
                  required
                  maxLength={100}
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="e.g. Ofada rice"
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-[#e6e3d8] bg-white px-4 text-base font-normal"
                />
              </label>

              <label className="block text-sm font-bold text-ink">
                Category
                <select
                  value={form.category}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      category: event.target.value as Category,
                    }))
                  }
                  className="mt-1.5 min-h-12 w-full rounded-xl border border-[#e6e3d8] bg-white px-4 text-base font-normal"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="block text-sm font-bold text-ink">
                  Price (₦)
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={form.price}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, price: event.target.value }))
                    }
                    placeholder="4500"
                    className="mt-1.5 min-h-12 w-full rounded-xl border border-[#e6e3d8] bg-white px-3 text-base font-normal"
                  />
                </label>
                <label className="block text-sm font-bold text-ink">
                  Unit size
                  <input
                    required
                    maxLength={50}
                    value={form.unit}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, unit: event.target.value }))
                    }
                    placeholder="per paint bucket"
                    className="mt-1.5 min-h-12 w-full rounded-xl border border-[#e6e3d8] bg-white px-3 text-base font-normal"
                  />
                </label>
              </div>

              <div>
                <span className="text-sm font-bold text-ink">Product photo (optional)</span>
                <input
                  ref={fileInput}
                  type="file"
                  accept="image/*"
                  onChange={chooseImage}
                  className="sr-only"
                  aria-label="Choose foodstuff photo from camera or gallery"
                />
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  className="mt-1.5 flex min-h-[4.5rem] w-full items-center gap-3 rounded-xl border border-dashed border-[#d9d7cb] bg-white px-4 text-left"
                >
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt="Preview of selected product"
                      className="h-12 w-12 rounded-lg object-cover"
                    />
                  ) : (
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#eff5e8] text-leaf">
                      <ImagePlus size={21} />
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-ink">
                      {form.image ? form.image.name : "Take a photo or choose from gallery"}
                    </span>
                    <span className="mt-0.5 block text-xs text-muted">
                      Photos are compressed before upload
                    </span>
                  </span>
                </button>
              </div>

              {pageError && (
                <p role="alert" className="rounded-xl bg-[#fff0ed] px-4 py-3 text-sm text-[#9b3928]">
                  {pageError}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={savingProduct}
                  onClick={() => setFormOpen(false)}
                  className="min-h-12 rounded-xl bg-white font-bold text-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-leaf px-3 font-extrabold text-white disabled:opacity-60"
                >
                  {savingProduct ? (
                    <LoaderCircle size={18} className="animate-spin" />
                  ) : (
                    <Plus size={18} />
                  )}
                  {savingProduct ? "Saving…" : "Add to shop"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

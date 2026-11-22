# Nigerian foodstuff store

A mobile-first Next.js storefront and inventory dashboard powered by Supabase.

## Get started

1. Copy `.env.example` to `.env.local` and fill in the Supabase project URL,
   either `NEXT_PUBLIC_SUPABASE_ANON_KEY` or
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, the store name and WhatsApp number.
   Use the international country-code format for `NEXT_PUBLIC_STORE_WHATSAPP`
   (for example, `2348012345678`).
2. In your Supabase project's SQL Editor, run
   `supabase/migrations/001_store_schema.sql`.
3. Create an admin user in Supabase Authentication. In that user's **app
   metadata**, set `"role": "admin"` (not user metadata). The SQL policies use
   this server-controlled claim to protect inventory and product photo changes.
   Have the user sign out and back in after changing the role so their session
   token includes it.
4. Install packages and start the app:

   ```sh
   npm install
   npm run dev
   ```

The public shop is at `/`, and the protected inventory manager is at `/admin`.
Customers can build a basket and send the itemized order to the store's WhatsApp
number; order confirmation, delivery fees and payment are arranged directly
with the customer.

## Security notes

The Supabase anon key is intended for browser use; never put a service-role key
in a `NEXT_PUBLIC_` variable. Public visitors can read products and product
images. Only authenticated users whose trusted `app_metadata.role` is `admin`
can change product records or upload, update and delete product images. Enable
email/password sign-in in Supabase Authentication for the admin account.
# synergydob

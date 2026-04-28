import Link from "next/link";

export default function HeroSection() {
  return (
    <section className="relative bg-gradient-to-br from-pink-50 via-white to-rose-50 border-b border-pink-100 overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-pink-100 rounded-full opacity-40" />
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-rose-100 rounded-full opacity-30" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-20 md:py-28">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-pink-500 tracking-widest uppercase mb-4">
            New Arrivals
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight">
            Celebrate every
            <span className="text-pink-600"> occasion </span>
            in style
          </h1>
          <p className="mt-4 text-gray-500 text-lg leading-relaxed max-w-lg">
            Handpicked sarees, kurtis and ethnic wear for women and kids. Delivered to your door from Thanjavur.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/women/sarees"
              className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-medium rounded-full transition-colors shadow-sm"
            >
              Shop Sarees
            </Link>
            <Link
              href="/women"
              className="px-6 py-3 border border-pink-200 hover:border-pink-400 text-pink-700 font-medium rounded-full transition-colors bg-white"
            >
              All Women's
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
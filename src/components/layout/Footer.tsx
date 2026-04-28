export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t border-gray-200 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-400">
        <p className="font-semibold text-gray-500">SKM WARDROBE</p>
        <p>© {new Date().getFullYear()} SKM Wardrobe. All rights reserved.</p>
      </div>
    </footer>
  );
}
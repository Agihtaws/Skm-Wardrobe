import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Return Policy | SKM Wardrobe",
  description: "Return and exchange policy for SKM Wardrobe.",
};

export default function ReturnPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Return Policy
          </h1>
          <p className="text-sm text-gray-400">Last updated: June 2025</p>
          <div className="h-1 w-16 bg-pink-500 rounded-full mt-4" />
        </div>

        <div className="space-y-8 text-gray-700 text-sm leading-relaxed">

          <section className="bg-pink-50 border border-pink-100 rounded-xl p-4">
            <p className="text-pink-700 font-semibold">
              🛍️ We want you to love what you ordered! If something isn't right, we're here to help.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Return Window</h2>
            <p>
              You can request a return within <strong>3 days</strong> of delivery. After 3 days,
              we are unable to accept return requests.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Eligible Returns</h2>
            <p>We accept returns <strong>only</strong> for:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Defective or damaged products received</li>
              <li>Wrong item delivered</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Non-Returnable Items</h2>
            <p>The following items cannot be returned:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Items that have been worn, washed, or altered</li>
              <li>Items without original tags and packaging</li>
              <li>Sale or discounted items (unless defective)</li>
              <li>Innerwear and accessories for hygiene reasons</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Exchange Policy</h2>
            <p>
              We currently <strong>do not accept exchanges</strong>. If your item is defective
              or wrong, please raise a return request and we will issue a refund.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. How to Initiate a Return</h2>
            <ol className="list-decimal pl-5 space-y-2 mt-2">
              <li>Go to <strong>My Orders</strong> in your account</li>
              <li>Find the order and click the <strong>Return</strong> button</li>
              <li>Enter the reason for return and submit your request</li>
              <li>We will review and respond within 2 business days with pickup details</li>
              <li>Pack the item securely with original tags and packaging</li>
              <li>Hand over to our pickup agent</li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Refund Process</h2>
            <p>
              Once we receive and inspect the returned item, refunds are processed within{" "}
              <strong>5–7 business days</strong> to your original payment method via Razorpay.
              You will receive a confirmation once the refund is initiated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Shipping Charges</h2>
            <p>
              Return shipping is <strong>free</strong> for defective or wrong items — we arrange
              pickup at no cost.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Contact Us</h2>
            <div className="bg-pink-50 border border-pink-100 rounded-xl p-4 space-y-1">
              <p><strong>SKM Wardrobe</strong></p>
              <p>Salem, Tamil Nadu, India</p>
              <p>Website: <a href="https://skmwardrobe.in" className="text-pink-600 hover:underline">skmwardrobe.in</a></p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
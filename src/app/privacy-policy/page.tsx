import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | SKM Wardrobe",
  description: "Privacy Policy for SKM Wardrobe – how we collect, use, and protect your data.",
};

export default function PrivacyPolicyPage() {
  const updated = "June 11, 2025";

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-400">Last updated: {updated}</p>
          <div className="h-1 w-16 bg-pink-500 rounded-full mt-4" />
        </div>

        <div className="prose prose-gray max-w-none space-y-8 text-gray-700 text-sm leading-relaxed">

          <section>
            <p>
              Welcome to <strong>SKM Wardrobe</strong> ("we", "our", or "us"), accessible at{" "}
              <a href="https://skmwardrobe.in" className="text-pink-600 hover:underline">
                skmwardrobe.in
              </a>
              . We are committed to protecting your personal information and your right to privacy.
              This Privacy Policy explains how we collect, use, and safeguard your information when
              you visit our website or make a purchase from us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Account information:</strong> name, email address, and password when you register</li>
              <li><strong>Order & delivery information:</strong> shipping address, phone number, and order details</li>
              <li><strong>Payment information:</strong> processed securely through Razorpay — we do not store card details</li>
              <li><strong>Usage data:</strong> pages visited, browser type, device, and IP address (collected automatically)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. How We Use Your Information</h2>
            <p>We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Process and fulfil your orders</li>
              <li>Send order confirmations, shipping updates, and delivery notifications</li>
              <li>Respond to your queries and provide customer support</li>
              <li>Improve our website, products, and services</li>
              <li>Show relevant advertisements via Google AdSense</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Cookies & Advertising</h2>
            <p>
              We use cookies to enhance your browsing experience and to serve personalised
              advertisements. We use <strong>Google AdSense</strong>, which uses cookies to display
              ads based on your prior visits to our website and other sites on the internet.
            </p>
            <p className="mt-2">
              You can opt out of personalised advertising by visiting{" "}
              <a
                href="https://www.google.com/settings/ads"
                target="_blank"
                rel="noopener noreferrer"
                className="text-pink-600 hover:underline"
              >
                Google Ads Settings
              </a>
              . You can also disable cookies in your browser settings, though this may affect
              some functionality of the site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Sharing Your Information</h2>
            <p>We do not sell or rent your personal information. We share it only with:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Razorpay</strong> – to process payments securely</li>
              <li><strong>Shiprocket / courier partners</strong> – to deliver your orders</li>
              <li><strong>Google</strong> – for analytics and advertising services</li>
              <li>Law enforcement or authorities when required by law</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data Storage & Security</h2>
            <p>
              Your data is stored securely using <strong>Supabase</strong> with industry-standard
              encryption. We take reasonable technical and organisational measures to protect your
              personal information against unauthorised access, loss, or misuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Withdraw consent at any time</li>
            </ul>
            <p className="mt-2">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@skmwardrobe.in" className="text-pink-600 hover:underline">
                support@skmwardrobe.in
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Children's Privacy</h2>
            <p>
              Our website is not directed to children under the age of 13. We do not knowingly
              collect personal information from children. If you believe we have inadvertently
              collected such information, please contact us immediately.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites. We are not responsible for
              the privacy practices of those sites and encourage you to review their policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. Changes will be posted on this
              page with an updated date. Continued use of our website after changes constitutes
              acceptance of the revised policy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">10. Contact Us</h2>
            <p>If you have any questions about this Privacy Policy, please contact us:</p>
            <div className="mt-3 bg-pink-50 border border-pink-100 rounded-xl p-4 space-y-1">
              <p><strong>SKM Wardrobe</strong></p>
              <p>Kumbakonam, Thanjavur, Tamil Nadu, India</p>
              <p>
                Website:{" "}
                <a href="https://skmwardrobe.in" className="text-pink-600 hover:underline">
                  skmwardrobe.in
                </a>
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
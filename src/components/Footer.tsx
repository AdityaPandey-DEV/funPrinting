import Link from 'next/link';

export default function Footer() {
  const footerLinks = [
    { href: '/terms', label: 'Terms & Conditions' },
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/cancellation-refund', label: 'Cancellation & Refund' },
    { href: '/shipping-delivery', label: 'Shipping & Delivery' },
    { href: '/contact', label: 'Contact Us' },
  ];

  const socialLinks = [
    { href: '#', label: 'Facebook', icon: '📘' },
    { href: '#', label: 'Twitter', icon: '🐦' },
    { href: '#', label: 'Instagram', icon: '📷' },
    { href: '#', label: 'LinkedIn', icon: '💼' },
  ];

  return (
    <footer className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-2xl font-bold text-blue-400 mb-4">PrintService</h3>
            <p className="text-gray-300 mb-4">
              Your trusted printing partner for all academic needs. Fast, reliable, and affordable printing services for college students.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                  aria-label={social.label}
                >
                  <span className="text-2xl">{social.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-300 hover:text-blue-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Info</h4>
            <div className="space-y-2 text-gray-300">
              <p>📍 College Campus</p>
              <p>📧 info@printservice.com</p>
              <p>📞 +91 98765 43210</p>
              <p>🕒 Mon-Sat: 9AM-6PM</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2024 PrintService. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

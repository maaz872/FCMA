import { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

async function getSiteName() {
  try {
    const entry = await prisma.siteContent.findFirst({ where: { contentKey: "site_name" } });
    return entry?.contentValue || "this platform";
  } catch { return "this platform"; }
}

export default async function PrivacyPolicyPage() {
  const name = await getSiteName();
  return (
    <div className="max-w-[800px] mx-auto py-15 px-6">
      <h1 className="text-4xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-10">Last updated: January 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">1. Introduction</h2>
        <p className="text-gray-700 leading-relaxed">
          Welcome to {name}. We are committed to protecting your personal
          information and your right to privacy. This Privacy Policy explains
          how we collect, use, disclose, and safeguard your information when
          you visit our website and use our services. By accessing or using
          our services, you agree to the terms outlined in this policy.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          2. Information We Collect
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We collect personal information that you voluntarily provide to us
          when you register for an account, make a purchase, subscribe to our
          newsletter, or otherwise contact us. This may include your name,
          email address, billing address, payment information, and any other
          information you choose to provide. We also automatically collect
          certain information when you visit our website, including your IP
          address, browser type, operating system, referring URLs, and
          information about how you interact with our website.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          3. How We Use Your Information
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We use the information we collect to provide, maintain, and improve
          our services, process transactions and send related information,
          send you newsletters and marketing communications (with your
          consent), respond to your enquiries and provide customer support,
          monitor and analyse trends, usage, and activities in connection with
          our services, and detect, investigate, and prevent fraudulent
          transactions and other illegal activities.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">4. Data Security</h2>
        <p className="text-gray-700 leading-relaxed">
          We implement appropriate technical and organisational security
          measures to protect the security of your personal information.
          However, please note that no method of transmission over the
          internet or method of electronic storage is 100% secure. While we
          strive to use commercially acceptable means to protect your
          personal information, we cannot guarantee its absolute security.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">5. Cookies</h2>
        <p className="text-gray-700 leading-relaxed">
          We use cookies and similar tracking technologies to track activity
          on our website and hold certain information. Cookies are files with
          a small amount of data which may include an anonymous unique
          identifier. You can instruct your browser to refuse all cookies or
          to indicate when a cookie is being sent. However, if you do not
          accept cookies, you may not be able to use some portions of our
          website.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          6. Third-Party Services
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We may employ third-party companies and individuals to facilitate
          our services, provide services on our behalf, perform
          service-related activities, or assist us in analysing how our
          services are used. These third parties have access to your personal
          information only to perform these tasks on our behalf and are
          obligated not to disclose or use it for any other purpose. This
          includes payment processors, email service providers, and analytics
          tools.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">7. Your Rights</h2>
        <p className="text-gray-700 leading-relaxed">
          Depending on your location, you may have certain rights regarding
          your personal information. These may include the right to access,
          correct, or delete your personal data, the right to restrict or
          object to our processing of your data, the right to data
          portability, and the right to withdraw consent at any time. To
          exercise any of these rights, please contact us using the details
          provided below.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">8. Data Retention</h2>
        <p className="text-gray-700 leading-relaxed">
          We will retain your personal information only for as long as is
          necessary for the purposes set out in this Privacy Policy. We will
          retain and use your information to the extent necessary to comply
          with our legal obligations, resolve disputes, and enforce our
          policies. When your data is no longer needed, we will securely
          delete or anonymise it.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          9. Changes to This Policy
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We may update our Privacy Policy from time to time. We will notify
          you of any changes by posting the new Privacy Policy on this page
          and updating the &ldquo;Last updated&rdquo; date at the top. You
          are advised to review this Privacy Policy periodically for any
          changes. Changes to this Privacy Policy are effective when they are
          posted on this page.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">10. Contact Us</h2>
        <p className="text-gray-700 leading-relaxed">
          If you have any questions or concerns about this Privacy Policy or
          our data practices, please contact us through the messaging feature
          in The Hub. We will make every effort to respond to your enquiry in
          a timely manner.
        </p>
      </section>
    </div>
  );
}

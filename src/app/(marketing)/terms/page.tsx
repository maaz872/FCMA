import { Metadata } from "next";
import { prisma } from "@/lib/db";

export const metadata: Metadata = {
  title: "Terms and Conditions",
};

async function getSiteName() {
  try {
    const entry = await prisma.siteContent.findFirst({ where: { contentKey: "site_name" } });
    return entry?.contentValue || "this platform";
  } catch { return "this platform"; }
}

export default async function TermsPage() {
  const name = await getSiteName();
  return (
    <div className="max-w-[800px] mx-auto py-15 px-6">
      <h1 className="text-4xl font-bold mb-2">Terms and Conditions</h1>
      <p className="text-gray-500 mb-10">Last updated: January 2026</p>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          1. Agreement to Terms
        </h2>
        <p className="text-gray-700 leading-relaxed">
          By accessing or using the {name} website and services, you agree
          to be bound by these Terms and Conditions. If you do not agree with
          any part of these terms, you must not use our services. These terms
          apply to all visitors, users, and others who access or use our
          platform.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">2. Services</h2>
        <p className="text-gray-700 leading-relaxed">
          {name} provides online fitness services, training programmes,
          nutritional guidance, and access to our digital platform known as
          &ldquo;The Hub.&rdquo; Our services are designed for informational
          and educational purposes and are not a substitute for professional
          medical advice, diagnosis, or treatment. All content provided
          through our services is for general guidance only.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          3. Account Registration
        </h2>
        <p className="text-gray-700 leading-relaxed">
          To access certain features of our services, you may be required to
          create an account. You are responsible for maintaining the
          confidentiality of your account credentials and for all activities
          that occur under your account. You agree to provide accurate,
          current, and complete information during registration and to update
          such information to keep it accurate, current, and complete.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          4. Payments and Refunds
        </h2>
        <p className="text-gray-700 leading-relaxed">
          Access to The Hub is available for a one-time payment of &euro;79,
          which grants lifetime access to the platform and its content. All
          payments are processed securely through our third-party payment
          provider. We offer a 14-day refund policy from the date of
          purchase. If you are not satisfied with the service, you may
          request a full refund within 14 days by contacting us. Refund
          requests made after 14 days will not be honoured.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          5. Intellectual Property
        </h2>
        <p className="text-gray-700 leading-relaxed">
          All content, materials, and resources provided through {name},
          including but not limited to text, graphics, logos, images, videos,
          training programmes, and software, are the intellectual property of
          {name} and are protected by applicable copyright and trademark
          laws. You may not reproduce, distribute, modify, or create
          derivative works from any of our content without prior written
          consent.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">6. User Conduct</h2>
        <p className="text-gray-700 leading-relaxed">
          You agree to use our services only for lawful purposes and in a
          manner that does not infringe the rights of, restrict, or inhibit
          anyone else&apos;s use and enjoyment of the services. You must not
          share your account credentials with others, redistribute or resell
          any content from our platform, use our services to transmit
          harmful, offensive, or illegal material, or attempt to gain
          unauthorised access to any part of our systems.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          7. Health Disclaimer
        </h2>
        <p className="text-gray-700 leading-relaxed">
          The training programmes, nutritional advice, and content provided
          by {name} are for informational purposes only and are not
          intended as medical advice. You should consult with a qualified
          healthcare professional before beginning any new exercise or
          nutrition programme. {name} is not responsible for any injury,
          illness, or health issue that may result from following our
          programmes. You participate in all activities at your own risk.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          8. Limitation of Liability
        </h2>
        <p className="text-gray-700 leading-relaxed">
          To the fullest extent permitted by law, {name} and its owner,
          employees, and affiliates shall not be liable for any indirect,
          incidental, special, consequential, or punitive damages, including
          but not limited to loss of profits, data, or other intangible
          losses, resulting from your access to or use of (or inability to
          access or use) our services. Our total liability for any claim
          arising out of or relating to these terms shall not exceed the
          amount you paid us in the 12 months prior to the claim.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">9. Termination</h2>
        <p className="text-gray-700 leading-relaxed">
          We reserve the right to suspend or terminate your account and
          access to our services at our sole discretion, without prior
          notice, for conduct that we determine violates these Terms and
          Conditions or is harmful to other users, us, or third parties, or
          for any other reason. Upon termination, your right to use the
          services will immediately cease.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">10. Governing Law</h2>
        <p className="text-gray-700 leading-relaxed">
          These Terms and Conditions shall be governed by and construed in
          accordance with the laws of Ireland, without regard to its conflict
          of law provisions. Any disputes arising under or in connection with
          these terms shall be subject to the exclusive jurisdiction of the
          courts of Ireland.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">
          11. Changes to These Terms
        </h2>
        <p className="text-gray-700 leading-relaxed">
          We reserve the right to modify or replace these Terms and
          Conditions at any time. If a revision is material, we will provide
          at least 30 days&apos; notice prior to any new terms taking
          effect. What constitutes a material change will be determined at
          our sole discretion. Your continued use of the services after any
          changes constitutes acceptance of the new terms.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-3">12. Contact Us</h2>
        <p className="text-gray-700 leading-relaxed">
          If you have any questions about these Terms and Conditions, please
          contact us through the messaging feature in The Hub. We will make
          every effort to address your concerns promptly.
        </p>
      </section>
    </div>
  );
}

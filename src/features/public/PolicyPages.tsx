import type { ReactNode } from 'react';
import { Mail, Phone, Clock } from 'lucide-react';
import { CONTACT, pageHref, type PublicPage } from './routes';
import { PricingCards } from './PricingCards';

const UPDATED = '23 November 2026';

function Doc({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 text-[15px] leading-7 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_p]:mt-3 [&_a]:underline [&_a]:text-primary">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="text-sm text-muted-foreground mt-1">Last updated: {UPDATED}</p>
      {children}
    </article>
  );
}

const Email = () => <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>;
const Tel = () => <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>;

function Terms() {
  return (
    <Doc title="Terms of Service">
      <p>These terms govern your use of Outstagram (the website, the web app and related services, together "the Service"). By creating an account or using the Service you agree to them. If you do not agree, please do not use the Service.</p>
      <p>Outstagram is operated by {CONTACT.legalName}, an individual based in {CONTACT.country} ("we", "us").</p>
      <h2>1. Who can use Outstagram</h2>
      <p>The Service is for students and learners. If you are under 18, you may use it only with the consent and supervision of a parent or guardian, who accepts these terms on your behalf.</p>
      <h2>2. Your account</h2>
      <ul>
        <li>Give accurate details and keep your password safe. You are responsible for activity on your account.</li>
        <li>Tell us at <Email /> if you think your account has been misused.</li>
        <li>You may stop using the Service at any time and ask us to delete your account.</li>
      </ul>
      <h2>3. What you post</h2>
      <p>You keep ownership of the posts, images and other content you upload. You give us a non-exclusive, worldwide, royalty-free licence to host, store, display and process that content only to run and improve the Service. Do not post content that is illegal, hateful, harassing, sexually explicit, infringes someone else's rights, or contains other people's personal data without permission. We may remove such content and suspend accounts that break these rules.</p>
      <h2>4. AI tutor and generated content</h2>
      <p>The AI tutor and AI-generated questions are learning aids. They can be wrong. Check important answers against your textbooks and teachers. Do not use the Service to cheat in any exam or assessment. Fair-use limits on AI messages apply per plan and are shown in the app.</p>
      <h2>5. Paid plans</h2>
      <p>Some features need a paid Pro pass. Prices are shown on the <a href={pageHref('pricing')}>pricing page</a> and before you pay. A Pro pass is a one-time payment for a fixed number of days and does not renew automatically. Payments are processed by Razorpay; we never see or store your card or UPI PIN. Refunds are covered by our <a href={pageHref('refunds')}>Refund &amp; Cancellation Policy</a>.</p>
      <h2>6. Acceptable use</h2>
      <p>Do not try to break, overload, scrape or reverse-engineer the Service, get around usage limits, access other people's accounts, or use it for spam or anything unlawful.</p>
      <h2>7. Our content</h2>
      <p>The question bank, software, design and branding of Outstagram belong to us or our licensors. You may use them for your personal study only.</p>
      <h2>8. Availability and changes</h2>
      <p>We work to keep the Service running but cannot promise it will always be available or error-free. We may change or discontinue features. If we make material changes to these terms we will update this page and, where appropriate, tell you in the app.</p>
      <h2>9. Liability</h2>
      <p>The Service is provided "as is". To the extent permitted by law, we are not liable for indirect or consequential losses, including exam results. Our total liability for any claim is limited to the amount you paid us in the 3 months before the claim.</p>
      <h2>10. Termination</h2>
      <p>We may suspend or close accounts that break these terms. If we close your account without cause while a Pro pass is active, we will refund the unused part of it.</p>
      <h2>11. Governing law</h2>
      <p>These terms are governed by the laws of India, and the courts of India have jurisdiction over any dispute.</p>
      <h2>12. Contact</h2>
      <p>Questions about these terms: <Email /> or <Tel />.</p>
    </Doc>
  );
}

function Privacy() {
  return (
    <Doc title="Privacy Policy">
      <p>This policy explains what personal data Outstagram collects, why, and the choices you have. We follow India's Digital Personal Data Protection Act, 2023.</p>
      <h2>What we collect</h2>
      <ul>
        <li><b>Account details:</b> name, username, email address, date of birth, bio, and a securely hashed password. If you sign in with Google we receive your name and verified email from Google.</li>
        <li><b>Content you create:</b> posts, images, comments, likes, follows and saved equations.</li>
        <li><b>Study activity:</b> exam attempts, answers, scores and time taken, and your conversations with the AI tutor.</li>
        <li><b>Payments:</b> order and payment IDs, amount and status from Razorpay. We do not receive or store card numbers, bank details or UPI PINs.</li>
        <li><b>Technical data:</b> basic logs such as IP address, browser type and error reports, kept to run and secure the Service.</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>To run your account, show your feed and profile, and save your progress.</li>
        <li>To answer your tutor questions and generate practice material.</li>
        <li>To process payments and give you Pro features.</li>
        <li>To keep the Service secure, prevent abuse and enforce usage limits.</li>
        <li>To contact you about your account or important changes. We do not send marketing without your consent.</li>
      </ul>
      <p>We do not sell your personal data and we do not show third-party ads.</p>
      <h2>Who processes it for us</h2>
      <ul>
        <li><b>Hosting and database:</b> Google Cloud and Supabase (servers in Tokyo, Japan).</li>
        <li><b>Sign-in:</b> Supabase Auth and Google, if you choose "Continue with Google".</li>
        <li><b>File storage:</b> an S3-compatible object storage provider for uploaded images.</li>
        <li><b>AI:</b> the text of your tutor questions, together with relevant exam and textbook context, is sent to AI model providers (such as Google Gemini) to produce an answer.</li>
        <li><b>Payments:</b> Razorpay.</li>
      </ul>
      <p>These providers process data only on our instructions. Some of them are outside India; we only transfer data as permitted by Indian law.</p>
      <h2>Who can see your content</h2>
      <p>Your profile and posts are visible to other Outstagram users. Exam attempts and tutor chats are private to you.</p>
      <h2>How long we keep it</h2>
      <p>We keep your data while your account is active. When you delete content or ask us to delete your account, we remove it from the live service within 30 days, except where we must keep records by law (for example payment records for tax purposes).</p>
      <h2>Your rights</h2>
      <p>You can ask to access, correct or delete your personal data, withdraw consent, or nominate someone to act for you, by writing to <Email />. You can delete tutor chats and posts yourself in the app. If you are not satisfied with our reply, you may complain to the Data Protection Board of India.</p>
      <h2>Children</h2>
      <p>If you are under 18, please use Outstagram with your parent's or guardian's consent. A parent or guardian can contact us to review or delete their child's data.</p>
      <h2>Security</h2>
      <p>Passwords are hashed, connections use HTTPS, and access to data is restricted. No system is perfectly secure, so please use a strong, unique password.</p>
      <h2>Grievance officer and contact</h2>
      <p>Email <Email /> or call <Tel />. We reply within 7 days.</p>
    </Doc>
  );
}

function Refunds() {
  return (
    <Doc title="Refund & Cancellation Policy">
      <p>Outstagram is free to use. The only paid product is the <b>Pro pass</b>: a one-time payment for a fixed number of days (see <a href={pageHref('pricing')}>pricing</a>). It is a digital service delivered instantly to your account; nothing is shipped.</p>
      <h2>Cancellation</h2>
      <ul>
        <li>The Pro pass does <b>not</b> renew automatically, so there is no subscription to cancel. When it ends your account returns to the Free plan and nothing more is charged.</li>
        <li>You can stop using Pro at any time; see below for when a refund applies.</li>
      </ul>
      <h2>Refunds</h2>
      <ul>
        <li><b>Within 7 days of purchase:</b> if you are not happy with Pro, email us within 7 days of payment and we will refund the full amount, no questions asked. This applies to your first Pro purchase.</li>
        <li><b>Payment taken but Pro not activated, or charged twice:</b> we refund the extra or failed payment in full. Contact us with your payment ID if it has not been refunded automatically.</li>
        <li><b>After 7 days:</b> passes are not refundable for partial use, except where required by law or where we closed your account without cause (then we refund the unused days).</li>
      </ul>
      <h2>How to request a refund</h2>
      <p>Email <Email /> or call <Tel /> from the email address on your account, with the Razorpay payment ID (shown in your payment confirmation). We confirm within 2 business days.</p>
      <h2>Timeline</h2>
      <p>Approved refunds are issued to the original payment method through Razorpay within 5–7 business days. Your bank or UPI app may take a few more days to show it.</p>
    </Doc>
  );
}

function Contact() {
  return (
    <Doc title="Contact us">
      <p>We are a small team and we read every message. For help with your account, payments, refunds, privacy requests or anything else, reach us at:</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <a href={`mailto:${CONTACT.email}`} className="!no-underline rounded-2xl border border-border bg-card p-5 hover:border-primary">
          <Mail className="h-5 w-5 text-primary" />
          <div className="mt-2 font-semibold text-foreground">Email</div>
          <div className="text-muted-foreground">{CONTACT.email}</div>
        </a>
        <a href={CONTACT.phoneHref} className="!no-underline rounded-2xl border border-border bg-card p-5 hover:border-primary">
          <Phone className="h-5 w-5 text-primary" />
          <div className="mt-2 font-semibold text-foreground">Phone</div>
          <div className="text-muted-foreground">{CONTACT.phone}</div>
        </a>
      </div>
      <p className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4" />We reply to email within 2 business days.</p>
      <p>Outstagram is operated by {CONTACT.legalName}, {CONTACT.country}.</p>
    </Doc>
  );
}

function Pricing({ onStart }: { onStart: () => void }) {
  return (
    <section className="px-4 py-12">
      <h1 className="text-center text-3xl font-bold">Pricing</h1>
      <p className="mt-2 mb-10 text-center text-muted-foreground">Free to start. One-time Pro pass when you need more; never auto-renews.</p>
      <PricingCards onStart={onStart} />
    </section>
  );
}

export function PolicyPage({ page, onStart }: { page: PublicPage; onStart: () => void }) {
  switch (page) {
    case 'terms': return <Terms />;
    case 'privacy': return <Privacy />;
    case 'refunds': return <Refunds />;
    case 'contact': return <Contact />;
    case 'pricing': return <Pricing onStart={onStart} />;
  }
}

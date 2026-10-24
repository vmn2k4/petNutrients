// LEGAL PAGES: /privacy, /terms, /disclaimer.
// Have a lawyer licensed in BC review before launch.
import { pageBand, esc } from '../ui.js';
import { breadcrumbLd, crumbsHtml } from '../seo.js';

export const LEGAL = {
  operator: 'RMRM Group Inc.',
  email: 'contact@choseno.com',
  updated: '23 October 2026',
};
const TEMPLATE_NOTE = '<!-- Template — have a lawyer licensed in BC review before launch. -->';

const section = ([h, ...paras]) => `<h2>${esc(h)}</h2>${paras.map((p) => (Array.isArray(p) ? `<ul>${p.map((x) => `<li>${x}</li>`).join('')}</ul>` : `<p>${p}</p>`)).join('')}`;

/** Every page's text, recorded as it is built, so the mobile app can read exactly the same words (see scripts/export_legal.mjs). */
export const DOCS = {};

function page(path, title, lead, sections) {
  DOCS[path] = { title, lead, updated: LEGAL.updated, sections };
  const crumbs = [{ name: 'Home', path: '/' }, { name: esc(title), path }];
  return `${TEMPLATE_NOTE}${pageBand(title, lead)}<div class="page page--narrow">${crumbsHtml(crumbs)}<script type="application/ld+json">${JSON.stringify(breadcrumbLd(crumbs))}</script>
    <p class="small muted">Last updated: ${LEGAL.updated}</p>
    <article class="prose">${sections.map(section).join('')}</article>
    <p class="small muted" style="margin-top:var(--space-6)">See also: <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms and Conditions</a> · <a href="/disclaimer">Medical &amp; Data Disclaimer</a></p></div>`;
}

const O = () => LEGAL.operator;
const MAIL = () => LEGAL.email;

export function disclaimer() {
  return {
    title: 'Medical & Data Disclaimer',
    html: page('/disclaimer', 'Medical & Data Disclaimer', 'Please read this before acting on anything you see here.', [
      ['General information only, not veterinary advice', `Pet Diet & Weight Tracker is operated by ${O()}, a founder based in Vancouver, British Columbia, Canada. Everything on this website and in the app is general information. It is not veterinary advice, diagnosis or treatment, and using the service does not create a veterinarian-client-patient relationship with anyone.`],
      ['Our numbers are approximate', 'Calories, portions, nutrient amounts, growth percentiles and weight goals are approximate calculations, not exact measurements, and we cannot be sure they are right for your pet. Nutrition values on labels and in public datasets can be wrong, missing or out of date, and every pet is different. Please ask your veterinarian before you change your pet\'s diet.'],
      ['This app is in beta', 'Pet Diet & Weight Tracker is a beta service. We try to give good information, but it is still being built and tested, and it may be wrong, incomplete or change without notice. To the fullest extent permitted by law, we are not responsible for decisions you make, or harm to a pet, from using it.'],
      ['Everything here is experimental and an estimate', 'All nutrition data, growth charts and percentiles, calorie and portion suggestions, weight goals, "can my pet eat this" answers, food matches, scores, rankings and reviews are experimental. They are estimates produced by formulas, published datasets and third-party data. They may be incomplete, inaccurate, out of date or simply wrong for your pet.'],
      ['Check before you act', 'Before you act on anything you read here, for any pet, verify it with at least one other reliable source <strong>and</strong> with your veterinarian. Always talk to your vet before you:', ['change your pet\'s diet or food,', 'start a weight-loss or weight-gain plan,', 'feed a growing puppy or kitten, or a pregnant, nursing, senior or sick pet differently,', 'give any new food, treat or supplement to a pet with a medical condition.']],
      ['Emergencies', 'If your pet may have eaten something harmful, or seems unwell, do not wait and do not rely on this site. Contact your veterinarian, an emergency animal hospital or a pet poison helpline immediately.'],
      ['Label and product data', 'Product details, guaranteed analyses, ingredients and calorie figures come from manufacturers, public databases (such as Open Pet Food Facts) and other third parties, or are typed in by users. Manufacturers change recipes and labels without notice. Always read the current label on the package you buy.'],
      ['Reviews', 'Reviews are the personal opinions of the people who wrote them. They are not verified veterinary or scientific evidence and are not endorsed by us.'],
      ['Sources', 'Where we cite organisations such as AAFCO, AAHA, WSAVA, the FDA or the ASPCA, we summarise their public material in our own words. They have not reviewed or endorsed this service.'],
      ['Your responsibility', 'You are responsible for decisions you make about your pet. See our <a href="/terms">Terms and Conditions</a> for the full terms, including limitation of liability and assumption of risk.'],
    ]),
  };
}

export function terms() {
  return {
    title: 'Terms and Conditions',
    html: page('/terms', 'Terms and Conditions', 'The rules for using Pet Diet & Weight Tracker.', [
      ['1. Who we are and agreement', `These terms are an agreement between you and ${O()} ("we", "us"), a founder based in Vancouver, British Columbia, Canada, operating Pet Diet & Weight Tracker (the "Service"). By using the Service you agree to these terms. If you do not agree, please do not use it.`],
      ['2. Not veterinary advice', 'The Service provides general, experimental information only. Our <a href="/disclaimer">Medical &amp; Data Disclaimer</a> forms part of these terms. Nothing on the Service is veterinary advice or creates a veterinarian-client-patient relationship. You agree to verify information with at least one other reliable source and your veterinarian before acting on it for any pet.'],
      ['3. Beta service and assumption of risk', 'The Service is in beta. We try to provide the best information available, but it may be wrong, incomplete or out of date, and you should not expect it to be accurate. To the fullest extent permitted by law, we are not responsible for decisions you make, or any loss or harm to you or a pet, from relying on it. You use the Service and any information from it at your own risk. Feeding, diet changes, weight plans and treats carry real risks to animals, and you accept those risks.'],
      ['4. Eligibility and accounts', 'You must be old enough to form a binding contract where you live, or use the Service with a parent or guardian\'s permission. You need a free account (Google sign-in, or email and password) to save a pet profile. You are responsible for activity on your device and account. We may suspend or terminate access, or delete content, if you breach these terms or misuse the Service, and you may stop using it at any time.'],
      ['5. Reviews and other user content', 'Reviews and other content you submit are your own opinions and remain yours. You give us a worldwide, non-exclusive, royalty-free, perpetual licence to host, store, display, reproduce, adapt (for example to fit a layout or translate) and distribute it in connection with the Service. You confirm you have the right to post it and that it is honest and based on your own experience.', 'You must not post content that is false or misleading, defamatory, hateful, harassing, obscene or illegal; infringes someone else\'s rights; contains personal information about others; is spam, advertising or undisclosed paid or incentivised content; or contains malware.', 'We may review, moderate, refuse, edit for formatting, or remove any content at our discretion, and we are not obliged to publish anything. We do not endorse user content.'],
      ['6. Products, trademarks and third parties', 'Product names, brand names and trademarks belong to their owners. Their appearance on the Service does not mean those owners endorse us or that we endorse their products. Links to third-party websites are provided for convenience; we do not control them and are not responsible for their content, products or practices.'],
      ['7. Affiliate links', 'The Service does not currently contain affiliate links. If affiliate links are added later, we may earn a commission when you buy through them, at no extra cost to you. Affiliate relationships will not change how foods are scored, and will be clearly disclosed.'],
      ['8. Our intellectual property', 'The Service, its design, text, graphics, code and compilations of data (excluding user content and third-party data licensed to us) belong to us or our licensors. Data from third-party sources remains subject to its own licence (for example CC BY 4.0 or ODbL), as credited in the site footer. You may use the Service for personal, non-commercial purposes. You must not copy, scrape, resell or reverse-engineer it except as the law allows.'],
      ['9. No warranties', 'The Service is provided "as is" and "as available", without warranties of any kind, express or implied, including accuracy, completeness, timeliness, fitness for a particular purpose, merchantability and non-infringement, to the fullest extent permitted by law. We do not guarantee the Service will be uninterrupted, secure or error-free.'],
      ['10. Limitation of liability', 'To the fullest extent permitted by law, we will not be liable for any indirect, incidental, special, consequential or punitive damages, or for any loss or harm to you or any animal, arising from your use of, or reliance on, the Service or its content. Our total liability for any claim relating to the Service is limited to the greater of the amount you paid us in the 12 months before the claim (if any) or CAD $50. Some jurisdictions do not allow certain limitations, so some of these may not apply to you; nothing in these terms limits rights you have under applicable consumer law that cannot be excluded.'],
      ['11. Indemnity', 'You agree to indemnify and hold us harmless from claims, losses and costs (including reasonable legal fees) arising from your content, your breach of these terms, or your misuse of the Service.'],
      ['12. Changes', 'We may change the Service or these terms. When we change the terms we will update the "Last updated" date, and for material changes we will try to give notice on the Service. Continuing to use the Service after changes take effect means you accept them.'],
      ['13. Governing law', 'These terms are governed by the laws of the Province of British Columbia and the federal laws of Canada that apply there. You agree that the courts located in Vancouver, British Columbia have exclusive jurisdiction, except where the law of your country of residence gives you a right to bring proceedings locally.'],
      ['14. Severability and whole agreement', 'If any part of these terms is found unenforceable, the rest stays in effect. These terms, the Disclaimer and the <a href="/privacy">Privacy Policy</a> are the whole agreement between you and us about the Service. If we do not enforce a right, we have not waived it.'],
      ['15. Contact', `Questions: ${MAIL()}.`],
    ]),
  };
}

export function privacy() {
  return {
    title: 'Privacy Policy',
    html: page('/privacy', 'Privacy Policy', 'What we collect, why, and how to delete it.', [
      ['Who is responsible', `${O()}, a founder based in Vancouver, British Columbia, Canada, is responsible for personal information handled through Pet Diet & Weight Tracker. Contact: ${MAIL()}.`],
      ['What we collect', 'We keep this short because we collect little:', [
        '<strong>Pet profile</strong>: your pet\'s name, species, breed or size group, birth date or age, sex, neuter status, weight, body condition, activity, allergies, health notes, goals, saved foods and weigh-ins (dates, weights, body condition scores).',
        '<strong>Account</strong>: if you sign in with Google we receive your name and email address from Google; if you use email and password we store your email address and a hashed (not readable) password. Accounts are handled by our database provider (Supabase), and a sign-in token is stored on your device. You can use the foods, guides and tools pages without an account.',
        '<strong>Reviews</strong> you choose to write: rating, text, how long you fed the food, the label you give your pet, and your pet\'s species, size group and approximate age.',
        '<strong>Technical data</strong> that any web request involves, such as IP address, browser type and request time, processed by our hosting and database providers for security and operation.',
        '<strong>Label photos</strong>: the service does not upload label photos. We will update this policy if that changes.',
      ]],
      ['Local storage and cookies', 'We store your pet profile, saved foods and sign-in token in your browser\'s local storage (keys starting with "pnm.") so the app works offline and remembers you. We do not currently use advertising cookies or third-party analytics. We will update this section if that changes. Clearing your browser storage removes the local copy.'],
      ['Why we use it, and legal bases', [
        'To provide the service: calculate growth, calories and food matches and save your profile (performance of a contract / necessary for the service you asked for).',
        'To publish reviews you choose to submit, and to moderate them (consent and our legitimate interest in a trustworthy review section).',
        'To keep the service secure, prevent abuse and fix problems (legitimate interests).',
        'To meet legal obligations.',
      ], 'Under Canadian law (PIPEDA and BC PIPA) we rely on your consent, which you give by using the features described here; you may withdraw it at any time, subject to legal limits.'],
      ['Sharing', 'We do not sell or rent personal information and do not share it for advertising. We share it only with service providers who process it for us under contract: Supabase (database and authentication) and our website hosting provider, Vercel. Published reviews are visible to everyone, without your name. We may disclose information if required by law or to protect rights and safety.'],
      ['International transfers', 'Our providers may store and process data outside your country, including in the United States (our database is hosted in the US East region). Data stored abroad may be accessible to authorities under local law. Where GDPR or UK GDPR applies, we rely on appropriate safeguards such as Standard Contractual Clauses offered by our providers.'],
      ['How long we keep it', 'We keep your pet profile and weigh-ins until you delete them or your account, and we delete accounts that have been inactive for 24 months. Deleting your account also deletes your reviews. Backups are overwritten on our providers\' normal cycles.'],
      ['Your rights', 'Depending on where you live, you can ask to access, correct, delete or receive a copy of your personal information, object to or restrict some processing, and withdraw consent:', [
        '<strong>Canada (PIPEDA, BC PIPA)</strong>: access and correction, withdrawal of consent, and complaints to the Office of the Privacy Commissioner of Canada or the Office of the Information and Privacy Commissioner for British Columbia.',
        '<strong>EU/EEA and UK (GDPR, UK GDPR)</strong>: access, rectification, erasure, restriction, portability, objection, and the right to complain to your local data protection authority.',
        '<strong>California (CCPA/CPRA)</strong>: the right to know, delete and correct, and to non-discrimination. We do not sell or share personal information for cross-context behavioural advertising.',
      ], `To make a request, email ${MAIL()}. We may need to verify the request and will reply within the time the law requires.`],
      ['How to delete your data', 'You can delete your account and all data linked to it yourself, in the app (Profile, then Delete my account and data) or on the website (Account, then Delete my data). Step-by-step instructions are on our <a href="/delete-account">Delete your account</a> page. You can also email us and we will delete it for you. Removing a single pet profile deletes that pet\'s weigh-ins, goals and diet items. Clearing your browser\'s site data removes the local copy.'],
      ['Children', 'The service is meant for pet owners and is not directed at children under 13 (or under 16 in the EU/UK). We do not knowingly collect their personal information. If you believe a child has given us information, contact us and we will delete it.'],
      ['Security', 'We use HTTPS, access controls in our database and providers with recognised security practices. No system is perfectly secure, so please avoid putting sensitive personal details in pet names, notes or reviews.'],
      ['Changes', 'We will update this policy when our practices change and change the "Last updated" date above.'],
      ['Contact', `${O()} · Vancouver, British Columbia, Canada · ${MAIL()}`],
    ]),
  };
}

export function deleteAccount() {
  return {
    title: 'Delete your account',
    description: 'How to delete your Pet Diet & Weight Tracker account and the data linked to it, in the app, on the website or by email.',
    html: page('/delete-account', 'Delete your account', 'How to delete your account and your data.', [
      ['In the app', 'Open the app, go to <strong>Profile</strong>, choose <strong>Delete my account and data</strong> and confirm. Your account is deleted straight away and you are signed out.'],
      ['On the website', 'Log in, open <strong>Account</strong>, choose <strong>Delete my data</strong> and confirm.'],
      ['By email', `Email ${MAIL()} from the address on your account with the subject "Delete my account". We will delete it and reply to confirm, normally within 30 days.`],
      ['What is deleted', 'Deleting your account permanently deletes:', [
        'your sign-in details (email address and name),',
        'your pet profiles, weigh-ins, goals, diet items and saved foods,',
        'the reviews you wrote.',
      ], 'This cannot be undone.'],
      ['What we keep', 'We do not keep a copy of your account data. Our database provider\'s backups are overwritten on their normal cycle, which can take up to 30 days. We may keep records we are required by law to keep.'],
      ['Delete without deleting your account', 'To remove one pet only, open that pet\'s profile and choose <strong>Remove this pet profile</strong>. This deletes that pet\'s weigh-ins, goals and diet items.'],
    ]),
  };
}

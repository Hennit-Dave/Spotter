export interface LegalSection {
  title: string;
  paragraphs: string[];
  links?: { label: string; href: string }[];
}

export interface LegalDocument {
  title: string;
  introduction: string;
  sections: LegalSection[];
}

export const privacyPolicy: LegalDocument = {
  title: 'Privacy Policy',
  introduction: 'This draft explains how Spotter is designed to handle information when your gym provides the service to you. It covers account registration, gym questions, membership records, check-in, payments, and contact with the desk.',
  sections: [
    {
      title: 'Who is responsible for your information',
      paragraphs: [
        'Spotter is the name of the service. The legal names, business addresses, privacy contact details, and respective responsibilities of the gym and the Spotter operator must be confirmed before this policy takes effect.',
        'For questions about a gym record, ask your gym desk. The dedicated contact for access, correction, deletion, and other privacy requests is awaiting confirmation.',
      ],
    },
    {
      title: 'Nigerian privacy law',
      paragraphs: [
        'This policy is drafted with reference to the Nigeria Data Protection Act 2023 and the Nigeria Data Protection Commission’s General Application and Implementation Directive 2025. Section 24 addresses processing principles; section 25 covers lawful grounds; section 27 covers information provided to individuals.',
        'Before this draft becomes effective, the operator must identify the applicable lawful basis for each purpose below. Creating an account does not itself provide blanket consent to every use of personal information.',
      ],
      links: [
        { label: 'Nigeria Data Protection Act 2023 — NDPC', href: 'https://www.ndpc.gov.ng/ndp-act-2023/' },
        { label: 'General Application and Implementation Directive 2025 — NDPC', href: 'https://ndpc.gov.ng/wp-content/uploads/2025/07/NDP-ACT-GAID-2025-MARCH-20TH.pdf' },
      ],
    },
    {
      title: 'Information used to provide Spotter',
      paragraphs: [
        'Account information includes your name, email address, phone number, answer to “Already a member at the gym?”, verification status, membership ID, password hash, and session and account-security records. You provide your registration details; the gym supplies and confirms existing membership information.',
        'Your member records include check-in dates, paid-until date, access-card status, charges, recorded payments, payment references and outcomes, and audited changes made by authorised staff. These support your membership status, attendance reports, and dated balance reports.',
        'Questions are logged with their text, time, member ID, plan, answer source, routing outcome, refusal reason where applicable, and whether the question was handed to the desk. Wrong-answer reports and unanswered questions support the gym’s weekly review.',
      ],
    },
    {
      title: 'How answers and artificial intelligence work',
      paragraphs: [
        'Shared gym answers use owner-approved gym cards. Private attendance and balance records are retrieved using your signed-in member ID. Their numbers are calculated from the database and displayed through fixed templates; the language model does not write those numbers.',
        'Every submitted question reaches the gym’s server and is logged. Obvious attendance, balance, and refusal questions are handled there. When that routing step cannot resolve a question, its text may be sent to Google Gemini for classification or a grounded answer. Obvious names and long digit strings are masked first; masking is not a guarantee that all personal information is removed.',
        'The required Gemini configuration does not use submitted text to train the provider’s models. Private member records, attendance, balances, payment records, and question logs are not placed in the shared search index. Avoid including sensitive medical details or information about other people in questions.',
      ],
    },
    {
      title: 'Who receives information',
      paragraphs: [
        'Authorised gym staff and the owner access records needed for their roles. Members can access only their own private records. The service design uses hosting and database providers, Google for the limited question processing above, Flutterwave for payments, and Resend for requested verification and password-reset emails.',
        'A desk handoff opens WhatsApp with your question prepared for the named staff member. Review it before sending; WhatsApp handles information under its own terms. Contact us prepares an email in your email app, where you choose whether to send it.',
        'The final policy must identify the deployed hosting and database arrangements, processing locations, recipient roles, and any international-transfer safeguards. Transfers outside Nigeria must satisfy the applicable requirements in sections 41–43 of the Act; this draft does not claim that a particular safeguard has already been implemented.',
      ],
    },
    {
      title: 'Cookies, storage, and security',
      paragraphs: [
        'Spotter uses a signed session cookie to keep you signed in. Access to private records is checked on the server. Passwords are stored as hashes, and verification and reset links are single-use and time-limited.',
        'The product design caches the app shell and the last membership-status summary on your device for weak connections. Cached information carries an “as of” time. Question answers and payment flows are not intended to be cached. Protect access to any device that stores your status summary.',
        'The service does not include advertising, marketing reminders, or automated follow-ups in its first version. Its account emails are verification and password reset, sent when requested.',
      ],
    },
    {
      title: 'How long information is kept',
      paragraphs: [
        'Retention periods for verified accounts, attendance, financial records, question logs, reports, audit history, and backups are not yet approved. Those periods and any applicable legal requirements must be settled before this policy is used as a final notice; this draft does not authorise indefinite retention.',
        'The approved account-cleanup design removes unverified accounts older than two months when a sign-up is processed, and removes failed-attempt records older than 24 hours when a new attempt is recorded. These are event-triggered cleanups, not guaranteed deletion at the exact expiry time.',
      ],
    },
    {
      title: 'Your rights and complaints',
      paragraphs: [
        'Subject to applicable conditions, the Act provides rights to access and correct personal data, request erasure or restriction, object to processing, obtain data portability, withdraw consent where relied upon, and challenge qualifying automated decisions. Sections 34–38 describe these rights.',
        'Spotter calculates app access from membership records; it does not decide money disputes or whether a physical door will open. Ask the desk to review an incorrect record. A privacy request may require an identity check to protect your records.',
        'You may complain to the Nigeria Data Protection Commission under section 46. Contacting the gym first does not remove that right.',
      ],
      links: [{ label: 'Nigeria Data Protection Commission', href: 'https://ndpc.gov.ng/' }],
    },
    {
      title: 'Children and policy updates',
      paragraphs: [
        'The registration policy for children, including any required parent or guardian involvement, is awaiting a decision. This draft does not set an age limit or claim that an age-verification process is in place.',
        'The final policy will show an effective date after the outstanding details are confirmed. Changes to actual processing must be reflected in the notice; this draft is not a certification of legal compliance.',
      ],
    },
  ],
};

export const termsOfService: LegalDocument = {
  title: 'Terms of Service',
  introduction: 'These draft terms describe Spotter, a web app provided by a gym to its members. The contracting business, contact details, eligibility rules, and effective date must be confirmed before these terms take effect.',
  sections: [
    {
      title: 'What Spotter provides',
      paragraphs: [
        'Spotter helps you ask questions about your gym, view your attendance and recorded balance, check in, pay for membership or a balance, and contact the desk. Shared answers come from approved gym records, not general internet knowledge. A source and date accompany an answer.',
        'When no record covers a question, Spotter hands you to the desk. It also refuses questions about another member, live door access, refunds, waivers, discounts, cancellations, staff conduct, and medical advice beyond an approved training card. These matters remain for the appropriate person to address.',
      ],
    },
    {
      title: 'Your account',
      paragraphs: [
        'Provide accurate contact details and answer truthfully whether you already belong to the gym. You set your password through the emailed verification link; verification creates your member record and membership ID. Keep your password and verification links private and use only your own account.',
        'A membership ID is a permanent desk reference. It is not an access credential. Ask the gym to correct inaccurate membership details. Eligibility rules for children and any guardian process are awaiting confirmation.',
      ],
    },
    {
      title: 'Free access and paid membership',
      paragraphs: [
        'Free access lets you use the app and view free gym information. It does not expire, but it is not gym membership and does not provide physical access or check-in. Paid access adds the gym’s approved training plans and trainer guidance.',
        'Paid status is calculated from the paid-until date in the gym’s records. Paying in Spotter does not unlock the gym door; access-card arrangements remain with the desk.',
      ],
    },
    {
      title: 'Payments and membership time',
      paragraphs: [
        'The gym owner sets the monthly membership price. Payments are unavailable until that price is set. No monthly price or gateway-fee allocation is promised by these draft terms; the fee arrangement remains to be confirmed.',
        'Payments are processed through Flutterwave. A payment is confirmed in Spotter only after the server receives and verifies the gateway confirmation. A success screen in your browser alone is not a receipt. A pending or interrupted payment may need review.',
        'A confirmed membership payment adds one calendar month from the later of today and your current paid-until date, adjusted to the last day of the destination month where necessary. Membership dates use Africa/Lagos time. Early payment does not remove remaining paid days. A payment towards a recorded balance does not extend membership time.',
        'Membership purchases are one month at a time; the first version has no automatic renewal or part-month price calculation. Cash and bank transfers paid to the gym appear after the owner records them. Direct payment discrepancies, refund requests, and cancellation requests to the gym. The absence of an in-app refund tool does not remove rights available under applicable law.',
      ],
    },
    {
      title: 'Attendance and balances',
      paragraphs: [
        'Paid members check in using the daily code. Only one attendance entry is counted per member per calendar day in Africa/Lagos. A staff member may record a manual check-in. A daily code records a good-faith check-in; it is not independent proof that someone entered the building.',
        'Balances are dated reports of recorded charges and payments, not decisions about what you legally owe. An existing gym member sees no balance until the owner records the opening balance. If a payment or visit is missing or inaccurate, ask the desk to review the underlying record.',
      ],
    },
    {
      title: 'Using the service responsibly',
      paragraphs: [
        'Do not use another person’s account, seek access to their private records, submit false check-ins, interfere with the service, or attempt to bypass access controls. Do not include another person’s private information in a question.',
        'Approved training-card content is information supplied by the gym. Spotter does not diagnose symptoms or provide personalised medical advice. Contact an appropriate qualified professional for medical concerns.',
      ],
    },
    {
      title: 'Availability, privacy, and support',
      paragraphs: [
        'Questions, payments, and check-in require a network connection. A cached status may be out of date; check its timestamp. Spotter may be unable to answer while a provider is unavailable or a gym record is missing.',
        'The Privacy Policy explains account data, question logging, limited Google processing, payments, cookies, and data rights. A WhatsApp handoff or an email draft is sent only when you choose to send it through that service.',
        'Ask the gym desk about membership, attendance, balance, and physical access. The Spotter operator’s support email and legal contact details are awaiting confirmation.',
      ],
    },
    {
      title: 'Applicable law and finalisation',
      paragraphs: [
        'This draft is prepared for the Nigerian service described in the product requirements. It does not exclude mandatory consumer or data-protection rights under applicable Nigerian law.',
        'The final terms must identify the contracting entity, effective date, eligibility rules, payment-fee arrangements, and complaint contact. This draft introduces no automatic acceptance mechanism, liability cap, mandatory arbitration clause, or waiver of statutory rights.',
      ],
    },
  ],
};

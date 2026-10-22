/**
 * Business details shown on the Contact, Terms and Refund pages.
 * Razorpay reviews these pages before activating live payments: fill them in with
 * your real legal name, address and support email (see docs/SETUP-SUBSCRIPTIONS.md).
 */
export const SITE = {
    name: 'PDFAdore',
    url: 'https://www.pdfadore.com',
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'support@pdfadore.com',
    /** Legal name of the business or individual operating the site. */
    legalName: process.env.NEXT_PUBLIC_LEGAL_NAME || 'Foxora Digital LLP',
    /** Registered/communication address. */
    address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS || 'Thundiyil Building, M Kanaran Road, East Nadakkave, Nadakkave, Kozhikode, Kerala 673006, India',
    /** Customer support phone, shown with the country code. */
    phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE || '+91 98097 25430',
    /** Courts with jurisdiction over disputes. */
    jurisdiction: process.env.NEXT_PUBLIC_JURISDICTION || 'Kozhikode, Kerala',
    policiesUpdated: 'October 22, 2026',
};

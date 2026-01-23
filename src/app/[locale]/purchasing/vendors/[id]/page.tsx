import { redirect } from 'next/navigation';

export default async function VendorEditRedirect({ params }: { params: { id: string } }) {
    // Redirect to pane-based edit in vendor center
    redirect(`/purchasing/vendors?vendorId=${params.id}&mode=edit`);
}

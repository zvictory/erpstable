import { redirect } from 'next/navigation';

export default function UOMSettingsPage() {
    redirect('/inventory/items?masterData=uom');
}

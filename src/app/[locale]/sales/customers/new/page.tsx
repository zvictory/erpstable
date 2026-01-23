import { redirect } from 'next/navigation';
import CustomerForm from '@/components/sales/CustomerForm';
import { createCustomer } from '@/app/actions/sales';

export const metadata = {
    title: 'New Customer',
};

export default async function NewCustomerPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const handleSave = async (data: any) => {
        'use server';
        try {
            const result = await createCustomer(data);
            if (result.success && result.customer) {
                redirect(`/${locale}/sales/customers?customerId=${result.customer.id}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Create customer error:', error);
            throw error;
        }
    };

    const handleCancel = async () => {
        'use server';
        redirect(`/${locale}/sales/customers`);
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mx-auto">
                <CustomerForm
                    mode="create"
                    onSuccess={async () => {
                        'use server';
                        redirect(`/${locale}/sales/customers`);
                    }}
                    onCancel={handleCancel}
                />
            </div>
        </div>
    );
}

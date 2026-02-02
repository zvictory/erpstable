import { redirect } from 'next/navigation';
import CustomerForm from '@/components/sales/CustomerForm';
import { createCustomer } from '@/app/actions/sales';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { DomainNavigation } from '@/components/navigation/DomainNavigation';
import { DOMAIN_NAV_CONFIG } from '@/lib/domain-nav-config';

export async function generateMetadata() {
    const t = await getTranslations('sales.customers');
    return {
        title: t('new_customer_title'),
    };
}

export default async function NewCustomerPage({
    params: { locale }
}: {
    params: { locale: string }
}) {
    const session = await auth();

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
        <>
            <DomainNavigation
                items={DOMAIN_NAV_CONFIG.sales}
                domain="sales"
                userRole={session?.user?.role}
            />
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
        </>
    );
}

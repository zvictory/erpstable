/**
 * Status label translations for Russian locale
 * Maps internal status codes to user-friendly Russian labels
 */

export const STATUS_TRANSLATIONS_RU: Record<string, string> = {
    // Document statuses
    'DRAFT': 'Черновик',
    'PENDING': 'На согласовании',
    'APPROVED': 'Утверждено',
    'POSTED': 'Проведен',
    'CANCELLED': 'Отменен',

    // Payment statuses
    'OPEN': 'Открыт',
    'PAID': 'Оплачен',
    'PARTIAL': 'Частично оплачен',
    'OVERDUE': 'Просрочен',

    // Production statuses
    'SCHEDULED': 'Запланировано',
    'IN_PROGRESS': 'В работе',
    'COMPLETED': 'Завершено',
    'ON_HOLD': 'Приостановлено',

    // Inventory statuses
    'ACTIVE': 'Активен',
    'INACTIVE': 'Неактивен',
    'ARCHIVED': 'Архивирован',
};

/**
 * Get localized status label
 * @param status - Status code (e.g., 'DRAFT', 'POSTED')
 * @param locale - Locale code (default: 'ru')
 * @returns Localized status label
 */
export function getStatusLabel(status: string, locale: string = 'ru'): string {
    if (locale === 'ru') {
        return STATUS_TRANSLATIONS_RU[status] || status;
    }
    return status;
}

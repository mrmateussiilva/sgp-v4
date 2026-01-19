import { describe, it, expect } from 'vitest';

// Simulação da lógica corrigida
const getUrgencyType = (dataEntrega: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let deliveryDate: Date;
    const dateMatch = dataEntrega.match(/^(\d{4})-(\d{2})-(\d{2})/);

    if (dateMatch) {
        const [, y, m, d] = dateMatch.map(Number);
        deliveryDate = new Date(y, m - 1, d);
    } else {
        deliveryDate = new Date(dataEntrega);
    }

    deliveryDate.setHours(0, 0, 0, 0);

    const diffTime = deliveryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'overdue';
    if (diffDays === 0) return 'today';
    return 'ok';
};

describe('Delay Logic Fix', () => {
    it('marks today as "today" and NOT "overdue"', () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        expect(getUrgencyType(todayStr)).toBe('today');
    });

    it('marks yesterday as "overdue"', () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const year = yesterday.getFullYear();
        const month = String(yesterday.getMonth() + 1).padStart(2, '0');
        const day = String(yesterday.getDate()).padStart(2, '0');
        const yesterdayStr = `${year}-${month}-${day}`;

        expect(getUrgencyType(yesterdayStr)).toBe('overdue');
    });

    it('marks tomorrow as "ok"', () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const year = tomorrow.getFullYear();
        const month = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const day = String(tomorrow.getDate()).padStart(2, '0');
        const tomorrowStr = `${year}-${month}-${day}`;

        expect(getUrgencyType(tomorrowStr)).toBe('ok');
    });
});

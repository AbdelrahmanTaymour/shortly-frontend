export const getLinkStatus = (link) => {
    const now = new Date();
    const expiryDate = link.expiresAt ? new Date(link.expiresAt) : null;

    if (expiryDate && expiryDate < now) {
        return {label: '🔴 Expired', class: 'text-danger'};
    }

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    if (expiryDate && (expiryDate - now < ONE_DAY_MS)) {
        return {label: '🟡 Expiring', class: 'text-warning'};
    }

    return link.isActive
        ? {label: '🟢 Active', class: 'text-success'}
        : {label: '⚪ Inactive', class: 'text-muted'};
};
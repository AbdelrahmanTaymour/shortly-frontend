/**
 * API Configuration
 * Central place for API endpoints and Settings
 */
const apiConfig = {
    // baseUrl: 'https://localhost:5002',  // dev
    baseUrl: 'https://shortly.runasp.net',

    timeout: 30000,

    retry: {
        maxAttempts: 3,
        delayMs: 1000,
        backoffMultiplier: 2
    },

    defaultHeaders: {
        'Content-Type': 'application/json'
    },

    endpoints: {

        // Account Management
        account: {
            sendEmailVerification: '/api/auth/send-email-verification',
            verifyEmail: '/api/auth/verify-email',
            changeEmail: '/api/auth/change-email',
            confirmEmailChange: '/api/auth/confirm-email-change',
            forgotPassword: '/api/auth/forgot-password',
            validateResetToken: '/api/auth/validate-reset-token',
            resetPassword: '/api/auth/reset-password',
            changePassword: '/api/auth/change-password'
        },

        // Authentication
        auth: {
            register: '/api/auth/register',
            login: '/api/auth/login',
            logout: '/api/auth/logout',
            logoutAll: '/api/auth/logout-all',
            refreshToken: '/api/auth/refresh-token'
        },

        // Click Tracking
        clickTracking: {
            trackClick: '/api/urls/tracking/:shortUrlId/click',
            getAnalytics: '/api/urls/tracking/:shortUrlId/Analytics',
            getRealTimeAnalytics: '/api/urls/tracking/:shortUrlId/real-time',
            getRecentClicks: '/api/urls/tracking/:shortUrlId/recent-clicks',
            getClickHistory: '/api/urls/tracking/:shortUrlId/click-history',
            cleanupOldClicks: '/api/urls/tracking/cleanup'
        },

        // OAuth
        oauth: {
            googleLogin: '/api/oauth/google/login',
            googleCallback: '/api/oauth/google/callback',
            status: '/api/oauth/status'
        },

        // Organizations
        organizations: {
            getAll: '/api/organizations',
            create: '/api/organizations',
            getById: '/api/organizations/:organizationId',
            search: '/api/organizations/search',
            getUserOrganizations: '/api/organizations/user/:ownerId',
            update: '/api/organizations/:id',
            delete: '/api/organizations/:id',
            activate: '/api/organizations/:id/activate',
            deactivate: '/api/organizations/:id/deactivate',
            transferOwnership: '/api/organizations/:id/transfer-ownership',
            checkUserAccess: '/api/organizations/:id/access/:userId'
        },

        // Organization Invitations
        organizationInvitations: {
            getByOrganization: '/api/organization-invitations/organization/:organizationId',
            create: '/api/organization-invitations/organization/:organizationId',
            getById: '/api/organization-invitations/:id',
            validate: '/api/organization-invitations/validate',
            accept: '/api/organization-invitations/accept',
            reject: '/api/organization-invitations/reject',
            cancel: '/api/organization-invitations/:id',
            resend: '/api/organization-invitations/:id/resend',
            cleanupExpired: '/api/organization-invitations/cleanup-expired'
        },

        // Organization Members
        organizationMembers: {
            getAll: '/api/organization-members',
            create: '/api/organization-members',
            getByOrganization: '/api/organization-members/organization/:organizationId',
            getByUser: '/api/organization-members/user/:userId',
            getMembership: '/api/organization-members/:organizationId/user/:userId',
            remove: '/api/organization-members/:organizationId/user/:userId',
            updateRole: '/api/organization-members/:organizationId/user/:userId/role',
            updatePermissions: '/api/organization-members/:organizationId/user/:userId/permissions',
            isMember: '/api/organization-members/:organizationId/user/:userId/is-member'
        },

        // Organization Teams
        organizationTeams: {
            getById: '/api/organization-teams/:id',
            update: '/api/organization-teams/:id',
            delete: '/api/organization-teams/:id',
            getByOrganization: '/api/organization-teams/organization/:organizationId',
            getMembers: '/api/organization-teams/:teamId/members',
            addMember: '/api/organization-teams/:teamId/members',
            create: '/api/organization-teams',
            removeMember: '/api/organization-teams/:teamId/members/:memberId',
            changeManager: '/api/organization-teams/:teamId/manager'
        },

        // Organization Usage
        organizationUsage: {
            getStats: '/api/organization-usage/:organizationId/stats',
            trackLink: '/api/organization-usage/:organizationId/track/link',
            trackQrCode: '/api/organization-usage/:organizationId/track/qrcode',
            canCreateLinks: '/api/organization-usage/:organizationId/can-create-Links',
            canCreateQrCodes: '/api/organization-usage/:organizationId/can-create-qrcodes',
            resetUsage: '/api/organization-usage/:organizationId/reset-usage',
            resetAllUsage: '/api/organization-usage/reset-all-usage'
        },

        // Profile
        profile: {
            get: '/api/Profile',
            delete: '/api/Profile',
            getQuotaStatus: '/api/Profile/quota-status',
            update: '/api/Profile/update'
        },

        // Security
        security: {
            getUserSecurityStatus: '/api/users/:userId/security/status',
            recordFailedLogin: '/api/users/:userId/security/failed-attempts',
            resetFailedLogins: '/api/users/:userId/security/reset-failed-attempts',
            isUserLocked: '/api/users/:userId/security/is-locked',
            lockUser: '/api/users/:userId/security/lock',
            unlockUser: '/api/users/:userId/security/unlock'
        },

        // Short URLs
        shortUrls: {
            getById: '/api/short-urls/:id',
            update: '/api/short-urls/:id',
            delete: '/api/short-urls/:id',
            getByCode: '/api/short-urls/code/:shortCode',
            deleteByCode: '/api/short-urls/code/:shortCode',
            create: '/api/short-urls',
            updateShortCode: '/api/short-urls/:id/short-code',
            isCodeExists: '/api/short-urls/code-exists',
        },

        // Short URL Analytics
        shortUrlAnalytics: {
            getTotalCount: '/api/short-urls/Analytics/total-count',
            getTotalClicks: '/api/short-urls/Analytics/:shortUrlId/total-clicks',
            getMostPopular: '/api/short-urls/Analytics/most-popular',
            getUserSummary: '/api/short-urls/Analytics/user/:userId/summary',
            getOrganizationSummary: '/api/short-urls/Analytics/organization/:organizationId/summary',
            getApproachingLimit: '/api/short-urls/Analytics/approaching-limit'
        },

        // Short URL Bulk Operations
        shortUrlBulk: {
            create: '/api/short-urls/bulk/create',
            updateExpiration: '/api/short-urls/bulk/update-expiration',
            delete: '/api/short-urls/bulk/delete',
            deleteExpired: '/api/short-urls/bulk/delete-expired',
            activate: '/api/short-urls/bulk/activate',
            deactivate: '/api/short-urls/bulk/deactivate'
        },

        // Short URL Query
        shortUrlQuery: {
            getByUser: '/api/short-urls/query/user/:userId',
            getByOrganization: '/api/short-urls/query/organization/:organizationId',
            getAnonymous: '/api/short-urls/query/anonymous',
            getExpired: '/api/short-urls/query/expired',
            getPrivateByUser: '/api/short-urls/query/private/:userId',
            getByDateRange: '/api/short-urls/query/date-range',
            getDuplicates: '/api/short-urls/query/duplicates',
            getUnused: '/api/short-urls/query/unused',
            search: '/api/short-urls/query/search',
        },

        // Short URL Redirect
        shortUrlRedirect: {
            redirect: '/:shortCode',
            passwordPage: '/api/url-redirect/password-page',
            verify: '/api/url-redirect/verify'
        },

        // User
        user: {
            getCurrentUser: '/api/user/current-user',
            getById: '/api/user/by-Id/:userId',
            getByEmail: '/api/user/by-email',
            getByUsername: '/api/user/by-username',
            create: '/api/user',
            update: '/api/user/:userId',
            delete: '/api/user/delete/:userId',
            activate: '/activate/:userId',
            deactivate: '/deactivate/:userId',
            exists: '/api/user/exists/:userId',
            isEmailAvailable: '/api/user/email-availability',
            isUsernameAvailable: '/api/user/username-availability'
        },

        // User Usage
        userUsage: {
            getStats: '/api/usage/:userId',
            trackLink: '/api/usage/:userId/track-link',
            trackQrCode: '/api/usage/:userId/track-qr',
            canCreateLinks: '/api/usage/:userId/can-create-Links',
            canCreateQrCodes: '/api/usage/:userId/can-create-qr',
            getRemainingLinks: '/api/usage/:userId/remaining-Links',
            getRemainingQrCodes: '/api/usage/:userId/remaining-qr',
            hasExceededLimits: '/api/usage/:userId/has-exceeded',
            resetUsage: '/api/usage/:userId/reset',
            resetAllUsage: '/api/usage/reset-all',
            getReport: '/api/usage/report'
        }
    }


};

export default apiConfig;

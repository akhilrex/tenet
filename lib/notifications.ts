import webpush from 'web-push';

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const email = process.env.VAPID_EMAIL || 'mailto:example@example.com';

if (process.env.ENABLE_NOTIFICATIONS === 'true') {
    if (!publicKey || !privateKey) {
        console.warn('Web Push VAPID keys are missing. Notifications will not work.');
    } else {
        webpush.setVapidDetails(email, publicKey, privateKey);
    }
}

export async function sendNotification(subscription: { endpoint: string; p256dh: string; auth: string }, payload: any) {
    if (process.env.ENABLE_NOTIFICATIONS !== 'true') return;

    try {
        const pushSubscription = {
            endpoint: subscription.endpoint,
            keys: {
                p256dh: subscription.p256dh,
                auth: subscription.auth,
            },
        };

        await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
    } catch (error) {
        console.error('Error sending notification:', error);
        // If subscription is expired or invalid, we should handle it (e.g., delete from DB)
    }
}

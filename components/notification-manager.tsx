'use client';

import { useEffect } from 'react';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

export function NotificationManager() {
    useEffect(() => {
        if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
            registerServiceWorker().catch(err => console.error(err));
        }
    }, []);

    async function registerServiceWorker() {
        const register = await navigator.serviceWorker.register('/sw.js', {
            scope: '/',
        });

        // Check if we have permission
        if (Notification.permission === 'default') {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;
        }

        if (Notification.permission === 'granted') {
            const subscription = await register.pushManager.getSubscription();

            if (!subscription) {
                if (!publicVapidKey) {
                    console.warn('VAPID public key is missing');
                    return;
                }

                const newSubscription = await register.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicVapidKey),
                });

                await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    body: JSON.stringify(newSubscription),
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });
            }
        }
    }

    function urlBase64ToUint8Array(base64String: string) {
        const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    return null;
}

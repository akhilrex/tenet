self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
    // We can add caching logic here later if needed
    event.respondWith(fetch(event.request));
});

self.addEventListener('push', function (event) {
    if (event.data) {
        const data = event.data.json();
        const options = {
            body: data.body,
            icon: data.icon || '/tenet_logo_v2.png',
            badge: '/badge.png', // We might need to create this later
            data: {
                url: data.url || '/',
            },
        };

        event.waitUntil(self.registration.showNotification(data.title, options));
    }
});

self.addEventListener('notificationclick', function (event) {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});

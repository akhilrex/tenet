
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export function TopProgressBar() {
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        // Listen for custom events to show/hide the progress bar
        const show = () => setLoading(true)
        const hide = () => setLoading(false)

        window.addEventListener('route-change-start', show)
        window.addEventListener('route-change-end', hide)

        return () => {
            window.removeEventListener('route-change-start', show)
            window.removeEventListener('route-change-end', hide)
        }
    }, [])

    if (!loading) return null

    return (
        <div className="fixed top-0 left-0 right-0 z-[100]">
            <div className="h-1 w-full bg-muted overflow-hidden">
                <div className="h-full bg-primary animate-progress origin-left"></div>
            </div>
        </div>
    )
}

export function triggerLoading(type: 'start' | 'end') {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(`route-change-${type}`))
    }
}

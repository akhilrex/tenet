'use client'
import { useRouter } from "next/navigation"
import { DateNav } from "./date-nav"
import { triggerLoading } from "./top-progress-bar"
import { useEffect } from "react"

export function DateNavClient({ dateStr }: { dateStr: string }) {
    const router = useRouter()

    useEffect(() => {
        // Hide loading bar once dateStr changes (indicating navigation complete)
        triggerLoading('end')
    }, [dateStr])

    // Ensure accurate date object specifically from "YYYY-MM-DD" without timezone shift
    const [y, m, d] = dateStr.split('-').map(Number)
    const date = new Date(y, m - 1, d)

    const setDate = (d: Date) => {
        triggerLoading('start')
        // Adjust for timezone offset so we get correct YYYY-MM-DD
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        const newDateStr = `${year}-${month}-${day}`
        router.push(`/?date=${newDateStr}`)
    }

    return <DateNav date={date} setDate={setDate} />
}

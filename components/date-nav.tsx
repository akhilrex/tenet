'use client'

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { format, addDays, subDays } from "date-fns"

interface DateNavProps {
    date: Date
    setDate: (date: Date) => void
}

export function DateNav({ date, setDate }: DateNavProps) {
    return (
        <div className="flex items-center space-x-4">
            <Button variant="outline" size="icon" onClick={() => setDate(subDays(date, 1))}>
                <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="text-lg font-semibold min-w-[200px] text-center">
                {format(date, "EEEE, MMM d, yyyy")}
            </div>
            <Button variant="outline" size="icon" onClick={() => setDate(addDays(date, 1))}>
                <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={() => setDate(new Date())}>
                Today
            </Button>
        </div>
    )
}

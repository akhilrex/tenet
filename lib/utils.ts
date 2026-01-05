import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTimeRange(startTime: string, duration: number) {
  const [h, m] = startTime.split(':').map(Number)
  const startDate = new Date()
  startDate.setHours(h, m, 0, 0)

  const endDate = new Date(startDate.getTime() + duration * 60000)

  const formatTime = (d: Date) => {
    let hours = d.getHours()
    const minutes = d.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12 // the hour '0' should be '12'
    const minsStr = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${minsStr}${ampm}`
  }

  return `${formatTime(startDate)} - ${formatTime(endDate)}`
}

export function formatEventTimeRange(start: Date, end: Date) {
  const formatTime = (d: Date) => {
    let hours = d.getHours()
    const minutes = d.getMinutes()
    const ampm = hours >= 12 ? 'pm' : 'am'
    hours = hours % 12
    hours = hours ? hours : 12
    const minsStr = minutes < 10 ? '0' + minutes : minutes
    return `${hours}:${minsStr}${ampm}`
  }
  return `${formatTime(start)} - ${formatTime(end)}`
}

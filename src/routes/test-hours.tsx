import { createFileRoute } from '@tanstack/react-router'
import { HoursEditor } from '@/components/GymSetupPanel'

export const Route = createFileRoute('/test-hours')({
  component: TestHoursPage,
})

const mockHours = [
  { day: 'Monday', open: '06:00', close: '22:00', closed: false },
  { day: 'Tuesday', open: '06:00', close: '22:00', closed: false },
  { day: 'Wednesday', open: '06:00', close: '22:00', closed: false },
  { day: 'Thursday', open: '06:00', close: '22:00', closed: false },
  { day: 'Friday', open: '06:00', close: '22:00', closed: false },
  { day: 'Saturday', open: '08:00', close: '16:00', closed: false },
  { day: 'Sunday', open: '08:00', close: '16:00', closed: true },
]

function TestHoursPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm">
        <HoursEditor hours={mockHours} onSave={(h) => console.log(h)} />
      </div>
    </div>
  )
}

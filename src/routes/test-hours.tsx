import { createFileRoute } from '@tanstack/react-router'
import { GymSetupPanel } from '@/components/GymSetupPanel'

export const Route = createFileRoute('/test-hours')({
  component: TestHoursPage,
})

function TestHoursPage() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl rounded-2xl border bg-card p-6 shadow-sm">
        <GymSetupPanel />
      </div>
    </div>
  )
}

import CreatePollForm from '@/components/CreatePollForm'
import ProtectedRoute from '@/components/protected-route'

export default function CreatePoll() {
  return (
    <ProtectedRoute>
      <CreatePollForm />
    </ProtectedRoute>
  )
}
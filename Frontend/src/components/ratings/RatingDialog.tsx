import { useEffect, useState } from 'react'
import { Loader2, Star } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ErrorAlert } from '../ui/ErrorAlert'
import { StarRating } from './StarRating'
import { getErrorMessage } from '../../lib/api'
import { submitRating } from '../../lib/ratings-api'
import { TARGET_LABELS } from '../../types/ratings'
import type { OrderRating, Rating, RatingTargetType } from '../../types/ratings'

interface RatingDialogProps {
  open: boolean
  orderId: number
  targetType: RatingTargetType
  targetName: string
  existing?: Rating | OrderRating | null
  onClose: () => void
  onSaved: (rating: Rating) => void
}

export function RatingDialog({
  open,
  orderId,
  targetType,
  targetName,
  existing,
  onClose,
  onSaved,
}: RatingDialogProps) {
  const [score, setScore] = useState(0)
  const [comment, setComment] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      return
    }

    setScore(existing?.score ?? 0)
    setComment(existing?.comment ?? '')
    setError(null)
    setSaving(false)
  }, [open, existing])

  async function handleSubmit() {
    if (score < 1) {
      setError('Selecciona de 1 a 5 estrellas.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const data = await submitRating(orderId, {
        targetType,
        score,
        comment: comment.trim() || undefined,
      })

      onSaved(data.rating)
      onClose()
    } catch (submitError) {
      setError(
        getErrorMessage(submitError, 'No se pudo guardar la calificación.'),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`Calificar ${TARGET_LABELS[targetType].toLowerCase()}`}
      description={targetName}
      onClose={() => {
        if (!saving) {
          onClose()
        }
      }}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Star className="size-4 fill-white" aria-hidden="true" />
            )}
            {existing ? 'Actualizar calificación' : 'Enviar calificación'}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-4 text-center">
          <p className="text-sm text-amber-800">
            ¿Cómo fue tu experiencia con{' '}
            <span className="font-bold">{targetName}</span>?
          </p>
          <div className="mt-3 flex justify-center">
            <StarRating value={score} onChange={setScore} size={34} />
          </div>
          <p className="mt-2 text-[11px] font-semibold text-amber-700">
            {score > 0
              ? ['Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'][score - 1]
              : 'Toca las estrellas para puntuar'}
          </p>
        </div>

        <div>
          <label
            htmlFor="rating-comment"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Comentario (opcional)
          </label>
          <textarea
            id="rating-comment"
            rows={3}
            maxLength={500}
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder="Cuéntanos qué tal estuvo el servicio…"
            className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
          />
          <p className="mt-1 text-right text-[11px] text-slate-400">
            {comment.length}/500
          </p>
        </div>

        {error && <ErrorAlert message={error} />}
      </div>
    </Modal>
  )
}

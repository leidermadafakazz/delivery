import { useEffect, useState } from 'react'
import { Loader2, XCircle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { ErrorAlert } from '../ui/ErrorAlert'
import { getErrorMessage } from '../../lib/api'

interface RejectRequestModalProps {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
}

export function RejectRequestModal({
  open,
  title,
  description,
  onClose,
  onConfirm,
}: RejectRequestModalProps) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (open) {
      setReason('')
      setError(null)
      setBusy(false)
    }
  }, [open])

  async function handleConfirm() {
    if (reason.trim().length < 5) {
      setError('Escribe un motivo de al menos 5 caracteres.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      await onConfirm(reason.trim())
    } catch (err) {
      setError(getErrorMessage(err, 'No se pudo completar la acción.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      title={title}
      description={description}
      onClose={() => {
        if (!busy) {
          onClose()
        }
      }}
      footer={
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleConfirm()}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <XCircle className="size-4" aria-hidden="true" />
            )}
            Confirmar rechazo
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          El solicitante verá este motivo y podrá corregir sus datos para
          reenviar la solicitud. Si ya estaba aprobada, se le revocará el rol.
        </p>
        <label
          htmlFor="reject-application-reason"
          className="mb-1.5 block text-sm font-medium text-slate-700"
        >
          Motivo del rechazo
        </label>
        <textarea
          id="reject-application-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Ej. El documento no es legible, faltan datos de contacto…"
          className="block w-full resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
        />
        {error && <ErrorAlert message={error} />}
      </div>
    </Modal>
  )
}

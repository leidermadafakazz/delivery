import { Star } from 'lucide-react'
import { cn } from '../../lib/cn'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: number
  showValue?: boolean
  count?: number
  className?: string
}

export function StarRating({
  value,
  onChange,
  size = 16,
  showValue = false,
  count,
  className,
}: StarRatingProps) {
  const filledStars = Math.round(value)

  return (
    <div className={cn('inline-flex items-center gap-0.5', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= filledStars

        const icon = (
          <Star
            style={{ width: size, height: size }}
            className={cn(
              filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-100 text-slate-300',
            )}
            aria-hidden="true"
          />
        )

        return onChange ? (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="rounded transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-amber-300"
            aria-label={`${star} de 5 estrellas`}
            aria-pressed={star === filledStars}
          >
            {icon}
          </button>
        ) : (
          <span key={star}>{icon}</span>
        )
      })}

      {showValue && (
        <span className="ml-1 text-xs font-semibold text-slate-600">
          {value > 0 ? value.toFixed(1) : 'Sin calificar'}
          {typeof count === 'number' ? ` (${count})` : ''}
        </span>
      )}
    </div>
  )
}

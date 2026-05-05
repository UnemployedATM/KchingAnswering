import { useState } from 'react';
import { Star, Send, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/Toast';

/**
 * Inline post-class rating prompt.
 * Shows on past confirmed bookings that haven't been rated yet.
 *
 * Props:
 *   bookingId  — UUID of the booking
 *   clientId   — current client's UUID
 *   studioId   — studio UUID (from booking)
 *   color      — studio accent color
 *   onRated    — callback after successful submit (to refresh data)
 */
export default function RatingPrompt({ bookingId, clientId, studioId, color = '#ffa504', onRated }) {
  const [expanded, setExpanded] = useState(false);
  const [stars, setStars]       = useState(0);
  const [hovering, setHovering] = useState(0);
  const [text, setText]         = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted]   = useState(false);

  async function handleSubmit() {
    if (stars === 0) return;
    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('session_ratings')
        .insert({
          booking_id:    bookingId,
          client_id:     clientId,
          studio_id:     studioId,
          stars,
          feedback_text: text.trim() || null,
        });
      if (error) throw error;
      setSubmitted(true);
      toast.success('Thanks for your feedback!');
      onRated?.();
    } catch (err) {
      toast.error(err.message ?? 'Could not submit rating');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-3 flex items-center gap-2 text-xs text-green-600">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="font-medium">Rated {stars}/5 — thank you!</span>
      </div>
    );
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="mt-3 text-xs font-semibold flex items-center gap-1.5 transition-colors"
        style={{ color }}
      >
        <Star className="w-3.5 h-3.5" />
        Rate this class
      </button>
    );
  }

  const display = hovering || stars;

  return (
    <div
      className="mt-3 rounded-xl bg-gray-50 p-3 space-y-2.5"
      style={{ animation: 'pageEnter 0.2s ease-out' }}
    >
      {/* Stars */}
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            onClick={() => setStars(n)}
            onMouseEnter={() => setHovering(n)}
            onMouseLeave={() => setHovering(0)}
            onTouchStart={() => setHovering(n)}
            onTouchEnd={() => setHovering(0)}
            className="p-0.5 transition-transform active:scale-110"
          >
            <Star
              className="w-6 h-6 transition-colors duration-150"
              fill={n <= display ? '#facc15' : 'none'}
              stroke={n <= display ? '#eab308' : '#d1d5db'}
              strokeWidth={1.8}
            />
          </button>
        ))}
        {stars > 0 && (
          <span className="ml-2 text-xs text-gray-400 font-medium">
            {stars === 1 && 'Not great'}
            {stars === 2 && 'Okay'}
            {stars === 3 && 'Good'}
            {stars === 4 && 'Great'}
            {stars === 5 && 'Loved it!'}
          </span>
        )}
      </div>

      {/* Optional feedback text */}
      {stars > 0 && (
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Any feedback? (optional)"
          rows={2}
          maxLength={500}
          className="w-full text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-gray-300 placeholder:text-gray-400"
        />
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setExpanded(false); setStars(0); setText(''); setHovering(0); }}
          className="text-xs text-gray-400 font-medium"
        >
          Cancel
        </button>
        {stars > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-1.5 text-xs font-semibold text-white px-3.5 py-1.5 rounded-full active:scale-95 transition-transform disabled:opacity-50"
            style={{ backgroundColor: color }}
          >
            <Send className="w-3 h-3" />
            {submitting ? 'Sending...' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}

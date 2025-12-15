/**
 * State Machine Validator for Print Status Transitions (Website)
 * Enforces strict state transition rules to prevent invalid operations
 */

export type PrintStatus = 'pending' | 'printing' | 'printed';

/**
 * Allowed state transitions
 * Key: from state, Value: array of allowed to states
 */
const ALLOWED_TRANSITIONS: Record<PrintStatus, PrintStatus[]> = {
  pending: ['printing'], // pending → printing (allowed)
  printing: ['printed', 'pending'], // printing → printed (success) or printing → pending (failure/reset)
  printed: ['pending'], // printed → pending (admin override only)
};

/**
 * Validate if a state transition is allowed
 */
export interface TransitionValidation {
  allowed: boolean;
  reason?: string;
}

export function validatePrintTransition(
  from: PrintStatus | string | undefined,
  to: PrintStatus | string,
  isAdmin: boolean = false
): TransitionValidation {
  // Handle undefined/null from state (new orders)
  if (!from || from === 'undefined' || from === 'null') {
    if (to === 'pending') {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Cannot transition from undefined to ${to}. New orders must start as 'pending'.`,
    };
  }

  // Validate from state is a valid PrintStatus
  if (!['pending', 'printing', 'printed'].includes(from)) {
    return {
      allowed: false,
      reason: `Invalid from state: ${from}. Must be one of: pending, printing, printed.`,
    };
  }

  // Validate to state is a valid PrintStatus
  if (!['pending', 'printing', 'printed'].includes(to)) {
    return {
      allowed: false,
      reason: `Invalid to state: ${to}. Must be one of: pending, printing, printed.`,
    };
  }

  const fromState = from as PrintStatus;
  const toState = to as PrintStatus;

  // Check if transition is in allowed list
  const allowedTransitions = ALLOWED_TRANSITIONS[fromState] || [];
  const isAllowed = allowedTransitions.includes(toState);

  // Special handling for admin overrides
  if (!isAllowed && isAdmin) {
    // Admin can override printed → pending (for reprints)
    if (fromState === 'printed' && toState === 'pending') {
      return {
        allowed: true,
        reason: 'Admin override: printed → pending (reprint)',
      };
    }
    // Admin can override printing → printed (force complete)
    if (fromState === 'printing' && toState === 'printed') {
      return {
        allowed: true,
        reason: 'Admin override: printing → printed (force complete)',
      };
    }
  }

  if (!isAllowed) {
    return {
      allowed: false,
      reason: `Transition from '${fromState}' to '${toState}' is not allowed. Allowed transitions from '${fromState}': ${allowedTransitions.join(', ')}.`,
    };
  }

  return { allowed: true };
}


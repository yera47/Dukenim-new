export type CheckoutSubmissionGuard = {
  acquire: () => boolean;
  release: () => void;
};

export function createCheckoutSubmissionGuard(): CheckoutSubmissionGuard {
  let locked = false;
  return {
    acquire() {
      if (locked) return false;
      locked = true;
      return true;
    },
    release() { locked = false; },
  };
}

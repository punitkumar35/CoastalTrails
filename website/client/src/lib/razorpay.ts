interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayFailedResponse {
  error?: { description?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.success', cb: (r: RazorpaySuccessResponse) => void): void;
  on(event: 'payment.failed', cb: (r: RazorpayFailedResponse) => void): void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  method?: { upi?: boolean; card?: boolean; netbanking?: boolean; wallet?: boolean };
  modal?: { ondismiss?: () => void };
  handler: (r: RazorpaySuccessResponse) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="checkout.razorpay.com"]')) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Could not load the payment gateway. Check your connection.'));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export interface CheckoutConfig {
  key: string;
  orderId: string;
  amountPaise: number;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  method?: 'upi' | 'card' | 'netbanking';
  onSuccess: (r: RazorpaySuccessResponse) => void | Promise<void>;
  onFail?: (message: string) => void;
  onCancel?: () => void | Promise<void>;
}

export async function openRazorpayCheckout(config: CheckoutConfig): Promise<void> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error('Payment gateway failed to load.');

  const rzp = new window.Razorpay({
    key: config.key,
    amount: config.amountPaise,
    currency: 'INR',
    name: 'Coastal Trails',
    description: config.description,
    order_id: config.orderId,
    prefill: config.prefill,
    theme: { color: '#0f766e' },
    method: {
      upi: config.method === 'upi',
      card: config.method === 'card',
      netbanking: config.method === 'netbanking',
      wallet: config.method === 'upi',
    },
    modal: {
      ondismiss: () => {
        void config.onCancel?.();
      },
    },
    handler: (r) => {
      void config.onSuccess(r);
    },
  });

  rzp.on('payment.failed', (r) => {
    config.onFail?.(r.error?.description || 'Payment failed. Please try again.');
  });

  rzp.open();
}

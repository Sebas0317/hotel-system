import { useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';

const SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || '6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI';

export default function ReCaptchaWidget({ onVerify, onExpire, theme = 'light' }) {
  const ref = useRef(null);

  return (
    <ReCAPTCHA
      ref={ref}
      sitekey={SITE_KEY}
      onChange={onVerify}
      onExpired={() => onExpire?.()}
      onErrored={() => onExpire?.()}
      theme={theme}
    />
  );
}

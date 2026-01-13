import { useState } from 'react';
import type { Employee } from '../types';

interface PinEntryProps {
  employee: Employee;
  onVerify: (pin: string) => Promise<boolean>;
  onBack: () => void;
  error?: string;
  isPending?: boolean;
}

export function PinEntry({ employee, onVerify, onBack, error, isPending }: PinEntryProps) {
  const [pin, setPin] = useState('');

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        onVerify(newPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  return (
    <div className="pin-entry">
      <h2>Enter PIN</h2>
      <p className="employee-name">{employee.full_name}</p>

      <div className="pin-display">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className={`pin-dot ${i < pin.length ? 'filled' : ''}`} />
        ))}
      </div>

      {error && <div className="pin-error">{error}</div>}

      <div className="pin-pad">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
          <button
            key={digit}
            type="button"
            className="pin-button"
            onClick={() => handleDigit(String(digit))}
            disabled={isPending}
          >
            {digit}
          </button>
        ))}
        <button
          type="button"
          className="pin-button pin-button-action"
          onClick={handleClear}
          disabled={isPending}
        >
          Clear
        </button>
        <button
          type="button"
          className="pin-button"
          onClick={() => handleDigit('0')}
          disabled={isPending}
        >
          0
        </button>
        <button
          type="button"
          className="pin-button pin-button-action"
          onClick={handleBackspace}
          disabled={isPending}
        >
          Del
        </button>
      </div>

      <button
        type="button"
        className="btn btn-secondary"
        onClick={onBack}
        disabled={isPending}
      >
        Back
      </button>
    </div>
  );
}

import { useLang } from '../context/LangContext';

interface StepperProps {
  step: number;
  onStepClick: (step: number) => void;
  steps: { num: number; label: string }[];
}

export default function Stepper({ step, onStepClick, steps }: StepperProps) {
  const { t } = useLang();
  return (
    <div className="stepper">
      {steps.map(s => {
        const isDone = s.num < step;
        const isActive = s.num === step;
        return (
          <div
            key={s.num}
            className={`step${isActive ? ' active' : isDone ? ' done' : ''}`}
            onClick={() => isDone && onStepClick(s.num)}
          >
            <span className="step-num">{t('stepWord')} {s.num}</span>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

const DEFAULT_STEPS = [
  { num: 1, label: 'Upload files' },
  { num: 2, label: 'Map columns & dates' },
  { num: 3, label: 'Results & Download' },
];

interface StepperProps {
  step: number;
  onStepClick: (step: number) => void;
  steps?: { num: number; label: string }[];
}

export default function Stepper({ step, onStepClick, steps = DEFAULT_STEPS }: StepperProps) {
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
            <span className="step-num">step {s.num}</span>
            {s.label}
          </div>
        );
      })}
    </div>
  );
}

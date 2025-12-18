import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import type {
  QuestionnaireData,
  SliderQuestion,
  TextareaQuestion,
  Question,
} from './types';

interface SliderQuestionProps {
  question: SliderQuestion;
  value: number | undefined;
  onChange: (value: number) => void;
}

export function SliderQuestionComponent({
  question,
  value,
  onChange,
}: SliderQuestionProps) {
  const currentValue = value ?? question.defaultValue ?? 5;
  const min = question.min ?? 1;
  const max = question.max ?? 10;

  return (
    <div className="space-y-3">
      <Label>{question.label}</Label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {question.minLabel}
          </span>
          <span className="text-xs text-muted-foreground">
            {question.maxLabel}
          </span>
        </div>
        <Slider
          min={min}
          max={max}
          value={[currentValue]}
          onValueChange={(vals) => onChange(vals[0])}
        />
        <div className="flex justify-center">
          <span className="text-sm font-semibold">Selected: {currentValue}</span>
        </div>
      </div>
    </div>
  );
}

interface TextareaQuestionProps {
  question: TextareaQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}

export function TextareaQuestionComponent({
  question,
  value,
  onChange,
}: TextareaQuestionProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={question.fieldName}>{question.label}</Label>
      <Textarea
        id={question.fieldName}
        rows={question.rows ?? 3}
        placeholder={question.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

interface QuestionComponentProps {
  question: Question;
  formData: QuestionnaireData;
  setFormData: React.Dispatch<React.SetStateAction<QuestionnaireData>>;
}

export function QuestionComponent({
  question,
  formData,
  setFormData,
}: QuestionComponentProps) {
  const handleChange = (newValue: number | string) => {
    setFormData((prev) => ({
      ...prev,
      [question.fieldName]: newValue,
    }));
  };

  if (question.type === 'slider') {
    return (
      <SliderQuestionComponent
        question={question}
        value={formData[question.fieldName] as number | undefined}
        onChange={(val) => handleChange(val)}
      />
    );
  }

  return (
    <TextareaQuestionComponent
      question={question}
      value={formData[question.fieldName] as string | undefined}
      onChange={(val) => handleChange(val)}
    />
  );
}


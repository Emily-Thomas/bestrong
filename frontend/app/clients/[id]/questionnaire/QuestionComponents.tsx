import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import type {
  QuestionnaireData,
  Question,
  SliderQuestion,
  TextareaQuestion,
  YesNoQuestion,
  SingleChoiceQuestion,
  MultiSelectQuestion,
  NumberQuestion,
} from './types';
import { cn } from '@/lib/utils';

function setField<K extends keyof QuestionnaireData>(
  setFormData: React.Dispatch<React.SetStateAction<QuestionnaireData>>,
  field: K,
  value: QuestionnaireData[K]
) {
  setFormData((prev) => ({ ...prev, [field]: value }));
}

function YesNoField({
  question,
  value,
  onChange,
}: {
  question: YesNoQuestion;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-base leading-snug">{question.label}</Label>
      {question.description ? (
        <p className="text-sm text-muted-foreground">{question.description}</p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={value === true ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(true)}
        >
          Yes
        </Button>
        <Button
          type="button"
          variant={value === false ? 'default' : 'outline'}
          size="sm"
          onClick={() => onChange(false)}
        >
          No
        </Button>
      </div>
    </div>
  );
}

function SingleChoiceField({
  question,
  value,
  onChange,
}: {
  question: SingleChoiceQuestion;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-medium leading-snug">{question.label}</p>
      <RadioGroup
        value={value ?? ''}
        onValueChange={onChange}
        className="grid gap-2"
      >
        {question.options.map((opt) => {
          const optId = `${String(question.fieldName)}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={optId}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm transition-colors',
                value === opt.value && 'border-primary bg-primary/5'
              )}
            >
              <RadioGroupItem value={opt.value} id={optId} />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </RadioGroup>
    </div>
  );
}

function MultiSelectField({
  question,
  value,
  onChange,
}: {
  question: MultiSelectQuestion;
  value: string[] | undefined;
  onChange: (v: string[]) => void;
}) {
  const selected = new Set(value ?? []);
  const toggle = (v: string) => {
    const next = new Set(selected);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    onChange([...next]);
  };
  return (
    <div className="space-y-3">
      <p className="text-base font-medium leading-snug">{question.label}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {question.options.map((opt) => {
          const optId = `${String(question.fieldName)}-${opt.value}`;
          return (
            <label
              key={opt.value}
              htmlFor={optId}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-sm',
                selected.has(opt.value) && 'border-primary bg-primary/5'
              )}
            >
              <Checkbox
                id={optId}
                checked={selected.has(opt.value)}
                onCheckedChange={() => toggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SliderQuestionComponent({
  question,
  value,
  onChange,
}: {
  question: SliderQuestion;
  value: number | undefined;
  onChange: (value: number) => void;
}) {
  const currentValue = value ?? question.defaultValue ?? 3;
  const min = question.min ?? 1;
  const max = question.max ?? 5;

  return (
    <div className="space-y-3">
      <Label>{question.label}</Label>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">{question.minLabel}</span>
          <span className="text-xs text-muted-foreground">{question.maxLabel}</span>
        </div>
        <Slider
          min={min}
          max={max}
          step={1}
          value={[currentValue]}
          onValueChange={(vals) => onChange(vals[0])}
        />
        <div className="flex justify-center">
          <span className="text-sm font-semibold">{currentValue}</span>
        </div>
      </div>
    </div>
  );
}

function TextareaQuestionComponent({
  question,
  value,
  onChange,
}: {
  question: TextareaQuestion;
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={String(question.fieldName)}>{question.label}</Label>
      <Textarea
        id={String(question.fieldName)}
        rows={question.rows ?? 3}
        placeholder={question.placeholder}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function NumberField({
  question,
  value,
  onChange,
}: {
  question: NumberQuestion;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={String(question.fieldName)}>{question.label}</Label>
      <Input
        id={String(question.fieldName)}
        type="number"
        min={question.min}
        max={question.max}
        step={question.step ?? 1}
        value={value === undefined ? '' : String(value)}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange(undefined);
            return;
          }
          const n = parseInt(raw, 10);
          if (!Number.isNaN(n)) onChange(n);
        }}
        className="max-w-[120px]"
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
  const field = question.fieldName;

  if (question.type === 'yes_no') {
    return (
      <YesNoField
        question={question}
        value={formData[field] as boolean | undefined}
        onChange={(v) => setField(setFormData, field, v as QuestionnaireData[typeof field])}
      />
    );
  }

  if (question.type === 'single_choice') {
    return (
      <SingleChoiceField
        question={question}
        value={formData[field] as string | undefined}
        onChange={(v) => setField(setFormData, field, v as QuestionnaireData[typeof field])}
      />
    );
  }

  if (question.type === 'multi_select') {
    return (
      <MultiSelectField
        question={question}
        value={formData[field] as string[] | undefined}
        onChange={(v) => setField(setFormData, field, v as QuestionnaireData[typeof field])}
      />
    );
  }

  if (question.type === 'slider') {
    return (
      <SliderQuestionComponent
        question={question}
        value={formData[field] as number | undefined}
        onChange={(v) => setField(setFormData, field, v as QuestionnaireData[typeof field])}
      />
    );
  }

  if (question.type === 'number') {
    return (
      <NumberField
        question={question}
        value={formData[field] as number | undefined}
        onChange={(v) =>
          setField(setFormData, field, v as QuestionnaireData[typeof field])
        }
      />
    );
  }

  return (
    <TextareaQuestionComponent
      question={question as TextareaQuestion}
      value={formData[field] as string | undefined}
      onChange={(v) => setField(setFormData, field, v as QuestionnaireData[typeof field])}
    />
  );
}

'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateTrainerInput } from '@/lib/api';

type TrainerFormFieldsProps = {
  form: CreateTrainerInput;
  onChange: (next: CreateTrainerInput) => void;
  idPrefix?: string;
};

export function TrainerFormFields({
  form,
  onChange,
  idPrefix = 'trainer',
}: TrainerFormFieldsProps) {
  const set = (patch: Partial<CreateTrainerInput>) =>
    onChange({ ...form, ...patch });

  return (
    <div className="space-y-6">
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Basics</CardTitle>
          <CardDescription>
            How this coach appears on your roster and in program pickers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-first`}>First name</Label>
              <Input
                id={`${idPrefix}-first`}
                value={form.first_name}
                onChange={(e) => set({ first_name: e.target.value })}
                autoComplete="given-name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${idPrefix}-last`}>Last name</Label>
              <Input
                id={`${idPrefix}-last`}
                value={form.last_name}
                onChange={(e) => set({ last_name: e.target.value })}
                autoComplete="family-name"
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-email`}>Email (optional)</Label>
            <Input
              id={`${idPrefix}-email`}
              type="email"
              value={form.email}
              onChange={(e) => set({ email: e.target.value })}
              autoComplete="email"
              placeholder="coach@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-title`}>Title</Label>
            <Input
              id={`${idPrefix}-title`}
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="e.g. Head Coach, Performance Specialist"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-photo`}>Photo URL (optional)</Label>
            <Input
              id={`${idPrefix}-photo`}
              value={form.image_url}
              onChange={(e) => set({ image_url: e.target.value })}
              placeholder="https://…"
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to show initials on the roster.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Coaching notes</CardTitle>
          <CardDescription>
            Scout uses this text to build a structured persona and to steer
            program generation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-def`}>
              What defines them as a trainer
            </Label>
            <Textarea
              id={`${idPrefix}-def`}
              value={form.raw_trainer_definition}
              onChange={(e) =>
                set({ raw_trainer_definition: e.target.value })
              }
              placeholder="Philosophy, methodology, how they program, what they emphasize or avoid…"
              rows={6}
              className="min-h-[140px] resize-y"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-clients`}>
              What defines their clients&apos; needs
            </Label>
            <Textarea
              id={`${idPrefix}-clients`}
              value={form.raw_client_needs}
              onChange={(e) => set({ raw_client_needs: e.target.value })}
              placeholder="Typical goals, experience level, constraints, equipment, lifestyle…"
              rows={6}
              className="min-h-[140px] resize-y"
              required
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

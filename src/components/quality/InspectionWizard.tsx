// src/components/quality/InspectionWizard.tsx - Quality Inspection Wizard
'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { submitInspectionResults } from '@/app/actions/quality';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Loader2,
  ClipboardCheck,
  AlertTriangle,
} from 'lucide-react';
import { format } from 'date-fns';

type WizardStep = 'review' | 'tests' | 'summary';

const testResultSchema = z.object({
  testId: z.number(),
  resultValue: z.string().min(1, 'Result is required'),
  notes: z.string().optional(),
});

const inspectionSchema = z.object({
  results: z.array(testResultSchema).min(1),
  overallNotes: z.string().optional(),
});

type InspectionFormValues = z.infer<typeof inspectionSchema>;

interface InspectionWizardProps {
  inspection: any;
  tests: any[];
}

export function InspectionWizard({ inspection, tests }: InspectionWizardProps) {
  const t = useTranslations('quality');
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('review');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<InspectionFormValues>({
    resolver: zodResolver(inspectionSchema),
    defaultValues: {
      results: tests.map((test) => ({
        testId: test.id,
        resultValue: '',
        notes: '',
      })),
      overallNotes: '',
    },
  });

  const results = form.watch('results');

  // Calculate pass/fail for each result
  const calculatePassed = (test: any, resultValue: string): boolean | null => {
    if (!resultValue) return null;

    if (test.testType === 'PASS_FAIL') {
      return resultValue.toUpperCase() === 'PASS';
    } else if (test.testType === 'NUMERIC') {
      const numValue = parseFloat(resultValue);
      if (isNaN(numValue)) return null;
      return numValue >= (test.minValue ?? -Infinity) && numValue <= (test.maxValue ?? Infinity);
    }
    return null;
  };

  // Check if all tests have results
  const allTestsComplete = results.every((r) => r.resultValue && r.resultValue.trim() !== '');

  // Calculate overall pass/fail
  const overallResult = allTestsComplete
    ? results.every((r) => {
        const test = tests.find((t) => t.id === r.testId);
        if (!test) return false;
        const passed = calculatePassed(test, r.resultValue);
        return passed === true;
      })
    : null;

  const handleSubmit = async (data: InspectionFormValues) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await submitInspectionResults({
        inspectionId: inspection.id,
        results: data.results,
        overallNotes: data.overallNotes,
      });

      if (!result.success) {
        setError(result.error || 'Failed to submit inspection');
        return;
      }

      router.push('/quality');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render content based on step
  const renderStepContent = () => {
    switch (step) {
      case 'review':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500">{t('inspection.batch')}</Label>
                <p className="font-mono text-sm mt-1">{inspection.batchNumber}</p>
              </div>
              <div>
                <Label className="text-slate-500">{t('inspection.item')}</Label>
                <p className="font-medium mt-1">{inspection.item.name}</p>
              </div>
              <div>
                <Label className="text-slate-500">{t('inspection.quantity')}</Label>
                <p className="font-medium mt-1">{inspection.quantity}</p>
              </div>
              <div>
                <Label className="text-slate-500">{t('inspection.source')}</Label>
                <p className="font-medium mt-1">
                  {inspection.sourceType === 'PRODUCTION_RUN'
                    ? t('inspection.source.production')
                    : t('inspection.source.purchase')}
                </p>
              </div>
              <div>
                <Label className="text-slate-500">{t('inspection.created_at')}</Label>
                <p className="text-sm mt-1">
                  {format(new Date(inspection.createdAt), 'MMM dd, yyyy HH:mm')}
                </p>
              </div>
              <div>
                <Label className="text-slate-500">{t('tests.title')}</Label>
                <p className="font-medium mt-1">{tests.length} tests</p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {t('wizard.review_instructions')}
              </p>
            </div>
          </div>
        );

      case 'tests':
        return (
          <div className="space-y-4">
            {tests.map((test, index) => {
              const result = results[index];
              const passed = calculatePassed(test, result?.resultValue || '');

              return (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">
                        {test.name}
                        {passed === true && (
                          <CheckCircle2 className="inline ml-2 h-4 w-4 text-green-600" />
                        )}
                        {passed === false && (
                          <XCircle className="inline ml-2 h-4 w-4 text-red-600" />
                        )}
                      </CardTitle>
                      <Badge variant="outline">
                        {test.testType === 'PASS_FAIL'
                          ? t('tests.type.pass_fail')
                          : t('tests.type.numeric')}
                      </Badge>
                    </div>
                    {test.description && (
                      <p className="text-sm text-slate-500 mt-1">{test.description}</p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor={`result-${test.id}`}>
                        {t('tests.result')} *
                        {test.testType === 'NUMERIC' && test.unit && ` (${test.unit})`}
                      </Label>
                      {test.testType === 'PASS_FAIL' ? (
                        <div className="flex gap-2 mt-2">
                          <Button
                            type="button"
                            variant={result?.resultValue === 'PASS' ? 'default' : 'outline'}
                            onClick={() => form.setValue(`results.${index}.resultValue`, 'PASS')}
                            className="flex-1"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            {t('tests.pass')}
                          </Button>
                          <Button
                            type="button"
                            variant={result?.resultValue === 'FAIL' ? 'destructive' : 'outline'}
                            onClick={() => form.setValue(`results.${index}.resultValue`, 'FAIL')}
                            className="flex-1"
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            {t('tests.fail')}
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2">
                          <Input
                            id={`result-${test.id}`}
                            type="number"
                            step="any"
                            placeholder={
                              test.minValue !== null && test.maxValue !== null
                                ? `${test.minValue} - ${test.maxValue}`
                                : ''
                            }
                            {...form.register(`results.${index}.resultValue`)}
                          />
                          {test.minValue !== null && test.maxValue !== null && (
                            <p className="text-xs text-slate-500 mt-1">
                              {t('tests.range')}: {test.minValue} - {test.maxValue} {test.unit}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <Label htmlFor={`notes-${test.id}`}>{t('tests.notes')}</Label>
                      <textarea
                        id={`notes-${test.id}`}
                        placeholder={t('tests.notes_placeholder')}
                        {...form.register(`results.${index}.notes`)}
                        rows={2}
                        className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        );

      case 'summary':
        return (
          <div className="space-y-6">
            {/* Overall Result */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {overallResult === true ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="text-green-600">{t('wizard.all_tests_passed')}</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-5 w-5 text-red-600" />
                      <span className="text-red-600">{t('wizard.some_tests_failed')}</span>
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {overallResult === false && (
                  <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                    <p className="text-sm text-red-800">
                      {t('wizard.failed_warning')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Test Results Summary */}
            <Card>
              <CardHeader>
                <CardTitle>{t('wizard.test_results_summary')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {tests.map((test, index) => {
                  const result = results[index];
                  const passed = calculatePassed(test, result?.resultValue || '');

                  return (
                    <div
                      key={test.id}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <p className="font-medium">{test.name}</p>
                        {result?.notes && (
                          <p className="text-sm text-slate-500 mt-1">{result.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm">{result?.resultValue}</span>
                        {passed === true && (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                        {passed === false && (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Overall Notes */}
            <div>
              <Label htmlFor="overallNotes">{t('wizard.overall_notes')}</Label>
              <textarea
                id="overallNotes"
                placeholder={t('wizard.overall_notes_placeholder')}
                {...form.register('overallNotes')}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Step navigation
  const steps: WizardStep[] = ['review', 'tests', 'summary'];
  const currentStepIndex = steps.indexOf(step);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  const handleNext = () => {
    if (step === 'tests' && !allTestsComplete) {
      setError(t('messages.all_tests_required'));
      return;
    }
    setError(null);
    setStep(steps[currentStepIndex + 1]);
  };

  const handleBack = () => {
    setError(null);
    setStep(steps[currentStepIndex - 1]);
  };

  // If inspection already completed, show read-only view
  if (inspection.status !== 'PENDING' && inspection.status !== 'IN_PROGRESS') {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5" />
              {t('inspection.title', { id: inspection.id })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                {t('messages.inspection_already_completed', { status: inspection.status })}
              </p>
            </div>
            <div className="mt-4">
              <Button variant="outline" onClick={() => router.push('/quality')}>
                {t('wizard.back_to_dashboard')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('inspection.title', { id: inspection.id })}
        </h1>
        <p className="text-slate-500 mt-1">{t('wizard.subtitle')}</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6">
        {steps.map((s, index) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                index <= currentStepIndex
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-slate-300 text-slate-400'
              }`}
            >
              {index < currentStepIndex ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <span className="text-sm font-medium">{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 mx-2 ${
                  index < currentStepIndex ? 'bg-blue-600' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-2 p-4 mb-6 bg-red-50 border border-red-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step Content */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {step === 'review' && t('wizard.step_review')}
            {step === 'tests' && t('wizard.step_tests')}
            {step === 'summary' && t('wizard.step_summary')}
          </CardTitle>
        </CardHeader>
        <CardContent>{renderStepContent()}</CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push('/quality')} disabled={isSubmitting}>
          {t('wizard.cancel')}
        </Button>

        <div className="flex gap-2">
          {!isFirstStep && (
            <Button variant="outline" onClick={handleBack} disabled={isSubmitting}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t('wizard.back')}
            </Button>
          )}

          {!isLastStep ? (
            <Button onClick={handleNext} disabled={isSubmitting}>
              {t('wizard.next')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isSubmitting || !allTestsComplete}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('wizard.submitting')}
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {t('wizard.submit')}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

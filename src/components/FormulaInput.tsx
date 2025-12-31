import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Calculator, X } from 'lucide-react';

interface FormulaValue {
  field: string;
  operator: string;
  value: string | number;
}

interface FormulaInputProps {
  value: any;
  onChange: (value: any) => void;
  placeholder?: string;
}

export function FormulaInput({ value, onChange, placeholder }: FormulaInputProps) {
  const isFormula = typeof value === 'object' && value !== null && !Array.isArray(value);

  const handleConvertToFormula = () => {
    onChange({
      field: '',
      operator: '*',
      value: 1,
    });
  };

  const handleConvertToText = () => {
    onChange('');
  };

  const updateFormula = (key: keyof FormulaValue, newVal: string | number) => {
    const current = (value as FormulaValue) || { field: '', operator: '*', value: 1 };
    onChange({
      ...current,
      [key]: newVal,
    });
  };

  if (isFormula) {
    const formula = value as FormulaValue;
    return (
      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="secondary"
              className="h-10 px-3 bg-muted hover:bg-muted/80 border border-input text-left font-normal"
            >
              <Calculator className="mr-2 h-4 w-4 opacity-50" />
              <span className="truncate">
                {formula.field ? `[${formula.field}]` : '[Select Field]'}{' '}
                {formula.operator}{' '}
                {formula.value}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-medium leading-none">Formula Editor</h4>
                <p className="text-sm text-muted-foreground">
                  Define a calculated value.
                </p>
              </div>
              <div className="grid gap-2">
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="baseField">Base Field</Label>
                  <Input
                    id="baseField"
                    value={formula.field}
                    onChange={(e) => updateFormula('field', e.target.value)}
                    className="col-span-2 h-8"
                    placeholder="e.g. PO Price"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="operator">Operator</Label>
                  <Input
                    id="operator"
                    value={formula.operator}
                    onChange={(e) => updateFormula('operator', e.target.value)}
                    className="col-span-2 h-8"
                    placeholder="*, +, -, /"
                  />
                </div>
                <div className="grid grid-cols-3 items-center gap-4">
                  <Label htmlFor="multiplier">Value</Label>
                  <Input
                    id="multiplier"
                    value={formula.value}
                    onChange={(e) => {
                       const val = e.target.value;
                       const num = parseFloat(val);
                       updateFormula('value', isNaN(num) ? val : num); // Keep as string if not number? Or always string usually safe but user example led to number
                    }}
                    className="col-span-2 h-8"
                    placeholder="e.g. 1.05"
                  />
                </div>
              </div>
              <div className="pt-2">
                 <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-destructive hover:text-destructive"
                    onClick={handleConvertToText}
                 >
                    <X className="mr-2 h-4 w-4" /> Switch to Standard Input
                 </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return (
    <div className="flex gap-2 w-full">
      <Input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleConvertToFormula}
        title="Convert to Formula"
      >
        <Calculator className="h-4 w-4" />
      </Button>
    </div>
  );
}

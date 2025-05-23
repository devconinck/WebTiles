import { Component, EventEmitter, Output, signal, inject } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { NgIf } from '@angular/common';
import { HlmCheckboxComponent } from '@spartan-ng/ui-checkbox-helm';
import { HlmLabelDirective } from '@spartan-ng/ui-label-helm';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { HlmButtonDirective } from '@spartan-ng/ui-button-helm';
import { HlmTooltipComponent } from '@spartan-ng/ui-tooltip-helm';
import { HlmTooltipTriggerDirective } from '@spartan-ng/ui-tooltip-helm';
import {
  HlmDialogDescriptionDirective,
  HlmDialogFooterComponent,
  HlmDialogHeaderComponent,
  HlmDialogTitleDirective,
} from '@spartan-ng/ui-dialog-helm';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

@Component({
  selector: 'app-add-widget-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgIf,
    HlmLabelDirective,
    HlmInputDirective,
    HlmButtonDirective,
    HlmDialogHeaderComponent,
    HlmDialogFooterComponent,
    HlmDialogTitleDirective,
    HlmDialogDescriptionDirective,
  ],
  templateUrl: './add-widget-modal.component.html',
})
export class AddWidgetModalComponent {
  @Output() add = new EventEmitter<{
    title: string;
    url: string;
    customCss: string;
  }>();

  widgetForm: FormGroup;
  formErrors = signal<{ title?: string; url?: string }>({});
  private readonly _dialogRef = inject(BrnDialogRef);

  constructor(private fb: FormBuilder) {
    this.widgetForm = this.fb.group({
      title: ['', [Validators.required]],
      url: ['', [Validators.required]],
    });

    this.widgetForm.valueChanges.subscribe(() => {
      this.updateFormErrors();
    });
  }

  updateFormErrors(): void {
    const errors: { title?: string; url?: string } = {};
    const titleControl = this.widgetForm.get('title');
    if (titleControl?.invalid && (titleControl.dirty || titleControl.touched)) {
      errors.title = 'Title is required';
    }

    const urlControl = this.widgetForm.get('url');
    if (urlControl?.invalid && (urlControl.dirty || urlControl.touched)) {
      if (urlControl?.errors?.['required']) {
        errors.url = 'URL is required';
      }
    }
    this.formErrors.set(errors);
  }

  onSubmit(): void {
    this.widgetForm.markAllAsTouched();
    this.updateFormErrors();

    if (this.widgetForm.valid) {
      const formValue = this.widgetForm.value;
      // Add https:// if not present
      if (
        !formValue.url.startsWith('http://') &&
        !formValue.url.startsWith('https://')
      ) {
        formValue.url = 'https://' + formValue.url;
      }
      this.add.emit(formValue);
      this._dialogRef.close();
      this.formErrors.set({});
    }
  }

  onCancel(): void {
    this._dialogRef.close();
    this.formErrors.set({});
  }
}

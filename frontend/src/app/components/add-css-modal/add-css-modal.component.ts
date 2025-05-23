import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  ViewChild,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import {
  HlmTabsComponent,
  HlmTabsContentDirective,
  HlmTabsListComponent,
  HlmTabsTriggerDirective,
} from '@spartan-ng/ui-tabs-helm';
import { AddPresetsComponent } from './add-presets/add-presets.component';
import { AddCustomCssComponent } from './add-custom-css/add-custom-css.component';
import {
  HlmDialogFooterComponent,
  HlmDialogHeaderComponent,
} from '@spartan-ng/ui-dialog-helm';
import { BrnDialogRef } from '@spartan-ng/brain/dialog';

@Component({
  selector: 'app-add-css-modal',
  standalone: true,
  imports: [
    HlmTabsComponent,
    HlmTabsListComponent,
    HlmTabsTriggerDirective,
    HlmTabsContentDirective,
    AddPresetsComponent,
    AddCustomCssComponent,
    HlmDialogHeaderComponent,
    HlmDialogFooterComponent,
  ],
  templateUrl: './add-css-modal.component.html',
})
export class AddCssModalComponent implements OnChanges {
  @Input() initialCss: string = '';
  @Output() save = new EventEmitter<string>();
  @ViewChild(AddCustomCssComponent)
  addCustomCssComponent!: AddCustomCssComponent;

  private readonly _dialogRef = inject(BrnDialogRef);

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCss'] && this.addCustomCssComponent) {
      this.addCustomCssComponent.customCss = this.initialCss;
    }
  }

  ngAfterViewInit(): void {
    if (this.addCustomCssComponent && this.initialCss) {
      this.addCustomCssComponent.customCss = this.initialCss;
    }
  }

  onSubmit() {
    const cssToSave = this.addCustomCssComponent?.customCss || '';

    if (cssToSave) {
      this.save.emit(cssToSave);
    }
    this._dialogRef.close();
  }

  onCancel() {
    this._dialogRef.close();
  }
}

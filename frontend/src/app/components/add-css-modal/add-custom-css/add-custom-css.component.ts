import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HlmInputDirective } from '@spartan-ng/ui-input-helm';
import { CodeEditor } from '@acrodata/code-editor';
import { LanguageDescription } from '@codemirror/language';
import { css } from '@codemirror/lang-css';

@Component({
  selector: 'app-add-custom-css',
  imports: [FormsModule, CodeEditor],
  templateUrl: './add-custom-css.component.html',
})
export class AddCustomCssComponent {
  customCss: string = '';

  languages: LanguageDescription[] = [
    LanguageDescription.of({
      name: 'css',
      support: css(),
    }),
  ];

  options: any = {
    language: 'css',
    theme: 'light',
    setup: 'basic',
    disabled: false,
    readonly: false,
    placeholder: 'Enter your custom CSS here...',
    indentWtihTab: false,
    indentUnit: '',
    lineWrapping: true,
    highlightWhitespace: false,
  };
}

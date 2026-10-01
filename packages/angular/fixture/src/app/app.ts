import { Component } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import {
  MUD_FORM_ACCESSORS,
  MudButton,
  MudCheckbox,
  MudDateInput,
  MudFileInput,
  MudIcon,
  MudInputChip,
  MudLogo,
  MudNumericInput,
  MudPhoneInput,
  MudSelect,
  MudTextInput,
} from '@egov-moldova/mud-angular';

// One component per model shape of the form-control model map, each bound with `[(ngModel)]`
// and showing its model in an `<output>`, so the spec reads both directions: the element to the
// model, and a model write back onto the element. Plus the Angular-only checks: `formControl`
// on a select, the phone-input country switch and a bare boolean attribute.
@Component({
  selector: 'app-root',
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MUD_FORM_ACCESSORS,
    MudButton,
    MudCheckbox,
    MudDateInput,
    MudFileInput,
    MudIcon,
    MudInputChip,
    MudLogo,
    MudNumericInput,
    MudPhoneInput,
    MudSelect,
    MudTextInput,
  ],
  templateUrl: './app.html',
})
export class App {
  protected text = '';
  protected date = '';
  protected num: number | null = null;
  protected checked = false;
  protected fruit = '';
  protected chips: string[] = [];
  // `null`, as a reactive form or `reset()` would leave it: the accessor turns it into `[]`,
  // because the component reads `files.length` unguarded.
  protected files: File[] | null = null;
  protected phone = '';
  protected readonly fruitControl = new FormControl('', { nonNullable: true });

  /** Which change detection this build runs on: the runner loads zone.js only for majors that pin it. */
  protected readonly zone = 'Zone' in globalThis ? 'zone.js' : 'zoneless';

  protected json(value: unknown): string {
    return JSON.stringify(value);
  }

  protected fileNames(): string[] {
    return (this.files ?? []).map(file => file.name);
  }
}

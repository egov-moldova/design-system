import { MudIcon, MudLogo, MudPhoneInput, MudSelect } from '@egov-moldova/mud-react';

// The page contract of scripts/adapters/fixture-e2e: the same four test ids in every fixture app.
export function App() {
  return (
    <main>
      <h1>mud-react consumer fixture</h1>

      <section>
        <h2>assets (icon, logo, flag, a component&apos;s own icon)</h2>
        <MudIcon data-testid="asset-icon" name="calendar" size={24} />
        <MudLogo data-testid="asset-logo" name="mpass-logo-with-name" />
        <MudPhoneInput data-testid="asset-phone" aria-label="Phone" />
        <MudSelect data-testid="asset-select" aria-label="Fruit">
          <option value="apple">Apple</option>
          <option value="pear">Pear</option>
        </MudSelect>
      </section>
    </main>
  );
}

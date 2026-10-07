import { MudTextInput } from '@egov-moldova/mud-react';

export const WrongType = () => (
  <>
    {/* @negative-binding value: the one wrong binding below. `value` is a string, not a number. */}
    <MudTextInput value={1} />
  </>
);

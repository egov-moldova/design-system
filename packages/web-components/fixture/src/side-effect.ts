// A side-effect-only import, as a bundled app writes it. The core declares `sideEffects`; the
// bundler must still keep this module, or no element registers.
import '@egov-moldova/mud/mud.esm.js';

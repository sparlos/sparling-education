# Curriculum data has a reference layer and a product layer

`packages/curriculum` keeps the official Ontario curriculum text (expectation wording and elaborations, imported from the Digital Curriculum Platform's content API) as a **reference layer** that only agents and humans read while designing games, and a **product layer** of expectation codes, curriculum editions and descriptions written by Kindling, which is all apps and game manifests can import. Curriculum text is Crown copyright, and commercial reproduction needs a licence from the King's Printer for Ontario, which we don't hold. Keeping the official text internal lets agents design against the exact expectations, instead of recalling codes from memory, which proved unreliable, without shipping that text to teachers.

## Consequences

- The package's exports expose only the product layer, so quick assess, the teacher view and teacher cards can't show ministry wording by accident.
- Every code in the product layer is checked against DCP by a human before it's merged.
- If a licence is ever obtained, the product can switch which layer it reads without rewriting anything that uses it.
- The DCP API is undocumented and has no published terms, so it's only called by the `add-curriculum` import script, run by a human, and never ad hoc by agents.

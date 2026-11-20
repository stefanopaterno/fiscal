# Specification Quality Checklist: Consenso informato dei pazienti

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-11-20
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- Nessun marcatore [NEEDS CLARIFICATION]: i punti aperti (obblighi deontologici esatti, consenso di entrambi i genitori, tempi di conservazione, cifratura delle copie firmate, comportamento senza connessione) sono in Assumptions e vanno chiariti con `/speckit-clarify`.
- Il consenso conferma che una persona è paziente: è dato sulla salute (GDPR). La specifica lo tratta come tale e la costituzione 2.2.0 lo ammette come eccezione al divieto di dati clinici, senza contenuti clinici.

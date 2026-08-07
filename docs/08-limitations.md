# Limitations

> Part of the GeoDSS reference docs. See [`README.md`](../README.md) for the index.

Known weaknesses of the analysis, recorded as they were encountered rather than
reconstructed at the end. Each is a deliberate position, not an oversight — the
report should state them rather than let an examiner find them.

## Data

**1. Population is a 2025 snapshot against current facility and transit data.**
Per-capita rates therefore mix vintages. The mismatch is small but real.

**2. Denominator changed mid-project.** Population is now all residents, not
HDB residents. Facilities-per-10k figures shifted accordingly between the
midterm and final states of the project. Stated explicitly so the numbers do
not appear to move without explanation.

**3. Figures are rounded to the nearest 10 at source**, so age and dwelling
components do not always sum to the published total (Ang Mo Kio: bands sum to
158,740 against a stated 158,720). The published total is always used; a
computed sum never is.

**4. Percentages are suppressed below 1,000 residents.** Rounding plus "-"
cells make them meaningless at that scale — seven areas produced 0% across all
bands, and Western Water Catchment summed to 105.2%.

## Method

**5. Min-max normalisation is outlier-sensitive.** Bounds come from the data
and are shared across areas, so a single extreme value compresses everything
else. The 1,000-resident floor removes the worst cases, but the sensitivity
remains structural. Winsorising at the 5th/95th percentile was considered and
not implemented. Observed bounds are surfaced in the UI so the effect is at
least visible.

**6. Default weights are judgement-based.** 0.35 / 0.25 / 0.25 / 0.15 were set
by reasoning about the domain, not derived through AHP pairwise comparison,
PCA, or expert elicitation. Defensible for a prototype, but unvalidated.

**7. Weighted linear combination is fully compensatory.** A strong score on one
criterion can entirely offset a weak score on another, so an area badly
underserved on exactly one dimension can still rank mid-table. Non-compensatory
methods — TOPSIS, ELECTRE-style outranking — avoid this and were not
implemented.

**8. Treating higher population density as raising priority is a normative
choice**, not a neutral property of the data. It encodes a judgement that
affected headcount should count toward urgency.

**9. Scores are relative, not absolute.** A score of 0.7 means "high relative
to these 38 areas", not "0.7 of some standard of adequacy". Scores from
different area sets are not comparable, and none of them speak to whether
provision is adequate in absolute terms.

**10. Straight-line distance from a single representative point.**
`ST_PointOnSurface` guarantees an interior point, but one point stands in for a
whole planning area, and geodesic distance is not travel distance. Actual
journeys are longer and vary with the road and rail network.

The probe point feature makes the first half of this measurable: placing
several points inside one planning area reports the spread in nearest-facility
distance directly, rather than leaving it asserted. The second half — straight
line versus travel distance — remains unaddressed and would require a routing
engine or network dataset.

**11. Non-contiguous and very-low-density areas score unusually.** Southern
Islands ranks first under default weights, scoring a maximum 1.0 on distance to
healthcare, facilities per 10k, and distance to MRT simultaneously. The
arithmetic is correct, but land-based accessibility metrics do not describe
offshore areas meaningfully. Retained rather than excluded, because removing
inconvenient results is worse than explaining them.

## Sensitivity analysis

**12. Weight uncertainty only.** Uncertainty in the underlying data — the 2025
population figures, facility geocoding accuracy, straight-line distance as a
proxy for travel — is not propagated. A full treatment would perturb inputs as
well as weights.

**13. The Dirichlet concentration parameter (default 40) is itself a
judgement** about what counts as a plausible alternative weighting. A lower
value would widen every stability interval. Documented but not empirically
grounded.

**14. Stability is measured against one aggregation method.** An area stable
under WLC might rank very differently under TOPSIS. The intervals describe
robustness to weights, not robustness to method choice.

**15. The weight sweep varies one criterion at a time.** Crossovers involving
two criteria moving together are not shown.

## Scope

**16. Planning area is the unit of analysis.** Subzone boundaries join
perfectly (332/332) and would address the representative-point limitation, but
changing the unit would require reworking the scoring module. Deferred as
viable future work, not rejected.

**17. Bus accessibility is descriptive context, not a scored input.** All four
candidate metrics failed construct validity — see
[`05-methodology.md`](05-methodology.md). The underlying constraint is that bus
accessibility needs household-level measurement, which is the same reason
building-level analysis is out of scope.

**18. Upload functionality is scoped to display-only map layers**, not
integrated into the analysis engine. Generalised ingestion was deliberately
excluded.

**19. No authentication.** The application holds no user data and persists
nothing between sessions: weights are ephemeral, and all source data is public.
Authentication was therefore not implemented, since there is no resource to
protect. A production deployment would need it, and it would become a genuine
requirement if saved scenarios or an audit trail ("this ranking was produced by
X on date Y with these weights") were added. Both are noted as future work
rather than omissions.

**20. Probe points are a query tool, not an analysis input.** They measure
accessibility at arbitrary locations but never feed the priority score, so the
unit of analysis remains the planning area. A reader who sees point-level
interaction should not infer that the scoring unit changed.

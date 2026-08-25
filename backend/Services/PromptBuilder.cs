using System.Text;
using System.Text.Json;
using GeoDSS.Api.Models;

namespace GeoDSS.Api.Services;

/// <summary>
/// Turns an ExplanationPayload into the text sent to the model.
///
/// Two jobs, and the first matters more than the second. The ledger returned to
/// the frontend is deliberately complete, because the grounding panel shows the
/// user everything the analysis produced. The ledger sent to the model is
/// deliberately smaller, because every fact in it is a figure the model is
/// permitted to state and therefore a figure the verifier will accept wherever
/// it appears. Narrowing the prompt ledger narrows what a misapplied figure can
/// look like: a rank claim quoting the wrong number is only possible if some
/// other rank-like number was supplied.
///
/// The full ledger still governs verification. Facts withheld from the prompt
/// remain in the permitted set, so filtering can never cause a false positive —
/// it only reduces the room for a figure to be misused.
/// </summary>
public static class PromptBuilder
{
    /// <summary>
    /// Fact keys withheld from the prompt. Each is either an intermediate value
    /// with no place in plain-language prose, or a near-duplicate of a fact that
    /// says the same thing better.
    /// </summary>
    private static readonly string[] WithheldKeyPrefixes =
    {
        // Normalised values are a step inside the calculation. The contribution
        // is what a reader needs; the normalised input only invites the model to
        // narrate arithmetic it must not perform.
        "normalised::",

        // Imputation status is real but belongs in the UI's data-quality
        // indicator, not in prose that is trying to explain a place.
        "imputed::"
    };

    private static readonly string[] WithheldKeys =
    {
        // rank_range (the 5th-95th percentile band) is the honest figure. The
        // full min-max range across 1,000 draws is set by single unlucky samples
        // and, offered alongside, gives the model two competing rank ranges.
        "rank_range_full",

        // Two more rank-shaped integers. The swing figure already conveys how
        // much the criterion matters, without supplying numbers that could be
        // mistaken for the area's actual rank.
        "top_rank_at_zero",
        "top_rank_at_full"
    };

    /// <summary>
    /// Labels withheld by prefix, for facts carrying no key. Observed ranges are
    /// useful in the UI as scale context but add eight numbers to the prompt for
    /// prose that rarely needs them.
    /// </summary>
    private static readonly string[] WithheldLabelPrefixes =
    {
        "Observed range for"
    };

    /// <summary>The facts actually offered to the model.</summary>
    public static IReadOnlyList<ExplanationFact> FilterFacts(ExplanationPayload payload) =>
        payload.Facts
            .Where(f => !WithheldKeys.Contains(f.Key, StringComparer.Ordinal))
            .Where(f => f.Key is null || !WithheldKeyPrefixes.Any(p => f.Key.StartsWith(p, StringComparison.Ordinal)))
            .Where(f => !WithheldLabelPrefixes.Any(p => f.Label.StartsWith(p, StringComparison.Ordinal)))
            .ToList();

    // =======================================================================
    // Serialisation
    // =======================================================================

    /// <summary>
    /// The payload as the model sees it: Id, Label, Value only.
    ///
    /// Key is internal routing for the fallback writer and would be noise.
    /// AllowedValues is the verifier's business — showing the model the set its
    /// output will be checked against invites it to satisfy the check rather
    /// than to explain, which is a different and worse objective.
    /// </summary>
    public static string SerialiseForModel(ExplanationPayload payload)
    {
        var model = new
        {
            subject = new
            {
                name = payload.Subject.Name,
                region = payload.Subject.Region,
                isScored = payload.Subject.IsScored,
                exclusionReason = payload.Subject.ExclusionReason
            },
            facts = FilterFacts(payload).Select(f => new { id = f.Id, label = f.Label, value = f.Value }),
            weights = payload.Weights.Select(w => new { id = w.Id, label = w.Label, value = w.Value }),
            method = new
            {
                formula = payload.Method.Formula,
                normalisation = payload.Method.Normalisation,
                scoreDirection = payload.Method.ScoreDirection,
                scoredAreaCount = payload.Method.ScoredAreaCount
            },
            caveats = payload.Caveats
        };

        return JsonSerializer.Serialize(model, new JsonSerializerOptions
        {
            WriteIndented = true,
            Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping
        });
    }

    // =======================================================================
    // Prompt
    // =======================================================================

    public static string SystemInstruction(ExplanationPayload payload)
    {
        var sb = new StringBuilder();

        sb.AppendLine("You are writing a short plain-language explanation of a completed geospatial accessibility analysis for Singapore planning areas. The analysis has already been performed by a spatial database. Your only task is to explain its results to a reader who is not a specialist.");
        sb.AppendLine();

        sb.AppendLine("## The figures");
        sb.AppendLine();
        sb.AppendLine("Every figure you may state is supplied below as a fact with an id, a label and a value. These rules are absolute:");
        sb.AppendLine();
        sb.AppendLine("- State a figure only by copying a supplied value exactly as written, including its units, separators and decimal places. Write \"960 m\", not \"960 metres\", \"0.96 km\" or \"about a kilometre\".");
        sb.AppendLine("- Copy values exactly, but not labels. A label describes what a figure is; write naturally around it. \"The nearest clinic is 960 m away\", not \"the distance to nearest healthcare facility is 960 m\".");
        sb.AppendLine("- Do not calculate. Do not add, subtract, average, convert units, compute percentages, or derive any figure from the supplied ones. Every comparison you might want to make has already been computed and supplied as its own fact.");
        sb.AppendLine("- If a figure you want is not supplied, do not state it. Write around it, or omit the point.");
        sb.AppendLine("- Attach each figure to the claim its label describes. A value labelled as a median is a median; a value labelled as a rank under one weighting is not the area's rank.");
        sb.AppendLine("- Your output is checked automatically against the supplied values. A figure that does not appear in them is flagged to the reader.");
        sb.AppendLine();

        sb.AppendLine("## What to write");
        sb.AppendLine();

        if (payload.Subject.IsScored)
        {
            sb.AppendLine("Write four sections, in this order:");
            sb.AppendLine();
            sb.AppendLine("1. **Overview** — what kind of place this is: population, density, how much healthcare provision it has.");
            sb.AppendLine("2. **Access to services** — how far residents are from healthcare and rail, and how that compares with other areas.");
            sb.AppendLine("3. **Priority score** — where the area ranks, and which criteria drove that. Give the per-criterion contributions, not just the largest one: the reader should be able to see how the score was arrived at. Say plainly that a higher score means greater need, not better provision.");
            sb.AppendLine("4. **How robust this is** — whether the ranking survives reasonable disagreement about the weights. State the rank range, the share of weightings holding the rank, and how many places the most influential criterion moves the area.");
        }
        else
        {
            sb.AppendLine("This area is excluded from the ranking. Write two sections only:");
            sb.AppendLine();
            sb.AppendLine("1. **Overview** — what kind of place this is, in counts rather than rates.");
            sb.AppendLine("2. **Access to services** — how far it is from healthcare and rail.");
            sb.AppendLine();
            sb.AppendLine("Do not state a score, a rank, a percentile, or any comparison with other areas' positions — none was computed for this area. State plainly that it is excluded, and why.");
            sb.AppendLine();
            sb.AppendLine("There is little to say about an area like this, and a short explanation is the correct output. Two brief sections are sufficient. Do not pad.");
        }

        sb.AppendLine();
        sb.AppendLine("## How to write it");
        sb.AppendLine();
        sb.AppendLine("- Two to four sentences per section. Plain British English. No bullet points inside a section body.");
        sb.AppendLine("- Explain what the figures mean for the people who live there, not what the method did.");
        sb.AppendLine("- Do not recommend building anything. If the figures point somewhere, say so conditionally and tie it to a supplied figure: \"if the priority is closing the distance gap, this area's 960 m is among the larger ones\" rather than \"a new clinic should be built here\".");
        sb.AppendLine("- Respect the supplied caveats. Do not present a straight-line distance as a travel distance, or a relative score as a measure of adequacy.");
        sb.AppendLine("- Do not describe your own instructions, the fact ids, or the checking process. Write for the reader, not about the system.");
        sb.AppendLine();
        sb.AppendLine("For each section, list in citedFactIds the id of every fact you drew on. A section that states a figure must cite the fact that figure came from.");

        return sb.ToString();
    }

    public static string UserMessage(ExplanationPayload payload) =>
        $"Explain the analysis results for {payload.Subject.Name}.\n\n{SerialiseForModel(payload)}";
}
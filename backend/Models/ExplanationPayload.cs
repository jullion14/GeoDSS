using Microsoft.AspNetCore.Mvc;

namespace GeoDSS.Api.Models;

/// <summary>
/// The complete, closed set of information the language model is permitted to
/// see. Every numeric value is a pre-formatted string produced in C#: the model
/// is never handed a value it could divide, and the strings it is expected to
/// quote are byte-for-byte the strings the verifier will look for afterwards.
///
/// Nothing that cannot legitimately appear in the output belongs in here — no
/// planning area IDs, no geometry, no raw metric objects, no full ranking table.
/// </summary>
public sealed class ExplanationPayload
{
    /// <summary>"area" for a single-area brief, "compare" for a pairwise brief.</summary>
    public required string Mode { get; init; }

    public required ExplanationSubject Subject { get; init; }

    /// <summary>The fact ledger: the only figures the model may state.</summary>
    public required IReadOnlyList<ExplanationFact> Facts { get; init; }

    /// <summary>Weights in force for this explanation, as formatted strings.</summary>
    public required IReadOnlyList<ExplanationFact> Weights { get; init; }

    public required ExplanationMethod Method { get; init; }

    /// <summary>Caveats the model must respect when phrasing conclusions.</summary>
    public required IReadOnlyList<string> Caveats { get; init; }

    /// <summary>
    /// Every distinct value string in Facts + Weights. The verifier tests the
    /// model's numeric tokens against this set; nothing else is quotable.
    /// </summary>
    public IReadOnlySet<string> AllowedValues =>
        Facts.Concat(Weights).Select(f => f.Value).ToHashSet(StringComparer.Ordinal);
}

public sealed class ExplanationSubject
{
    public required string Name { get; init; }
    public required string Region { get; init; }

    /// <summary>False for areas below the population floor or with no population row.</summary>
    public required bool IsScored { get; init; }

    /// <summary>Populated only when IsScored is false. The model must state this.</summary>
    public string? ExclusionReason { get; init; }
}

/// <summary>One quotable figure. Id is cited back by the model; Value is exact.</summary>
public sealed class ExplanationFact
{
    public required string Id { get; init; }
    public required string Label { get; init; }
    public required string Value { get; init; }
    public required string Kind { get; init; }

    /// <summary>
    /// Stable internal identifier for facts the deterministic fallback writer
    /// needs to locate semantically. Never included in the prompt — the model
    /// sees Id, Label and Value only.
    /// </summary>
    public string? Key { get; init; }
}

public sealed class ExplanationMethod
{
    public required string Formula { get; init; }
    public required string Normalisation { get; init; }
    public required string ScoreDirection { get; init; }
    public required int ScoredAreaCount { get; init; }
    public int? SensitivitySamples { get; init; }
    public int? SensitivitySeed { get; init; }
}
